---
description: "Use when writing or reviewing Tailwind CSS classes, component styling, colors, spacing, or shadcn/ui theme tokens in this project. Covers the warm-minimalist palette, token mapping, and patterns to avoid."
applyTo: "**/*.tsx"
---

# Styling Conventions

Full design rationale is in `documentation/brand-and-design.md`. This file is the implementation reference.

## Core Rules

- **Tailwind utility classes only.** No CSS files, no CSS modules, no `style` props.
- **Use semantic tokens, not raw colors.** Always use the shadcn CSS variable tokens. Never hardcode hex values or raw Tailwind color palette classes (`text-black`, `bg-white`, `text-gray-700`, etc.) in component code.
- If a color need isn't covered by the token list below, check `documentation/brand-and-design.md` and map it to the nearest token — don't introduce a new color.

## Token Reference

| Token | Usage |
|---|---|
| `bg-background` | Page / screen background |
| `bg-card` | Card and panel surfaces |
| `bg-muted` | Subtle background for inactive or secondary areas |
| `bg-primary` | Accent / primary action backgrounds |
| `bg-destructive` | Destructive action backgrounds |
| `text-foreground` | Primary body text |
| `text-muted-foreground` | Secondary text, captions, metadata, placeholders |
| `text-primary` | Accent-colored text or icon |
| `text-primary-foreground` | Text on top of `bg-primary` |
| `text-destructive` | Error text |
| `border` | Default border color |
| `ring` | Focus ring |

## Typography

- Body text: `text-sm` (14px) for dense lists, `text-base` (16px) for reading content.
- Subheadings / labels: `text-sm font-medium`.
- Section headings: `text-lg font-semibold` or `text-xl font-semibold`.
- Captions / metadata: `text-xs text-muted-foreground`.
- Never use `font-bold` for headings — use `font-semibold`. Reserve `font-bold` for numbers and standout stats only.

## Spacing

- Use Tailwind's spacing scale with generous values. Prefer `p-4` (16px) or `p-6` (24px) for card interiors.
- Use `gap-3` or `gap-4` for flex/grid item spacing. Avoid `gap-1` or `gap-2` except for tight inline icon+text pairs.
- Sections within a view should be separated with `space-y-6` or `space-y-8`.

## Shape & Radius

- Cards and panels: `rounded-xl` (matches the 12px spec).
- Inputs and buttons: `rounded-lg` (default from shadcn — do not override).
- Status chips and badges: `rounded-full`.
- Never use `rounded-none` or `rounded-sm` for interactive elements.

## Shadows & Elevation

- Cards: `shadow-sm` at most. Do not use `shadow-md`, `shadow-lg`, or custom shadow utilities.
- Elevation hierarchy should be communicated through background tone (`bg-background` vs `bg-card`), not shadow depth.
- Modals and sheets (from shadcn) handle their own elevation — do not add extra shadow classes to Dialog or Sheet children.

## Interactive States

- Hover: shadcn components handle this. For custom touchable areas, add `hover:bg-muted transition-colors`.
- Focus: rely on shadcn's built-in `ring` focus styles — do not add `outline-none` without restoring a visible focus indicator.
- Disabled: `opacity-50 pointer-events-none` on wrappers, or use the `disabled` prop on shadcn components.
- Destructive hover: `hover:bg-destructive/10` for soft destructive affordance before a confirm step.

## Dark Mode

- Do not hardcode light-only classes. All token-based classes (`bg-background`, `text-foreground`, etc.) automatically handle dark mode via CSS variables.
- If a truly custom color is unavoidable, always pair light and dark variants: `bg-stone-100 dark:bg-stone-800`.

## Patterns to Avoid

```tsx
// Bad — hardcoded color
<p className="text-gray-500">Last updated</p>

// Good — semantic token
<p className="text-muted-foreground">Last updated</p>

// Bad — inline style
<div style={{ padding: 16 }}>

// Good — Tailwind
<div className="p-4">

// Bad — arbitrary value
<div className="bg-[#FAF9F7]">

// Good — token
<div className="bg-background">
```

## Responsive Layout

- Mobile-first. Base styles are mobile, `md:` and `lg:` add desktop layout.
- Use CSS Grid (`grid grid-cols-1 md:grid-cols-2`) or Flexbox for layout — not absolute positioning for flow content.
- Sidebar/nav patterns: use `Sheet` from shadcn for mobile drawers; render a persistent sidebar with `hidden md:flex` for desktop.
- Touch targets: any tappable element should be at least 44×44px on mobile. Use `min-h-[44px] min-w-[44px]` or `p-3` to ensure comfort.
