import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Sparkles, Archive, Globe, Lock } from 'lucide-react'
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

  const [isEditing, setIsEditing] = useState(false)
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([])
  const [editTasks, setEditTasks] = useState<PrepTask[]>([])
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)

  function startEditing() {
    if (!recipe) return
    setEditIngredients(recipe.ingredients)
    setEditTasks(recipe.prepTasks)
    setIsEditing(true)
  }

  async function saveEdits() {
    if (!recipe) return
    await updateMutation.mutateAsync({
      recipeId: recipe.recipeId,
      changes: { ingredients: editIngredients, prepTasks: editTasks },
    })
    setIsEditing(false)
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
    const startOrder = editTasks.length
    const newTasks: PrepTask[] = result.prepTasks.map((t, i) => ({
      taskId: nanoid(),
      description: t.description,
      difficulty: t.difficulty,
      order: startOrder + i,
    }))
    setEditTasks((prev) => [...prev, ...newTasks])
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
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
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
              </>
            )}
            {isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveEdits}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save'}
                </Button>
              </>
            )}
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
          Ingredients ({(isEditing ? editIngredients : recipe.ingredients).length})
        </h2>
        <RecipeIngredientEditor
          ingredients={isEditing ? editIngredients : recipe.ingredients}
          onChange={setEditIngredients}
          stores={stores}
          disabled={!isEditing}
        />
      </section>

      {/* Prep Tasks */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">
            Prep Tasks ({(isEditing ? editTasks : recipe.prepTasks).length})
          </h2>
          {isEditing && isParent && (
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
          tasks={isEditing ? editTasks : recipe.prepTasks}
          onChange={setEditTasks}
          disabled={!isEditing}
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
