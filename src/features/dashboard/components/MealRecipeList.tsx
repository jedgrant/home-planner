import { Badge } from '@/shared/components/ui/badge'
import { RichTextContent } from '@/shared/components/RichTextContent'
import type { Meal } from '@/shared/types/meals'

const courseLabels: Record<string, string> = {
  entree: 'Entrée',
  side: 'Side',
  salad: 'Salad',
  fruit: 'Fruit',
  dessert: 'Dessert',
  topping: 'Topping',
}

export interface MealRecipeListProps {
  meal: Meal
}

export function MealRecipeList({ meal }: MealRecipeListProps) {
  const hasRecipes = meal.recipes.length > 0
  const hasFreeForm = (meal.freeFormItems ?? []).length > 0

  if (!hasRecipes && !hasFreeForm) return null

  return (
    <div className="space-y-1.5">
      {meal.recipes.map((r) => (
        <div key={r.recipeId} className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs shrink-0">
            {courseLabels[r.courseType] ?? r.courseType}
          </Badge>
          <span className="text-sm text-foreground">{r.recipeName}</span>
        </div>
      ))}
      {(meal.freeFormItems ?? []).map((item) => (
        <div key={item.itemId} className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs shrink-0">
            {courseLabels[item.courseType] ?? item.courseType}
          </Badge>
          <RichTextContent html={item.description} className="text-sm text-foreground" />
        </div>
      ))}
    </div>
  )
}
