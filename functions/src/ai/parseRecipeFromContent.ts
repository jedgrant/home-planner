import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { geminiApiKey, getGemini } from '../shared/gemini'
import { PREP_TASKS_GUIDANCE } from '../shared/prompts'
import { fetchAndExtractRecipeSchema, normalizeRecipeInstructions } from '../shared/jsonLd'
import { generateRecipeFromScratch } from '../shared/generateRecipe'
import type { RecipeSchema } from '../shared/jsonLd'
import type { TaskDifficulty, CourseType } from '../shared/types'

const tavilyApiKey = defineSecret('TAVILY_API_KEY')

// ─── Input / Output types ─────────────────────────────────────────────────────

interface ParseRecipeInput {
  text?: string
  imageBase64?: string
  imageMediaType?: string
}

interface RecipeComponentOutput {
  name: string
  /** Cooking instructions for this component (sequential steps, not parallel tasks) */
  notes: string
  ingredients: { name: string; quantity: string }[]
  tasks: { description: string; difficulty: TaskDifficulty; order: number }[]
}

interface ParseRecipeOutput {
  name: string
  courseType: CourseType
  description: string
  servingSize: number
  components: RecipeComponentOutput[]
}

// ─── URL / fetch helpers ──────────────────────────────────────────────────────

function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value.trim())
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

// Normalise a bare domain/path like "melskitchencafe.com/recipe-slug/" to a
// full https:// URL. Returns null if it doesn't look like a URL (e.g. it has
// spaces, or no dot in the hostname part).
function normaliseUrl(value: string): string | null {
  const trimmed = value.trim()
  // Already a valid https URL
  if (isHttpsUrl(trimmed)) return trimmed
  // Has spaces → it's a search query, not a URL
  if (trimmed.includes(' ')) return null
  // Try prepending https://
  try {
    const u = new URL(`https://${trimmed}`)
    // Must have at least one dot in the hostname and no illegal URL characters
    if (u.hostname.includes('.')) return u.href
  } catch {
    // Not a URL
  }
  return null
}

interface FetchedContent {
  content: string
  sourceUrl: string
}

// Fetch a URL via Jina Reader — returns clean markdown suitable for Gemini.
// Handles SSR pages and many SPAs without needing a headless browser.
async function fetchUrlWithJina(url: string): Promise<FetchedContent> {
  let response: Response
  try {
    response = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(20_000),
    })
  } catch (err) {
    throw new HttpsError('unavailable', `Could not reach the recipe page: ${(err as Error).message}`)
  }
  if (response.status === 401 || response.status === 403) {
    throw new HttpsError('invalid-argument', 'The recipe page requires a login or is not publicly accessible.')
  }
  if (response.status === 404) {
    throw new HttpsError('invalid-argument', 'The recipe page was not found (404). Check the URL and try again.')
  }
  if (!response.ok) {
    throw new HttpsError('unavailable', `The recipe page returned an error (status ${response.status}). Try pasting the recipe text directly.`)
  }
  return { content: (await response.text()).slice(0, 30_000), sourceUrl: url }
}

interface TavilyResult {
  url: string
  title: string
}

// Domains that will never have a usable recipe page — skip these in Tavily results.
const BLOCKED_DOMAINS = new Set([
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com',
  'youtube.com', 'pinterest.com', 'reddit.com', 'threads.net',
])

function isBadResultUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return BLOCKED_DOMAINS.has(hostname)
  } catch {
    return true
  }
}

