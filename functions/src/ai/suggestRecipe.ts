import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { geminiApiKey } from '../shared/gemini'
import { generateRecipeFromScratch } from '../shared/generateRecipe'
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

    const result = await generateRecipeFromScratch(recipeName.trim())
    const ingredients = result.components.flatMap((c) => c.ingredients)
    const prepTasks = result.components.flatMap((c) => c.tasks)
    return { description: result.description, servingSize: result.servingSize, ingredients, prepTasks }
  }
)
