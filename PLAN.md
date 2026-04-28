# Home Manager — Execution Plan

**Last Updated:** April 27, 2026
**Status Legend:** ⬜ Not Started · 🔄 In Progress · ✅ Done · ⏸ Blocked

> **Rule:** Never execute more than one phase at a time. Complete and verify all tasks in a phase before starting the next.

---

## Firestore Data Architecture Decisions

Before reading the phase tasks, understand the core design constraints that apply to ALL data modelling:

### Token & Read Efficiency Principles

1. **Aggregate documents for AI context.** Any AI feature that needs historical data must read a single pre-built aggregate document — never N documents. Aggregates are maintained by Cloud Functions triggered on a once a week schedule.
2. **Embed sub-entities when always read together.** Chore items live inside their group document. Recipe ingredients and prep tasks are embedded arrays on the recipe document. Meal task assignments are embedded inside the meal document. This avoids subcollection reads.
3. **Denormalize display names.** User display names, recipe names, chore names are copied (denormalized) into documents that reference them. Avoids fan-out reads just to display a name.
4. **One document per week for chore execution.** The weekly chore view (`weeklyChores/{weekId}`) is a single document containing all group assignments and per-chore completion state for that week. The real-time `onSnapshot` is one subscription, one read.
5. **No unbounded subcollection scans for AI.** Grocery item history, meal history, and task history are summarized into compact aggregate documents under `families/{familyId}/aggregates/`.

### Planned Firestore Collections

```
users/{userId}                              — profile, role, familyId
inviteCodes/{code}                          — single-use, time-limited
families/{familyId}                         — family name, memberIds[]
families/{familyId}/choreGroups/{groupId}   — group + embedded chores[]
families/{familyId}/weeklyChores/{weekId}   — entire week's state in one doc (weekId = "2026-W17")
families/{familyId}/stores/{storeId}        — store config
families/{familyId}/groceryItems/{itemId}   — grocery list items (all stores, filtered by storeId)
families/{familyId}/quickPickItems/{itemId} — quick-pick catalog per store
families/{familyId}/recipes/{recipeId}      — family recipes, embedded ingredients[] + prepTasks[]
globalRecipes/{recipeId}                    — global shared recipe library (same shape as family recipe)
families/{familyId}/meals/{mealId}          — planned meals, embedded task assignments
families/{familyId}/aggregates/mealHistory  — compact last-30-served-meals summary (1 doc, AI input)
families/{familyId}/aggregates/taskHistory  — compact recent prep task completions (1 doc, AI input)
families/{familyId}/aggregates/purchasePatterns — per-item purchase frequency + recency (1 doc, AI input)
```

---

## Phase 0 — Project Scaffolding & Navigation Shell

> Goal: A running app with placeholder routes for every feature so multiple agents can build features in parallel without merge conflicts on routing or structure.

### 0.1 Project Init

- ⬜ `npm create vite@latest home-manager -- --template react-ts`
- ⬜ Install core dependencies: `react-router-dom`, `@tanstack/react-query`, `zustand`, `firebase`
- ⬜ Install UI dependencies: `tailwindcss`, `@tailwindcss/vite`, shadcn/ui init, `lucide-react`
- ⬜ Configure `tsconfig.json` — strict mode, path aliases (`@/` → `src/`)
- ⬜ Configure `vite.config.ts` — path alias to match tsconfig
- ⬜ Configure Tailwind — content paths, CSS variable theme (warm palette from brand-and-design.md)
- ⬜ Run `shadcn init` — Stone base, CSS variables on, radius 0.5rem

### 0.2 Firebase Setup

- ⬜ Create Firebase project (or confirm existing)
- ⬜ Enable Firebase Auth (email/password), Firestore, Storage, Functions, Hosting
- ⬜ Create `firebase.json` and `.firebaserc`
- ⬜ Configure Firebase Emulator Suite (auth, firestore, storage, functions ports)
- ⬜ Add `firebase.emulators` scripts to `package.json`
- ⬜ Create `src/shared/lib/firebase.ts` — single Firebase app init, connect to emulators in dev
- ⬜ Create `src/shared/lib/collections.ts` — all collection name constants (stubs for now, filled in Phase 1)

