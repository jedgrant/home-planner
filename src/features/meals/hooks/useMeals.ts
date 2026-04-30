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
import type {
  Meal,
  MealItem,
  MealComponent,
  MealSuggestion,
  SuggestionVote,
  MealHistoryAggregate,
  MealHistorySummary,
  TaskHistoryAggregate,
} from '@/shared/types/meals'
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
        items: [],
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
      updates: Partial<Pick<Meal, 'name' | 'date' | 'status' | 'items' | 'cleanupTasks' | 'suggestions'>>
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
      itemId,
      componentId,
      taskId,
      completedBy,
    }: {
      meal: Meal
      itemId: string
      componentId: string
      taskId: string
      completedBy: string
    }) => {
      const updatedItems: MealItem[] = meal.items.map((item) => {
        if (item.itemId !== itemId) return item
        return {
          ...item,
          components: item.components.map((comp) => {
            if (comp.componentId !== componentId) return comp
            return {
              ...comp,
              tasks: comp.tasks.map((task) => {
                if (task.taskId !== taskId) return task
                return {
                  ...task,
                  completedBy,
                  completedAt: serverTimestamp() as unknown as import('firebase/firestore').Timestamp,
                }
              }),
            }
          }),
        }
      })
      await updateDoc(doc(db, mealsPath(familyId), meal.mealId), {
        items: updatedItems,
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
      const newEntry: MealHistorySummary = {
        mealId: meal.mealId,
        date: meal.date,
        itemNames: meal.items.map((i) => i.name),
        recipeIds: meal.items.flatMap((i) => (i.recipeId ? [i.recipeId] : [])),
      }
      const recentMeals = [newEntry, ...existing].slice(0, 30)
      await setDoc(histRef, { recentMeals, updatedAt: now }, { merge: true })

      // 3. Update task history aggregate (keep last 50)
      const taskHistRef = doc(db, aggregateTaskHistory(familyId))
      const taskHistSnap = await getDoc(taskHistRef)
      const existingTasks = taskHistSnap.exists()
        ? (taskHistSnap.data() as TaskHistoryAggregate).recentCompletions
        : []
      const completedTasks = meal.items.flatMap((item) =>
        item.components.flatMap((comp) =>
          comp.tasks
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
      itemId,
      componentId,
      taskId,
      assigneeId,
      assigneeName,
    }: {
      meal: Meal
      itemId: string
      componentId: string
      taskId: string
      /** Pass null to unassign */
      assigneeId: string | null
      assigneeName: string | null
    }) => {
      const updatedItems: MealItem[] = meal.items.map((item) => {
        if (item.itemId !== itemId) return item
        return {
          ...item,
          components: item.components.map((comp) => {
            if (comp.componentId !== componentId) return comp
            // Component-level assignment (no tasks)
            if (taskId === '__component__') {
              return { ...comp, assigneeId, assigneeName }
            }
            return {
              ...comp,
              tasks: comp.tasks.map((task) => {
                if (task.taskId !== taskId) return task
                return { ...task, assigneeId, assigneeName }
              }),
            }
          }),
        }
      })
      await updateDoc(doc(db, mealsPath(familyId), meal.mealId), {
        items: updatedItems,
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
      let newItem: MealItem

      if (suggestion.recipeId) {
        const recipe = allRecipes.find((r) => r.recipeId === suggestion.recipeId)
        if (recipe) {
          newItem = {
            itemId: nanoid(),
            courseType: recipe.courseType,
            name: recipe.name,
            recipeId: recipe.recipeId,
            components: recipe.components.map((comp): MealComponent => ({
              componentId: comp.componentId,
              name: comp.name,
              notes: comp.notes,
              ingredients: comp.ingredients,
              tasks: comp.tasks.map((pt) => ({
                taskId: pt.taskId,
                description: pt.description,
                difficulty: pt.difficulty,
                assigneeId: null,
                assigneeName: null,
                completedAt: null,
              })),
            })),
          }
        } else {
          // Recipe not found — fall back to free-form item
          newItem = {
            itemId: nanoid(),
            courseType: (suggestion.courseType as MealItem['courseType']) ?? 'entree',
            name: suggestion.name,
            recipeId: null,
            components: [],
          }
        }
      } else {
        newItem = {
          itemId: nanoid(),
          courseType: (suggestion.courseType as MealItem['courseType']) ?? 'entree',
          name: suggestion.name,
          recipeId: null,
          components: [],
        }
      }

      const updatedSuggestions = (meal.suggestions ?? []).map((s) =>
        s.suggestionId === suggestion.suggestionId ? { ...s, accepted: true } : s,
      )

      await updateDoc(doc(db, mealsPath(familyId), meal.mealId), {
        items: [...meal.items, newItem],
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
