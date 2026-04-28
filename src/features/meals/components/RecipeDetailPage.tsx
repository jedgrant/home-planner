import { useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Sparkles, Archive, Globe, Lock, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { RecipeIngredientEditor } from './RecipeIngredientEditor'
import { RecipePrepTaskEditor } from './RecipePrepTaskEditor'
import {
  useRecipe,
  useGlobalRecipe,
  useUpdateRecipe,
  useArchiveRecipe,
  useSetRecipeVisibility,
} from '../hooks/useRecipes'
import { useAISuggestTasks } from '../hooks/useRecipeAI'
import { useStores } from '@/features/grocery/hooks/useStores'
import { useAuthStore } from '@/shared/lib/authStore'
import { nanoid } from 'nanoid'
import type { Ingredient, PrepTask, CourseType } from '@/shared/types/recipes'

const courseLabels: Record<CourseType, string> = {
  entree: 'Entrée',
  side: 'Side',
  salad: 'Salad',
  fruit: 'Fruit',
  dessert: 'Dessert',
}

export function RecipeDetailPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const isGlobalView = searchParams.get('source') === 'global'
  const navigate = useNavigate()

  const user = useAuthStore((s) => s.user)
  const familyId = user?.familyId ?? ''
  const isParent = user?.role === 'parent'

  const familyQuery = useRecipe(familyId, id)
  const globalQuery = useGlobalRecipe(isGlobalView ? id : '')

  const recipe = isGlobalView ? globalQuery.data : familyQuery.data
  const isLoading = isGlobalView ? globalQuery.isLoading : familyQuery.isLoading

  const updateMutation = useUpdateRecipe(familyId)
  const archiveMutation = useArchiveRecipe(familyId)
  const visibilityMutation = useSetRecipeVisibility(familyId)
  const aiSuggestTasks = useAISuggestTasks()

  const { data: stores = [] } = useStores(familyId)

  const [ingredients, setIngredients] = useState<Ingredient[]>([]) // seeded from recipe below
  const [tasks, setTasks] = useState<PrepTask[]>([])
  const [seeded, setSeeded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)

  // Seed local state once the recipe loads
  if (recipe && !seeded) {
    setIngredients(recipe.ingredients)
    setTasks(recipe.prepTasks)
    setSeeded(true)
  }

  const saveToFirestore = useCallback(
    async (nextIngredients: Ingredient[], nextTasks: PrepTask[]) => {
      if (!recipe) return
      setSaveStatus('saving')
      try {
        await updateMutation.mutateAsync({
          recipeId: recipe.recipeId,
          changes: { ingredients: nextIngredients, prepTasks: nextTasks },
        })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('idle')
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipe?.recipeId, familyId],
  )

  function handleIngredientsChange(next: Ingredient[]) {
    setIngredients(next)
    void saveToFirestore(next, tasks)
  }

  function handleTasksChange(next: PrepTask[]) {
    setTasks(next)
  }

  function handleTasksSave(next: PrepTask[]) {
    setTasks(next)
    void saveToFirestore(ingredients, next)
  }

  async function handleAISuggestTasks() {
    if (!recipe) return
    const result = await aiSuggestTasks.mutateAsync({
      recipeName: recipe.name,
      ingredients: recipe.ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity,
      })),
      notes: recipe.description,
    })
    const startOrder = tasks.length
    const newTasks: PrepTask[] = result.prepTasks.map((t, i) => ({
      taskId: nanoid(),
      description: t.description,
      difficulty: t.difficulty,
      order: startOrder + i,
    }))
    const next = [...tasks, ...newTasks]
    setTasks(next)
    void saveToFirestore(ingredients, next)
  }

  async function handleArchive() {
    if (!recipe) return
    await archiveMutation.mutateAsync(recipe.recipeId)
    navigate('/meals/recipes')
  }

  async function handleToggleVisibility() {
    if (!recipe) return
    await visibilityMutation.mutateAsync({
      recipeId: recipe.recipeId,
      visibility: recipe.visibility === 'global' ? 'private' : 'global',
    })
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Recipe not found.</p>
        <Button variant="ghost" onClick={() => navigate('/meals/recipes')} className="mt-3">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/meals/recipes')}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{recipe.name}</h1>
            <Badge variant="secondary">{courseLabels[recipe.courseType]}</Badge>
            {recipe.visibility === 'global' && (
              <Badge variant="outline" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                Global
              </Badge>
            )}
          </div>
          {recipe.servingSize > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Serves {recipe.servingSize}
            </p>
          )}
        </div>

        {isParent && !isGlobalView && (
          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Saved
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleVisibility}
              disabled={visibilityMutation.isPending}
            >
              {recipe.visibility === 'global' ? (
                <>
                  <Lock className="h-4 w-4 mr-1" />
                  Make Private
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-1" />
                  Share Globally
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setShowArchiveDialog(true)}
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
          </div>
        )}
      </div>

      {/* Description */}
      {recipe.description && (
        <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">
          {recipe.description}
        </p>
      )}

      {/* Ingredients */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-foreground mb-2">
          Ingredients ({ingredients.length})
        </h2>
        <RecipeIngredientEditor
          ingredients={ingredients}
          onChange={handleIngredientsChange}
          stores={stores}
          disabled={!isParent || isGlobalView}
        />
      </section>

      {/* Prep Tasks */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">
            Prep Tasks ({tasks.length})
          </h2>
          {isParent && !isGlobalView && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={aiSuggestTasks.isPending}
              onClick={handleAISuggestTasks}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {aiSuggestTasks.isPending ? 'Asking AI…' : 'Suggest Tasks'}
            </Button>
          )}
        </div>
        <RecipePrepTaskEditor
          tasks={tasks}
          onChange={handleTasksChange}
          onSave={handleTasksSave}
          disabled={!isParent || isGlobalView}
        />
      </section>

      {/* Archive confirm */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              "{recipe.name}" will be archived and hidden from the recipe book.
              Past meal references are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
