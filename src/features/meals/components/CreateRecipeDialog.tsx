import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { useCreateRecipe } from '../hooks/useRecipes'
import { useAISuggestRecipe } from '../hooks/useRecipeAI'
import { useAuthStore } from '@/shared/lib/authStore'
import { nanoid } from 'nanoid'
import type { CourseType } from '@/shared/types/recipes'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  courseType: z.enum(['entree', 'side', 'salad', 'fruit', 'dessert']),
  description: z.string(),
  servingSize: z.number().int().positive().optional(),
})

type FormValues = z.infer<typeof schema>

interface CreateRecipeDialogProps {
  open: boolean
  onClose: () => void
  familyId: string
  onCreated: (recipeId: string) => void
}

export function CreateRecipeDialog({
  open,
  onClose,
  familyId,
  onCreated,
}: CreateRecipeDialogProps) {
  const user = useAuthStore((s) => s.user)
  const createMutation = useCreateRecipe(familyId)
  const aiSuggest = useAISuggestRecipe()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      courseType: 'entree',
      description: '',
      servingSize: undefined,
    },
  })

  async function handleAISuggest() {
    const name = form.getValues('name')
    if (!name.trim()) return
    try {
      const result = await aiSuggest.mutateAsync({ recipeName: name })
      form.setValue('description', result.description)
      form.setValue('servingSize', result.servingSize)
      // ingredients + tasks returned but handled on detail page after save
    } catch {
      // silently fail; user can still fill manually
    }
  }

  async function onSubmit(values: FormValues) {
    const ingredientsFromAI =
      aiSuggest.data?.ingredients.map((ing) => ({
        ingredientId: nanoid(),
        name: ing.name,
        quantity: ing.quantity,
        unit: null,
        storeId: null,
        storeName: null,
      })) ?? []

    const tasksFromAI =
      aiSuggest.data?.prepTasks.map((t, i) => ({
        taskId: nanoid(),
        description: t.description,
        order: t.order ?? i,
      })) ?? []

    const id = await createMutation.mutateAsync({
      familyId,
      name: values.name,
      courseType: values.courseType as CourseType,
      description: values.description,
      servingSize: values.servingSize ?? 0,
      visibility: 'private',
      sourceGlobalRecipeId: null,
      components: (ingredientsFromAI.length > 0 || tasksFromAI.length > 0)
        ? [{ componentId: nanoid(), name: values.name, ingredients: ingredientsFromAI, tasks: tasksFromAI }]
        : [],
      archived: false,
      createdBy: user?.uid ?? '',
    })
    form.reset()
    aiSuggest.reset()
    onCreated(id)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Recipe</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipe Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Chicken Alfredo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="courseType"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Course</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="entree">Entrée</SelectItem>
                        <SelectItem value="side">Side</SelectItem>
                        <SelectItem value="salad">Salad</SelectItem>
                        <SelectItem value="fruit">Fruit</SelectItem>
                        <SelectItem value="dessert">Dessert</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="servingSize"
                render={({ field }) => (
                  <FormItem className="w-28">
                    <FormLabel>Serves</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="4"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? e.target.valueAsNumber : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes / Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Cooking tips, summary…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!form.watch('name') || aiSuggest.isPending}
              onClick={handleAISuggest}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {aiSuggest.isPending
                ? 'Asking AI…'
                : aiSuggest.data
                  ? 'AI Suggestion Applied'
                  : 'AI Suggest Recipe'}
            </Button>

            {aiSuggest.data && (
              <p className="text-xs text-muted-foreground">
                AI populated description
                {aiSuggest.data.ingredients.length
                  ? `, ${aiSuggest.data.ingredients.length} ingredients, and ${aiSuggest.data.prepTasks.length} tasks`
                  : ''}
                . You can edit everything on the detail page.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating…' : 'Create Recipe'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
