import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { GoogleGenerativeAI } from '@google/generative-ai'

initializeApp()

const geminiApiKey = defineSecret('GEMINI_API_KEY')

function getGemini() {
  return new GoogleGenerativeAI(geminiApiKey.value()).getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskDifficulty = 'easy' | 'medium' | 'hard'
type CourseType = 'entree' | 'side' | 'salad' | 'fruit' | 'dessert'

interface SuggestRecipeInput {
  recipeName: string
}

interface SuggestRecipeOutput {
  description: string
  servingSize: number
  ingredients: { name: string; quantity: string }[]
  prepTasks: { description: string; difficulty: TaskDifficulty; order: number }[]
}

interface SuggestTasksInput {
  recipeName: string
  ingredients: { name: string; quantity: string }[]
  notes: string
}

interface SuggestTasksOutput {
  prepTasks: { description: string; difficulty: TaskDifficulty; order: number }[]
}

// ─── suggestRecipe ────────────────────────────────────────────────────────────

export const suggestRecipe = onCall<SuggestRecipeInput>(
  { region: 'us-central1', secrets: [geminiApiKey] },
  async (request): Promise<SuggestRecipeOutput> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    const { recipeName } = request.data
    if (!recipeName?.trim()) {
      throw new HttpsError('invalid-argument', 'recipeName is required.')
    }

    const prompt = `You are a recipe assistant. Generate a complete recipe for "${recipeName}".

Return a JSON object with exactly this shape:
{
  "description": string,        // 1–3 sentence description / cooking notes
  "servingSize": number,        // typical number of people it serves
  "ingredients": [
    { "name": string, "quantity": string }
  ],
  "prepTasks": [
    { "description": string, "difficulty": "easy"|"medium"|"hard", "order": number }
  ]
}

Rules:
- All task descriptions should be action-oriented (e.g. "Dice the onions").
- difficulty reflects physical/skill effort: easy = basic, medium = some skill, hard = complex technique.
- order starts at 0 and follows logical cooking sequence.
- Return only valid JSON, no markdown fences.`

    try {
      const model = getGemini()
      const result = await model.generateContent(prompt)
      const json = result.response.text()
      return JSON.parse(json) as SuggestRecipeOutput
    } catch (err) {
      console.error('suggestRecipe Gemini error', err)
      throw new HttpsError('internal', 'Failed to generate recipe.')
    }
  }
)

// ─── suggestTasks ─────────────────────────────────────────────────────────────

export const suggestTasks = onCall<SuggestTasksInput>(
  { region: 'us-central1', secrets: [geminiApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    const { recipeName, ingredients = [], notes } = request.data
    if (!recipeName?.trim()) {
      throw new HttpsError('invalid-argument', 'recipeName is required.')
    }

    const ingredientList = ingredients.map((i) => `- ${i.name} (${i.quantity})`).join('\n')
    const prompt = `You are a recipe assistant. Generate an ordered list of prep tasks for the recipe "${recipeName}".

${ingredientList ? `Ingredients:\n${ingredientList}\n` : ''}${notes ? `Notes: ${notes}\n` : ''}
Return a JSON object with exactly this shape:
{
  "prepTasks": [
    { "description": string, "difficulty": "easy"|"medium"|"hard", "order": number }
  ]
}

Rules:
- Each task should be a single, discrete action (e.g. "Mince the garlic").
- difficulty: easy = basic prep, medium = some skill, hard = complex technique.
- order starts at 0 and follows logical cooking sequence.
- Return only valid JSON, no markdown fences.`

    try {
      const model = getGemini()
      const result = await model.generateContent(prompt)
      const json = result.response.text()
      return JSON.parse(json) as SuggestTasksOutput
    } catch (err) {
      console.error('suggestTasks Gemini error', err)
      throw new HttpsError('internal', 'Failed to generate tasks.')
    }
  }
)

// ─── parseRecipeFromContent ───────────────────────────────────────────────────
// Parses a recipe from pasted text and/or a base64-encoded image using Gemini's
// multimodal input. Text and image can be combined (e.g. a photo + a note).

interface ParseRecipeInput {
  text?: string
  imageBase64?: string
  imageMediaType?: string
}

interface ParseRecipeOutput {
  name: string
  courseType: CourseType
  description: string
  servingSize: number
  ingredients: { name: string; quantity: string }[]
  prepTasks: { description: string; difficulty: TaskDifficulty; order: number }[]
}

export const parseRecipeFromContent = onCall<ParseRecipeInput>(
  { region: 'us-central1', secrets: [geminiApiKey] },
  async (request): Promise<ParseRecipeOutput> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    const { text, imageBase64, imageMediaType } = request.data
    if (!text?.trim() && !imageBase64) {
      throw new HttpsError(
        'invalid-argument',
        'Either text or imageBase64 is required.'
      )
    }

    const systemPrompt = `You are a recipe parsing assistant. Extract a structured recipe from the provided content (text, image, or both).

Return a JSON object with exactly this shape:
{
  "name": string,
  "courseType": "entree"|"side"|"salad"|"fruit"|"dessert",
  "description": string,
  "servingSize": number,
  "ingredients": [
    { "name": string, "quantity": string }
  ],
  "prepTasks": [
    { "description": string, "difficulty": "easy"|"medium"|"hard", "order": number }
  ]
}

Rules:
- name: the recipe's proper title.
- courseType: best guess based on the dish type.
- servingSize: number of servings; use 4 if unknown.
- ingredients: each entry has a name and a quantity (e.g. "2 cups"). Split combined entries into separate items.
- description: Always provide a 1-3 sentence description of the dish. Include what it tastes like, how it's typically served, and what sides, toppings, or other elements it pairs well with. Never leave this empty.

CRITICAL — description (notes) vs. prepTasks:
The app is used by families cooking together. prepTasks are assigned to individual people (often a child helping a parent).

- description: The 1-3 sentence overview described above. Do NOT put step-by-step cooking instructions here.
- prepTasks: Use for any discrete step that would take 5 or more minutes on its own, or any step that could meaningfully be handed off to a separate person. Examples that SHOULD be prep tasks: "Chop and wash the lettuce", "Defrost and brown the ground beef", "Boil and drain the pasta", "Dice the onions and peppers". Examples that should NOT be prep tasks (too quick/trivial): "Open the can", "Sprinkle salt". For simple sides or toppings where all steps are quick and done by one person (e.g. canned corn, sliced fruit), leave prepTasks empty.
- Each prep task must be a single, assignable action with enough detail to stand alone (e.g. "Brown 1 lb ground beef in a skillet over medium heat until no pink remains" rather than just "Cook beef").

- Return only valid JSON, no markdown fences.`

    try {
      const model = getGemini()
      const contentParts: Array<string | { inlineData: { mimeType: string; data: string } }> = [systemPrompt]

      if (imageBase64 && imageMediaType) {
        contentParts.push({
          inlineData: { mimeType: imageMediaType, data: imageBase64 },
        })
      }
      if (text?.trim()) {
        contentParts.push(text.trim())
      }

      const result = await model.generateContent(contentParts)
      const json = result.response.text()
      console.log('Gemini parseRecipeFromContent response', json)
      return JSON.parse(json) as ParseRecipeOutput
    } catch (err) {
      console.error('parseRecipeFromContent Gemini error', err)
      throw new HttpsError('internal', 'Failed to parse recipe from content.')
    }
  }
)

