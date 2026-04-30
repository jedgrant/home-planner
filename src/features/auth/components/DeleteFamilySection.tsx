import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
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
import { deleteFamily } from '@/features/auth/familyFunctions'

interface DeleteFamilySectionProps {
  familyId: string
  familyName: string
  onDeleted: () => void
}

export function DeleteFamilySection({
  familyId,
  familyName,
  onDeleted,
}: DeleteFamilySectionProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirm() {
    setIsDeleting(true)
    try {
      await deleteFamily(familyId)
      toast.success('Family deleted.')
      onDeleted()
    } catch (err) {
      console.error('Failed to delete family:', err)
      toast.error('Failed to delete family. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Delete &ldquo;{familyName}&rdquo;</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently deletes the family and all associated data — chores, recipes, meal plans,
              and shopping lists. All members will be removed from the family. This cannot be undone.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" size="sm" className="shrink-0" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &ldquo;{familyName}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the family and all associated data including chores,
                  recipes, meal plans, and shopping lists. All family members will be removed from
                  the family. <strong>This cannot be undone.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirm}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting…' : 'Delete family'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </section>
  )
}
