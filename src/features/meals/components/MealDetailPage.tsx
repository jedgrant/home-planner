import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Separator } from '@/shared/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import { Combobox } from '@/shared/components/Combobox'
import { useAuthStore } from '@/shared/lib/authStore'
import { useFamilyMembers } from '@/features/auth/hooks/useFamilyQueries'
import { useRecipes } from '../hooks/useRecipes'
import { useMeal, useUpdateMeal, useVoteMealSuggestion, useAcceptMealSuggestion } from '../hooks/useMeals'
import { MealSuggestionItem, SuggestEntreeDialog } from '@/features/dashboard'
import { useAIAssignTasks } from '../hooks/useMealAI'
import { MealRecipeSection } from './MealRecipeSection'
import { MealTaskRow } from './MealTaskRow'
import { CleanupDishesRow } from './CleanupDishesRow'
import { FreeFormItemRow } from './FreeFormItemRow'
import { AddEditFreeFormItemDialog } from './AddEditFreeFormItemDialog'
import { deriveMealStatus } from '../utils'
import { InlineErrorBoundary } from '@/app/SectionErrorBoundary'
import type { MealRecipe, MealTask, FreeFormItem, MealSuggestion } from '@/shared/types/meals'

const CLEANUP_TASK_DEFAULTS: MealTask[] = [
  { taskId: 'cleanup-dishes', description: 'Dishes', difficulty: 'easy', assigneeId: null, assigneeName: null, completedAt: null },
  { taskId: 'cleanup-put-away', description: 'Put away food', difficulty: 'easy', assigneeId: null, assigneeName: null, completedAt: null },
  { taskId: 'cleanup-cooktop', description: 'Clean cooktop', difficulty: 'easy', assigneeId: null, assigneeName: null, completedAt: null },
  { taskId: 'cleanup-wipe-counters', description: 'Wipe down counters', difficulty: 'easy', assigneeId: null, assigneeName: null, completedAt: null },
]

const statusVariant: Record<string, 'secondary' | 'outline' | 'default'> = {
  incomplete: 'secondary',
  planned: 'outline',
  in_progress: 'secondary',
  served: 'default',
}

const statusLabel: Record<string, string> = {
  incomplete: 'Incomplete',
  planned: 'Planned',
  in_progress: 'In Progress',
  served: 'Served',
}

