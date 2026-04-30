import { onCall, HttpsError } from 'firebase-functions/v2/https'
import type { CourseType } from '../shared/types'

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

// TODO: Replace stub with a real Gemini call
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
