import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { Combobox } from '@/shared/components/Combobox'
import { COMMON_STORES } from '@/features/grocery/lib/commonStores'
import type { Store } from '@/shared/types/grocery'

interface AddEditStoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, notes: string) => Promise<void>
  store?: Store
  isPending?: boolean
}

interface FormValues {
  name: string
  notes: string
}

export function AddEditStoreDialog({
  open,
  onOpenChange,
  onSave,
  store,
  isPending = false,
}: AddEditStoreDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: store?.name ?? '', notes: store?.notes ?? '' },
  })

  useEffect(() => {
    if (open) {
      reset({ name: store?.name ?? '', notes: store?.notes ?? '' })
    }
  }, [open, store, reset])

  async function onSubmit(values: FormValues) {
    await onSave(values.name.trim(), values.notes.trim())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{store ? 'Edit Store' : 'Add Store'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-name">Store name</Label>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Store name is required' }}
              render={({ field }) => (
                <Combobox
                  options={COMMON_STORES}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Search or type a store name…"
                  searchPlaceholder="Search stores…"
                  emptyText="Type a custom store name and press Enter"
                />
              )}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="store-notes">Notes (optional)</Label>
            <Input
              id="store-notes"
              placeholder="e.g. Shop on Wednesdays"
              {...register('notes')}
            />
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
              {isPending ? 'Saving…' : store ? 'Save Changes' : 'Add Store'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
