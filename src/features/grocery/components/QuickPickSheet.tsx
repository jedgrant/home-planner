import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Check } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Separator } from '@/shared/components/ui/separator'
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
import { useQuickPickItems } from '../hooks/useQuickPickItems'
import { useQuickPickMutations } from '../hooks/useQuickPickMutations'
import { AddEditQuickPickDialog } from './AddEditQuickPickDialog'
import type { Store, QuickPickItem } from '@/shared/types/grocery'

interface QuickPickSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  familyId: string
  store: Store
  isParent: boolean
  onAddItems: (
    items: Array<{ name: string; quantity: string; note: string }>
  ) => Promise<void>
}

export function QuickPickSheet({
  open,
  onOpenChange,
  familyId,
  store,
  isParent,
  onAddItems,
}: QuickPickSheetProps) {
  const { data: quickPickList = [], isLoading } = useQuickPickItems(
    familyId,
    store.storeId
  )
  const { addQuickPickItem, editQuickPickItem, removeQuickPickItem } =
    useQuickPickMutations(familyId, store.storeId)

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<QuickPickItem | null>(null)
  const [deleteItem, setDeleteItem] = useState<QuickPickItem | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return quickPickList
    const lower = search.toLowerCase()
    return quickPickList.filter((item) =>
      item.name.toLowerCase().includes(lower)
    )
  }, [quickPickList, search])

  function toggleSelected(itemId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  async function handleAddSelected() {
    const pickedItems = quickPickList
      .filter((item) => selected.has(item.itemId))
      .map((item) => ({
        name: item.name,
        quantity: item.defaultQuantity,
        note: item.defaultNote,
      }))

    setIsAdding(true)
    try {
      await onAddItems(pickedItems)
      setSelected(new Set())
      onOpenChange(false)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader className="shrink-0">
            <SheetTitle>Quick Pick — {store.name}</SheetTitle>
          </SheetHeader>

          <div className="flex items-center gap-2 mt-3 shrink-0">
            <Input
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            {isParent && (
              <Button
                variant="outline"
                size="icon"
                aria-label="Add quick pick item"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Separator className="my-3 shrink-0" />

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search ? 'No items match your search.' : 'No quick pick items yet.'}
              </p>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.itemId}
                  className="flex items-center gap-3 py-3 border-b last:border-0"
                >
                  <Checkbox
                    id={`qp-${item.itemId}`}
                    checked={selected.has(item.itemId)}
                    onCheckedChange={() => toggleSelected(item.itemId)}
                    aria-label={`Select ${item.name}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.name}
                      {item.defaultQuantity && (
                        <span className="ml-1.5 text-muted-foreground font-normal">
                          · {item.defaultQuantity}
                        </span>
                      )}
                    </p>
                    {item.defaultNote && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.defaultNote}
                      </p>
                    )}
                  </div>
                  {isParent && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => setEditItem(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Remove ${item.name}`}
                        onClick={() => setDeleteItem(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer actions */}
          <div className="shrink-0 pt-3 border-t space-y-2">
            {selected.size > 0 && (
              <Button
                className="w-full"
                onClick={handleAddSelected}
                disabled={isAdding}
              >
                <Check className="mr-2 h-4 w-4" />
                {isAdding
                  ? 'Adding…'
                  : `Add ${selected.size} item${selected.size !== 1 ? 's' : ''} to List`}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add / Edit dialogs */}
      <AddEditQuickPickDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={(name, defaultQuantity, defaultNote) =>
          addQuickPickItem.mutateAsync({
            name,
            defaultQuantity,
            defaultNote,
            storeId: store.storeId,
          })
        }
        isPending={addQuickPickItem.isPending}
      />

      {editItem && (
        <AddEditQuickPickDialog
          open={Boolean(editItem)}
          onOpenChange={(open) => !open && setEditItem(null)}
          onSave={(name, defaultQuantity, defaultNote) =>
            editQuickPickItem.mutateAsync({
              itemId: editItem.itemId,
              name,
              defaultQuantity,
              defaultNote,
            })
          }
          item={editItem}
          isPending={editQuickPickItem.isPending}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(deleteItem)}
        onOpenChange={(open) => !open && setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{deleteItem?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the item from your Quick Pick list for {store.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteItem) {
                  await removeQuickPickItem.mutateAsync(deleteItem.itemId)
                  setDeleteItem(null)
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
