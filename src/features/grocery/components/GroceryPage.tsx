import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useAuthStore } from '@/shared/lib/authStore'
import { useStores } from '../hooks/useStores'
import { useStoreMutations } from '../hooks/useStoreMutations'
import { useAllGroceryItems } from '../hooks/useAllGroceryItems'
import { useGroceryItemMutations } from '../hooks/useGroceryItemMutations'
import { StoreCard } from './StoreCard'
import { AddEditStoreDialog } from './AddEditStoreDialog'
import type { GroceryItem } from '@/shared/types/grocery'

export function GroceryPage() {
  const user = useAuthStore((s) => s.user)
  const familyId = user?.familyId ?? ''
  const isParent = user?.role === 'parent'

  const { data: storeList = [], isLoading } = useStores(familyId)
  const { addStore, editStore, archiveStore } = useStoreMutations(familyId)
  const { items: allItems } = useAllGroceryItems(familyId)
  const { moveItem } = useGroceryItemMutations(familyId)

  const [addOpen, setAddOpen] = useState(false)

  // ── Per-store ordered item id lists ──────────────────────────────────────────
  const [itemOrder, setItemOrder] = useState<Record<string, string[]>>({})
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [dragOriginStore, setDragOriginStore] = useState<string | null>(null)
  const [preDragOrder, setPreDragOrder] = useState<Record<string, string[]> | null>(null)

  // Reconcile local order with Firestore (add new items, remove deleted ones)
  useEffect(() => {
    setItemOrder((prev) => {
      const next: Record<string, string[]> = {}
      for (const store of storeList) {
        const firestoreIds = allItems
          .filter((i) => i.storeId === store.storeId)
          .map((i) => i.itemId)
        const firestoreSet = new Set(firestoreIds)
        const prevOrder = prev[store.storeId] ?? []
        const kept = prevOrder.filter((id) => firestoreSet.has(id))
        const newIds = firestoreIds.filter((id) => !prevOrder.includes(id))
        next[store.storeId] = [...newIds, ...kept]
      }
      return next
    })
  }, [allItems, storeList])

  const itemMap = new Map<string, GroceryItem>(allItems.map((i) => [i.itemId, i]))

  function getStoreItems(storeId: string): GroceryItem[] {
    return (itemOrder[storeId] ?? [])
      .map((id) => itemMap.get(id))
      .filter(Boolean) as GroceryItem[]
  }

  function findContainer(itemId: string): string | null {
    for (const [storeId, ids] of Object.entries(itemOrder)) {
      if (ids.includes(itemId)) return storeId
    }
    return null
  }

  // ── DnD sensors ──────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragStart({ active }: DragStartEvent) {
    const id = active.id as string
    setActiveItemId(id)
    setDragOriginStore(findContainer(id))
    setPreDragOrder(itemOrder)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeId = active.id as string
    const overId = over.id as string

    const activeContainer = findContainer(activeId)
    const overContainer = itemOrder[overId] !== undefined ? overId : findContainer(overId)
    if (!activeContainer || !overContainer || activeContainer === overContainer) return

    setItemOrder((prev) => {
      const sourceIds = [...(prev[activeContainer] ?? [])]
      const destIds = [...(prev[overContainer] ?? [])]
      const activeIdx = sourceIds.indexOf(activeId)
      const overIdx = destIds.indexOf(overId)

      sourceIds.splice(activeIdx, 1)
      destIds.splice(overIdx >= 0 ? overIdx : destIds.length, 0, activeId)

      return { ...prev, [activeContainer]: sourceIds, [overContainer]: destIds }
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const activeId = active.id as string
    const currentContainer = findContainer(activeId)

    if (!over) {
      // Cancelled — restore pre-drag state
      if (preDragOrder) setItemOrder(preDragOrder)
    } else if (dragOriginStore && currentContainer && dragOriginStore !== currentContainer) {
      // Persisted cross-store move
      moveItem.mutate({ itemId: activeId, newStoreId: currentContainer })
    } else if (over && currentContainer) {
      // Within-store reorder
      const overId = over.id as string
      const overContainer = itemOrder[overId] !== undefined ? overId : findContainer(overId)
      if (overContainer === currentContainer) {
        setItemOrder((prev) => {
          const ids = [...(prev[currentContainer] ?? [])]
          const oldIdx = ids.indexOf(activeId)
          const newIdx = ids.indexOf(overId)
          if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return prev
          return { ...prev, [currentContainer]: arrayMove(ids, oldIdx, newIdx) }
        })
      }
    }

    setActiveItemId(null)
    setDragOriginStore(null)
    setPreDragOrder(null)
  }

  function handleDragCancel() {
    if (preDragOrder) setItemOrder(preDragOrder)
    setActiveItemId(null)
    setDragOriginStore(null)
    setPreDragOrder(null)
  }

  const activeItem = activeItemId ? itemMap.get(activeItemId) : null

  if (!familyId) return null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Grocery list</h1>
            <p className="text-sm text-muted-foreground">Manage stores and shopping lists</p>
          </div>
          {isParent && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Store
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : storeList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground text-sm">No stores yet.</p>
            {isParent && (
              <Button variant="outline" className="mt-4" onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first store
              </Button>
            )}
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 gap-4 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {storeList.map((store) => (
              <StoreCard
                key={store.storeId}
                store={store}
                items={getStoreItems(store.storeId)}
                isParent={isParent}
                onEdit={(name, notes) =>
                  editStore.mutateAsync({ storeId: store.storeId, name, notes })
                }
                onRemove={() => archiveStore.mutateAsync(store.storeId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating item ghost while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="bg-card border border-primary/30 rounded-lg px-3 py-2 text-sm text-foreground shadow-lg opacity-90 flex items-center gap-2 pointer-events-none">
            <span className="flex-1 truncate">{activeItem.name}</span>
            {activeItem.quantity !== '1' && (
              <span className="text-xs text-muted-foreground shrink-0">×{activeItem.quantity}</span>
            )}
          </div>
        ) : null}
      </DragOverlay>

      {isParent && (
        <AddEditStoreDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onSave={(name, notes) => addStore.mutateAsync({ name, notes })}
          isPending={addStore.isPending}
        />
      )}
    </DndContext>
  )
}
