import { HttpsError } from 'firebase-functions/v2/https'
import { getGemini } from './gemini'
import { PREP_TASKS_GUIDANCE } from './prompts'
import type { TaskDifficulty, CourseType } from './types'

export interface RecipeComponentOutput {
  name: string
  notes: string
  ingredients: { name: string; quantity: string }[]
  tasks: { description: string; difficulty: TaskDifficulty; order: number }[]
}

export interface GeneratedRecipe {
  name: string
  courseType: CourseType
  description: string
  servingSize: number
  components: RecipeComponentOutput[]
}

/**
 * Ask Gemini to generate a complete recipe from scratch given a name or
 * open-ended request. Used by both suggestRecipe and parseRecipeFromContent.
 */
export async function generateRecipeFromScratch(request: string): Promise<GeneratedRecipe> {
  const prompt = `You are a recipe assistant. Generate a complete, accurate recipe for: "${request}"

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

Top-level field rules:
- name: a proper recipe title, capitalised correctly.
- courseType: best guess based on the dish type.
- servingSize: typical number of servings for this dish.
- description: 1-3 friendly sentences describing what the dish is and how it tastes.

Component rules:
- Split into natural sub-assemblies that each have their own distinct ingredients. Examples: stir fry → ["Chicken", "Vegetables", "Sauce", "Rice"]; pasta bake → ["Pasta", "Meat Sauce", "Cheese Topping"]; cookies → ["Cookies"] (single component).
- notes: sequential cooking instructions for this component in friendly imperative tone. This is the cooking narrative a person follows — NOT a task list.
- Ingredient names sentence-cased (e.g. "All-purpose flour", "Olive oil").
${PREP_TASKS_GUIDANCE}
- Return only valid JSON, no markdown fences.`

  let json: string
  try {
    const result = await getGemini().generateContent(prompt)
    json = result.response.text()
  } catch (err) {
    const e = err as { status?: number; message?: string }
    if (e.status === 429) throw new HttpsError('resource-exhausted', 'AI service rate limit reached. Please try again in a moment.')
    if (e.status === 403) throw new HttpsError('internal', 'AI service authentication error. Please contact support.')
    const msg = (e.message ?? 'unknown error').replace(/\n/g, ' ').slice(0, 200)
    console.error('generateRecipeFromScratch Gemini error', err)
    throw new HttpsError('internal', `AI service error: ${msg}`)
  }

  return JSON.parse(json) as GeneratedRecipe
}
