# Tech Stack

**Version:** 0.1 (Draft)
**Last Updated:** April 27, 2026
**Parent Document:** [README.md](./README.md)

---

## Overview

Home Manager is built as a single-page React application backed by Firebase. This document describes every layer of the stack, the rationale for each choice, and the notes an AI coding agent needs to work within it consistently.

---

## Why Not Next.js

Next.js is a strong default for many React projects, but it is the wrong fit here for several concrete reasons:

- **The entire app is authenticated.** There are no public-facing pages that benefit from server-side rendering or SEO. Next.js's primary value proposition does not apply.
- **Firestore real-time listeners are awkward in SSR.** `onSnapshot` subscriptions belong in a browser, not a server render cycle. Next.js App Router's React Server Components add friction without benefit for data that is inherently real-time and user-scoped.
- **Firebase Auth becomes complex under SSR.** Keeping session tokens synchronized between the server and client requires cookie management, middleware, and hydration care that is unnecessary overhead for an SPA.
- **Cloud Functions replace the one thing Next.js would add.** The only reason to reach for Next.js in an otherwise-SPA project is to keep secrets (LLM API keys) off the client. Firebase Cloud Functions handle this cleanly without adopting the full Next.js runtime.

**Verdict:** Vite SPA — simpler, faster, and a better match for Firebase's real-time model.

---

## Stack

### Build & Runtime

| Layer | Choice | Version |
|---|---|---|
| Build tool | **Vite** | Latest stable |
| UI framework | **React** | 19 |
| Language | **TypeScript** | 5.x |

**Rationale:** Vite provides near-instant hot module replacement and a straightforward config surface. React 19 is the version the developer is most familiar with and is the basis for the entire component ecosystem used here. TypeScript is non-negotiable for a project of this scope — it surfaces data model errors early and gives AI coding agents accurate auto-complete context.

---

### UI & Styling

| Layer | Choice |
|---|---|
| Utility styling | **Tailwind CSS** |
| Component library | **shadcn/ui** |
| Headless primitives | **Radix UI** (via shadcn) |
| Icons | **Lucide React** (via shadcn) |

**Rationale:** Defined in [brand-and-design.md](./brand-and-design.md). shadcn/ui copies components into the project rather than importing them from a package — every component is readable and editable by both developers and AI coding agents. Radix UI handles accessible interaction patterns (dialogs, dropdowns, popovers, toasts) so they do not need to be hand-rolled. Lucide is the default icon set bundled with shadcn setups.

---

### Routing

| Layer | Choice |
|---|---|
| Client-side router | **React Router v7** |

**Rationale:** React Router v7 supports nested layouts and loader patterns that map cleanly to this app's structure (authenticated shell → section → detail). It is deeply familiar to the React ecosystem and well-understood by AI coding agents. All routes are protected behind an auth check at the root layout level; unauthenticated users are redirected to the sign-in screen.

---

### Backend — Firebase

All backend services are provided by Firebase. No separate server is required.

| Service | Purpose |
|---|---|
| **Firebase Auth** | Email/password authentication, session management, invitation link handling |
| **Firestore** | Primary database for all application data |
| **Firebase Storage** | Chore completion photo and video uploads |
| **Cloud Functions** | LLM API calls (Gemini), invitation email dispatch, any privileged server-side logic |
| **Firebase Hosting** | Static asset hosting and deployment |

**Firestore data access pattern:**
- Real-time `onSnapshot` subscriptions are used where live updates matter: the weekly chore view, active shopping lists, and the current meal plan.
- TanStack Query (see below) is used for one-time reads where real-time is not needed: profile history, recipe book browsing, chore management screens.

**Rules:** Firestore Security Rules enforce all role-based access (parent vs. child) at the database level. Client-side role checks are a UX convenience only and are not trusted for security.

---

### Data & State Management

| Layer | Choice | Purpose |
|---|---|---|
| Server state / caching | **TanStack Query (React Query) v5** | Firestore one-time reads, loading/error states, cache invalidation |
| Global client state | **Zustand** | Current user session, family ID, lightweight cross-component state |
| Real-time subscriptions | **Firestore `onSnapshot`** | Chore weekly view, shopping lists, meal task updates |

