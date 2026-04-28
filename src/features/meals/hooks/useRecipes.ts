import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { db } from '@/shared/lib/firebase'
import { recipes as recipesPath, GLOBAL_RECIPES } from '@/shared/lib/collections'
import type { Recipe } from '@/shared/types/recipes'

type RecipePayload = Omit<Recipe, 'recipeId' | 'createdAt' | 'updatedAt'>

// ── Reads ─────────────────────────────────────────────────────────────────────

export function useRecipes(familyId: string) {
  return useQuery({
    queryKey: ['recipes', familyId],
    queryFn: async () => {
      const ref = collection(db, recipesPath(familyId))
      const snap = await getDocs(
        query(ref, where('archived', '==', false), orderBy('name'))
      )
      return snap.docs.map((d) => ({ recipeId: d.id, ...d.data() } as Recipe))
    },
    enabled: Boolean(familyId),
  })
}

export function useRecipe(familyId: string, recipeId: string) {
  return useQuery({
    queryKey: ['recipe', familyId, recipeId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, recipesPath(familyId), recipeId))
      if (!snap.exists()) return null
      return { recipeId: snap.id, ...snap.data() } as Recipe
    },
    enabled: Boolean(familyId) && Boolean(recipeId),
  })
}

export function useGlobalRecipes() {
  return useQuery({
    queryKey: ['globalRecipes'],
    queryFn: async () => {
      const ref = collection(db, GLOBAL_RECIPES)
      const snap = await getDocs(
        query(ref, where('archived', '==', false), orderBy('name'))
      )
      return snap.docs.map((d) => ({ recipeId: d.id, ...d.data() } as Recipe))
    },
  })
}

export function useGlobalRecipe(recipeId: string) {
  return useQuery({
    queryKey: ['globalRecipe', recipeId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, GLOBAL_RECIPES, recipeId))
      if (!snap.exists()) return null
      return { recipeId: snap.id, ...snap.data() } as Recipe
    },
    enabled: Boolean(recipeId),
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateRecipe(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: RecipePayload) => {
      const recipeId = nanoid()
      await setDoc(doc(db, recipesPath(familyId), recipeId), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return recipeId
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes', familyId] }),
  })
}

export function useUpdateRecipe(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      recipeId,
      changes,
    }: {
      recipeId: string
      changes: Partial<RecipePayload>
    }) => {
      await updateDoc(doc(db, recipesPath(familyId), recipeId), {
        ...changes,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_d, { recipeId }) => {
      qc.invalidateQueries({ queryKey: ['recipes', familyId] })
      qc.invalidateQueries({ queryKey: ['recipe', familyId, recipeId] })
    },
  })
}

export function useArchiveRecipe(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recipeId: string) => {
      await updateDoc(doc(db, recipesPath(familyId), recipeId), {
        archived: true,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes', familyId] }),
  })
}

export function useSetRecipeVisibility(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      recipeId,
      visibility,
    }: {
      recipeId: string
      visibility: 'private' | 'global'
    }) => {
      await updateDoc(doc(db, recipesPath(familyId), recipeId), {
        visibility,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_d, { recipeId }) => {
      qc.invalidateQueries({ queryKey: ['recipes', familyId] })
      qc.invalidateQueries({ queryKey: ['recipe', familyId, recipeId] })
      qc.invalidateQueries({ queryKey: ['globalRecipes'] })
    },
  })
}

export function useForkGlobalRecipe(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recipe: Recipe) => {
      const recipeId = nanoid()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { recipeId: _recipeId, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = recipe
      await setDoc(doc(db, recipesPath(familyId), recipeId), {
        ...rest,
        familyId,
        visibility: 'private',
        sourceGlobalRecipeId: recipe.recipeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      return recipeId
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recipes', familyId] }),
  })
}
