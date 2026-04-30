import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import type { Meal } from '@/shared/types/meals'

interface MealDayTileProps {
  date: Date
  meal: Meal | undefined
}

export function MealDayTile({ date, meal }: MealDayTileProps) {
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-1.5 min-h-24 transition-colors ${
        isToday ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {format(date, 'EEE')}
        </span>
        <span
          className={`text-xs ${isToday ? 'text-primary font-medium' : 'text-muted-foreground'}`}
        >
          {format(date, 'MMM d')}
        </span>
      </div>

      {meal ? (
        <Link to={`/meals/${meal.mealId}`} className="group flex-1 flex flex-col gap-1">
          {(meal.items ?? []).length > 0 && (
            <p className="text-sm line-clamp-1">
              {(meal.items ?? []).map((i) => i.name).join(', ')}
            </p>
          )}
          <span
            className={`mt-auto inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 w-fit ${
              meal.status === 'served'
                ? 'bg-primary/10 text-primary'
                : meal.status === 'in_progress'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {meal.status === 'served'
              ? 'Served'
              : meal.status === 'in_progress'
                ? 'In progress'
                : 'Planned'}
          </span>
        </Link>
      ) : (
        <Link
          to="/meals"
          className="flex-1 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group"
        >
          <span className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 transition-colors" />
          <span>Not planned</span>
        </Link>
      )}
    </div>
  )
}
