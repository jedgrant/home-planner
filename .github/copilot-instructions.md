# Home Manager — Copilot Instructions

## Project Overview

Home Manager is a family household management app: chores, grocery shopping, and meal planning. React 19 SPA backed by Firebase. Full requirements and design decisions live in `documentation/` — read the relevant doc before changing behavior in a section.

| Doc | Contents |
|---|---|
| `documentation/README.md` | Full project scope |
| `documentation/tech-stack.md` | Stack decisions and rationale |
| `documentation/brand-and-design.md` | Visual design system, palette, shadcn config |
| `documentation/auth-and-profiles.md` | Auth, family creation, roles |
| `documentation/chores.md` | Chores, groups, rotation, verification |
| `documentation/grocery-shopping.md` | Stores, lists, quick-pick |
| `documentation/meal-planning.md` | Recipes, meals, task assignment, Gemini integration |

---

## Folder Structure

```
src/
  app/                    # Root layout, routing setup, auth guard, providers
  features/
    auth/                 # Registration, login, family creation/join
    chores/               # Chore management + weekly execution view
    grocery/              # Stores, lists, quick-pick
    meals/                # Recipe book, meal planner, task assignment
    profiles/             # User profile pages and history
  shared/
    components/           # Reusable UI components used across 2+ features
    hooks/                # Reusable custom hooks
    lib/                  # Firebase init, utility functions, helpers
    types/                # Shared TypeScript types and interfaces
```

Each feature folder mirrors this internal shape when needed:
```
features/<name>/
  components/             # UI components for this feature only
  hooks/                  # Feature-scoped hooks
  types.ts                # Feature-local types (if not shared)
  index.ts                # Public barrel export for the feature
```

Never reach across features directly — import from `shared/` or the feature's `index.ts`.

---

## File & Component Rules

- **One component per file.** No file exports two sibling components of equal weight.
- **File line limit: 250 lines** for component files (`.tsx`). If a file exceeds this, split it.
- **File line limit: 150 lines** for hooks, utilities, and non-component `.ts` files.
- **No god files.** A file that does data fetching, business logic, AND renders JSX needs to be split.
- Name files after the component they export: `ChoreCard.tsx` exports `ChoreCard`.
- Barrel `index.ts` files are acceptable for feature exports but must not contain logic.

---

## TypeScript

- Strict mode is on. No `any`. No `@ts-ignore` without a comment explaining why.
- Define types and interfaces in the closest appropriate scope. Shared types go in `shared/types/`.
- Use `type` for unions and primitives; use `interface` for object shapes that may be extended.
- Props interfaces are named `<ComponentName>Props`.
- Firebase document shapes are defined as TypeScript interfaces in `shared/types/` and reused everywhere — never inline anonymous Firestore document types.

---

## State Management

- **TanStack Query** for all Firestore one-time reads (`.get()`). Use `queryKey` arrays that include the family ID and any relevant IDs.
- **Firestore `onSnapshot`** for views that need real-time updates: chore weekly view, active shopping lists, meal task view.
- **Zustand** for global client state only: current user, family ID, auth status. Keep this store minimal.
- Do not use `useEffect` to fetch data — use TanStack Query or a dedicated `useSnapshot` hook.
- Co-locate data-fetching hooks with the feature that owns the data.

---

## Component Patterns

- **Default to existing components.** Use shadcn/ui first. Extend with props or `className` before creating anything new. Do not create one-off variant components.
- If a new shared component or new UX pattern seems necessary, **ask the user before building it.** Introducing new patterns without confirmation is a source of bloat.
- A new component is justified only when it is genuinely reused in 2+ distinct places AND no existing component can be extended to cover it.
- Prefer **small, focused components** over large ones. If a component takes more than 6 props, consider whether it should be split.
- Extract repeated JSX blocks into named sub-components in their own files.
- All interactive elements must be keyboard-navigable and have appropriate ARIA labels.
- See `.github/instructions/react-components.instructions.md` for detailed component conventions.

---

## Firebase

- The Firebase app is initialized once in `src/shared/lib/firebase.ts`. Import from there everywhere.
- Never call Firebase services with hardcoded strings for collection names — define collection name constants in `src/shared/lib/collections.ts`.
- All Firestore writes include a `updatedAt` timestamp via `serverTimestamp()`.
- Firestore Security Rules are the authority on access control. Client-side role checks are UX only.
- All development runs against the **Firebase Emulator Suite** — never target production from a local dev environment.
- See `.github/instructions/firebase.instructions.md` for data access patterns.

---

## Styling

- Tailwind utility classes only — no plain CSS files, no CSS modules, no inline `style` props.
- Use the shadcn/ui CSS variable tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border`, `primary`, etc.) rather than hardcoded Tailwind color classes.
- Never use `text-black`, `bg-white`, or arbitrary hex values in class strings.
- See `.github/instructions/styling.instructions.md` for full palette mapping and component styling patterns.

---

## Dev & Build

```bash
# Install
npm install

# Start local dev (Firebase emulators must be running)
firebase emulators:start
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint

# Test
npm run test

# Build
npm run build
```

All local dev targets the Firebase Emulator Suite. Do not run `firebase deploy` unless explicitly asked.
