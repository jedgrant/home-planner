import { useMutation } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/shared/lib/firebase'
import type { TaskDifficulty } from '@/shared/types/recipes'

interface SuggestRecipeInput {
  recipeName: string
}

interface SuggestRecipeOutput {
  description: string
  servingSize: number
  ingredients: { name: string; quantity: string }[]
  prepTasks: { description: string; difficulty: TaskDifficulty; order: number }[]
}

interface SuggestTasksInput {
  recipeName: string
  ingredients: { name: string; quantity: string }[]
  notes: string
}

interface SuggestTasksOutput {
  prepTasks: { description: string; difficulty: TaskDifficulty; order: number }[]
}

export function useAISuggestRecipe() {
  const fn = httpsCallable<SuggestRecipeInput, SuggestRecipeOutput>(
    functions,
    'suggestRecipe'
  )
  return useMutation({
    mutationFn: (input: SuggestRecipeInput) => fn(input).then((r) => r.data),
  })
}

export function useAISuggestTasks() {
  const fn = httpsCallable<SuggestTasksInput, SuggestTasksOutput>(
    functions,
    'suggestTasks'
  )
  return useMutation({
    mutationFn: (input: SuggestTasksInput) => fn(input).then((r) => r.data),
  })
}
