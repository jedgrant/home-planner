import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Plus, Sparkles, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Separator } from '@/shared/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog'
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
import { useMeal, useUpdateMeal, useMarkServed, useCompleteTask } from '../hooks/useMeals'
import { useAIAssignTasks } from '../hooks/useMealAI'
import { MealRecipeSection } from './MealRecipeSection'
import type { MealRecipe, MealTask } from '@/shared/types/meals'

const CLEANUP_TASKS = ['Dishes', 'Put away food', 'Wipe down counters']

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

export function MealDetailPage() {
  const { mealId } = useParams<{ mealId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const familyId = user?.familyId ?? ''
  const isParent = user?.role === 'parent'

  const [addRecipeOpen, setAddRecipeOpen] = useState(false)
  const [selectedRecipeId, setSelectedRecipeId] = useState('')
  const [aiProposal, setAiProposal] = useState<ReturnType<typeof useAIAssignTasks>['data'] | null>(null)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)

  const { data: meal, isLoading } = useMeal(familyId, mealId ?? '')
  const { data: familyMembers = [] } = useFamilyMembers(familyId)
  const { data: recipes = [] } = useRecipes(familyId)
  const updateMeal = useUpdateMeal(familyId)
  const markServed = useMarkServed(familyId)
  const completeTask = useCompleteTask(familyId)
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
  const isServed = m.status === 'served'
  const allTasksComplete = m.recipes.every((r) =>
    r.tasks.length === 0 || r.tasks.every((t) => t.completedAt !== null)
  )
  const hasTasks = m.recipes.some((r) => r.tasks.length > 0)

  const childMembers = familyMembers.filter((member) => member.role === 'child')
  const assignedMemberIds = new Set(
    m.recipes.flatMap((r) => r.tasks.map((t) => t.assigneeId)).filter(Boolean) as string[]
  )

  const recipeOptions = recipes
    .filter((r) => !m.recipes.some((mr) => mr.recipeId === r.recipeId))
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

  function handleCompleteTask(recipeIndex: number, taskIndex: number, completed: boolean) {
    if (!completed) return
    if (!user) return
    completeTask.mutate({
      meal: m,
      recipeIndex,
      taskIndex,
      completedBy: user.uid,
    })
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

  async function handleMarkServed() {
    try {
      await markServed.mutateAsync(m)
      toast.success('Meal marked as served!')
    } catch {
      toast.error('Failed to mark meal as served.')
    }
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
          <Badge variant={statusVariant[m.status] ?? 'outline'}>
            {statusLabel[m.status] ?? m.status}
          </Badge>
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

      <Separator />

      {/* Recipe sections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Recipes</h2>
          {!isServed && isParent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddRecipeOpen(true)}
              disabled={recipeOptions.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Recipe
            </Button>
          )}
        </div>

        {m.recipes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No recipes added yet.{isParent && !isServed && ' Add a recipe to get started.'}
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
                onCompleteTask={(ti, completed) => handleCompleteTask(ri, ti, completed)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cleanup section */}
      {childMembers.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="font-medium">Cleanup</h2>
            <div className="space-y-2">
              {childMembers.map((child) => {
                const hasMealTask = assignedMemberIds.has(child.userId)
                return (
                  <div key={child.userId} className="rounded-xl border p-4 space-y-2">
                    <p className="text-sm font-medium">{child.displayName}</p>
                    {hasMealTask ? (
                      <p className="text-xs text-muted-foreground">
                        Assigned to meal prep — no cleanup tasks.
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {CLEANUP_TASKS.map((task) => (
                          <li
                            key={task}
                            className="text-xs text-muted-foreground flex items-center gap-2"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                            {task}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      {!isServed && (        <div className="flex flex-wrap gap-2">
          {isParent && hasTasks && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAIAssign}
              disabled={aiAssign.isPending}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {aiAssign.isPending ? 'Getting suggestions…' : 'AI Assign Tasks'}
            </Button>
          )}

          {isParent && allTasksComplete && m.recipes.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger>
                <Button size="sm" disabled={markServed.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {markServed.isPending ? 'Saving…' : 'Mark as Served'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mark meal as served?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will record &ldquo;{m.name}&rdquo; as served and update the meal
                    history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMarkServed}>Mark as Served</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

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