// ─── suggestMeal ──────────────────────────────────────────────────────────────
// TODO: Replace stub with a real Gemini call once a project API key is configured.

interface SuggestMealInput {
  familyId: string
  date: string
}

interface SuggestMealOutput {
  name: string
  suggestions: Array<{
    recipeId: string
    recipeName: string
    courseType: CourseType
    rationale: string
  }>
}

export const suggestMeal = onCall<SuggestMealInput>(
  { region: 'us-central1' },
  async (request): Promise<SuggestMealOutput> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    const { date } = request.data
    if (!date?.trim()) {
      throw new HttpsError('invalid-argument', 'date is required.')
    }

    // Stub response — replace with Gemini/Vertex AI call
    return {
      name: `Dinner ${date}`,
      suggestions: [
        {
          recipeId: '',
          recipeName: 'Suggested Entree',
          courseType: 'entree' as CourseType,
          rationale: 'Based on your recent meal history, this would be a great choice.',
        },
        {
          recipeId: '',
          recipeName: 'Suggested Side',
          courseType: 'side' as CourseType,
          rationale: 'Pairs well with the suggested entree.',
        },
      ],
    }
  }
)

// ─── assignTasks ─────────────────────────────────────────────────────────────
// TODO: Replace stub with a real Gemini call once a project API key is configured.

interface AssignTasksInput {
  familyId: string
  mealId: string
}

interface TaskAssignment {
  recipeIndex: number
  taskIndex: number
  recipeName: string
  taskDescription: string
  difficulty: TaskDifficulty
  assigneeId: string
  assigneeName: string
  rationale: string
}

interface AssignTasksOutput {
  assignments: TaskAssignment[]
}

export const assignTasks = onCall<AssignTasksInput>(
  { region: 'us-central1' },
  async (request): Promise<AssignTasksOutput> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    const { mealId } = request.data
    if (!mealId?.trim()) {
      throw new HttpsError('invalid-argument', 'mealId is required.')
    }

    // Stub response — replace with Gemini/Vertex AI call
    return { assignments: [] }
  }
)

// ─── deleteFamily ─────────────────────────────────────────────────────────────
// Permanently deletes a family and all related data.
//
// Firestore does NOT cascade-delete subcollections when a document is deleted.
// This function uses the Admin SDK's recursiveDelete() to handle that, then
// also removes invite codes and clears familyId/role on all member user docs.

interface DeleteFamilyInput {
  familyId: string
}

export const deleteFamily = onCall<DeleteFamilyInput>(
  { region: 'us-central1' },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }

    const { familyId } = request.data
    if (!familyId?.trim()) {
      throw new HttpsError('invalid-argument', 'familyId is required.')
    }

    const adminDb = getFirestore()

    // Verify caller is a parent in this family
    const callerDoc = await adminDb.doc(`users/${request.auth.uid}`).get()
    if (!callerDoc.exists) {
      throw new HttpsError('not-found', 'User not found.')
    }
    const callerData = callerDoc.data()!
    if (callerData.familyId !== familyId) {
      throw new HttpsError('permission-denied', 'Not a member of this family.')
    }
    if (callerData.role !== 'parent') {
      throw new HttpsError('permission-denied', 'Only parents can delete the family.')
    }

    // Fetch family document to get member IDs
    const familyDoc = await adminDb.doc(`families/${familyId}`).get()
    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found.')
    }
    const memberIds: string[] = familyDoc.data()?.memberIds ?? []

    // Batch: delete invite codes + clear familyId/role on all member user docs
    const inviteSnap = await adminDb
      .collection('inviteCodes')
      .where('familyId', '==', familyId)
      .get()

    const batch = adminDb.batch()

    for (const codeDoc of inviteSnap.docs) {
      batch.delete(codeDoc.ref)
    }

    for (const uid of memberIds) {
      batch.update(adminDb.doc(`users/${uid}`), {
        familyId: null,
        role: null,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    await batch.commit()

    // Recursively delete the family document and ALL subcollections
    await adminDb.recursiveDelete(adminDb.doc(`families/${familyId}`))

    return { success: true }
  }
)
