import type { Meal, MealStatus } from '@/shared/types/meals'

/**
 * Derives the display status of a meal from its data.
 *
 * - 'served'     — already recorded as served (stored in Firestore)
 * - 'planned'    — has ≥1 entree, ≥1 side/topping, all prep tasks assigned, all cleanup tasks assigned
 * - 'incomplete' — any of the above conditions are not yet met
 */
export function deriveMealStatus(meal: Meal): MealStatus {
  if (meal.status === 'served') return 'served'

  const freeForm = meal.freeFormItems ?? []

  const hasEntree =
    meal.recipes.some((r) => r.courseType === 'entree') ||
    freeForm.some((i) => i.courseType === 'entree')

  const hasSide =
    meal.recipes.some(
      (r) => r.courseType === 'side' || r.courseType === 'salad' || r.courseType === 'fruit'
    ) || freeForm.some((i) => i.courseType === 'side' || i.courseType === 'topping')

  const allPrepAssigned =
    meal.recipes.length > 0 &&
    meal.recipes.every((r) => r.tasks.every((t) => t.assigneeId !== null))

  // If cleanupTasks is undefined the defaults apply (all unassigned) → incomplete
  const allCleanupAssigned =
    Array.isArray(meal.cleanupTasks) &&
    meal.cleanupTasks.length > 0 &&
    meal.cleanupTasks.every((t) => t.assigneeId !== null)

  if (hasEntree && hasSide && allPrepAssigned && allCleanupAssigned) return 'planned'

  return 'incomplete'
}