### 0.3 Folder Structure

- ⬜ Create all feature folders with empty `index.ts` barrel files:
  - `src/features/auth/`
  - `src/features/chores/`
  - `src/features/grocery/`
  - `src/features/meals/`
  - `src/features/profiles/`
- ⬜ Create `src/shared/components/`, `src/shared/hooks/`, `src/shared/lib/`, `src/shared/types/`
- ⬜ Create `src/app/` for root layout, providers, auth guard

### 0.4 Providers & Global State Stub

- ⬜ Create Zustand auth store stub (`src/shared/lib/authStore.ts`) — `{ user, familyId, role, isLoading }`
- ⬜ Create `src/app/Providers.tsx` — wraps `QueryClientProvider` + Zustand-initialized `AuthProvider`
- ⬜ Create `src/app/AuthProvider.tsx` — `onAuthStateChanged` listener; populates Zustand store

### 0.5 Routing & Navigation Shell

- ⬜ Create all route definitions in `src/app/router.tsx` using React Router v7
- ⬜ Route tree:
  ```
  /                     → redirect to /chores (if authed) or /login
  /login                → LoginPage (placeholder)
  /register             → RegisterPage (placeholder)
  /onboarding           → OnboardingPage (placeholder — create/join family gate)
  /chores               → ChoresPage (placeholder)
  /chores/manage        → ChoreManagePage (placeholder)
  /grocery              → GroceryPage (placeholder)
  /grocery/:storeId     → StoreListPage (placeholder)
  /meals                → MealsPage (placeholder)
  /meals/recipes        → RecipeBookPage (placeholder)
  /meals/recipes/:id    → RecipeDetailPage (placeholder)
  /meals/:mealId        → MealDetailPage (placeholder)
  /profile/:userId      → ProfilePage (placeholder)
  /settings             → SettingsPage (placeholder)
  ```
- ⬜ Create `AuthGuard` component — redirects unauthenticated users to `/login`
- ⬜ Create `FamilyGuard` component — redirects family-less users to `/onboarding`
- ⬜ Create `AppShell` layout component — top/side nav with links to all sections (placeholder nav items)
- ⬜ Create all placeholder page components (one file each, returns section title only)

### 0.6 Verify

- ⬜ `npm run dev` starts without errors
- ⬜ All routes resolve to their placeholder pages
- ⬜ `npm run typecheck` passes
- ⬜ `npm run lint` passes
- ⬜ Firebase emulators start cleanly alongside the dev server

---

## Phase 1 — TypeScript Interfaces

> Goal: All Firestore document shapes defined as TypeScript interfaces in `src/shared/types/`. No implementation code yet — just types and collection constants. Every subsequent phase imports from here; no inline anonymous types ever.

### 1.1 Auth & Family Types (`src/shared/types/auth.ts`)

- ⬜ `UserProfile` — userId, displayName, email, photoUrl, familyId, role, createdAt, updatedAt
- ⬜ `UserRole` — `'parent' | 'child'`
- ⬜ `Family` — familyId, name, memberIds, createdAt, updatedAt
- ⬜ `InviteCode` — code, familyId, role, createdBy, createdAt, expiresAt, used, usedBy, usedAt

### 1.2 Chore Types (`src/shared/types/chores.ts`)

- ⬜ `ChoreItem` — choreId, name, description (embedded in group)
- ⬜ `ChoreGroup` — groupId, familyId, name, description, assignmentType, fixedAssignees, rotationPool, rotationDurationWeeks, rotationStartDate, chores (ChoreItem[]), archived, createdAt, updatedAt
- ⬜ `WeeklyChoreAssignment` — assigneeId, assigneeName, groupName, chores record keyed by choreId
- ⬜ `WeeklyChoreEntry` — status (`pending | submitted | complete | needs_resubmission`), submittedAt, submittedBy, mediaUrl, verifiedAt, verifiedBy
- ⬜ `WeeklyChoreDoc` — weekId (e.g. `"2026-W17"`), weekStartDate, assignments record keyed by groupId, createdAt, updatedAt

