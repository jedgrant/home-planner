import type { Timestamp } from 'firebase/firestore'

export type CourseType = 'entree' | 'side' | 'salad' | 'fruit' | 'dessert'

export type TaskDifficulty = 'easy' | 'medium' | 'hard'

export type RecipeVisibility = 'private' | 'global'

export interface Ingredient {
  ingredientId: string
  name: string
  quantity: string
  storeId: string | null
  storeName: string | null
}

export interface PrepTask {
  taskId: string
  description: string
  difficulty: TaskDifficulty
  order: number
}

export interface Recipe {
  recipeId: string
  /** null when stored in globalRecipes collection */
  familyId: string | null
  name: string
  courseType: CourseType
  description: string
  servingSize: number
  visibility: RecipeVisibility
  /** set when recipe was copied from a global recipe */
  sourceGlobalRecipeId: string | null
  ingredients: Ingredient[]
  prepTasks: PrepTask[]
  archived: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
