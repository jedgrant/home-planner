import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { groceryItems as groceryItemsPath } from '@/shared/lib/collections'

/** Returns the count of pending (not completed) items for a given store. Real-time. */
export function usePendingItemCount(familyId: string, storeId: string) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!familyId || !storeId) return

    const ref = collection(db, groceryItemsPath(familyId))
    const q = query(
      ref,
      where('storeId', '==', storeId),
      where('completed', '==', false)
    )

    const unsub = onSnapshot(q, (snap) => {
      setCount(snap.size)
    })

    return unsub
  }, [familyId, storeId])

  return count
}
