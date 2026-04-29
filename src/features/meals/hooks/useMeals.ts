import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { db } from '@/shared/lib/firebase'
import {
  meals as mealsPath,
  aggregateMealHistory,
  aggregateTaskHistory,
} from '@/shared/lib/collections'
import type { Meal, MealRecipe, MealSuggestion, SuggestionVote, MealHistoryAggregate, MealHistorySummary, TaskHistoryAggregate } from '@/shared/types/meals'
import type { Recipe } from '@/shared/types/recipes'

// ── Reads ─────────────────────────────────────────────────────────────────────

export function useMeals(familyId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['meals', familyId, startDate, endDate],
    queryFn: async () => {
      const ref = collection(db, mealsPath(familyId))
      const snap = await getDocs(
        query(
          ref,
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date')
        )
      )
      return snap.docs.map((d) => ({ mealId: d.id, ...d.data() } as Meal))
    },
    enabled: Boolean(familyId) && Boolean(startDate) && Boolean(endDate),
  })
}

export function useMeal(familyId: string, mealId: string) {
  return useQuery({
    queryKey: ['meal', familyId, mealId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, mealsPath(familyId), mealId))
      if (!snap.exists()) return null
      return { mealId: snap.id, ...snap.data() } as Meal
    },
    enabled: Boolean(familyId) && Boolean(mealId),
  })
}

// ── Create ────────────────────────────────────────────────────────────────────

type CreateMealPayload = {
  name: string
  date: string
  createdBy: string
}

export function useCreateMeal(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateMealPayload) => {
      const mealId = nanoid()
      const now = serverTimestamp()
      const meal = {
        familyId,
        name: payload.name,
        date: payload.date,
        status: 'planned' as const,
        servedAt: null,
        recipes: [],
        createdBy: payload.createdBy,
        createdAt: now,
        updatedAt: now,
      }
      await setDoc(doc(db, mealsPath(familyId), mealId), meal)
      return mealId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals', familyId] })
    },
  })
}

// ── Update ────────────────────────────────────────────────────────────────────

export function useUpdateMeal(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      mealId,
      updates,
    }: {
      mealId: string
      updates: Partial<Pick<Meal, 'name' | 'date' | 'status' | 'recipes' | 'cleanupTasks' | 'freeFormItems' | 'suggestions'>>
    }) => {
      await updateDoc(doc(db, mealsPath(familyId), mealId), {
        ...updates,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, { mealId }) => {
      qc.invalidateQueries({ queryKey: ['meal', familyId, mealId] })
      qc.invalidateQueries({ queryKey: ['meals', familyId] })
    },
  })
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function useDeleteMeal(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (mealId: string) => {
      await deleteDoc(doc(db, mealsPath(familyId), mealId))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals', familyId] })
    },
  })
}

// ── Complete task ─────────────────────────────────────────────────────────────

export function useCompleteTask(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      meal,
      recipeIndex,
      taskIndex,
      completedBy,
    }: {
      meal: Meal
      recipeIndex: number
      taskIndex: number
      completedBy: string
    }) => {
      const updatedRecipes: MealRecipe[] = meal.recipes.map((recipe, ri) => {
        if (ri !== recipeIndex) return recipe
        return {
          ...recipe,
          tasks: recipe.tasks.map((task, ti) => {
            if (ti !== taskIndex) return task
            return {
              ...task,
              completedBy,
              completedAt: serverTimestamp() as unknown as import('firebase/firestore').Timestamp,
            }
          }),
        }
      })
      await updateDoc(doc(db, mealsPath(familyId), meal.mealId), {
        recipes: updatedRecipes,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, { meal }) => {
      qc.invalidateQueries({ queryKey: ['meal', familyId, meal.mealId] })
    },
  })
}

// ── Mark Served ───────────────────────────────────────────────────────────────

