import { format, isToday } from 'date-fns'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { Meal } from '@/shared/types/meals'

const STATUS_VARIANT: Record<string, 'secondary' | 'outline' | 'default'> = {
  planned: 'outline',
  in_progress: 'secondary',
  served: 'default',
}

const STATUS_LABEL: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  served: 'Served',
}

interface DinnerCardProps {
  day: Date
  meal: Meal | undefined
  isLoading: boolean
  isParent: boolean
  onPlanDinner: () => void
}

export function DinnerCard({ day, meal, isLoading, isParent, onPlanDinner }: DinnerCardProps) {
  const navigate = useNavigate()
  const isCurrentDay = isToday(day)

  const dayLabel = (
    <div className={`w-12 shrink-0 text-center ${isCurrentDay ? 'text-primary' : 'text-muted-foreground'}`}>
      <div className="text-xs font-medium uppercase tracking-wide">{format(day, 'EEE')}</div>
      <div className={`text-2xl font-bold leading-tight ${isCurrentDay ? 'text-primary' : 'text-foreground'}`}>
        {format(day, 'd')}
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        {dayLabel}
        <Skeleton className="h-15 flex-1 rounded-xl" />
      </div>
    )
  }

  if (!meal) {
    return (
      <div className="flex items-center gap-4">
        {dayLabel}
        <div
          className={`flex-1 rounded-xl border border-dashed p-4 flex items-center justify-between text-muted-foreground transition-colors ${isParent ? 'cursor-pointer hover:bg-muted hover:border-border hover:text-foreground' : ''}`}
          onClick={isParent ? onPlanDinner : undefined}
          role={isParent ? 'button' : undefined}
          tabIndex={isParent ? 0 : undefined}
          onKeyDown={isParent ? (e) => { if (e.key === 'Enter' || e.key === ' ') onPlanDinner() } : undefined}
          aria-label={isParent ? `Plan dinner for ${format(day, 'EEEE, MMMM d')}` : undefined}
        >
          <span className="text-sm">No dinner planned</span>
          {isParent && (
            <Plus className="h-3.5 w-3.5 shrink-0" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      {dayLabel}
      <Card
        className="flex-1 cursor-pointer hover:bg-muted transition-colors"
        onClick={() => navigate(`/meals/${meal.mealId}`)}
        role="button"
        aria-label={`View dinner on ${format(day, 'EEEE, MMMM d')}: ${meal.name}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') navigate(`/meals/${meal.mealId}`)
        }}
      >
        <CardContent className="px-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm leading-snug truncate">{meal.name}</p>
            {meal.recipes.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {meal.recipes.map((r) => r.recipeName).join(' · ')}
              </p>
            )}
          </div>
          <Badge
            variant={STATUS_VARIANT[meal.status] ?? 'outline'}
            className="shrink-0 rounded-full"
          >
            {STATUS_LABEL[meal.status] ?? meal.status}
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
