import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { stores as storesPath } from '@/shared/lib/collections'

interface AddStoreInput {
  name: string
  notes: string
}

interface EditStoreInput {
  storeId: string
  name: string
  notes: string
}

export function useStoreMutations(familyId: string) {
  const queryClient = useQueryClient()

  const addStore = useMutation({
    mutationFn: async (input: AddStoreInput) => {
      const ref = collection(db, storesPath(familyId))
      await addDoc(ref, {
        familyId,
        name: input.name,
        notes: input.notes,
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', familyId] })
    },
  })

  const editStore = useMutation({
    mutationFn: async (input: EditStoreInput) => {
      const ref = doc(db, storesPath(familyId), input.storeId)
      await updateDoc(ref, {
        name: input.name,
        notes: input.notes,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', familyId] })
    },
  })

  const archiveStore = useMutation({
    mutationFn: async (storeId: string) => {
      const ref = doc(db, storesPath(familyId), storeId)
      await updateDoc(ref, {
        archived: true,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', familyId] })
    },
  })

  return { addStore, editStore, archiveStore }
}