### 1.3 Grocery Types (`src/shared/types/grocery.ts`)

- ⬜ `Store` — storeId, familyId, name, notes, archived, createdAt, updatedAt
- ⬜ `GroceryItem` — itemId, familyId, storeId, name, quantity, note, addedBy, addedAt, completed, completedAt, completedBy
- ⬜ `QuickPickItem` — itemId, familyId, storeId, name, defaultQuantity, defaultNote, createdAt, updatedAt
- ⬜ `PurchasePattern` — itemName, storeId, storeName, typicalQuantity, avgDaysBetweenPurchases, lastPurchasedAt, purchaseCount
- ⬜ `PurchasePatternsAggregate` — patterns record keyed by normalized item name, updatedAt

### 1.4 Recipe Types (`src/shared/types/recipes.ts`)

- ⬜ `CourseType` — `'entree' | 'side' | 'salad' | 'fruit' | 'dessert'`
- ⬜ `TaskDifficulty` — `'easy' | 'medium' | 'hard'`
- ⬜ `RecipeVisibility` — `'private' | 'global'`
- ⬜ `Ingredient` — ingredientId, name, quantity, storeId, storeName
- ⬜ `PrepTask` — taskId, description, difficulty, order
- ⬜ `Recipe` — recipeId, familyId (null if global), name, courseType, description, servingSize, visibility, sourceGlobalRecipeId, ingredients (Ingredient[]), prepTasks (PrepTask[]), archived, createdBy, createdAt, updatedAt

### 1.5 Meal Types (`src/shared/types/meals.ts`)

- ⬜ `MealStatus` — `'planned' | 'in_progress' | 'served'`
- ⬜ `MealTask` — taskId, description, difficulty, assigneeId, assigneeName, completedAt, completedBy (embedded)
- ⬜ `MealRecipe` — recipeId, recipeName, courseType, tasks (MealTask[]) (embedded)
- ⬜ `Meal` — mealId, familyId, name, date (ISO string), status, servedAt, recipes (MealRecipe[]), createdBy, createdAt, updatedAt
- ⬜ `MealHistorySummary` — mealId, date, recipeIds, recipeNames (compact, for aggregate)
- ⬜ `MealHistoryAggregate` — recentMeals (MealHistorySummary[], last 30), updatedAt
- ⬜ `TaskCompletionRecord` — userId, userName, taskDescription, difficulty, mealId, mealDate, completedAt (compact, for aggregate)
- ⬜ `TaskHistoryAggregate` — recentCompletions (TaskCompletionRecord[], last 50 per family), updatedAt

### 1.6 Collection Constants (`src/shared/lib/collections.ts`)

- ⬜ Fill in all collection/document path constants:
  - `USERS`, `INVITE_CODES`, `FAMILIES`, `GLOBAL_RECIPES`
  - `choreGroups(familyId)`, `weeklyChores(familyId)`, `stores(familyId)`
  - `groceryItems(familyId)`, `quickPickItems(familyId)`, `recipes(familyId)`, `meals(familyId)`
  - `aggregateMealHistory(familyId)`, `aggregateTaskHistory(familyId)`, `aggregatePurchasePatterns(familyId)`

### 1.7 Barrel Exports

- ⬜ `src/shared/types/index.ts` — re-exports all types from all type files

### 1.8 Verify

- ⬜ `npm run typecheck` passes with zero errors
- ⬜ No `any` types anywhere in `src/shared/types/`

---

## Phase 2 — Auth, Registration, Family Creation & User Profiles

> Goal: A fully working auth flow. Users can register, create or join a family, and view/edit profiles. All subsequent phases assume the auth context is available.

### 2.1 shadcn/ui Components to Install

