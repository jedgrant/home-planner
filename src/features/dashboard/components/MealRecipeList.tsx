import { Badge } from '@/shared/components/ui/badge'
import type { Meal } from '@/shared/types/meals'

const courseLabels: Record<string, string> = {
  entree: 'Entrée',
  side: 'Side',
  salad: 'Salad',
  fruit: 'Fruit',
  dessert: 'Dessert',
}

export interface MealRecipeListProps {
  meal: Meal
}

export function MealRecipeList({ meal }: MealRecipeListProps) {
  const items = meal.items ?? []
  if (items.length === 0) return null

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.itemId} className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs shrink-0">
            {courseLabels[item.courseType] ?? item.courseType}
          </Badge>
          <span className="text-sm text-foreground">{item.name}</span>
        </div>
      ))}
    </div>
  )
}
