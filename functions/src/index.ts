import { initializeApp } from 'firebase-admin/app'

initializeApp()

export { suggestRecipe } from './ai/suggestRecipe'
export { suggestTasks } from './ai/suggestTasks'
export { parseRecipeFromContent } from './ai/parseRecipeFromContent'
export { suggestMeal } from './ai/suggestMeal'
export { suggestMeals } from './ai/suggestMeals'
export { assignTasks } from './ai/assignTasks'
export { deleteFamily } from './family/deleteFamily'
