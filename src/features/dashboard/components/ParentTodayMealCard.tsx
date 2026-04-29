import { useState } from 'react'
import { format, parseISO, isToday } from 'date-fns'
import { UtensilsCrossed, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import mealPrepIllustration from '@/assets/illustration-meal-prep.png'
import { MealCard } from './MealCard'
import { SuggestEntreeDialog } from './SuggestEntreeDialog'
import { useCreateMeal } from '@/features/meals/hooks/useMeals'
import { useAuthStore } from '@/shared/lib/authStore'
import type { Meal } from '@/shared/types/meals'
import type { Timestamp } from 'firebase/firestore'

export interface ParentTodayMealCardProps {
  familyId: string
  userId: string
  userName: string
  meal: Meal | undefined
  date: string
  hasPrev?: boolean
  hasNext?: boolean
  onPrev?: () => void
  onNext?: () => void
}

export function ParentTodayMealCard({
  familyId,
  userId,
  userName,
  meal,
  date,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: ParentTodayMealCardProps) {
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [createdMeal, setCreatedMeal] = useState<Meal | null>(null)
  const { user } = useAuthStore()
  const createMeal = useCreateMeal(familyId)

  // Prefer the server-fetched meal; fall back to the locally constructed one
  // while the query refetches after on-the-fly creation.
  const activeMeal = meal ?? createdMeal

  function handleAddSuggestion() {
    if (!user) return
    createMeal.mutate(
      { name: 'Dinner', date, createdBy: user.uid },
      {
        onSuccess: (mealId) => {
          const newMeal: Meal = {
            mealId,
            familyId,
            name: 'Dinner',
            date,
            status: 'planned',
            servedAt: null,
            recipes: [],
            freeFormItems: [],
            suggestions: [],
            createdBy: user.uid,
            // Timestamps are not used by SuggestEntreeDialog
            createdAt: null as unknown as Timestamp,
            updatedAt: null as unknown as Timestamp,
          }
          setCreatedMeal(newMeal)
          setSuggestOpen(true)
        },
      },
    )
  }

  return (
    <>
      {activeMeal ? (
        <MealCard
          meal={activeMeal}
          userId={userId}
          userName={userName}
          familyId={familyId}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onPrev={onPrev}
          onNext={onNext}
        />
      ) : (
        <div className={`rounded-xl border p-4 space-y-3 ${isToday(parseISO(date)) ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary shrink-0" />
              <h2 className="text-xl font-semibold">{isToday(parseISO(date)) ? "Dinner" : format(parseISO(date), 'EEE, MMM d')}</h2>
            </div>
            {(hasPrev || hasNext) && (
              <div className="flex items-center gap-1">
                <button
                  onClick={onPrev}
                  disabled={!hasPrev}
                  aria-label="Previous day"
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  aria-label="Next day"
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center space-y-3 my-4">
            <img
              src={mealPrepIllustration}
              alt="Meal prep illustration"
              width={1247}
              height={848}
              className="w-full max-w-75 rounded-lg object-cover"
            />
            <div className="space-y-2 w-full">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Suggestions</p>
                <Button
                  variant="ghost"
                  onClick={handleAddSuggestion}
                  disabled={createMeal.isPending}
                  className="h-7 px-2 text-xs text-primary"
                >
                  <Lightbulb className="h-3.5 w-3.5 mr-1" />
                  Add suggestion
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">No suggestions yet</p>
            </div>
          </div>
        </div>
      )}

      {/* Opened transiently after on-the-fly meal creation, before the
          query refetches and MealCard takes full control. */}
      {createdMeal && (
        <SuggestEntreeDialog
          meal={createdMeal}
          open={suggestOpen}
          onOpenChange={setSuggestOpen}
        />
      )}
    </>
  )
}
