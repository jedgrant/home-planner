import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { groceryItems as groceryItemsPath } from '@/shared/lib/collections'
import { updatePurchasePattern } from '../lib/purchasePatterns'
import type { Store } from '@/shared/types/grocery'

interface AddItemInput {
  name: string
  quantity: string
  note: string
  storeId: string
  addedBy: string
}

interface EditItemInput {
  itemId: string
  name: string
  quantity: string
  note: string
}

interface CompleteItemInput {
  itemId: string
  itemName: string
  quantity: string
  store: Store
  completedBy: string
}

export function useGroceryItemMutations(familyId: string) {
  const queryClient = useQueryClient()

  const addItem = useMutation({
    mutationFn: async (input: AddItemInput) => {
      const ref = collection(db, groceryItemsPath(familyId))
      await addDoc(ref, {
        familyId,
        storeId: input.storeId,
        name: input.name,
        quantity: input.quantity,
        note: input.note,
        addedBy: input.addedBy,
        addedAt: serverTimestamp(),
        completed: false,
        completedAt: null,
        completedBy: null,
      })
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['itemNameHistory', familyId] })
      queryClient.invalidateQueries({
        queryKey: ['groceryItemCount', familyId, vars.storeId],
      })
    },
  })

  const editItem = useMutation({
    mutationFn: async (input: EditItemInput) => {
      const ref = doc(db, groceryItemsPath(familyId), input.itemId)
      await updateDoc(ref, {
        name: input.name,
        quantity: input.quantity,
        note: input.note,
        updatedAt: serverTimestamp(),
      })
    },
  })

  const completeItem = useMutation({
    mutationFn: async (input: CompleteItemInput) => {
      const now = Timestamp.now()
      const ref = doc(db, groceryItemsPath(familyId), input.itemId)
      await updateDoc(ref, {
        completed: true,
        completedAt: now,
        completedBy: input.completedBy,
        updatedAt: now,
      })
      await updatePurchasePattern(familyId, {
        itemName: input.itemName,
        storeId: input.store.storeId,
        storeName: input.store.name,
        quantity: input.quantity,
        completedAt: now,
      })
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['groceryItemCount', familyId, vars.store.storeId],
      })
    },
  })

  const uncompleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const ref = doc(db, groceryItemsPath(familyId), itemId)
      await updateDoc(ref, {
        completed: false,
        completedAt: null,
        completedBy: null,
        updatedAt: serverTimestamp(),
      })
    },
  })

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const ref = doc(db, groceryItemsPath(familyId), itemId)
      await deleteDoc(ref)
    },
  })

  return { addItem, editItem, completeItem, uncompleteItem, removeItem }
}
