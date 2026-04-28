import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Calendar } from '@/shared/components/ui/calendar'
import { cn } from '@/shared/lib/utils'
import type { ChoreGroup } from '@/shared/types/chores'
import type { UserProfile } from '@/shared/types/auth'

const schema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    description: z.string(),
    assignmentType: z.enum(['fixed', 'rotation']),
    fixedAssignees: z.array(z.string()),
    rotationPool: z.array(z.string()),
    rotationDurationWeeks: z.number().int().min(1),
    rotationStartDate: z.string().nullable(),
  })
  .refine(
    (data) => {
      if (data.assignmentType === 'fixed') return data.fixedAssignees.length > 0
      return true
    },
    { message: 'Select at least one assignee', path: ['fixedAssignees'] },
  )
  .refine(
    (data) => {
      if (data.assignmentType === 'rotation') return data.rotationPool.length > 0
      return true
    },
    { message: 'Select at least one member for rotation', path: ['rotationPool'] },
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
          description: existingGroup.description,
          assignmentType: existingGroup.assignmentType,
          fixedAssignees: existingGroup.fixedAssignees,
          rotationPool: existingGroup.rotationPool,
          rotationDurationWeeks: existingGroup.rotationDurationWeeks || 1,
          rotationStartDate: existingGroup.rotationStartDate,
        }
      : {
          name: '',
          description: '',
          assignmentType: 'rotation',
          fixedAssignees: [],
          rotationPool: [],
          rotationDurationWeeks: 1,
          rotationStartDate: null,
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional description" {...field} />
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

            {assignmentType === 'rotation' && (
              <>
                <FormField
                  control={form.control}
                  name="rotationPool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rotation Pool</FormLabel>
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
                <FormField
                  control={form.control}
                  name="rotationDurationWeeks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (weeks per person)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rotationStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rotation Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger
                          className={cn(
                            'flex h-8 w-full items-center justify-start gap-2 rounded-lg border border-border bg-background px-2.5 text-sm font-normal transition-colors hover:bg-muted',
                            !field.value && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="h-4 w-4" />
                          {field.value
                            ? format(new Date(field.value), 'PPP')
                            : 'Pick a date'}
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(d) =>
                              field.onChange(d ? d.toISOString().slice(0, 10) : null)
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
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
