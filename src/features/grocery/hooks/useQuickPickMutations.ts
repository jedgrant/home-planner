import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { quickPickItems as quickPickPath } from '@/shared/lib/collections'

interface AddQuickPickInput {
  name: string
  defaultQuantity: string
  defaultNote: string
  storeId: string
}

interface EditQuickPickInput {
  itemId: string
  name: string
  defaultQuantity: string
  defaultNote: string
}

export function useQuickPickMutations(familyId: string, storeId: string) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ['quickPickItems', familyId, storeId],
    })
  }

  const addQuickPickItem = useMutation({
    mutationFn: async (input: AddQuickPickInput) => {
      const ref = collection(db, quickPickPath(familyId))
      await addDoc(ref, {
        familyId,
        storeId: input.storeId,
        name: input.name,
        defaultQuantity: input.defaultQuantity,
        defaultNote: input.defaultNote,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: invalidate,
  })

  const editQuickPickItem = useMutation({
    mutationFn: async (input: EditQuickPickInput) => {
      const ref = doc(db, quickPickPath(familyId), input.itemId)
      await updateDoc(ref, {
        name: input.name,
        defaultQuantity: input.defaultQuantity,
        defaultNote: input.defaultNote,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: invalidate,
  })

  const removeQuickPickItem = useMutation({
    mutationFn: async (itemId: string) => {
      const ref = doc(db, quickPickPath(familyId), itemId)
      await deleteDoc(ref)
    },
    onSuccess: invalidate,
  })

  return { addQuickPickItem, editQuickPickItem, removeQuickPickItem }
}