export function useMarkServed(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (meal: Meal) => {
      const mealRef = doc(db, mealsPath(familyId), meal.mealId)
      const now = serverTimestamp()

      // 1. Update meal status
      await updateDoc(mealRef, {
        status: 'served' as const,
        servedAt: now,
        updatedAt: now,
      })

      // 2. Update meal history aggregate (keep last 30)
      const histRef = doc(db, aggregateMealHistory(familyId))
      const histSnap = await getDoc(histRef)
      const existing = histSnap.exists()
        ? (histSnap.data() as MealHistoryAggregate).recentMeals
        : []
      const newEntry = {
        mealId: meal.mealId,
        date: meal.date,
        recipeIds: meal.recipes.map((r) => r.recipeId),
        recipeNames: meal.recipes.map((r) => r.recipeName),
      }
      const recentMeals = [newEntry, ...existing].slice(0, 30)
      await setDoc(histRef, { recentMeals, updatedAt: now }, { merge: true })

      // 3. Update task history aggregate (keep last 50)
      const taskHistRef = doc(db, aggregateTaskHistory(familyId))
      const taskHistSnap = await getDoc(taskHistRef)
      const existingTasks = taskHistSnap.exists()
        ? (taskHistSnap.data() as TaskHistoryAggregate).recentCompletions
        : []
      const completedTasks = meal.recipes.flatMap((r) =>
        r.tasks
          .filter((t) => t.completedAt !== null && t.assigneeId !== null)
          .map((t) => ({
            userId: t.assigneeId!,
            userName: t.assigneeName ?? '',
            taskDescription: t.description,
            difficulty: t.difficulty,
            mealId: meal.mealId,
            mealDate: meal.date,
            completedAt: t.completedAt!,
          }))
      )
      const recentCompletions = [...completedTasks, ...existingTasks].slice(0, 50)
      await setDoc(taskHistRef, { recentCompletions, updatedAt: now }, { merge: true })
    },
    onSuccess: (_data, meal) => {
      qc.invalidateQueries({ queryKey: ['meal', familyId, meal.mealId] })
      qc.invalidateQueries({ queryKey: ['meals', familyId] })
    },
  })
}

// ── Assign / unassign a meal task (e.g. a child volunteering) ─────────────────

export function useAssignMealTask(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      meal,
      recipeIndex,
      taskIndex,
      assigneeId,
      assigneeName,
    }: {
      meal: Meal
      recipeIndex: number
      taskIndex: number
      /** Pass null to unassign */
      assigneeId: string | null
      assigneeName: string | null
    }) => {
      const updatedRecipes: MealRecipe[] = meal.recipes.map((recipe, ri) => {
        if (ri !== recipeIndex) return recipe
        return {
          ...recipe,
          tasks: recipe.tasks.map((task, ti) => {
            if (ti !== taskIndex) return task
            return { ...task, assigneeId, assigneeName }
          }),
        }
      })
      await updateDoc(doc(db, mealsPath(familyId), meal.mealId), {
        recipes: updatedRecipes,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, { meal }) => {
      qc.invalidateQueries({ queryKey: ['meal', familyId, meal.mealId] })
      qc.invalidateQueries({ queryKey: ['meals', familyId] })
    },
  })
}

export function useAssignCleanupTask(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      meal,
      taskIndex,
      assigneeId,
      assigneeName,
    }: {
      meal: Meal
      taskIndex: number
      assigneeId: string | null
      assigneeName: string | null
    }) => {
      const updatedCleanupTasks = (meal.cleanupTasks ?? []).map((task, ti) => {
        if (ti !== taskIndex) return task
        return { ...task, assigneeId, assigneeName }
      })
      await updateDoc(doc(db, mealsPath(familyId), meal.mealId), {
        cleanupTasks: updatedCleanupTasks,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, { meal }) => {
      qc.invalidateQueries({ queryKey: ['meal', familyId, meal.mealId] })
      qc.invalidateQueries({ queryKey: ['meals', familyId] })
    },
  })
}

// ── Meal history ──────────────────────────────────────────────────────────────

export function useMealHistory(familyId: string) {
  return useQuery({
    queryKey: ['mealHistory', familyId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, aggregateMealHistory(familyId)))
      if (!snap.exists()) return [] as MealHistorySummary[]
      return (snap.data() as MealHistoryAggregate).recentMeals
    },
    enabled: Boolean(familyId),
  })
}

// ── Meal suggestions ──────────────────────────────────────────────────────────

