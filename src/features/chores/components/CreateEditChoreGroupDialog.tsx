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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Checkbox } from '@/shared/components/ui/checkbox'
import type { ChoreGroup } from '@/shared/types/chores'
import type { UserProfile } from '@/shared/types/auth'

const schema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    assignmentType: z.enum(['fixed', 'rotation']),
    fixedAssignees: z.array(z.string()),
  })
  .refine(
    (data) => {
      if (data.assignmentType === 'fixed') return data.fixedAssignees.length > 0
      return true
    },
    { message: 'Select at least one assignee', path: ['fixedAssignees'] },
  )

type FormValues = z.infer<typeof schema>

interface CreateEditChoreGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: UserProfile[]
  existingGroup?: ChoreGroup
  onSubmit: (values: FormValues) => Promise<void>
}

export function CreateEditChoreGroupDialog({
  open,
  onOpenChange,
  members,
  existingGroup,
  onSubmit,
}: CreateEditChoreGroupDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: existingGroup
      ? {
          name: existingGroup.name,
          assignmentType: existingGroup.assignmentType,
          fixedAssignees: existingGroup.fixedAssignees,
        }
      : {
          name: '',
          assignmentType: 'rotation',
          fixedAssignees: [],
        },
  })

  const assignmentType = form.watch('assignmentType')

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existingGroup ? 'Edit Chore Group' : 'Create Chore Group'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Kitchen Cleanup" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignment Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="rotation">Rotating</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {assignmentType === 'fixed' && (
              <FormField
                control={form.control}
                name="fixedAssignees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignees</FormLabel>
                    <div className="space-y-2">
                      {members.map((m) => (
                        <label key={m.userId} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={field.value.includes(m.userId)}
                            onCheckedChange={(checked) => {
                              const next = checked
                                ? [...field.value, m.userId]
                                : field.value.filter((id) => id !== m.userId)
                              field.onChange(next)
                            }}
                          />
                          <span className="text-sm">{m.displayName}</span>
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {existingGroup ? 'Save Changes' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
