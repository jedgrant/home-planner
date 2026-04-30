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
  /** ID of the MealItem */
  itemId: string
  itemName: string
  /** ID of the MealComponent within the item */
  componentId: string
  componentName: string
  /** ID of the MealTask within the component */
  taskId: string
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

// ─── Suggest Meals ────────────────────────────────────────────────────────────

export interface AIMealSide {
  name: string
  recipeId: string | null
  isFromRecipes: boolean
}

export interface AIMealIdea {
  ideaId: string
  title: string
  entree: {
    name: string
    recipeId: string | null
    isFromRecipes: boolean
    lastServedDate: string | null
  }
  sides: AIMealSide[]
  rationale: string
}

interface SuggestMealsInput {
  familyId: string
  mealStyle: 'quick' | 'full'
  cuisinePreference: string
}

interface SuggestMealsOutput {
  ideas: AIMealIdea[]
}

export function useAISuggestMeals() {
  return useMutation({
    mutationFn: async (input: SuggestMealsInput) => {
      const fn = httpsCallable<SuggestMealsInput, SuggestMealsOutput>(functions, 'suggestMeals')
      const result = await fn(input)
      return result.data
    },
  })
}
