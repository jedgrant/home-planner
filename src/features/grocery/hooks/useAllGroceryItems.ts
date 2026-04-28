import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { groceryItems as groceryItemsPath } from '@/shared/lib/collections'
import type { GroceryItem } from '@/shared/types/grocery'

/** Real-time listener for all pending (not completed) grocery items for a family. */
export function useAllGroceryItems(familyId: string) {
  const [items, setItems] = useState<GroceryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!familyId) return

    const ref = collection(db, groceryItemsPath(familyId))
    const q = query(ref, where('completed', '==', false), orderBy('addedAt', 'asc'))

    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ itemId: d.id, ...d.data() } as GroceryItem)))
      setIsLoading(false)
    })

    return unsub
  }, [familyId])

  return { items, isLoading }
}
