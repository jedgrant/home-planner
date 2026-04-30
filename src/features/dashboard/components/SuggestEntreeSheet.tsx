import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/shared/components/ui/sheet'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Separator } from '@/shared/components/ui/separator'
import { Combobox } from '@/shared/components/Combobox'
import { MealSuggestionItem } from './MealSuggestionItem'
import { useRecipes } from '@/features/meals/hooks/useRecipes'
import {
  useMealHistory,
  useAddMealSuggestion,
  useVoteMealSuggestion,
  useAcceptMealSuggestion,
} from '@/features/meals/hooks/useMeals'
import { useAuthStore } from '@/shared/lib/authStore'
import type { Meal, MealSuggestion } from '@/shared/types/meals'

export interface SuggestEntreeSheetProps {
  meal: Meal
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SuggestEntreeSheet({ meal, open, onOpenChange }: SuggestEntreeSheetProps) {
  const { user } = useAuthStore()
  const familyId = user?.familyId ?? ''
  const isParent = user?.role === 'parent'

  const [freeFormText, setFreeFormText] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState('')

  const { data: history = [] } = useMealHistory(familyId)
  const { data: allRecipes = [] } = useRecipes(familyId)
  const addSuggestion = useAddMealSuggestion(familyId)
  const voteSuggestion = useVoteMealSuggestion(familyId)
  const acceptSuggestion = useAcceptMealSuggestion(familyId)

  const recentDishes = useMemo(() => {
    const seen = new Set<string>()
    const result: { recipeId: string; recipeName: string; date: string }[] = []
    for (const m of history) {
      for (let i = 0; i < m.recipeIds.length; i++) {
        const id = m.recipeIds[i]
        if (!seen.has(id)) {
          seen.add(id)
          result.push({ recipeId: id, recipeName: m.itemNames[i], date: m.date })
          if (result.length >= 14) break
        }
      }
      if (result.length >= 14) break
    }
    return result
  }, [history])

  const recipeOptions = useMemo(
    () => allRecipes.map((r) => ({ value: r.recipeId, label: r.name })),
    [allRecipes],
  )

  const alreadySuggested = useMemo(
    () =>
      new Set(
        (meal.suggestions ?? [])
          .filter((s) => !s.accepted && s.recipeId !== null)
          .map((s) => s.recipeId as string),
      ),
    [meal.suggestions],
  )

  const pendingSuggestions = (meal.suggestions ?? []).filter((s) => !s.accepted)
  const isMutating = addSuggestion.isPending || voteSuggestion.isPending || acceptSuggestion.isPending

  function handleSuggestRecipe(recipeId: string) {
    const recipe = allRecipes.find((r) => r.recipeId === recipeId)
    if (!recipe || !user) return
    addSuggestion.mutate({
      meal,
      suggestion: {
        recipeId: recipe.recipeId,
        name: recipe.name,
        courseType: recipe.courseType,
        suggestedById: user.uid,
        suggestedByName: user.displayName,
      },
    })
    setSelectedRecipeId('')
  }

  function handleSuggestFreeForm() {
    if (!freeFormText.trim() || !user) return
    addSuggestion.mutate({
      meal,
      suggestion: {
        recipeId: null,
        name: freeFormText.trim(),
        courseType: null,
        suggestedById: user.uid,
        suggestedByName: user.displayName,
      },
    })
    setFreeFormText('')
  }

  function handleVote(suggestion: MealSuggestion) {
    if (!user) return
    voteSuggestion.mutate({
      meal,
      suggestionId: suggestion.suggestionId,
      voter: { userId: user.uid, userName: user.displayName, photoUrl: user.photoUrl },
    })
  }

  function handleAccept(suggestion: MealSuggestion) {
    acceptSuggestion.mutate({ meal, suggestion, allRecipes })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col pt-safe">
        <SheetHeader>
          <SheetTitle className="text-xl">Suggest an Entrée</SheetTitle>
          <SheetDescription>
            Add a suggestion for{' '}<span className="font-semibold text-foreground">{format(new Date(meal.date + 'T00:00:00'), 'EEEE, MMM d')}</span>. Family members can vote,
            and a parent can accept one to add it to the meal.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 px-4">
          {/* Existing suggestions */}
          {pendingSuggestions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Current suggestions</p>
              <div className="space-y-2">
                {pendingSuggestions.map((s) => (
                  <MealSuggestionItem
                    key={s.suggestionId}
                    suggestion={s}
                    currentUserId={user?.uid ?? ''}
                    isParent={isParent}
                    onVote={() => handleVote(s)}
                    onAccept={() => handleAccept(s)}
                    onRemove={() => {}}
                    isPending={isMutating}
                  />
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* Recent dishes */}
          {recentDishes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">From recent meals</p>
              <div className="flex flex-wrap gap-2">
                {recentDishes.map((e) => (
                  <button
                    key={e.recipeId}
                    disabled={alreadySuggested.has(e.recipeId) || isMutating}
                    onClick={() => handleSuggestRecipe(e.recipeId)}
                    className="flex flex-col items-start rounded-lg border border-border bg-card px-3 py-2 text-left hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="text-sm font-medium text-foreground">{e.recipeName}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(e.date + 'T00:00:00'), 'MMM d, yyyy')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recipe search */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Search recipes</p>
            <div className="flex gap-2">
              <div className="flex-1">
              <Combobox
                options={recipeOptions}
                value={selectedRecipeId}
                onChange={setSelectedRecipeId}
                placeholder="Search recipes…"
              />
              </div>
              <Button
                onClick={() => handleSuggestRecipe(selectedRecipeId)}
                disabled={!selectedRecipeId || isMutating}
                size="sm"
              >
                Suggest
              </Button>
            </div>
          </div>

          {/* Free-form */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Free-form recommendation</p>
            <div className="flex gap-2">
              <Input
                value={freeFormText}
                onChange={(e) => setFreeFormText(e.target.value)}
                placeholder="e.g. Homemade pizza"
                onKeyDown={(e) => e.key === 'Enter' && handleSuggestFreeForm()}
              />
              <Button
                onClick={handleSuggestFreeForm}
                disabled={!freeFormText.trim() || isMutating}
                size="sm"
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
