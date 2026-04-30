import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { geminiApiKey, getGemini } from '../shared/gemini'
import type { CourseType } from '../shared/types'

interface SuggestMealsInput {
  familyId: string
  mealStyle: 'quick' | 'full'
  cuisinePreference: string
}

interface AIMealSide {
  name: string
  recipeId: string | null
  isFromRecipes: boolean
}

interface AIMealIdea {
  ideaId: string
  title: string
  entree: {
    name: string
    recipeId: string | null
    isFromRecipes: boolean
    lastServedDate: string | null
  }
  sides: AIMealSide[]
  rationale: string
}

interface SuggestMealsOutput {
  ideas: AIMealIdea[]
}

export const suggestMeals = onCall<SuggestMealsInput>(
  { region: 'us-central1', secrets: [geminiApiKey] },
  async (request): Promise<SuggestMealsOutput> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    const { familyId, mealStyle, cuisinePreference } = request.data
    if (!familyId?.trim()) {
      throw new HttpsError('invalid-argument', 'familyId is required.')
    }

    const adminDb = getFirestore()

    // Verify caller belongs to this family
    const callerDoc = await adminDb.doc(`users/${request.auth.uid}`).get()
    if (!callerDoc.exists || callerDoc.data()?.familyId !== familyId) {
      throw new HttpsError('permission-denied', 'Not a member of this family.')
    }

    // Fetch family recipes (name, courseType, recipeId)
    const recipesSnap = await adminDb
      .collection(`families/${familyId}/recipes`)
      .where('archived', '==', false)
      .get()
    const familyRecipes = recipesSnap.docs.map((d) => ({
      recipeId: d.id,
      name: d.data().name as string,
      courseType: d.data().courseType as CourseType,
    }))

    // Fetch meal history aggregate
    const histSnap = await adminDb.doc(`families/${familyId}/aggregates/mealHistory`).get()
    const recentMeals: Array<{ date: string; itemNames: string[]; recipeIds: string[] }> = histSnap.exists
      ? (histSnap.data()?.recentMeals ?? [])
      : []

    // Build a "last served" map: recipeId -> most recent date
    const lastServedMap: Record<string, string> = {}
    for (const m of recentMeals) {
      for (let i = 0; i < m.recipeIds.length; i++) {
        const rid = m.recipeIds[i]
        if (rid && !lastServedMap[rid]) {
          lastServedMap[rid] = m.date
        }
      }
    }

    // Recent item names for "avoid repeating" context
    const recentNames = [...new Set(recentMeals.slice(0, 7).flatMap((m) => m.itemNames))].slice(0, 15)

    const recipeListText =
      familyRecipes.length > 0
        ? familyRecipes
            .map((r) => {
              const lastDate = lastServedMap[r.recipeId]
              const ago = lastDate ? ` (last served ${lastDate})` : ' (never served)'
              return `  - ${r.name} [${r.courseType}]${ago} [recipeId:${r.recipeId}]`
            })
            .join('\n')
        : '  (no saved recipes yet)'

    const recentText = recentNames.length > 0 ? recentNames.join(', ') : 'none'

    const cuisineText = cuisinePreference.trim()
      ? `The family is interested in: ${cuisinePreference.trim()}.`
      : 'Give a good variety of cuisines and styles.'

    const styleText =
      mealStyle === 'quick'
        ? 'Meal style: QUICK AND EASY. Favour simple weeknight meals with minimal prep. Not every meal needs sides — a quick pasta or tacos can stand alone.'
        : 'Meal style: FULL MEAL. Include an entree plus appropriate sides, toppings, or accompaniments. Aim for variety across the 10 ideas.'

    const prompt = `You are a helpful family meal planner. Generate exactly 10 varied dinner ideas for a family.

${styleText}
${cuisineText}

Family's saved recipes (use these where a good match — reference recipeId exactly as shown):
${recipeListText}

Recently served meals to AVOID repeating: ${recentText}

Rules:
- Always produce exactly 10 ideas.
- Each idea must have a unique title (the meal occasion name).
- entree.name: the main dish name.
- entree.recipeId: ONLY set this if the family has a saved recipe that is a great match — copy the recipeId exactly. Otherwise null.
- entree.isFromRecipes: true if recipeId is set, false otherwise.
- entree.lastServedDate: the last served date string if from the family recipe list and it was served before, otherwise null.
- sides: 0–3 sides/toppings. For quick meals, 0–1 sides is fine. Use saved recipe recipeIds when a match exists.
- Vary cuisines, protein types, and cooking styles across the 10 ideas.
- rationale: 1 sentence explaining why this is a good suggestion today.
- ideaId: a unique short slug like "idea-1", "idea-2", etc.

Return a JSON object with exactly this shape, no markdown fences:
{
  "ideas": [
    {
      "ideaId": string,
      "title": string,
      "entree": {
        "name": string,
        "recipeId": string | null,
        "isFromRecipes": boolean,
        "lastServedDate": string | null
      },
      "sides": [
        { "name": string, "recipeId": string | null, "isFromRecipes": boolean }
      ],
      "rationale": string
    }
  ]
}`

    try {
      const model = getGemini()
      const result = await model.generateContent(prompt)
      const json = result.response.text()
      const parsed = JSON.parse(json) as SuggestMealsOutput

      // Sanitise: ensure recipeIds actually exist in the family recipes set
      const validRecipeIds = new Set(familyRecipes.map((r) => r.recipeId))
      const sanitised: AIMealIdea[] = parsed.ideas.map((idea) => ({
        ...idea,
        entree: {
          ...idea.entree,
          recipeId:
            idea.entree.recipeId && validRecipeIds.has(idea.entree.recipeId) ? idea.entree.recipeId : null,
          isFromRecipes: !!(idea.entree.recipeId && validRecipeIds.has(idea.entree.recipeId)),
        },
        sides: idea.sides.map((s) => ({
          ...s,
          recipeId: s.recipeId && validRecipeIds.has(s.recipeId) ? s.recipeId : null,
          isFromRecipes: !!(s.recipeId && validRecipeIds.has(s.recipeId)),
        })),
      }))

      return { ideas: sanitised }
    } catch (err) {
      console.error('suggestMeals Gemini error', err)
      throw new HttpsError('internal', 'Failed to generate meal suggestions.')
    }
  }
)
