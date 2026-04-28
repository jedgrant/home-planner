import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { ChoreItem } from '@/shared/types/chores'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string(),
})

type FormValues = z.infer<typeof schema>

interface AddEditChoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingChore?: ChoreItem
  onSubmit: (values: FormValues) => Promise<void>
}

export function AddEditChoreDialog({
  open,
  onOpenChange,
  existingChore,
  onSubmit,
}: AddEditChoreDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: existingChore
      ? { name: existingChore.name, description: existingChore.description }
      : { name: '', description: '' },
  })

  async function handleSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      await onSubmit(values)
      onOpenChange(false)
      form.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{existingChore ? 'Edit Chore' : 'Add Chore'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chore Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sweep floor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional details" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {existingChore ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