- ⬜ `button`, `input`, `label`, `form`, `card`, `avatar`, `badge`, `separator`, `skeleton`, `toast`

### 2.2 Firebase Auth Wiring

- ⬜ Complete `AuthProvider` — `onAuthStateChanged`, load `UserProfile` from Firestore on login, populate Zustand store, handle loading state
- ⬜ Sign-up function (creates Firebase Auth user + writes `users/{userId}` doc)
- ⬜ Sign-in function
- ⬜ Sign-out function
- ⬜ Password reset function

### 2.3 Registration & Onboarding Pages

- ⬜ `RegisterPage` — name, email, password form; on success routes to `/onboarding`
- ⬜ `LoginPage` — email, password form; on success routes to app (or `/onboarding` if no family)
- ⬜ `OnboardingPage` — two-path gate: "Create a Family" or "Join with Invite Code"
  - Create path: family name input → creates `families/{familyId}`, updates user doc with familyId + role=parent
  - Join path: invite code input → validates code, joins family, invalidates code

### 2.4 Invite Code Management (Parent Flow)

- ⬜ `InviteManagementCard` component (used inside Settings or a modal)
- ⬜ Generate invite code — Cloud Function or client-side write to `inviteCodes/{code}` with TTL
- ⬜ List active (unused, unexpired) invite codes with copy-to-clipboard
- ⬜ Revoke invite code

### 2.5 User Profiles

- ⬜ `ProfilePage` — display name, photo, role, chore history section, meal task history section
- ⬜ Edit own display name and photo (upload to Firebase Storage, update `users/{userId}`)
- ⬜ Parent can edit any member's name, photo, role
- ⬜ `ChoreHistorySection` — week-by-week pagination, 10 weeks per page (reads `weeklyChores` docs, filters for user)
- ⬜ `MealTaskHistorySection` — paginated past task completions, 10 per page (reads from `taskHistoryAggregate` + individual meal docs as needed)

### 2.6 Settings Page

- ⬜ Family name rename (parent only)
- ⬜ Family member list with role display
- ⬜ Invite code management (parent only)
- ⬜ Remove member (parent only, with confirmation)

### 2.7 Verify

- ⬜ Register → onboarding → creates family → enters app
- ⬜ Register → onboarding → enters invite code → joins family as correct role
- ⬜ Auth guard redirects unauthenticated users
- ⬜ Family guard redirects family-less users to onboarding
- ⬜ `npm run typecheck` + `npm run lint` pass

---

## Phase 3 — Chores, Groups, Rotation & History

> Goal: Full chore management + weekly execution view + 12 weeks of seed data for the Grant family so the UI is immediately populated and testable.

### 3.1 shadcn/ui Components to Install

- ⬜ `dialog`, `select`, `checkbox`, `table`, `popover`, `calendar`, `dropdown-menu`, `alert-dialog`

### 3.2 Chore Group Management (Parent)

- ⬜ `ChoreManagePage` — list of all chore groups
- ⬜ `ChoreGroupCard` — name, assignment type, current assignee, chore count
- ⬜ `CreateEditChoreGroupDialog` — name, description, assignment type toggle
- ⬜ Fixed assignment: multi-select family members
- ⬜ Rotating assignment: ordered user pool, duration (weeks) selector, start date picker
- ⬜ Rotation schedule preview — calculated list of upcoming assignees (X weeks ahead)
- ⬜ `AddEditChoreDialog` — name, description; belongs to a group
- ⬜ Delete chore (soft-delete, confirmation required)
- ⬜ Archive chore group (confirmation required)
- ⬜ Manual rotation override for a specific week

### 3.3 Weekly Execution View

- ⬜ `ChoresPage` — real-time `onSnapshot` on `weeklyChores/{currentWeekId}`
- ⬜ Week navigation (prev / next week)
- ⬜ `ChoreGroupSection` — group name, assignee, list of chores with status badges
- ⬜ `ChoreRow` — chore name, status indicator, action button
  - Pending → "Submit" (child/parent uploads photo or video)
  - Submitted → "Verify" (parent only) or "Resubmit" (parent-triggered)
  - Complete → shows verified timestamp + verifier name
