import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { geminiApiKey, getGemini } from '../shared/gemini'
import type { TaskDifficulty } from '../shared/types'

interface SuggestRecipeInput {
  recipeName: string
}

interface SuggestRecipeOutput {
  description: string
  servingSize: number
  ingredients: { name: string; quantity: string }[]
  prepTasks: { description: string; difficulty: TaskDifficulty; order: number }[]
}

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
