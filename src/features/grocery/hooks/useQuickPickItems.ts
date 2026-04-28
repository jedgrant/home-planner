import { useQuery } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
} from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { quickPickItems as quickPickPath } from '@/shared/lib/collections'
import type { QuickPickItem } from '@/shared/types/grocery'

export function useQuickPickItems(familyId: string, storeId: string) {
  return useQuery({
    queryKey: ['quickPickItems', familyId, storeId],
    queryFn: async () => {
      const ref = collection(db, quickPickPath(familyId))
      const snap = await getDocs(
        query(ref, where('storeId', '==', storeId), orderBy('name'))
      )
      return snap.docs.map(
        (d) => ({ itemId: d.id, ...d.data() } as QuickPickItem)
      )
    },
    enabled: Boolean(familyId) && Boolean(storeId),
  })
}

/** All quick-pick item names (for a given store) — used as Combobox options */
export function useQuickPickNames(familyId: string, storeId: string) {
  const { data = [] } = useQuickPickItems(familyId, storeId)
  return data.map((item) => item.name)
}
