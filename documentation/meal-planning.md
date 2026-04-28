# Meal Planning

**Version:** 0.2 (Draft)
**Last Updated:** April 27, 2026
**Parent Document:** [README.md](./README.md)

---

## Overview

The Meal Planning section lets families build and share a recipe library, compose meals from individual recipes, break each recipe down into preparation tasks, assign those tasks equitably using AI, and generate grocery shopping lists from ingredients. AI is a first-class feature throughout this section — from creating a recipe to fairly distributing prep work to building a shopping list.

The section is organized into three building blocks that compose upward:

1. **Recipes** — Individual dishes with ingredients, prep tasks, and AI-assisted authoring.
2. **Meals** — A combination of recipes planned for a specific date.
3. **Meal Planning Calendar** — Scheduling meals, managing task assignments, and viewing history.

---

## 1. Recipes

A **recipe** is a single, reusable dish entry — an entrée, side, salad, fruit course, or dessert — with its ingredients and prep tasks. Recipes live in a **global shared collection**: any family can discover and save recipes created by others. Families also maintain their own private recipes.

### 1.1 Recipe Scope: Global vs. Family

| Type | Description |
|---|---|
| **Global recipe** | Visible to all families. Created by any parent and marked as shared. Other families can save (fork) it as their own editable copy. |
| **Family recipe** | Private to the creating family. Can be promoted to global by a parent. |

When a family saves a global recipe, they receive their own editable copy. Changes do not affect the original or other families' copies.

### 1.2 Recipe Data

| Field | Required | Description |
|---|---|---|
| Name | Yes | The name of the recipe (e.g., "Chicken Alfredo", "Caesar Salad") |
| Course Type | Yes | The role in a meal (see §1.3) |
| Description / Notes | No | Free-text cooking notes, tips, or summary |
| Serving Size | No | Number of people the recipe serves (used for context when scaling) |
| Ingredients | No | List of ingredients (see §1.4) |
| Prep Tasks | No | List of tasks required to make the recipe (see §1.5) |
| Visibility | Yes | **Private** (family only) or **Global** (shared) |

### 1.3 Course Types

Each recipe is classified as one of:

- Entrée
- Side
- Salad
- Fruit
- Dessert

Used when composing a meal and when browsing the recipe book by category.

### 1.4 Ingredients

| Field | Required | Description |
|---|---|---|
| Name | Yes | Ingredient name (e.g., "Heavy cream") |
| Quantity | No | Amount needed (free-text: "2 cups", "1 block") |
| Store | No | The store where this ingredient is typically purchased; links to a store in [Grocery Shopping](./grocery-shopping.md) |

- Ingredient name and store fields use a **searchable select** pattern: names draw from the family's ingredient history; store selection draws from configured stores. Free-text entry is allowed for new names.
- Store association enables AI shopping list generation (see §5).

### 1.5 Prep Tasks

Each **prep task** is a discrete action required to make the recipe.

| Field | Required | Description |
|---|---|---|
| Task description | Yes | What needs to be done (e.g., "Chop onions", "Boil pasta") |
| Difficulty | No | Estimated effort: **Easy**, **Medium**, or **Hard** — used by AI fair assignment (see §3.2) |
| Completed | Auto | Whether the task has been marked done for a specific meal instance |

- Tasks are defined at the recipe level (what, not who). Assignees are set per planned meal (see §3.1).
- Tasks are ordered; reorderable via drag-and-drop.

### 1.6 AI: Suggest Recipe

A parent can enter a recipe name and tap **"AI Suggest Recipe"** to generate a complete draft recipe.

**What the AI generates:**
- A description / notes summary
- A full ingredient list with estimated quantities
- An ordered list of prep tasks with suggested difficulty ratings

**Flow:**
1. Parent types a recipe name (e.g., "Chicken Tikka Masala").
2. Taps "AI Suggest Recipe."
3. A preview shows all generated fields populated.
4. Parent edits, removes items, or accepts all.
5. Confirming saves the recipe to the family's recipe book.

This eliminates building a recipe from scratch. The output is always a suggestion — the parent is the final authority.

### 1.7 AI: Suggest Tasks

For a recipe that already has a name and possibly ingredients, a parent can tap **"Suggest Tasks"** to generate a prep task list.

- The AI receives the recipe name, ingredient list, and any existing notes.
- It returns a suggested, ordered task list with difficulty ratings.
- The user can remove, edit, or reorder before accepting.
- Suggested tasks are added alongside any tasks already on the recipe.

### 1.8 Recipe Book

The **Recipe Book** is the family-facing interface for managing recipes:

- Browse the family's collection (own + saved global recipes), filterable by course type.
- Search by name across the family's collection and the global shared library.
- Create, edit, archive, and share (promote to global) recipes.

Archiving requires confirmation. Recipes referenced by past or future planned meals are archived rather than deleted so history is preserved.

---

## 2. Meals

A **meal** is a named collection of recipes planned for a specific date.

### 2.1 Meal Data

| Field | Required | Description |
|---|---|---|
| Name | No | Optional label (e.g., "Sunday Dinner"); defaults to date if omitted |
| Date | Yes | The day the meal is planned for |
| Recipes | Yes | One or more recipes selected from the recipe book |
| Status | Auto | **Planned**, **In Progress**, or **Served** |

**Meal Status:**
- **Planned** — Scheduled for a future date.
- **In Progress** — Prep tasks are actively being worked on.
- **Served** — Meal is complete. Locks the record and writes an entry to meal history.

### 2.2 Composing a Meal

