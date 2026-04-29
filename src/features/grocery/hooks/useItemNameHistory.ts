import { useQuery } from '@tanstack/react-query'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { groceryItems as groceryItemsPath } from '@/shared/lib/collections'
import type { GroceryItem } from '@/shared/types/grocery'

// Cap at 500 most-recent items to avoid ever-growing full-collection scans.
const HISTORY_READ_LIMIT = 500

/**
 * Returns deduplicated item names from the family's recent grocery history.
 * Used as Combobox suggestions when adding new items.
 */
export function useItemNameHistory(familyId: string) {
  return useQuery({
    queryKey: ['itemNameHistory', familyId],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, groceryItemsPath(familyId)), orderBy('addedAt', 'desc'), limit(HISTORY_READ_LIMIT)),
      )
      const names = snap.docs.map((d) => (d.data() as GroceryItem).name)
      const unique = Array.from(new Set(names.map((n) => n.toLowerCase().trim()))).map(
        (n) => n.charAt(0).toUpperCase() + n.slice(1)
      )
      return unique.sort()
    },
    enabled: Boolean(familyId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
