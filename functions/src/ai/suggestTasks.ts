import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { geminiApiKey, getGemini } from '../shared/gemini'
import { PREP_TASKS_GUIDANCE } from '../shared/prompts'
import type { TaskDifficulty } from '../shared/types'

interface SuggestTasksInput {
  recipeName: string
  componentName?: string
  ingredients: { name: string; quantity: string }[]
  notes: string
}

interface SuggestTasksOutput {
  prepTasks: { description: string; difficulty: TaskDifficulty; order: number }[]
}

export const suggestTasks = onCall<SuggestTasksInput>(
  { region: 'us-central1', secrets: [geminiApiKey] },
  async (request): Promise<SuggestTasksOutput> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    const { recipeName, componentName, ingredients = [], notes } = request.data
    if (!recipeName?.trim()) {
      throw new HttpsError('invalid-argument', 'recipeName is required.')
    }

    const subject = componentName?.trim() ? `the "${componentName}" component of "${recipeName}"` : `"${recipeName}"`
    const ingredientList = ingredients.map((i) => `- ${i.name} (${i.quantity})`).join('\n')
    const prompt = `You are a recipe assistant for a family cooking app. Generate an ordered list of prep tasks for ${subject}.

${ingredientList ? `Ingredients:\n${ingredientList}\n` : ''}${notes ? `Notes: ${notes}\n` : ''}
The app is used by families cooking together. Tasks are assigned to individual people (often a child helping a parent).

Return a JSON object with exactly this shape:
{
  "prepTasks": [
    { "description": string, "difficulty": "easy"|"medium"|"hard", "order": number }
  ]
}

${PREP_TASKS_GUIDANCE}
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