// Find the best-matching recipe URL via Tavily. Returns the URL only — the caller
// decides whether to use JSON-LD or Jina to fetch the actual content.
async function findRecipeUrlWithTavily(query: string, apiKey: string): Promise<string> {
  let response: Response
  try {
    response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: `recipe ${query}`,
        search_depth: 'basic',
        include_raw_content: false,
        max_results: 5,
      }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    throw new HttpsError('unavailable', `Recipe search unavailable: ${(err as Error).message}`)
  }
  if (response.status === 429) {
    throw new HttpsError('resource-exhausted', 'Recipe search rate limit reached. Please try again in a moment.')
  }
  if (response.status === 401 || response.status === 403) {
    throw new HttpsError('internal', 'Recipe search is not configured correctly. Please contact support.')
  }
  if (!response.ok) {
    throw new HttpsError('unavailable', `Recipe search returned an error (status ${response.status}).`)
  }
  const data = (await response.json()) as { results: TavilyResult[] }
  const top = (data.results ?? []).find((r) => !isBadResultUrl(r.url))
  if (!top?.url) {
    throw new HttpsError('not-found', 'No recipe found for that search. Try being more specific or paste the recipe text directly.')
  }
  return top.url
}

// ─── Error helpers ────────────────────────────────────────────────────────────

// Convert Gemini/fetch errors into descriptive HttpsErrors that propagate
// to the client. The `status` property comes from GoogleGenerativeAIFetchError.
function handleGeminiError(err: unknown): never {
  if (err instanceof HttpsError) throw err
  const e = err as { status?: number; message?: string }
  if (e.status === 429) {
    throw new HttpsError('resource-exhausted', 'AI service rate limit reached. Please try again in a moment.')
  }
  if (e.status === 403) {
    throw new HttpsError('internal', 'AI service authentication error. Please contact support.')
  }
  if (e.status === 400) {
    throw new HttpsError('invalid-argument', 'The content was rejected by the AI service (too large or malformed).')
  }
  const msg = (e.message ?? 'unknown error').replace(/\n/g, ' ').slice(0, 200)
  console.error('Gemini error', err)
  throw new HttpsError('internal', `AI service error: ${msg}`)
}

// ─── Gemini call: fast path (JSON-LD schema input, ~800 tokens) ───────────────

// When we already have structured recipe data from a JSON-LD schema, we only
// ask Gemini to transform it into our shape — not extract from a 30k char page.
async function parseWithSchema(schema: RecipeSchema, sourceUrl: string): Promise<ParseRecipeOutput> {
  const instructions = normalizeRecipeInstructions(schema)
  const yieldStr = Array.isArray(schema.recipeYield)
    ? String(schema.recipeYield[0] ?? '')
    : String(schema.recipeYield ?? '')

  const prompt = `You are a recipe assistant. Transform this recipe into our app's format.

Name: ${schema.name ?? 'Unknown Recipe'}
Yield: ${yieldStr.trim() || 'unknown'}
Category hint: ${[schema.recipeCategory, schema.recipeCuisine].filter(Boolean).join(', ') || 'none'}
Source: ${sourceUrl}

Ingredients (one raw string per line):
${(schema.recipeIngredient ?? []).join('\n') || '(none)'}

Cooking instructions:
${instructions || '(none provided)'}

Return a JSON object with exactly this shape:
{
  "name": string,
  "courseType": "entree"|"side"|"salad"|"fruit"|"dessert",
  "description": string,
  "servingSize": number,
  "components": [
    {
      "name": string,
      "notes": string,
      "ingredients": [{ "name": string, "quantity": string }],
      "tasks": [{ "description": string, "difficulty": "easy"|"medium"|"hard", "order": number }]
    }
  ]
}

Component rules:
- Split the recipe into natural sub-assemblies that each have their own distinct set of ingredients and can be prepped somewhat independently. Examples: a stir fry → ["Chicken", "Vegetables", "Sauce", "Rice"]; pasta bake → ["Pasta", "Meat Sauce", "Cheese Topping"]; cookies → ["Cookies"] (single component).
- Each component has a name, notes (cooking instructions), its own ingredients list, and tasks.
- Assign every ingredient to exactly one component. Do not drop any ingredient.
- Each ingredient name must be sentence-cased (e.g. "All-purpose flour", "Olive oil", "Garlic cloves").
- notes: sequential cooking instructions for this component written in a friendly imperative tone (e.g. "Bring a large pot of salted water to a boil. Cook pasta until al dente, about 8 min. Drain and set aside."). This is NOT a task list — it is the cooking narrative one person follows.

Top-level field rules:
- name: use the provided name, capitalised properly.
- courseType: infer from the name and category hint.
- servingSize: parse a number from the yield (e.g. "24 rolls" → 24, "6-8 servings" → 7). Use 4 if unclear.
- description: 1-3 sentences about what the dish is and how it tastes, in a friendly tone. End with "Recipe from: ${sourceUrl}". Do NOT list steps here.

${PREP_TASKS_GUIDANCE}
- Return only valid JSON, no markdown fences.`

  try {
    const result = await getGemini().generateContent(prompt)
    return JSON.parse(result.response.text()) as ParseRecipeOutput
  } catch (err) {
    return handleGeminiError(err)
  }
}

