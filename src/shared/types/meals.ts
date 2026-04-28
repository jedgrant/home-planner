import type { Timestamp } from 'firebase/firestore'
import type { CourseType, TaskDifficulty } from './recipes'

export type MealStatus = 'planned' | 'in_progress' | 'served'

export interface MealTask {
  taskId: string
  description: string
  difficulty: TaskDifficulty
  assigneeId: string | null
  assigneeName: string | null
  completedAt: Timestamp | null
  completedBy: string | null
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
