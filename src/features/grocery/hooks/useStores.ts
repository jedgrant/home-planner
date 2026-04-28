import { useQuery } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { stores as storesPath } from '@/shared/lib/collections'
import type { Store } from '@/shared/types/grocery'

export function useStores(familyId: string) {
  return useQuery({
    queryKey: ['stores', familyId],
    queryFn: async () => {
      const ref = collection(db, storesPath(familyId))
      const snap = await getDocs(
        query(ref, where('archived', '==', false), orderBy('name'))
      )
      return snap.docs.map((d) => ({ storeId: d.id, ...d.data() } as Store))
    },
    enabled: Boolean(familyId),
  })
}