- ⬜ Photo/video upload to Firebase Storage; URL written to `weeklyChores` doc
- ⬜ Parent verify action — writes `verifiedAt`, `verifiedBy`, sets status to `complete`

### 3.4 Rotation Calculation Logic

- ⬜ Pure function `getCurrentAssignee(group: ChoreGroup, weekId: string): string` in `src/features/chores/`
- ⬜ Pure function `getRotationSchedule(group: ChoreGroup, weeksAhead: number): RotationEntry[]`
- ⬜ Weekly document generation — when a week doesn't exist yet, compute assignments from groups and create the doc (on first load of that week)

### 3.5 Seed Data Script

- ⬜ Create `scripts/seedChores.ts` — generates 12 weeks of past `weeklyChores` documents for the Grant family:
  - Family members: Jed + Brittany (parents), Brook, Nate, Ty, Spence (children)
  - At least 3 chore groups, mix of fixed (Jed/Brittany) and rotating (kids)
  - All past weeks marked complete with realistic timestamps
  - Current week has partial completions (some submitted, some verified, some pending)
- ⬜ Seed script targets Firestore emulator only

### 3.6 Verify

- ⬜ Weekly view shows all groups and chore states
- ⬜ Rotation preview correctly shows upcoming assignee sequence
- ⬜ Submit + verify flow updates UI in real time (onSnapshot)
- ⬜ Profile chore history shows correct weeks with pagination
- ⬜ Seed data populates correctly in emulator
- ⬜ `npm run typecheck` + `npm run lint` pass

---

## Phase 4 — Grocery Shopping

> Goal: Multi-store grocery lists with quick-pick, full shopping experience, purchase history recording.

### 4.1 shadcn/ui Components to Install

- ⬜ `command` (for searchable select / combobox), `sheet` (mobile list pane), `switch`

### 4.2 Store Management

- ⬜ `GroceryPage` — list of stores, each as a card with item count and "Shop" CTA
- ⬜ Add / edit / remove store (parent only, with confirmation for remove)

### 4.3 Shared Combobox Component

- ⬜ `src/shared/components/Combobox.tsx` — reusable searchable select, used for item name + store field throughout grocery and meal sections

### 4.4 Shopping List

- ⬜ `StoreListPage` — real-time `onSnapshot` on `groceryItems` filtered by storeId + not-completed
- ⬜ Add item form — name (combobox from history), quantity, note
- ⬜ `GroceryItemRow` — checkbox, name, quantity, note; check-off writes completedAt + completedBy
- ⬜ Completed items section — collapsible, shows with strikethrough; any member can uncheck
- ⬜ Parent-only edit + remove item actions
- ⬜ Pending item count badge on store card

### 4.5 Quick Pick

- ⬜ `QuickPickSheet` — slides up on "Quick Pick" button tap; per-store list of saved quick-pick items
- ⬜ Search/filter within quick-pick list
- ⬜ Tap to add (pre-populates name, quantity, note; user can adjust before confirming)
- ⬜ Multi-select + "Add Selected" action
- ⬜ Parent-only: add, edit, remove quick-pick items

### 4.6 Purchase Pattern Aggregation

- ⬜ Firestore trigger (or client-side write) on item completion → updates `aggregates/purchasePatterns` doc
  - Recalculates `avgDaysBetweenPurchases` and updates `lastPurchasedAt` for that item
  - Create entry if first purchase; update if existing

### 4.7 Verify

- ⬜ Items added by children appear in real time for all family members
- ⬜ Children cannot edit/remove items
- ⬜ Quick-pick adds to list correctly
- ⬜ `purchasePatterns` aggregate updates on item completion in emulator
- ⬜ `npm run typecheck` + `npm run lint` pass

---

## Phase 5 — Family Recipe Book

