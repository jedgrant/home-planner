import type { Timestamp } from 'firebase/firestore'
import type { CourseType, Ingredient, TaskDifficulty } from './recipes'

export type MealStatus = 'incomplete' | 'planned' | 'in_progress' | 'served'

export interface MealTask {
  taskId: string
  description: string
  difficulty?: TaskDifficulty
  assigneeId: string | null
  assigneeName: string | null
  completedAt: Timestamp | null
}

/**
 * A named component within a MealItem at execution time (e.g. "Chicken", "Pico").
 * Mirrors RecipeComponent but tasks carry assignee fields.
 */
export interface MealComponent {
  componentId: string
  name: string
  notes?: string
  /** Assignee for the whole component — only used when tasks is empty */
  assigneeId?: string | null
  assigneeName?: string | null
  ingredients: Ingredient[]
  tasks: MealTask[]
}

/**
 * A single dish/item within a planned meal.
 * May be linked to a saved recipe (recipeId set) or free-form (recipeId null).
 */
export interface MealItem {
  itemId: string
  courseType: CourseType
  name: string
  /** Linked recipe ID, or null if free-form */
  recipeId: string | null
  /** Optional top-level notes for the item */
  notes?: string
  components: MealComponent[]
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

export interface Meal {
  mealId: string
  familyId: string
  name: string
  /** ISO date string e.g. "2026-04-27" */
  date: string
  status: MealStatus
  servedAt: Timestamp | null
  items: MealItem[]
  /** Fixed cleanup tasks (Dishes, Put away food, Wipe down counters). Stored when first assigned. */
  cleanupTasks?: MealTask[]
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
  /** Names of all MealItems served in this meal */
  itemNames: string[]
  /** recipeIds of linked items (may be empty for free-form items) */
  recipeIds: string[]
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