1. Select a date.
2. Add one or more recipes by searching or browsing the recipe book.
3. Each recipe shows its course type, ingredients, and prep tasks.
4. Assign tasks manually (see §3.1) or request AI assignment (see §3.2).
5. Optionally initiate "AI Shop for This" per recipe (see §5).

### 2.3 AI: Suggest a Meal

On the Meal Planning Calendar, a parent can tap **"AI Suggest Meal"** for a given date.

**What the AI does:**
- Reviews the family's recipe book, categorized by course type.
- Reads the family's **meal history** (see §2.4) to identify recently served recipes and avoid repetition.
- Suggests a balanced meal combination — one Entrée, one or more Sides, and optionally a Salad, Fruit, or Dessert — drawn entirely from the family's existing recipe book.

**Output:** A preview showing the suggested combination with course labels. The parent can swap individual courses (e.g., keep the suggested entrée, pick a different side), then confirm to add the meal to the calendar.

The AI selects only from recipes the family already has — it does not create new ones.

### 2.4 Meal History

Every meal marked as **Served** is written to the family's meal history log. Meal history is used as:

- Context for **AI Suggest Meal** (avoid recently repeated meals).
- Source data for the **profile page meal task history** (see [auth-and-profiles.md §5.2](./auth-and-profiles.md)).
- Historical view on the Meal Planning Calendar (past dates).

Meal history is retained indefinitely.

### 2.5 Meal Planning Calendar

- Navigate by week or month.
- Future dates show planned meals; past dates show served meal history.
- Each day shows the meal name, recipes, and task completion status at a glance.
- Add new meals for any future date; edit or delete planned (not yet served) meals.

---

## 3. Task Assignment

### 3.1 Assigning Tasks Manually

Task assignment happens at the **meal level** for a specific planned meal. Recipes carry no pre-assigned person.

- Each prep task has a family member selector (searchable select from the household roster).
- Unassigned tasks are visually flagged.
- Parents can assign tasks individually or use AI assignment (§3.2) for the whole meal at once.

### 3.2 AI: Fair Task Assignment

A parent can tap **"AI Assign Tasks"** on a meal to have the AI suggest a fair distribution of all unassigned prep tasks across family members.

**What the AI considers:**
- Each family member's recent task history: what tasks they have done and how frequently.
- The **difficulty** of each task (Easy / Medium / Hard from the recipe).
- Any tasks already manually assigned in this meal.

**Output:** A suggested assignment for every unassigned task with a brief inline rationale (e.g., "Assigned to Sam — Alex handled most prep the last three meals"). The parent reviews the full suggestion, can override any individual task, and confirms to apply all at once.

### 3.3 Task Completion

- Assigned users (and parents) mark tasks complete during meal prep.
- Completion records the user and timestamp.
- When all tasks are complete, a parent marks the meal as **Served**, locking the record and writing to meal history.

---

## 4. Ingredient Management & Store Association

Each ingredient on a recipe can optionally be linked to one of the family's configured stores. This association drives AI shopping list generation (see §5).

- Ingredients without a store association appear in an "Unassigned Store" bucket in the shopping preview. The AI will attempt to infer a likely store from the family's purchase history, but the user always has final say.

---

## 5. AI: Shop for This

**"AI Shop for This"** is available on any recipe added to a planned meal. It generates a ready-to-review shopping list by combining recipe ingredient data with the family's purchase history.

### 5.1 What Makes This AI-Driven

Unlike a simple ingredient copy, the AI layer adds:

- **Store inference** — For ingredients without a store association, the AI suggests the most likely store based on the family's purchase history.
- **Quantity awareness** — If the family typically buys a different quantity of an ingredient than the recipe specifies, the AI surfaces that discrepancy.
- **Already-stocked detection** — If an ingredient was purchased recently and not yet likely depleted, the AI flags it as "Likely have this" and pre-removes it from the list (the user can toggle it back).

### 5.2 Flow

1. Parent taps **"AI Shop for This"** on a recipe within a planned meal.
2. The AI collects the recipe's ingredients and runs them against purchase history.
3. A **shopping preview** is shown, grouped by store:
   - Each ingredient shows name, suggested quantity, and inferred or associated store.
   - Items flagged "Likely have this" are pre-deselected.
   - Items with no store association show an AI-suggested store with an option to change.
4. Parent removes any unwanted items and confirms.
5. Confirmed items are added to the respective store's grocery lists.

No items are added to any list until the parent explicitly confirms.

### 5.3 Ingredient Deduplication

If an ingredient already exists on the target store's active shopping list, it is flagged as a duplicate in the preview so the user can skip or merge it.

---

## 6. Access Control Summary

| Action | Parent | Child |
|---|---|---|
| Create / edit / archive family recipes | ✓ | ✗ |
| Mark a recipe as global (share publicly) | ✓ | ✗ |
| Save a global recipe to the family book | ✓ | ✗ |
| Browse global recipe library | ✓ | ✓ |
| View family recipe book | ✓ | ✓ |
| Use "AI Suggest Recipe" | ✓ | ✗ |
| Use "AI Suggest Tasks" | ✓ | ✗ |
| Create / edit / delete planned meals | ✓ | ✗ |
| View planned and historical meals | ✓ | ✓ |
| Use "AI Suggest Meal" | ✓ | ✗ |
| Assign tasks manually | ✓ | ✗ |
| Use "AI Assign Tasks" | ✓ | ✗ |
| Mark tasks as complete | ✓ | ✓ (own tasks) |
| Mark meal as Served | ✓ | ✗ |
| Use "AI Shop for This" | ✓ | ✗ |
| Remove ingredients from shopping preview | ✓ | ✗ |
