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

  const hasEntree = meal.items.some((i) => i.courseType === 'entree')

  const hasSide = meal.items.some(
    (i) => i.courseType === 'side' || i.courseType === 'salad' || i.courseType === 'fruit'
  )

  const allPrepAssigned =
    meal.items.length > 0 &&
    meal.items.every((item) =>
      item.components.every((comp) =>
        comp.tasks.length === 0 || comp.tasks.every((t) => t.assigneeId !== null)
      )
    )

  // If cleanupTasks is undefined the defaults apply (all unassigned) → incomplete
  const allCleanupAssigned =
    Array.isArray(meal.cleanupTasks) &&
    meal.cleanupTasks.length > 0 &&
    meal.cleanupTasks.every((t) => t.assigneeId !== null)

  if (hasEntree && hasSide && allPrepAssigned && allCleanupAssigned) return 'planned'

  return 'incomplete'
}
