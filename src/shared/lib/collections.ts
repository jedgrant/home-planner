// ─── Top-level collections ───────────────────────────────────────────────────
export const USERS = 'users'
export const INVITE_CODES = 'inviteCodes'
export const FAMILIES = 'families'
export const GLOBAL_RECIPES = 'globalRecipes'

// ─── Family subcollections (returns collection path strings) ─────────────────
export const choreGroups = (familyId: string) =>
  `families/${familyId}/choreGroups`

export const weeklyChores = (familyId: string) =>
  `families/${familyId}/weeklyChores`

export const stores = (familyId: string) =>
  `families/${familyId}/stores`

export const groceryItems = (familyId: string) =>
  `families/${familyId}/groceryItems`

export const quickPickItems = (familyId: string) =>
  `families/${familyId}/quickPickItems`

export const recipes = (familyId: string) =>
  `families/${familyId}/recipes`

export const meals = (familyId: string) =>
  `families/${familyId}/meals`

export const pendingProfiles = (familyId: string) =>
  `families/${familyId}/pendingProfiles`

// ─── Aggregate document paths ────────────────────────────────────────────────
export const aggregateMealHistory = (familyId: string) =>
  `families/${familyId}/aggregates/mealHistory`

export const aggregateTaskHistory = (familyId: string) =>
  `families/${familyId}/aggregates/taskHistory`

export const aggregatePurchasePatterns = (familyId: string) =>
  `families/${familyId}/aggregates/purchasePatterns`
