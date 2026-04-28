import { useMutation } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/shared/lib/firebase'
import type { CourseType, TaskDifficulty } from '@/shared/types/recipes'

// ─── Suggest Meal ─────────────────────────────────────────────────────────────

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

export function useAISuggestMeal() {
  return useMutation({
    mutationFn: async (input: SuggestMealInput) => {
      const fn = httpsCallable<SuggestMealInput, SuggestMealOutput>(functions, 'suggestMeal')
      const result = await fn(input)
      return result.data
    },
  })
}

// ─── Assign Tasks ─────────────────────────────────────────────────────────────

interface AssignTasksInput {
  familyId: string
  mealId: string
}

export interface TaskAssignment {
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

export function useAIAssignTasks() {
  return useMutation({
    mutationFn: async (input: AssignTasksInput) => {
      const fn = httpsCallable<AssignTasksInput, AssignTasksOutput>(functions, 'assignTasks')
      const result = await fn(input)
      return result.data
    },
  })
}
