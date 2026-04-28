import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Separator } from '@/shared/components/ui/separator'
import { useAuthStore } from '@/shared/lib/authStore'
import { useStores } from '../hooks/useStores'
import { useGroceryItems } from '../hooks/useGroceryItems'
import { useGroceryItemMutations } from '../hooks/useGroceryItemMutations'
import { useItemNameHistory } from '../hooks/useItemNameHistory'
import { AddItemForm } from './AddItemForm'
import { GroceryItemRow } from './GroceryItemRow'
import { QuickPickSheet } from './QuickPickSheet'

export function StoreListPage() {
  const { storeId = '' } = useParams<{ storeId: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const familyId = user?.familyId ?? ''
  const isParent = user?.role === 'parent'

  const { data: storeList = [] } = useStores(familyId)
  const store = storeList.find((s) => s.storeId === storeId)

  const { items, isLoading } = useGroceryItems(familyId, storeId)
  const { addItem, editItem, completeItem, uncompleteItem, removeItem } =
    useGroceryItemMutations(familyId)
  const { data: nameHistory = [] } = useItemNameHistory(familyId)

  const [showCompleted, setShowCompleted] = useState(false)
  const [quickPickOpen, setQuickPickOpen] = useState(false)

  const pendingItems = items.filter((i) => !i.completed)
  const completedItems = items.filter((i) => i.completed)

  if (!familyId) return null

  async function handleAddItem(name: string, quantity: string, note: string) {
    if (!store || !user) return
    await addItem.mutateAsync({
      name,
      quantity,
      note,
      storeId,
      addedBy: user.uid,
    })
  }

  async function handleQuickPickAdd(
    pickedItems: Array<{ name: string; quantity: string; note: string }>
  ) {
    if (!store || !user) return
    await Promise.all(
      pickedItems.map((item) =>
        addItem.mutateAsync({
          ...item,
          storeId,
          addedBy: user.uid,
        })
      )
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back to stores"
          onClick={() => navigate('/grocery')}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            {store?.name ?? 'Store List'}
          </h1>
          {store?.notes && (
            <p className="text-xs text-muted-foreground">{store.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pendingItems.length > 0 && (
            <Badge variant="secondary" className="rounded-full">
              {pendingItems.length} remaining
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickPickOpen(true)}
          >
            <Zap className="mr-1.5 h-4 w-4" />
            Quick Pick
          </Button>
        </div>
      </div>

      {/* Add item form */}
      <AddItemForm
        nameHistory={nameHistory}
        onAdd={handleAddItem}
        isPending={addItem.isPending}
      />

      {/* Pending items */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm px-4">
          {pendingItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing left to buy — great work!
            </p>
          ) : (
            pendingItems.map((item) => (
              <GroceryItemRow
                key={item.itemId}
                item={item}
                isParent={isParent}
                onComplete={() => {
                  if (!store) return
                  completeItem.mutate({
                    itemId: item.itemId,
                    itemName: item.name,
                    quantity: item.quantity,
                    store,
                    completedBy: user?.uid ?? '',
                  })
                }}
                onUncomplete={() => uncompleteItem.mutate(item.itemId)}
                onEdit={(name, quantity, note) =>
                  editItem.mutateAsync({ itemId: item.itemId, name, quantity, note })
                }
                onRemove={() => removeItem.mutate(item.itemId)}
              />
            ))
          )}
        </div>
      )}

      {/* Completed items */}
      {completedItems.length > 0 && (
        <div className="bg-card rounded-xl shadow-sm px-4">
          <button
            type="button"
            className="flex w-full items-center justify-between py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowCompleted((v) => !v)}
            aria-expanded={showCompleted}
          >
            <span>Completed ({completedItems.length})</span>
            {showCompleted ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showCompleted && (
            <>
              <Separator />
              {completedItems.map((item) => (
                <GroceryItemRow
                  key={item.itemId}
                  item={item}
                  isParent={isParent}
                  onComplete={() => {}}
                  onUncomplete={() => uncompleteItem.mutate(item.itemId)}
                  onEdit={(name, quantity, note) =>
                    editItem.mutateAsync({ itemId: item.itemId, name, quantity, note })
                  }
                  onRemove={() => removeItem.mutate(item.itemId)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Quick Pick Sheet */}
      {store && (
        <QuickPickSheet
          open={quickPickOpen}
          onOpenChange={setQuickPickOpen}
          familyId={familyId}
          store={store}
          isParent={isParent}
          onAddItems={handleQuickPickAdd}
        />
      )}
    </div>
  )
}
