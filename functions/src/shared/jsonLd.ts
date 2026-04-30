export interface RecipeSchema {
  name?: string
  description?: string
  recipeYield?: string | number | string[]
  recipeIngredient?: string[]
  recipeInstructions?: unknown
  recipeCategory?: string
  recipeCuisine?: string
}

interface LdNode {
  '@type'?: string | string[]
  '@graph'?: LdNode[]
  [key: string]: unknown
}

function isRecipeNode(node: LdNode): boolean {
  const t = node['@type']
  if (typeof t === 'string') return t === 'Recipe'
  if (Array.isArray(t)) return t.includes('Recipe')
  return false
}

function flattenInstructions(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return ''
  return value
    .flatMap((item: unknown): string[] => {
      if (typeof item === 'string') return [item]
      if (typeof item === 'object' && item !== null) {
        const node = item as Record<string, unknown>
        // HowToSection has itemListElement containing the actual steps
        if (Array.isArray(node['itemListElement'])) {
          return flattenInstructions(node['itemListElement']).split('\n').filter(Boolean)
        }
        return [String(node['text'] ?? node['name'] ?? '')]
      }
      return []
    })
    .filter(Boolean)
    .join('\n')
}

// Parse all <script type="application/ld+json"> blocks in the HTML and return
// the first schema.org Recipe object found, or null if none exists.
export function extractRecipeSchema(html: string): RecipeSchema | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]) as LdNode | LdNode[]
      const candidates: LdNode[] = Array.isArray(parsed) ? parsed : [parsed]

      for (const candidate of candidates) {
        // Direct @type: "Recipe" at root
        if (isRecipeNode(candidate)) return candidate as unknown as RecipeSchema

        // @graph array (common on sites using Yoast SEO, WPRM, etc.)
        const graph = candidate['@graph']
        if (Array.isArray(graph)) {
          const recipe = (graph as LdNode[]).find(isRecipeNode)
          if (recipe) return recipe as unknown as RecipeSchema
        }
      }
    } catch {
      // Invalid JSON in this block — skip and try the next
    }
  }

  return null
}

// Normalise recipeInstructions (string | HowToStep[] | HowToSection[] | string[])
// into a single plain-text string for use in prompts.
export function normalizeRecipeInstructions(schema: RecipeSchema): string {
  return flattenInstructions(schema.recipeInstructions)
}

// Fetch the raw HTML for a URL and extract the Recipe JSON-LD schema.
// Uses a plain fetch() — JSON-LD is always server-rendered (for SEO) even on JS-heavy sites.
// Returns null on any failure so the caller can fall back to Jina Reader.
export async function fetchAndExtractRecipeSchema(url: string): Promise<RecipeSchema | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        // Identify as a browser so recipe sites don't serve bot-detection pages
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)',
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return null
    const html = await response.text()
    return extractRecipeSchema(html)
  } catch {
    return null // Non-fatal — caller falls back to Jina
  }
}
