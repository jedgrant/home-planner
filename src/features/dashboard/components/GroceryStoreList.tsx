import { useMemo } from 'react'
import { GroceryStoreRow } from './GroceryStoreRow'
import { useAllGroceryItems } from '@/features/grocery/hooks/useAllGroceryItems'
import type { Store } from '@/shared/types/grocery'

interface GroceryStoreListProps {
  stores: Store[]
  familyId: string
}

export function GroceryStoreList({ stores, familyId }: GroceryStoreListProps) {
  // One listener for all pending items; counts derived in memory — no per-row listeners.
  const { items } = useAllGroceryItems(familyId)

  const countByStore = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of items) {
      map[item.storeId] = (map[item.storeId] ?? 0) + 1
    }
    return map
  }, [items])

  return (
    <div className="space-y-3">
      {stores.map((store) => (
        <GroceryStoreRow
          key={store.storeId}
          store={store}
          count={countByStore[store.storeId] ?? 0}
        />
      ))}
      <p className="text-sm text-muted-foreground">
        Stores with more than 3 items, or marked as needing purchase, will appear here.
      </p>
    </div>
  )
}
