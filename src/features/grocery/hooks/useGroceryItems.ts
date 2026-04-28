import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { groceryItems as groceryItemsPath } from '@/shared/lib/collections'
import type { GroceryItem } from '@/shared/types/grocery'

export function useGroceryItems(familyId: string, storeId: string) {
  const [items, setItems] = useState<GroceryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!familyId || !storeId) return

    const ref = collection(db, groceryItemsPath(familyId))
    const q = query(
      ref,
      where('storeId', '==', storeId),
      orderBy('addedAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((d) => ({ itemId: d.id, ...d.data() } as GroceryItem))
      )
      setIsLoading(false)
    })

    return unsub
  }, [familyId, storeId])

  return { items, isLoading }
}
