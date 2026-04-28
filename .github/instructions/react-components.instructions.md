---
description: "Use when creating, editing, or reviewing React components (.tsx files). Covers component structure, props, naming, file size, splitting, shadcn/ui usage, and accessibility patterns for this project."
applyTo: "**/*.tsx"
---

# React Component Conventions

## Anti-Bloat Rule (Read First)

**Default to using what already exists. Bias strongly against creating new components or new UX patterns.**

Before creating any new component, ask:
1. Does a shadcn/ui component already do this? → Use it.
2. Does an existing project component already do this, or nearly do this? → Extend it via props or `className`.
3. Is this a genuinely new, reusable pattern used in 2+ places? → Create it, but flag it in the response.
4. Is this a one-off variant needed in exactly one place? → **Do not create a new component.** Compose from existing primitives inline.

If the right path is unclear — especially if it might require introducing a new shared component or a new UX interaction pattern — **stop and ask the user** before building. One well-placed question prevents entire categories of rework.

Examples of what to avoid:
- `PrimaryButton`, `DangerButton`, `LargeButton` — use `<Button variant="..." size="...">` from shadcn.
- `ChoreListEmptyState`, `GroceryListEmptyState` — create one `EmptyState` component in `shared/components/`.
- A custom dropdown when `DropdownMenu` from shadcn already handles it.
- A hand-rolled modal when `Dialog` from shadcn exists.

This rule applies to UX patterns too — if a new interaction model (a multi-step flow, a custom gesture, an inline editor) would be needed, flag it and get confirmation before implementing.

## File & Naming Rules

- One component per file. The file name matches the export: `ChoreCard.tsx` exports `ChoreCard`.
- **250-line limit** for `.tsx` files. If you are approaching this, split before exceeding it.
- Sub-components that only exist to support one parent component live in their own file (e.g., `ChoreCardHeader.tsx`), not inlined in the parent.
- Group files by feature, not by type. A chore component lives in `src/features/chores/components/`, not a global `components/` folder unless it's genuinely reusable across 2+ features.

## Props

- Define a `<ComponentName>Props` interface for every component — no inline anonymous prop types.
- Props interfaces live at the top of the file, above the component function.
- Maximum 6 props before considering a split. If you need more, group related props into a sub-object or split the component.
- Children should be typed as `React.ReactNode` when accepted.

```tsx
interface ChoreCardProps {
  chore: Chore;
  isComplete: boolean;
  onVerify: (choreId: string) => void;
}

export function ChoreCard({ chore, isComplete, onVerify }: ChoreCardProps) {
  // ...
}
```

## Component Structure (order inside a file)

1. Imports
2. Props interface
3. Any component-local constants or helpers (small, pure functions only — if it's significant logic, move to a hook or util)
4. Component function
5. Default export (named exports are preferred; default is acceptable)

## Hooks

- Do not call data-fetching logic directly in a component. Extract it into a custom hook in the `hooks/` folder alongside the feature.
- `useEffect` must never be used to fetch data — use TanStack Query hooks or a `useSnapshot` pattern.
- One concern per hook: a hook that subscribes to Firestore AND manages local form state should be split.
- **150-line limit** for hook files.

## Splitting Components

Split a component when any of these are true:
- File exceeds 250 lines.
- A section of JSX is conditionally rendered and complex enough to be self-contained.
- A logical sub-section (header, footer, list item, empty state) can be named clearly.
- The component fetches its own data AND renders the result (separate into a container hook + presentational component).

## shadcn/ui Usage

- Always reach for a shadcn/ui component before building anything from scratch: `Button`, `Input`, `Dialog`, `Select`, `Checkbox`, `DropdownMenu`, `Popover`, `Sheet`, `Badge`, `Separator`, `Skeleton`, etc.
- Import from the component path: `import { Button } from "@/shared/components/ui/button"`.
- Extend shadcn components with Tailwind classes via the `className` prop — do not duplicate the component file just to restyle it.
- For searchable selects (ingredient names, store names, item names), use the `Combobox` pattern built on `Command` + `Popover` from shadcn.

## Accessibility

- Every interactive element (`Button`, `IconButton`, custom clickable) must have either visible text or an `aria-label`.
- Form inputs must have a visible `<label>` or `aria-labelledby` — never a placeholder alone.
- Modal dialogs must use `Dialog` from shadcn/ui (built on Radix), which handles focus trapping and ARIA roles automatically.
- Icon-only buttons require `aria-label` describing the action, not the icon name.

```tsx
// Good
<Button aria-label="Delete chore">
  <Trash2 className="h-4 w-4" />
</Button>

// Bad
<button onClick={handleDelete}>
  <Trash2 />
</button>
```

## Loading & Error States

- Every component that loads async data must handle three states: loading, error, and success.
- Use shadcn `Skeleton` for loading states that reflect the shape of the content.
- Display a meaningful inline error message — do not silently fail or crash.
- TanStack Query's `isLoading`, `isError`, and `data` destructured from `useQuery` are the standard pattern.
