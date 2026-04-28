# Home Manager — Product Overview

**Version:** 0.1 (Draft)
**Last Updated:** April 27, 2026

---

## Overview

Home Manager is a family-oriented web and responsive mobile application that centralizes the everyday logistics of running a household. It gives families a single place to coordinate chores, grocery shopping, meal planning, and meal preparation, with clear visibility into who is doing what and a history of contributions over time.

The product is designed with two primary user roles in mind: **parents** (administrators) and **children** (members). Parents have full management authority across all data and household members. Children participate in assigned tasks and can manage their own profile details.

---

## Core Principles

- **Clarity** — Every family member should immediately know what is expected of them.
- **Accountability** — Contributions are recorded and visible, reducing friction around fairness.
- **Efficiency** — Repetitive data entry is minimized through smart defaults, quick-pick lists, and AI assistance at every friction point.
- **Flexibility** — The system supports both structured rotation for recurring responsibilities and ad-hoc assignment for one-off tasks.
- **AI-augmented, human-confirmed** — AI features accelerate every tedious part of household management (recipe creation, task assignment, shopping lists), but no AI action is applied without explicit user review and confirmation.

---

## Functional Scope

The application is organized into four core sections, each documented in detail in the files linked below.

| Section | Description | Document |
|---|---|---|
| **Brand & Design** | Visual language, color palette, typography, and design system guidance for AI coding agents | [brand-and-design.md](./brand-and-design.md) |
| **Tech Stack** | Framework, Firebase services, routing, state management, LLM integration, and tooling decisions | [tech-stack.md](./tech-stack.md) |
| **Authentication & User Profiles** | Family onboarding, user invitations, role management, and profile history | [auth-and-profiles.md](./auth-and-profiles.md) |
| **Chores** | Chore and group management, weekly rotation, assignment visibility, and completion verification | [chores.md](./chores.md) |
| **Grocery Shopping** | Store and item management, quick-pick lists, shopping completion tracking, AI shopping suggestions | [grocery-shopping.md](./grocery-shopping.md) |
| **Meal Planning** | Shared recipe library, meal composition, AI recipe/meal/task suggestions, AI shopping list generation | [meal-planning.md](./meal-planning.md) |

---

## User Roles

| Role | Description |
|---|---|
| **Parent (Admin)** | Full read/write access to all data. Can invite users, manage all household members' data, approve chore completions, and administer every section of the app. |
| **Child (Member)** | Can view their assignments, mark progress, and submit completion evidence. Can manage their own name and profile photo. Cannot manage other users or administer household settings. |

Multiple parents are supported. A family must have at least one parent at all times.

---

## Platform

The application will be delivered as:
- A **web application** accessible via any modern browser.
- A **responsive mobile experience** that adapts to phone and tablet viewports, suitable for use on the go.

No native mobile app is required in the initial scope; the responsive web app serves both platforms.

---

## Authentication & Onboarding Summary

- Users must be authenticated to access any part of the application.
- Access to a family's data is invitation-based. A new user cannot self-register into an existing family without a valid invite.
- See [auth-and-profiles.md](./auth-and-profiles.md) for full details.

---

## AI Features Summary

AI (powered by Google Gemini) is integrated throughout the product. All AI calls are proxied through Firebase Cloud Functions — the API key is never client-side. Every AI output is a suggestion that requires explicit user confirmation before being applied.

| Feature | Section | What It Does |
|---|---|---|
| AI Suggest Recipe | Meal Planning | Given a recipe name, generates a full recipe: description, ingredients, and prep tasks with difficulty ratings |
| AI Suggest Tasks | Meal Planning | Generates a prep task list for an existing recipe |
| AI Suggest Meal | Meal Planning | Recommends a balanced meal from the family's recipe book, using meal history to avoid repetition |
| AI Assign Tasks | Meal Planning | Fairly assigns prep tasks across family members based on task history and difficulty |
| AI Shop for This | Meal Planning | Converts a recipe's ingredients into a store-grouped shopping list, with stocked-item detection |
| AI Shopping Suggestions | Grocery Shopping | Surfaces items the family likely needs based on purchase frequency and recency |

---

## Out of Scope (Initial Release)

- Financial tracking or budgeting
- Calendar or scheduling integrations with external services
- Push notifications (may be considered in a future iteration)
- Multi-family or multi-household management per account
