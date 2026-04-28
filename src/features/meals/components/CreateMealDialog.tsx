import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { useCreateMeal } from '../hooks/useMeals'
import { useAuthStore } from '@/shared/lib/authStore'

const schema = z.object({
  name: z.string().min(1, 'Meal name is required').max(80),
  date: z.string().min(1, 'Date is required'),
})

type FormValues = z.infer<typeof schema>

export interface CreateMealDialogProps {
  familyId: string
  open: boolean
  onClose: () => void
  /** Pre-populated date in yyyy-MM-dd format */
  initialDate?: string
  onCreated?: (mealId: string) => void
}

export function CreateMealDialog({
  familyId,
  open,
  onClose,
  initialDate,
  onCreated,
}: CreateMealDialogProps) {
  const user = useAuthStore((s) => s.user)
  const createMeal = useCreateMeal(familyId)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      name: '',
      date: initialDate ?? format(new Date(), 'yyyy-MM-dd'),
    },
  })

  // Sync date field when initialDate prop changes
  useEffect(() => {
    if (initialDate && !form.formState.isDirty) {
      form.setValue('date', initialDate)
    }
  }, [initialDate, form])

  async function onSubmit(values: FormValues) {
    if (!user) return
    const mealId = await createMeal.mutateAsync({
      name: values.name,
      date: values.date,
      createdBy: user.uid,
    })
    form.reset()
    onClose()
    onCreated?.(mealId)
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      form.reset()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Meal</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sunday Dinner" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMeal.isPending}>
                {createMeal.isPending ? 'Creating…' : 'Create Meal'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