// ─── Gemini call: full-context path (raw page content or image) ───────────────

async function parseWithContent(
  content: string,
  imageBase64: string | null,
  imageMediaType: string | null,
  sourceUrl: string | null,
): Promise<ParseRecipeOutput> {
  const systemPrompt = `You are a recipe parsing assistant. Extract a structured recipe from the provided content (text, image, or both).

Return a JSON object with exactly this shape:
{
  "found": boolean,
  "notFoundReason": string | null,
  "name": string,
  "courseType": "entree"|"side"|"salad"|"fruit"|"dessert",
  "description": string,
  "servingSize": number,
  "components": [
    {
      "name": string,
      "notes": string,
      "ingredients": [{ "name": string, "quantity": string }],
      "tasks": [{ "description": string, "difficulty": "easy"|"medium"|"hard", "order": number }]
    }
  ]
}

HALLUCINATION GUARD — this is the most important rule:
- If the content does not contain a recognisable recipe (ingredients list + some instructions or steps), set "found": false and set "notFoundReason" to a short, friendly, user-facing sentence explaining why (e.g. "I couldn't find a recipe for that — the page may require a login or the link may have changed.", or "That search didn't turn up a recognisable recipe. Try pasting the recipe text directly."). Leave all other fields as empty defaults.
- If the content clearly contains a recipe, set "found": true and "notFoundReason": null, then fill in all fields.
- NEVER invent or guess ingredients, quantities, or steps that are not present in the content.

Rules (apply only when found is true):
- name: the recipe's proper title.
- courseType: best guess based on the dish type.
- servingSize: number of servings; use 4 if unknown.
- description: 1-3 friendly sentences about what the dish is and how it tastes. Do NOT list steps here.${sourceUrl ? ' End with "Recipe from: ' + sourceUrl + '".' : ' Include what it tastes like and how it is typically served.'}

Component rules:
- Split the recipe into natural sub-assemblies that each have their own distinct ingredients and can be prepped somewhat independently. Examples: a stir fry → ["Chicken", "Vegetables", "Sauce", "Rice"]; pasta bake → ["Pasta", "Meat Sauce", "Cheese Topping"]; cookies → ["Cookies"] (single component).
- Assign every ingredient to exactly one component. CRITICAL: do not drop any ingredient.
- Each ingredient name must be sentence-cased (e.g. "All-purpose flour", "Olive oil", "Garlic cloves").
- notes: sequential cooking instructions for this component in friendly imperative tone (e.g. "Heat oil in a wok over high heat. Add chicken and cook 5-6 min until no longer pink. Set aside."). This is the cooking narrative — NOT a list of tasks.

${PREP_TASKS_GUIDANCE}

- Return only valid JSON, no markdown fences.`

  const contentParts: Array<string | { inlineData: { mimeType: string; data: string } }> = [systemPrompt]
  if (imageBase64 && imageMediaType) {
    contentParts.push({ inlineData: { mimeType: imageMediaType, data: imageBase64 } })
  }
  if (content.trim()) {
    contentParts.push(content.trim())
  }

  try {
    const result = await getGemini().generateContent(contentParts)
    const json = result.response.text()
    console.log('Gemini parseWithContent response', json)
    const parsed = JSON.parse(json) as ParseRecipeOutput & { found: boolean; notFoundReason: string | null }

    if (!parsed.found) {
      throw new HttpsError(
        'not-found',
        parsed.notFoundReason ?? "Couldn't find a recipe in that content. Try pasting the recipe text directly."
      )
    }

    const { found: _found, notFoundReason: _reason, ...output } = parsed
    return output as ParseRecipeOutput
  } catch (err) {
    return handleGeminiError(err)
  }
}

