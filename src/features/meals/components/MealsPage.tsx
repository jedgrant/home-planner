import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, startOfDay, format, eachDayOfInterval } from 'date-fns'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useAuthStore } from '@/shared/lib/authStore'
import { useMeals, useCreateMeal } from '../hooks/useMeals'
import { DinnerCard } from './DinnerCard'

const PAGE_SIZE = 10
const today = startOfDay(new Date())

export function MealsPage() {
  const user = useAuthStore((s) => s.user)
  const familyId = user?.familyId ?? ''
  const isParent = user?.role === 'parent'
  const navigate = useNavigate()

  const [pageStart, setPageStart] = useState<Date>(today)

  const pageEnd = addDays(pageStart, PAGE_SIZE - 1)
  const startStr = format(pageStart, 'yyyy-MM-dd')
  const endStr = format(pageEnd, 'yyyy-MM-dd')

  const { data: meals = [], isLoading } = useMeals(familyId, startStr, endStr)
  const createMeal = useCreateMeal(familyId)
  const days = eachDayOfInterval({ start: pageStart, end: pageEnd })

  const isOnToday = pageStart.getTime() === today.getTime()

  function dinnerOnDay(date: Date) {
    const iso = format(date, 'yyyy-MM-dd')
    return meals.find((m) => m.date === iso)
  }

  async function handlePlanDinner(date: Date) {
    const mealId = await createMeal.mutateAsync({
      name: 'Dinner',
      date: format(date, 'yyyy-MM-dd'),
      createdBy: user?.uid ?? '',
    })
    navigate(`/meals/${mealId}`)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">Dinner Planner</h1>
        <p className="text-sm text-muted-foreground">
          Plan and track your family&apos;s dinners
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setPageStart((d) => addDays(d, -PAGE_SIZE))}
          aria-label="Previous 10 days"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm font-medium min-w-45 text-center">
          {format(pageStart, 'MMM d')} – {format(pageEnd, 'MMM d, yyyy')}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setPageStart((d) => addDays(d, PAGE_SIZE))}
          aria-label="Next 10 days"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {!isOnToday && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPageStart(today)}
            className="ml-1"
          >
            Today
          </Button>
        )}
      </div>

      {/* Dinner list */}
      <div className="space-y-3">
        {days.map((day) => (
          <DinnerCard
            key={day.toISOString()}
            day={day}
            meal={dinnerOnDay(day)}
            isLoading={isLoading}
            isParent={isParent}
            onPlanDinner={() => handlePlanDinner(day)}
          />
        ))}
      </div>

      {/* AI suggest placeholder banner */}
      {isParent && (
        <div className="rounded-xl border border-dashed p-4 flex items-center gap-3 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span>AI dinner suggestions will be available in the next update.</span>
        </div>
      )}
    </div>
  )
}