export function MealDetailPage() {
  const { mealId } = useParams<{ mealId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const familyId = user?.familyId ?? ''
  const isParent = user?.role === 'parent'

  const [addRecipeOpen, setAddRecipeOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [freeFormDialogOpen, setFreeFormDialogOpen] = useState(false)
  const [editingFreeFormItem, setEditingFreeFormItem] = useState<FreeFormItem | undefined>()
  const [aiProposal, setAiProposal] = useState<ReturnType<typeof useAIAssignTasks>['data'] | null>(null)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)

  const { data: meal, isLoading } = useMeal(familyId, mealId ?? '')
  const { data: familyMembers = [] } = useFamilyMembers(familyId)
  const { data: recipes = [] } = useRecipes(familyId)
  const updateMeal = useUpdateMeal(familyId)
  const voteSuggestion = useVoteMealSuggestion(familyId)
  const acceptSuggestion = useAcceptMealSuggestion(familyId)
  const aiAssign = useAIAssignTasks()

  if (!mealId) return null

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!meal) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-muted-foreground">Meal not found.</p>
        <Button variant="outline" onClick={() => navigate('/meals')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Planner
        </Button>
      </div>
    )
  }

  // meal is guaranteed non-null from here; alias to avoid TS narrowing issues in closures
  const m = meal
  const displayStatus = deriveMealStatus(m)
  const isServed = displayStatus === 'served'
  const hasTasks = m.recipes.some((r) => r.tasks.length > 0)

  const freeFormItems: FreeFormItem[] = m.freeFormItems ?? []
  const pendingSuggestions = (m.suggestions ?? []).filter((s) => !s.accepted)
  const isSuggestionMutating = voteSuggestion.isPending || acceptSuggestion.isPending

  const hasEntree =
    m.recipes.some((r) => r.courseType === 'entree') ||
    freeFormItems.some((i) => i.courseType === 'entree')
  const hasDessert =
    m.recipes.some((r) => r.courseType === 'dessert') ||
    freeFormItems.some((i) => i.courseType === 'dessert')

  const cleanupTasks: MealTask[] = m.cleanupTasks ?? CLEANUP_TASK_DEFAULTS

  const recipeOptions = recipes
    .filter((r) => !m.recipes.some((mr) => mr.recipeId === r.recipeId))
    .filter((r) => !(r.courseType === 'entree' && hasEntree))
    .map((r) => ({ value: r.recipeId, label: r.name }))

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleAddRecipe() {
    const recipe = recipes.find((r) => r.recipeId === selectedRecipeId)
    if (!recipe) return

    const tasks: MealTask[] = recipe.prepTasks.map((pt) => ({
      taskId: pt.taskId,
      description: pt.description,
      difficulty: pt.difficulty,
      assigneeId: null,
      assigneeName: null,
      completedAt: null,
      completedBy: null,
    }))

    const newRecipe: MealRecipe = {
      recipeId: recipe.recipeId,
      recipeName: recipe.name,
      courseType: recipe.courseType,
      tasks,
    }

    updateMeal.mutate({
      mealId: m.mealId,
      updates: { recipes: [...m.recipes, newRecipe] },
    })
    setSelectedRecipeId('')
    setAddRecipeOpen(false)
  }

  function handleSaveFreeFormItem(item: FreeFormItem) {
    const existing = freeFormItems.findIndex((i) => i.itemId === item.itemId)
    const updated =
      existing >= 0
        ? freeFormItems.map((i, idx) => (idx === existing ? item : i))
        : [...freeFormItems, item]
    updateMeal.mutate({ mealId: m.mealId, updates: { freeFormItems: updated } })
  }

  function handleDeleteFreeFormItem(itemId: string) {
    const updated = freeFormItems.filter((i) => i.itemId !== itemId)
    updateMeal.mutate({ mealId: m.mealId, updates: { freeFormItems: updated } })
  }

  function handleAssignFreeFormItem(
    itemId: string,
    assigneeId: string | null,
    assigneeName: string | null
  ) {
    const updated = freeFormItems.map((i) =>
      i.itemId === itemId ? { ...i, assigneeId, assigneeName } : i
    )
    updateMeal.mutate({ mealId: m.mealId, updates: { freeFormItems: updated } })
  }

  function handleRemoveRecipe(recipeIndex: number) {
    const updated = m.recipes.filter((_, i) => i !== recipeIndex)
    updateMeal.mutate({ mealId: m.mealId, updates: { recipes: updated } })
  }

  function handleAssignTask(
    recipeIndex: number,
    taskIndex: number,
    assigneeId: string | null,
    assigneeName: string | null
  ) {
    const updated = m.recipes.map((recipe, ri) => {
      if (ri !== recipeIndex) return recipe
      return {
        ...recipe,
        tasks: recipe.tasks.map((task, ti) => {
          if (ti !== taskIndex) return task
          return { ...task, assigneeId, assigneeName }
        }),
      }
    })
    updateMeal.mutate({ mealId: m.mealId, updates: { recipes: updated } })
  }

  function handleAssignCleanupTask(
    taskIndex: number,
    assigneeId: string | null,
    assigneeName: string | null
  ) {
    const updated = cleanupTasks.map((t, i) =>
      i === taskIndex ? { ...t, assigneeId, assigneeName } : t
    )
    updateMeal.mutate({ mealId: m.mealId, updates: { cleanupTasks: updated } })
  }

  function handleDishAssignPerson(assigneeId: string, assigneeName: string) {
    // Fill first unassigned Dishes slot; if none, add a new entry
    let filled = false
    const updated = cleanupTasks.map((t) => {
      if (!filled && t.description === 'Dishes' && t.assigneeId === null) {
        filled = true
        return { ...t, assigneeId, assigneeName }
      }
      return t
    })
    if (!filled) {
      updated.push({
        taskId: `cleanup-dishes-${Date.now()}`,
        description: 'Dishes',
        difficulty: 'easy' as const,
        assigneeId,
        assigneeName,
        completedAt: null,
      })
    }
    updateMeal.mutate({ mealId: m.mealId, updates: { cleanupTasks: updated } })
  }

  function handleDishUnassignPerson(globalIndex: number) {
    const dishCount = cleanupTasks.filter((t) => t.description === 'Dishes').length
    if (dishCount <= 1) {
      // Keep the single Dishes entry but clear the assignee
      const updated = cleanupTasks.map((t, i) =>
        i === globalIndex ? { ...t, assigneeId: null, assigneeName: null } : t
      )
      updateMeal.mutate({ mealId: m.mealId, updates: { cleanupTasks: updated } })
    } else {
      const updated = cleanupTasks.filter((_, i) => i !== globalIndex)
      updateMeal.mutate({ mealId: m.mealId, updates: { cleanupTasks: updated } })
    }
  }

  function handleVote(suggestion: MealSuggestion) {
    if (!user) return
    voteSuggestion.mutate({
      meal: m,
      suggestionId: suggestion.suggestionId,
      voter: { userId: user.uid, userName: user.displayName, photoUrl: user.photoUrl },
    })
  }

  function handleAccept(suggestion: MealSuggestion) {
    acceptSuggestion.mutate({ meal: m, suggestion, allRecipes: recipes })
  }

  function handleRemoveSuggestion(suggestion: MealSuggestion) {
    const updated = (m.suggestions ?? []).filter(
      (s) => s.suggestionId !== suggestion.suggestionId,
    )
    updateMeal.mutate({ mealId: m.mealId, updates: { suggestions: updated } })
  }

  async function handleAIAssign() {
    try {
      const result = await aiAssign.mutateAsync({ familyId, mealId: m.mealId })
      if (result.assignments.length === 0) {
        toast.info('No task assignments were suggested.')
        return
      }
      setAiProposal(result)
      setAiDialogOpen(true)
    } catch {
      toast.error('Failed to get AI suggestions.')
    }
  }

  function applyAIAssignments() {
    if (!aiProposal) return
    const updated = m.recipes.map((recipe, ri) => ({
      ...recipe,
      tasks: recipe.tasks.map((task, ti) => {
        const assignment = aiProposal.assignments.find(
          (a) => a.recipeIndex === ri && a.taskIndex === ti
        )
        if (!assignment) return task
        return {
          ...task,
          assigneeId: assignment.assigneeId,
          assigneeName: assignment.assigneeName,
        }
      }),
    }))
    updateMeal.mutate({ mealId: m.mealId, updates: { recipes: updated } })
    setAiDialogOpen(false)
    setAiProposal(null)
    toast.success('Task assignments applied.')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back nav */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/meals')} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Dinner Planner
      </Button>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">{m.name}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusVariant[displayStatus] ?? 'outline'}>
              {statusLabel[displayStatus] ?? displayStatus}
            </Badge>
            {isParent && hasTasks && !isServed && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAIAssign}
                      disabled={aiAssign.isPending}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      {aiAssign.isPending ? 'Assigning…' : 'Auto-assign'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Use AI to automatically assign tasks to family members</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(m.date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
        </p>
        {isServed && m.servedAt && (
          <p className="text-xs text-muted-foreground">
            Served at {format(m.servedAt.toDate(), 'h:mm a')}
          </p>
        )}
      </div>

      {/* Suggestions section */}
      {(pendingSuggestions.length > 0 || (isParent && !hasEntree)) && (
        <>
          <Separator />
          <InlineErrorBoundary label="Suggested entrées failed to load">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Suggested entrées</h2>
                {isParent && (
                  <Button variant="outline" size="sm" className="text-primary" onClick={() => setSuggestOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add suggestion
                  </Button>
                )}
              </div>
              {pendingSuggestions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No suggestions yet. Add one to get the family voting.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingSuggestions.map((s) => (
                    <MealSuggestionItem
                      key={s.suggestionId}
                      suggestion={s}
                      currentUserId={user?.uid ?? ''}
                      isParent={isParent}
                      onVote={() => handleVote(s)}
                      onAccept={() => handleAccept(s)}
                      onRemove={() => handleRemoveSuggestion(s)}
                      isPending={isSuggestionMutating}
                    />
                  ))}
                </div>
              )}
            </div>
          </InlineErrorBoundary>
        </>
      )}

      <Separator />

      {/* Recipe sections */}
      <InlineErrorBoundary label="Dishes section failed to load">
        <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Dishes to serve</h2>
          {!isServed && isParent && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingFreeFormItem(undefined)
                  setFreeFormDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add item
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddRecipeOpen(true)}
                disabled={recipeOptions.length === 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add from recipes
              </Button>
            </div>
          )}
        </div>

        {m.recipes.length === 0 && freeFormItems.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No dishes added yet.{isParent && !isServed && ' Add a recipe or a custom item to get started.'}
          </div>
        ) : (
          <div className="space-y-3">
            {m.recipes.map((recipe, ri) => (
              <MealRecipeSection
                key={recipe.recipeId}
                recipe={recipe}
                recipeIndex={ri}
                isServed={isServed}
                isParent={isParent}
                currentUserId={user?.uid ?? ''}
                familyMembers={familyMembers}
                onRemoveRecipe={() => handleRemoveRecipe(ri)}
                onAssignTask={(ti, assigneeId, assigneeName) =>
                  handleAssignTask(ri, ti, assigneeId, assigneeName)
                }
              />
            ))}
            {freeFormItems.map((item) => (
              <FreeFormItemRow
                key={item.itemId}
                item={item}
                isServed={isServed}
                isParent={isParent}
                familyMembers={familyMembers}
                onAssign={(assigneeId, assigneeName) =>
                  handleAssignFreeFormItem(item.itemId, assigneeId, assigneeName)
                }
                onEdit={() => {
                  setEditingFreeFormItem(item)
                  setFreeFormDialogOpen(true)
                }}
                onRemove={() => handleDeleteFreeFormItem(item.itemId)}
              />
            ))}
          </div>
        )}
      </div>
      </InlineErrorBoundary>

      {/* Cleanup section */}
      <Separator />
      <InlineErrorBoundary label="Cleanup section failed to load">
        <div className="space-y-3">
        <h2 className="font-medium">Cleanup</h2>
        <div className="rounded-lg border bg-card space-y-2 p-3">
          {/* Dishes row — supports multiple assignees */}
          <CleanupDishesRow
            entries={cleanupTasks
              .map((task, i) => ({ task, globalIndex: i }))
              .filter((e) => e.task.description === 'Dishes')}
            isServed={isServed}
            isParent={isParent}
            currentUserId={user?.uid ?? ''}
            familyMembers={familyMembers}
            onAssignPerson={handleDishAssignPerson}
            onUnassignPerson={handleDishUnassignPerson}
          />
          {/* Other cleanup tasks */}
          {cleanupTasks
            .map((task, ti) => ({ task, ti }))
            .filter(({ task }) => task.description !== 'Dishes')
            .map(({ task, ti }) => (
              <MealTaskRow
                key={task.taskId}
                task={task}
                isServed={isServed}
                isParent={isParent}
                currentUserId={user?.uid ?? ''}
                familyMembers={familyMembers}
                onAssign={(assigneeId) => {
                  const member = familyMembers.find((fm) => fm.userId === assigneeId)
                  handleAssignCleanupTask(ti, assigneeId, member?.displayName ?? null)
                }}
              />
            ))}
        </div>
      </div>      </InlineErrorBoundary>
      {/* Add Recipe Dialog */}
      <Dialog open={addRecipeOpen} onOpenChange={setAddRecipeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a Recipe</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Combobox
              options={recipeOptions}
              value={selectedRecipeId}
              onChange={setSelectedRecipeId}
              placeholder="Select a recipe…"
              searchPlaceholder="Search recipes…"
              emptyText="No recipes found."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRecipeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecipe} disabled={!selectedRecipeId || updateMeal.isPending}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Free-Form Item Dialog */}
      <AddEditFreeFormItemDialog
        open={freeFormDialogOpen}
        onOpenChange={setFreeFormDialogOpen}
        existingItem={editingFreeFormItem}
        hasEntree={hasEntree}
        hasDessert={hasDessert}
        familyMembers={familyMembers}
        onSave={handleSaveFreeFormItem}
        onDelete={
          editingFreeFormItem
            ? () => handleDeleteFreeFormItem(editingFreeFormItem.itemId)
            : undefined
        }
      />

      {/* Suggest Entrée Dialog */}
      <SuggestEntreeDialog
        meal={m}
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
      />

      {/* AI Assignment Preview Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI Task Assignment Suggestions</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 max-h-80 overflow-y-auto">
            {aiProposal?.assignments.map((a, i) => (
              <div key={i} className="rounded-md border px-3 py-2 text-sm space-y-0.5">
                <div className="font-medium">{a.taskDescription}</div>
                <div className="text-muted-foreground text-xs">
                  Assign to: <span className="font-medium text-foreground">{a.assigneeName}</span>
                </div>
                {a.rationale && (
                  <div className="text-muted-foreground text-xs italic">{a.rationale}</div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyAIAssignments}>Apply All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