**Rationale:** TanStack Query handles the async lifecycle (loading, error, stale, refetch) cleanly and pairs well with Firestore's promise-based reads. Zustand is a minimal, boilerplate-free store for the small amount of true global client state (who is logged in, what family they belong to). It is intentionally kept small — most state lives in the component tree or in TanStack Query's cache.

---

### LLM Integration — Gemini

AI is a first-class feature of this product. All LLM calls are made server-side via **Firebase Cloud Functions** using **Google Gemini**. The Gemini API key is stored as a Firebase secret and is never exposed to the client.

| AI Feature | Trigger | Inputs to Gemini | Output |
|---|---|---|---|
| **AI Suggest Recipe** | Parent taps "AI Suggest Recipe" with a recipe name | Recipe name, optional notes | Description, ingredient list with quantities, ordered prep task list with difficulty ratings |
| **AI Suggest Tasks** | Parent taps "Suggest Tasks" on an existing recipe | Recipe name, ingredient list, existing notes | Ordered prep task list with difficulty ratings |
| **AI Suggest Meal** | Parent taps "AI Suggest Meal" for a date | Family recipe book (names + course types), recent meal history | Suggested meal combination drawn from existing recipes |
| **AI Assign Tasks** | Parent taps "AI Assign Tasks" on a planned meal | All prep tasks + difficulties, each member's recent task history and load | Full suggested task-to-person assignment with rationale |
| **AI Shop for This** | Parent taps "AI Shop for This" on a recipe in a meal | Recipe ingredients, family purchase history, configured stores | Shopping list preview grouped by store, with stocked-item flags and inferred stores |
| **AI Shopping Suggestions** | Parent taps "What do we need?" | Full purchase history across all stores | Ranked list of likely-needed items grouped by store, with recency signals |

**Shared architecture for all AI calls:**

1. The client calls a named HTTPS callable Cloud Function via `httpsCallable()`.
2. The function verifies `request.auth` — unauthenticated calls are rejected immediately.
3. The function calls the Gemini API using the secret-stored API key.
4. The function returns structured JSON to the client.
5. The client presents the output as a user-editable preview — AI output is never applied automatically without user confirmation.

**Graceful degradation:** Every AI-powered button must handle failure gracefully. If a Cloud Function call fails or times out, the button returns to its idle state and displays an inline error. The user can retry or proceed manually. No feature is blocked by AI unavailability.

---

### Developer Tooling

| Tool | Purpose |
|---|---|
| **ESLint** | Linting (with React and TypeScript rules) |
| **Prettier** | Code formatting |
| **Vitest** | Unit and component testing |
| **React Testing Library** | Component test utilities |
| **Firebase Emulator Suite** | Local development — Auth, Firestore, Storage, Functions all run locally without touching production |

**Firebase Emulator Suite** is the most important dev tooling item. All local development runs against the emulator. This means no test data enters production, Cloud Functions can be tested without deployment, and Firestore rules can be iterated quickly.

---

## Package Summary (Key Dependencies)

```
react, react-dom
react-router-dom
typescript
vite
tailwindcss, @tailwindcss/vite
@radix-ui/* (via shadcn)
lucide-react
@tanstack/react-query
zustand
firebase
@google/generative-ai  ← used in Cloud Functions only, not the client bundle
```

---

## Environment Variables

All secrets live in Firebase environment config (Functions) or `.env` files that are never committed.

| Variable | Where Used |
|---|---|
| `GEMINI_API_KEY` | Cloud Function environment (Firebase secret) |
| `VITE_FIREBASE_*` (public config) | Client `.env` — these are the standard Firebase Web SDK config values and are safe to expose |

No other secrets exist. There is no separate backend server and no database password.

---

## Deployment

- **Client:** `vite build` output deployed to **Firebase Hosting** via `firebase deploy`.
- **Functions:** TypeScript Cloud Functions deployed via `firebase deploy --only functions`.
- Both are deployed from the same Firebase project and share the same Auth, Firestore, and Storage instance.
