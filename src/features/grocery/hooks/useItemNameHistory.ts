import { useQuery } from '@tanstack/react-query'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { groceryItems as groceryItemsPath } from '@/shared/lib/collections'
import type { GroceryItem } from '@/shared/types/grocery'

/**
 * Returns deduplicated item names from the family's full grocery history.
 * Used as Combobox suggestions when adding new items.
 */
export function useItemNameHistory(familyId: string) {
  return useQuery({
    queryKey: ['itemNameHistory', familyId],
    queryFn: async () => {
      const snap = await getDocs(collection(db, groceryItemsPath(familyId)))
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
