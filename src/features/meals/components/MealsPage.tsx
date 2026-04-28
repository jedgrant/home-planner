import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  eachDayOfInterval,
  isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Badge } from '@/shared/components/ui/badge'
import { useAuthStore } from '@/shared/lib/authStore'
import { useMeals } from '../hooks/useMeals'
import { CreateMealDialog } from './CreateMealDialog'
import type { Meal } from '@/shared/types/meals'

const statusVariant: Record<string, 'secondary' | 'outline' | 'default'> = {
  planned: 'outline',
  in_progress: 'secondary',
  served: 'default',
}

const statusLabel: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  served: 'Served',
}

export function MealsPage() {
  const user = useAuthStore((s) => s.user)
  const familyId = user?.familyId ?? ''
  const isParent = user?.role === 'parent'
  const navigate = useNavigate()

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | undefined>()

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })
  const startStr = format(weekStart, 'yyyy-MM-dd')
  const endStr = format(weekEnd, 'yyyy-MM-dd')

  const { data: meals = [], isLoading } = useMeals(familyId, startStr, endStr)
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  function mealsOnDay(date: Date): Meal[] {
    const iso = format(date, 'yyyy-MM-dd')
    return meals.filter((m) => m.date === iso)
  }

  function handleAddMeal(date: Date) {
    setSelectedDate(format(date, 'yyyy-MM-dd'))
    setDialogOpen(true)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Meal Planner</h1>
          <p className="text-sm text-muted-foreground">
            Plan and track your family&apos;s meals
          </p>
        </div>

        {isParent && (
          <Button onClick={() => { setSelectedDate(undefined); setDialogOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" />
            New Meal
          </Button>
        )}
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm font-medium min-w-[180px] text-center">
          {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
          className="ml-1"
        >
          Today
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayMeals = mealsOnDay(day)
          const isCurrentDay = isToday(day)

          return (
            <div key={day.toISOString()} className="flex flex-col gap-1">
              {/* Day header */}
              <div
                className={`text-center py-1 rounded-md text-xs font-medium ${
                  isCurrentDay
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                <div>{format(day, 'EEE')}</div>
                <div className="text-base">{format(day, 'd')}</div>
              </div>

              {/* Meal cards */}
              <div className="flex flex-col gap-1 min-h-[120px]">
                {isLoading ? (
                  <Skeleton className="h-16 w-full rounded-md" />
                ) : (
                  <>
                    {dayMeals.map((meal) => (
                      <Card
                        key={meal.mealId}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => navigate(`/meals/${meal.mealId}`)}
                      >
                        <CardContent className="p-2 space-y-1">
                          <p className="text-xs font-medium leading-tight line-clamp-2">
                            {meal.name}
                          </p>
                          <Badge
                            variant={statusVariant[meal.status] ?? 'outline'}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {statusLabel[meal.status] ?? meal.status}
                          </Badge>
                          {meal.recipes.length > 0 && (
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              {meal.recipes.map((r) => r.recipeName).join(', ')}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {isParent && (
                      <button
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-accent/30 transition-colors w-fit"
                        onClick={() => handleAddMeal(day)}
                        aria-label={`Add meal on ${format(day, 'EEEE, MMM d')}`}
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* AI suggest placeholder banner */}
      {isParent && (
        <div className="rounded-lg border border-dashed p-4 flex items-center gap-3 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span>AI meal suggestions will be available in the next update.</span>
        </div>
      )}

      <CreateMealDialog
        familyId={familyId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialDate={selectedDate}
        onCreated={(mealId) => navigate(`/meals/${mealId}`)}
      />
    </div>
  )
}
