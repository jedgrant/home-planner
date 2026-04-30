import { onCall, HttpsError } from 'firebase-functions/v2/https'
import type { TaskDifficulty } from '../shared/types'

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

// TODO: Replace stub with a real Gemini call
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

    return { assignments: [] }
  }
)
