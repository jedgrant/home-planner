import { initializeApp } from 'firebase-admin/app'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

initializeApp()

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskDifficulty = 'easy' | 'medium' | 'hard'

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

// ─── suggestRecipe ────────────────────────────────────────────────────────────
// TODO: Replace stub with a real Gemini call once a project API key is configured.

export const suggestRecipe = onCall<SuggestRecipeInput, SuggestRecipeOutput>(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    const { recipeName } = request.data
    if (!recipeName?.trim()) {
      throw new HttpsError('invalid-argument', 'recipeName is required.')
    }

    // Stub response — replace with Gemini/Vertex AI call
    return {
      description: `A delicious ${recipeName} your family will love.`,
      servingSize: 4,
      ingredients: [
        { name: 'Main ingredient', quantity: '2 cups' },
        { name: 'Secondary ingredient', quantity: '1 tbsp' },
      ],
      prepTasks: [
        { description: 'Prepare all ingredients', difficulty: 'easy', order: 0 },
        { description: `Cook the ${recipeName}`, difficulty: 'medium', order: 1 },
        { description: 'Serve and enjoy', difficulty: 'easy', order: 2 },
      ],
    }
  }
)

// ─── suggestTasks ─────────────────────────────────────────────────────────────

export const suggestTasks = onCall<SuggestTasksInput, SuggestTasksOutput>(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    const { recipeName, ingredients = [] } = request.data
    if (!recipeName?.trim()) {
      throw new HttpsError('invalid-argument', 'recipeName is required.')
    }

    // Stub response — replace with Gemini/Vertex AI call
    const tasks: SuggestTasksOutput['prepTasks'] = ingredients
      .slice(0, 3)
      .map((ing, i) => ({
        description: `Prepare ${ing.name}`,
        difficulty: 'easy' as TaskDifficulty,
        order: i,
      }))

    tasks.push({
      description: `Combine and cook ${recipeName}`,
      difficulty: 'medium',
      order: tasks.length,
    })

    return { prepTasks: tasks }
  }
)

// ─── suggestMeal ──────────────────────────────────────────────────────────────
// TODO: Replace stub with a real Gemini call once a project API key is configured.

interface SuggestMealInput {
  familyId: string
  date: string
}

type CourseType = 'entree' | 'side' | 'salad' | 'fruit' | 'dessert'

interface SuggestMealOutput {
  name: string
  suggestions: Array<{
    recipeId: string
    recipeName: string
    courseType: CourseType
    rationale: string
  }>
}

export const suggestMeal = onCall<SuggestMealInput, SuggestMealOutput>(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    const { date } = request.data
    if (!date?.trim()) {
      throw new HttpsError('invalid-argument', 'date is required.')
    }

    // Stub response — replace with Gemini/Vertex AI call
    return {
      name: `Dinner ${date}`,
      suggestions: [
        {
          recipeId: '',
          recipeName: 'Suggested Entree',
          courseType: 'entree' as CourseType,
          rationale: 'Based on your recent meal history, this would be a great choice.',
        },
        {
          recipeId: '',
          recipeName: 'Suggested Side',
          courseType: 'side' as CourseType,
          rationale: 'Pairs well with the suggested entree.',
        },
      ],
    }
  }
)

// ─── assignTasks ─────────────────────────────────────────────────────────────
// TODO: Replace stub with a real Gemini call once a project API key is configured.

interface AssignTasksInput {
  familyId: string
  mealId: string
}

interface TaskAssignment {
  recipeIndex: number
  taskIndex: number
  recipeName: string
  taskDescription: string
  difficulty: TaskDifficulty
  assigneeId: string
  assigneeName: string
  rationale: string
}

interface AssignTasksOutput {
  assignments: TaskAssignment[]
}

export const assignTasks = onCall<AssignTasksInput, AssignTasksOutput>(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    const { mealId } = request.data
    if (!mealId?.trim()) {
      throw new HttpsError('invalid-argument', 'mealId is required.')
    }

    // Stub response — replace with Gemini/Vertex AI call
    return { assignments: [] }
  }
)
