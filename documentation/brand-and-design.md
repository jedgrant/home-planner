# Brand & Design

**Version:** 0.1 (Draft)
**Last Updated:** April 27, 2026
**Parent Document:** [README.md](./README.md)

---

## Design Direction

Home Manager should feel like it belongs on the countertop of a well-designed kitchen — calm, intentional, and uncluttered. The visual language is **warm minimalism**: generous whitespace, soft neutral tones, and restrained use of color so that the content (names, tasks, lists) is always the focal point. Nothing should feel clinical or corporate, but nothing should feel playful or juvenile either. The app needs to serve a six-year-old checking off a chore and a parent reviewing the week's meal plan with equal comfort.

**Three words to calibrate against:** Calm. Warm. Considered.

---

## Color Palette

The palette is built on warm off-whites and soft neutrals, with a single restrained accent used sparingly for primary actions.

| Role | Description | Example Value |
|---|---|---|
| **Background** | Warm off-white; never pure white | `#FAF9F7` |
| **Surface** | Cards, panels, modals — slightly warmer than background | `#F4F2EE` |
| **Border / Divider** | Soft warm gray | `#E5E2DC` |
| **Text — Primary** | Deep warm charcoal; avoid pure black | `#1C1917` |
| **Text — Secondary** | Medium warm gray for captions, metadata | `#78716C` |
| **Text — Disabled / Placeholder** | Light warm gray | `#A8A29E` |
| **Accent (Primary Action)** | A single muted warm tone — earthy terracotta or dusty sage; pick one. | e.g., `#B45309` (amber-700) or `#4A7C59` (sage) |
| **Accent — Hover / Pressed** | Darkened version of accent | ~15% darker |
| **Destructive** | Muted red; not aggressive | `#B91C1C` |
| **Success** | Muted green; completion states | `#15803D` |

> **Accent choice:** Select one accent and use it consistently. Terracotta/amber reads warmer and more rustic; sage reads cleaner and more contemporary. Either works — commit to one.

Dark mode should use the same warm neutrals inverted (deep warm charcoal backgrounds, not cold grays).

---

## Typography

- **Primary typeface:** A clean, humanist sans-serif. Recommended: **Inter** (widely available, excellent legibility at all sizes).
- **Headings:** Same typeface, medium or semibold weight. Avoid decorative or serif typefaces in the UI.
- A subtle serif accent (e.g., for empty-state headlines or marketing-style moments) is acceptable sparingly — but is not required and should not be in the component system.
- **Scale:** Use a modest type scale. Body text at 15–16px. Generous line height (1.6). Let whitespace do the work.
- **Weight vocabulary:** Regular (body), Medium (labels, subheadings), Semibold (headings, emphasis). Avoid Bold except for numbers/stats.

---

## Spacing & Shape

- **Spacing:** 4px base unit. Prefer generous internal padding (16–24px in cards). Let things breathe.
- **Border radius:** Softly rounded — 8–12px on cards and inputs, 6px on buttons, full-pill only for status badges/chips.
- **Shadows:** Extremely subtle. A single faint shadow on cards; no dramatic drop shadows. Elevation should be conveyed through tone, not shadow depth.
- **Density:** Comfortable, not dense. Prioritize scanability over fitting more on screen.

---

## Iconography

- Use a **single, consistent icon set** throughout. Recommended: **Lucide** (clean, modern, open-source, well-matched to shadcn/ui).
- Icons should be outline style, 20–24px in UI contexts.
- Never mix icon libraries.

---

## Illustration & Imagery

- Illustrations should be used sparingly — primarily in empty states and onboarding.
- Style: **Simple, warm line illustrations** with minimal fill. Think household objects rendered cleanly with a hand-crafted-but-minimal quality. Soft curves over sharp geometry.
- Avoid: stock photography, hyper-realistic art, cartoonish characters with exaggerated proportions.
- Profile photos are the only place real photography appears in the UI; they should be displayed in circular crops with a soft border.

---

## Tone of Voice (UI Copy)

- Friendly and direct. Write like a thoughtful adult leaving a note on the fridge — not a corporate product.
- Use plain language. "Add a chore" not "Create a new chore item."
- Avoid exclamation marks except in genuine celebratory moments (e.g., completing a full week of chores).
- Empty states should be warm and inviting, not apologetic. ("Nothing on the list yet — add your first item.")

---

## Design System Recommendation

**Use [shadcn/ui](https://ui.shadcn.com/) with Tailwind CSS.**

Rationale for AI coding agents:
- shadcn/ui is exceptionally well-represented in AI training data and is understood deeply by modern coding agents (Copilot, Cursor, Claude, etc.).
- Components are copied into the project rather than imported from a black-box library — the agent can read, modify, and extend every component directly.
- Built on **Radix UI** primitives, which provide accessible, headless behavior (dropdowns, dialogs, popovers, etc.) without requiring the agent to implement interaction logic.
- The **"Stone" or "Neutral" base theme** maps directly to the warm gray palette described above with minimal overrides needed.
- Tailwind utility classes make one-off styling adjustments readable and reviewable rather than hidden in CSS files.

**Configuration notes for the agent:**
- Set `cssVariables: true` in the shadcn config so the palette above can be applied via CSS custom properties and swapped cleanly for dark mode.
- Override the default shadcn radius to `0.5rem` (8px) to match this spec.
- Set the Tailwind `fontFamily.sans` to `['Inter', 'sans-serif']`.
- The accent color should be mapped to shadcn's `primary` token; status colors (success, destructive) map to their respective tokens.
- Lucide React is included by default in shadcn/ui setups — no additional icon library is needed.