// ─── Shared: Tavily → JSON-LD or Jina → Gemini ───────────────────────────────
//
// Used by both the name-search path and the URL-with-blocked-Jina fallback.
// Finds the best recipe URL via Tavily, tries JSON-LD first, falls back to Jina.

async function resolveUrlAndParse(query: string): Promise<ParseRecipeOutput> {
  const url = await findRecipeUrlWithTavily(query, tavilyApiKey.value())
  const schema = await fetchAndExtractRecipeSchema(url)
  if (schema?.recipeIngredient?.length) {
    console.log('parseRecipeFromContent: Tavily → JSON-LD fast path', url, `(${schema.recipeIngredient.length} ingredients)`)
    return parseWithSchema(schema, url)
  }
  console.log('parseRecipeFromContent: Tavily → Jina path (no JSON-LD)', url)
  const jina = await fetchUrlWithJina(url)
  console.log('parseRecipeFromContent: Jina returned', jina.content.length, 'chars')
  return parseWithContent(jina.content, null, null, jina.sourceUrl)
}

// ─── Input classification ─────────────────────────────────────────────────────
//
// Ask Gemini to classify the input AND extract a clean recipe title in one call.
// The title is used for Tavily search and for generateRecipeFromScratch so that
// a vague prompt like "something cozy with chicken" becomes "Chicken Pot Pie"
// rather than being sent verbatim to a search engine.

type InputType = 'url' | 'recipe' | 'name' | 'vague'

interface ClassifyResult {
  type: InputType
  recipeTitle: string | null
}

async function classifyInput(text: string): Promise<ClassifyResult> {
  const prompt = `Classify the following user input for a recipe import feature and extract a clean recipe title.

Return a JSON object with exactly this shape:
{ "type": "url"|"recipe"|"name"|"vague", "recipeTitle": string | null }

Classification rules:
- "url"    — A URL or something that looks like a URL (e.g. "https://example.com/cookies", "allrecipes.com/chicken-soup"). Set recipeTitle to null.
- "recipe" — Pasted recipe text that contains ingredients or cooking steps. Set recipeTitle to null.
- "name"   — A specific, well-known dish or recipe name (e.g. "chocolate chip cookies", "chicken tikka masala"). Set recipeTitle to the name as-is, cleaned up.
- "vague"  — A general, descriptive, or open-ended request (e.g. "something healthy", "easy weeknight dinner with chicken", "a cozy soup for winter"). Set recipeTitle to the best matching well-known recipe name (e.g. "Chicken Vegetable Soup").

For "name" and "vague", recipeTitle should be a clean, properly capitalised recipe title suitable for a web search — not a sentence.

Input: ${text.slice(0, 500)}

Return only valid JSON, no markdown fences.`

  try {
    const result = await getGemini().generateContent(prompt)
    const parsed = JSON.parse(result.response.text()) as { type?: string; recipeTitle?: string | null }
    const type = parsed.type
    if (type === 'url' || type === 'recipe' || type === 'name' || type === 'vague') {
      return { type, recipeTitle: parsed.recipeTitle ?? null }
    }
  } catch {
    // Classification failure — fall back to treating it as a name search
  }
  return { type: 'name', recipeTitle: null }
}