type AddSuggestionPayload = {
  meal: Meal
  suggestion: Omit<MealSuggestion, 'suggestionId' | 'votes' | 'accepted'>
  suggestedByPhotoUrl?: string | null
}

export function useAddMealSuggestion(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ meal, suggestion, suggestedByPhotoUrl = null }: AddSuggestionPayload) => {
      const newSuggestion: MealSuggestion = {
        suggestionId: nanoid(),
        votes: [
          {
            userId: suggestion.suggestedById,
            userName: suggestion.suggestedByName,
            photoUrl: suggestedByPhotoUrl,
          },
        ],
        accepted: false,
        ...suggestion,
      }
      await updateDoc(doc(db, mealsPath(familyId), meal.mealId), {
        suggestions: [...(meal.suggestions ?? []), newSuggestion],
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, { meal }) => {
      qc.invalidateQueries({ queryKey: ['meals', familyId] })
      qc.invalidateQueries({ queryKey: ['meal', familyId, meal.mealId] })
    },
  })
}

export function useVoteMealSuggestion(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      meal,
      suggestionId,
      voter,
    }: {
      meal: Meal
      suggestionId: string
      voter: SuggestionVote
    }) => {
      const suggestions = (meal.suggestions ?? []).map((s) => {
        if (s.suggestionId !== suggestionId) return s
        const alreadyVoted = s.votes.some((v) => v.userId === voter.userId)
        return {
          ...s,
          votes: alreadyVoted
            ? s.votes.filter((v) => v.userId !== voter.userId)
            : [...s.votes, voter],
        }
      })
      await updateDoc(doc(db, mealsPath(familyId), meal.mealId), {
        suggestions,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, { meal }) => {
      qc.invalidateQueries({ queryKey: ['meals', familyId] })
      qc.invalidateQueries({ queryKey: ['meal', familyId, meal.mealId] })
    },
  })
}

export function useRemoveMealSuggestion(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ meal, suggestionId }: { meal: Meal; suggestionId: string }) => {
      const suggestions = (meal.suggestions ?? []).filter(
        (s) => s.suggestionId !== suggestionId,
      )
      await updateDoc(doc(db, mealsPath(familyId), meal.mealId), {
        suggestions,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, { meal }) => {
      qc.invalidateQueries({ queryKey: ['meals', familyId] })
      qc.invalidateQueries({ queryKey: ['meal', familyId, meal.mealId] })
    },
  })
}

export function useAcceptMealSuggestion(familyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      meal,
      suggestion,
      allRecipes,
    }: {
      meal: Meal
      suggestion: MealSuggestion
      allRecipes: Recipe[]
    }) => {
      let updatedRecipes = meal.recipes
      let updatedFreeFormItems = meal.freeFormItems ?? []

      if (suggestion.recipeId) {
        const recipe = allRecipes.find((r) => r.recipeId === suggestion.recipeId)
        if (recipe) {
          const newRecipe: MealRecipe = {
            recipeId: recipe.recipeId,
            recipeName: recipe.name,
            courseType: recipe.courseType,
            tasks: recipe.prepTasks.map((pt) => ({
              taskId: pt.taskId,
              description: pt.description,
              difficulty: pt.difficulty,
              assigneeId: null,
              assigneeName: null,
              completedAt: null,
            })),
          }
          updatedRecipes = [...meal.recipes, newRecipe]
        }
      } else {
        updatedFreeFormItems = [
          ...updatedFreeFormItems,
          {
            itemId: nanoid(),
            courseType: 'entree' as const,
            description: suggestion.name,
            assigneeId: null,
            assigneeName: null,
          },
        ]
      }

      const updatedSuggestions = (meal.suggestions ?? []).map((s) =>
        s.suggestionId === suggestion.suggestionId ? { ...s, accepted: true } : s,
      )

      await updateDoc(doc(db, mealsPath(familyId), meal.mealId), {
        recipes: updatedRecipes,
        freeFormItems: updatedFreeFormItems,
        suggestions: updatedSuggestions,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, { meal }) => {
      qc.invalidateQueries({ queryKey: ['meals', familyId] })
      qc.invalidateQueries({ queryKey: ['meal', familyId, meal.mealId] })
    },
  })
}
