import type { Timestamp } from 'firebase/firestore'
import type { CourseType, TaskDifficulty } from './recipes'

export type MealStatus = 'incomplete' | 'planned' | 'in_progress' | 'served'

export type FreeFormCourseType = 'entree' | 'side' | 'topping' | 'dessert'

export interface FreeFormItem {
  itemId: string
  courseType: FreeFormCourseType
  /** HTML string from Tiptap */
  description: string
  assigneeId: string | null
  assigneeName: string | null
}

export interface MealTask {
  taskId: string
  description: string
  difficulty: TaskDifficulty
  assigneeId: string | null
  assigneeName: string | null
  completedAt: Timestamp | null
}

export interface SuggestionVote {
  userId: string
  userName: string
  photoUrl: string | null
}

export interface MealSuggestion {
  suggestionId: string
  /** null for free-form suggestions */
  recipeId: string | null
  name: string
  /** null for free-form suggestions */
  courseType: string | null
  suggestedById: string
  suggestedByName: string
  votes: SuggestionVote[]
  accepted: boolean
}

export interface MealRecipe {
  recipeId: string
  recipeName: string
  courseType: CourseType
  tasks: MealTask[]
}

export interface Meal {
  mealId: string
  familyId: string
  name: string
  /** ISO date string e.g. "2026-04-27" */
  date: string
  status: MealStatus
  servedAt: Timestamp | null
  recipes: MealRecipe[]
  /** Fixed cleanup tasks (Dishes, Put away food, Wipe down counters). Stored when first assigned. */
  cleanupTasks?: MealTask[]
  /** Free-form items (not from recipe book) added to the meal. */
  freeFormItems?: FreeFormItem[]
  /** Crowd-sourced entrée suggestions from family members. */
  suggestions?: MealSuggestion[]
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// ─── Aggregate types ──────────────────────────────────────────────────────────

export interface MealHistorySummary {
  mealId: string
  date: string
  recipeIds: string[]
  recipeNames: string[]
}

export interface MealHistoryAggregate {
  /** Last 30 served meals, most recent first */
  recentMeals: MealHistorySummary[]
  updatedAt: Timestamp
}

export interface TaskCompletionRecord {
  userId: string
  userName: string
  taskDescription: string
  difficulty: TaskDifficulty
  mealId: string
  mealDate: string
  completedAt: Timestamp
}

export interface TaskHistoryAggregate {
  /** Last 50 task completions across the family */
  recentCompletions: TaskCompletionRecord[]
  updatedAt: Timestamp
}