// ─── URL fetch chain ──────────────────────────────────────────────────────────
//
// Shared by the "url" classification path and the Tavily → URL path.
// Tries JSON-LD (fast), then Jina, then site-scoped Tavily fallback.

async function fetchUrlAndParse(url: string): Promise<ParseRecipeOutput> {
  const schema = await fetchAndExtractRecipeSchema(url)
  if (schema?.recipeIngredient?.length) {
    console.log('parseRecipeFromContent: JSON-LD fast path', url, `(${schema.recipeIngredient.length} ingredients)`)
    return parseWithSchema(schema, url)
  }
  console.log('parseRecipeFromContent: no JSON-LD, trying Jina', url)

  const jina = await fetchUrlWithJina(url)
  console.log('parseRecipeFromContent: Jina returned', jina.content.length, 'chars')

  if (jina.content.length >= 500) {
    return parseWithContent(jina.content, null, null, jina.sourceUrl)
  }

  // Jina returned minimal content — site is likely Cloudflare-protected.
  // Fall back to a site-scoped Tavily search for the same page.
  const parsedUrl = new URL(url)
  const slug = parsedUrl.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') ?? ''
  if (!slug) {
    throw new HttpsError('invalid-argument', "The recipe page couldn't be loaded. Try pasting the recipe text directly.")
  }
  const siteQuery = `${slug} site:${parsedUrl.hostname.replace(/^www\./, '')}`
  console.log('parseRecipeFromContent: Jina blocked, Tavily site-scoped fallback:', siteQuery)
  return resolveUrlAndParse(siteQuery)
}

// ─── Cloud Function ───────────────────────────────────────────────────────────
//
// Routing (determined by a Gemini classification call, not heuristics):
//   image only → multimodal Gemini
//   "url"      → JSON-LD fast path → Jina → site-scoped Tavily
//   "recipe"   → direct full-context Gemini (pasted text ± image)
//   "name"     → Tavily search → JSON-LD or Jina on result URL
//   "vague"    → same as "name"; if nothing found → generate from scratch

export const parseRecipeFromContent = onCall<ParseRecipeInput>(
  { region: 'us-central1', secrets: [geminiApiKey, tavilyApiKey] },
  async (request): Promise<ParseRecipeOutput> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    const { text, imageBase64, imageMediaType } = request.data
    if (!text?.trim() && !imageBase64) {
      throw new HttpsError('invalid-argument', 'Either text or imageBase64 is required.')
    }

    // Image-only — no text to classify, go straight to multimodal Gemini
    if (!text?.trim()) {
      console.log('parseRecipeFromContent: image-only path')
      return parseWithContent('', imageBase64!, imageMediaType!, null)
    }

    const trimmed = text.trim()
    const { type: inputType, recipeTitle } = await classifyInput(trimmed)
    console.log('parseRecipeFromContent: classified input as', inputType, recipeTitle ? `→ "${recipeTitle}"` : '')

    switch (inputType) {
      case 'url': {
        const normalised = normaliseUrl(trimmed) ?? `https://${trimmed}`
        return fetchUrlAndParse(normalised)
      }

      case 'recipe':
        return parseWithContent(trimmed, imageBase64 ?? null, imageMediaType ?? null, null)

      case 'name': {
        const searchQuery = recipeTitle ?? trimmed
        return resolveUrlAndParse(searchQuery)
      }

      case 'vague': {
        const searchQuery = recipeTitle ?? trimmed
        try {
          return await resolveUrlAndParse(searchQuery)
        } catch (err) {
          if (err instanceof HttpsError && err.code === 'not-found') {
            console.log('parseRecipeFromContent: no recipe found, generating from scratch')
            return generateRecipeFromScratch(searchQuery)
          }
          throw err
        }
      }
    }
  }
)
