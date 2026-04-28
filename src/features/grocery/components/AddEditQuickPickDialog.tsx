import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import type { QuickPickItem } from '@/shared/types/grocery'

interface AddEditQuickPickDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, defaultQuantity: string, defaultNote: string) => Promise<void>
  item?: QuickPickItem
  isPending?: boolean
}

interface FormValues {
  name: string
  defaultQuantity: string
  defaultNote: string
}

export function AddEditQuickPickDialog({
  open,
  onOpenChange,
  onSave,
  item,
  isPending = false,
}: AddEditQuickPickDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: item?.name ?? '',
      defaultQuantity: item?.defaultQuantity ?? '',
      defaultNote: item?.defaultNote ?? '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: item?.name ?? '',
        defaultQuantity: item?.defaultQuantity ?? '',
        defaultNote: item?.defaultNote ?? '',
      })
    }
  }, [open, item, reset])

  async function onSubmit(values: FormValues) {
    await onSave(
      values.name.trim(),
      values.defaultQuantity.trim(),
      values.defaultNote.trim()
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit Quick Pick Item' : 'Add Quick Pick Item'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qp-name">Name</Label>
            <Input
              id="qp-name"
              placeholder="e.g. Whole milk"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="qp-qty">Default quantity</Label>
              <Input
                id="qp-qty"
                placeholder="e.g. 1 gallon"
                {...register('defaultQuantity')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qp-note">Default note</Label>
              <Input
                id="qp-note"
                placeholder="optional"
                {...register('defaultNote')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