> Goal: Full recipe management — create, edit, AI-assist, archive, browse global library, fork global recipes into family collection.

### 5.1 shadcn/ui Components to Install

- ⬜ `tabs`, `badge`, `textarea`, `tooltip`, `collapsible`
- ⬜ Install drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable` (for prep task ordering)

### 5.2 Recipe Book Page

- ⬜ `RecipeBookPage` — tabs: "Our Recipes" (family) and "Global Library"
- ⬜ Filter by course type (Entrée, Side, Salad, Fruit, Dessert)
- ⬜ Search by name (client-side filter on loaded list)
- ⬜ `RecipeCard` — name, course type badge, ingredient count, task count

### 5.3 Recipe Detail & Edit

- ⬜ `RecipeDetailPage` — full recipe view: description, servings, ingredients, prep tasks
- ⬜ `RecipeEditPage` (or inline editing) — all fields editable by parents
- ⬜ Ingredient list management — add, edit, remove; name uses combobox from history
- ⬜ Store association per ingredient — combobox from family's configured stores
- ⬜ Prep task list management — add, edit, remove, drag-to-reorder, difficulty selector
- ⬜ Archive recipe (confirmation, checks for future meal references)
- ⬜ Promote to global / demote to private (parent only)

### 5.4 Global Recipe Library

- ⬜ Browse `globalRecipes` collection — read-only view
- ⬜ "Save to My Recipes" — forks global recipe into `families/{familyId}/recipes/` with `sourceGlobalRecipeId` set

### 5.5 AI: Suggest Recipe (Cloud Function)

- ⬜ Cloud Function `suggestRecipe(recipeName: string)` → calls Gemini, returns `{ description, ingredients, prepTasks }`
- ⬜ "AI Suggest Recipe" button on new recipe form — calls function, populates preview fields
- ⬜ User edits preview then saves — never auto-applies

### 5.6 AI: Suggest Tasks (Cloud Function)

- ⬜ Cloud Function `suggestTasks({ recipeName, ingredients, notes })` → returns `PrepTask[]`
- ⬜ "Suggest Tasks" button on recipe edit — calls function, appends to existing task list as editable preview

### 5.7 Verify

- ⬜ Create recipe with ingredients and tasks, save, view detail
- ⬜ Drag-to-reorder tasks persists
- ⬜ Fork global recipe — changes don't affect original
- ⬜ AI Suggest Recipe populates all fields in preview (requires emulated Gemini stub or live key)
- ⬜ `npm run typecheck` + `npm run lint` pass

---

## Phase 6 — Meal Planner

> Goal: Calendar view for planning meals from the recipe book, task assignment, task completion flow, and meal history.

### 6.1 shadcn/ui Components to Install

- ⬜ `calendar` (already installed in Phase 3, confirm), `scroll-area`

### 6.2 Meal Planning Calendar

- ⬜ `MealsPage` (calendar) — week and month view; days show meals at a glance
- ⬜ Click a day → open meal for that date (or create new)
- ⬜ `MealDetailPage` — shows all recipes in the meal, each with their task list and assignees
- ⬜ Status badge (Planned / In Progress / Served)
- ⬜ "Mark as Served" button (parent) — confirms, locks meal, triggers meal history aggregate update

### 6.3 Composing a Meal

- ⬜ Create meal for a date — name (optional), date picker
- ⬜ Add recipes — search/browse from recipe book, add by course type
- ⬜ Each added recipe expands to show its tasks (ready for assignment)
- ⬜ Remove recipe from meal (before Served)

### 6.4 Task Assignment

- ⬜ Per-task assignee selector — combobox from family member roster
- ⬜ Unassigned tasks visually flagged with warning state
- ⬜ Assigned user (or parent) can mark own tasks complete
- ⬜ Completion writes user + timestamp to embedded `MealTask`

### 6.5 AI: Suggest Meal (Cloud Function)

- ⬜ Cloud Function `suggestMeal(familyId)` → reads 1 doc (`aggregates/mealHistory`), reads family recipe book, calls Gemini → returns recipe combination suggestion
- ⬜ "AI Suggest Meal" button on calendar day → shows preview with course-by-course selection
- ⬜ User can swap individual courses before confirming

### 6.6 AI: Fair Task Assignment (Cloud Function)

- ⬜ Cloud Function `assignTasks({ familyId, mealId })` → reads 1 doc (`aggregates/taskHistory`), reads meal tasks, calls Gemini → returns `{ taskId, assigneeId, rationale }[]`
- ⬜ "AI Assign Tasks" button on meal → shows full proposed assignment with per-task rationale
- ⬜ User can override any individual task; confirms to apply all

### 6.7 Meal History Aggregate Maintenance

- ⬜ On "Mark as Served" → write compact `MealHistorySummary` entry to `aggregates/mealHistory.recentMeals[]` (trim to last 30)
- ⬜ On task completion → write compact `TaskCompletionRecord` to `aggregates/taskHistory.recentCompletions[]` (trim to last 50)

### 6.8 Verify

- ⬜ Plan a meal, assign tasks, mark tasks complete, mark served
- ⬜ Served meal appears correctly in calendar history
- ⬜ `mealHistory` and `taskHistory` aggregates update on meal served
- ⬜ AI Suggest Meal returns sensible suggestion from recipe book
- ⬜ AI Assign Tasks proposes fair distribution with rationale
- ⬜ `npm run typecheck` + `npm run lint` pass

---

## Phase 7 — AI Features (Grocery)

> Goal: Complete the two remaining AI features scoped to the grocery section. Recipe/meal AI features were delivered in Phases 5–6. These two require the `purchasePatterns` aggregate built in Phase 4.

### 7.1 AI: Shopping Suggestions (Cloud Function)

- ⬜ Cloud Function `shoppingSuggestions(familyId)` → reads 1 doc (`aggregates/purchasePatterns`), calls Gemini → returns ranked `{ itemName, storeId, storeName, typicalQuantity, overdueSignal }[]`
- ⬜ "What do we need?" button on Grocery home page → calls function, shows grouped-by-store suggestion list
- ⬜ Per-item "Add" action → adds to store's grocery list
- ⬜ "Add All" → adds all to respective lists
- ⬜ Dismiss individual suggestions

### 7.2 AI: Shop for This (Cloud Function)

- ⬜ Cloud Function `shopForThis({ familyId, recipeId })` → reads recipe (1 doc) + `purchasePatterns` (1 doc) → calls Gemini → returns `{ ingredient, storeId, suggestedQuantity, likelyHave: boolean }[]`
- ⬜ "AI Shop for This" button on recipe-in-meal → shows store-grouped preview
- ⬜ Items flagged `likelyHave: true` are pre-deselected (togglable)
- ⬜ Items with no store association show AI-suggested store (changeable)
- ⬜ Duplicate detection — flag items already on the target store's active list
- ⬜ Confirm → writes selected items to respective `groceryItems` collections

### 7.3 Verify

- ⬜ Shopping suggestions surface items that are overdue based on seed purchase history
- ⬜ "Shop for This" correctly pre-deselects recently purchased items
- ⬜ Confirming adds items to the correct store list
- ⬜ `npm run typecheck` + `npm run lint` pass

---

## Progress Summary

| Phase | Status | Notes |
|---|---|---|
| 0 — Scaffolding & Navigation Shell | ⬜ Not Started | |
| 1 — TypeScript Interfaces | ⬜ Not Started | |
| 2 — Auth / Registration / Family / Profiles | ⬜ Not Started | |
| 3 — Chores / Groups / Rotation / Seed Data | ⬜ Not Started | |
| 4 — Grocery Shopping | ⬜ Not Started | |
| 5 — Family Recipe Book | ⬜ Not Started | |
| 6 — Meal Planner | ⬜ Not Started | |
| 7 — AI Features (Grocery) | ⬜ Not Started | |
