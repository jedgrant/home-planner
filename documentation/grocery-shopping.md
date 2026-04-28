# Grocery Shopping

**Version:** 0.1 (Draft)
**Last Updated:** April 27, 2026
**Parent Document:** [README.md](./README.md)

---

## Overview

The Grocery Shopping section enables families to manage one or more shopping lists organized by store. It combines a straightforward todo-list interface with a quick-pick feature for frequently purchased items. The system records when items are added and when they are purchased, enabling future analysis of purchase patterns and purchase frequency.

---

## 1. Stores

A **store** represents a real-world retailer where the family shops (e.g., "Trader Joe's", "Costco", "Farmer's Market").

### 1.1 Store Data

| Field | Description |
|---|---|
| Name | Display name for the store |
| Notes | Optional free-text field (e.g., shopping day, aisle notes) |

### 1.2 Store Management

- Parents can **add**, **edit**, and **remove** stores.
- Removing a store should require confirmation. All items and historical data associated with that store are retained but the store will no longer appear as an active option.
- At least one store must be present to create grocery items.

---

## 2. Grocery Items

A **grocery item** is a single entry on a store's shopping list.

### 2.1 Item Data

| Field | Required | Description |
|---|---|---|
| Name | Yes | What the item is (e.g., "Whole milk", "Bananas") |
| Quantity | No | How much to buy (free-text to allow "2 lbs", "1 dozen", "3", etc.) |
| Note | No | Extra context, e.g., "get the organic kind" or "aisle 7" |
| Store | Yes | Which store this item is on the list for |
| Added By | Auto | The user who created the item |
| Date & Time Added | Auto | Timestamp recorded when the item is created |
| Completed | Auto | Whether the item has been checked off |
| Date & Time Completed | Auto | Timestamp recorded when the item is marked complete |

### 2.2 Item Management

- Any authenticated family member can **add** items to a store's list.
- Only **parents** can **edit** or **remove** items on a store's list.
- Items are marked complete by checking them off during a shopping trip (see §4); any family member can check off items.
- Completed items remain in the store's history; they do not automatically disappear from view but should be visually distinct from pending items. The interface should support hiding or filtering completed items.

---

## 3. Quick Pick

The **Quick Pick** feature provides a curated list of items the family frequently buys from a specific store, enabling one-tap addition to the active shopping list without any typing. This is a saved list of real products — not a dropdown of categories or enums.

### 3.1 Quick Pick Items

- Each store maintains its own independent quick-pick list.
- A quick-pick item represents a specific product the family regularly purchases from that store (e.g., "Whole milk", "Brown rice", "Sourdough bread").
- Quick-pick items are managed separately from the live shopping list and persist across shopping trips.

### 3.2 Quick Pick Data

| Field | Description |
|---|---|
| Name | The product name |
| Default Quantity | Optional pre-filled quantity (e.g., "2", "1 gallon") |
| Default Note | Optional pre-filled note |
| Store | The store this quick-pick item belongs to |

### 3.3 Adding via Quick Pick

- On the shopping list view for a store, a "Quick Pick" action surfaces the store's saved quick-pick items as a browsable, searchable list.
- Tapping or clicking an item adds it to the active shopping list, pre-populating name, quantity, and note from the saved defaults.
- The user can adjust any field before confirming.
- Multiple items can be selected and added in a single action.

### 3.4 Managing Quick Pick Items

- Only **parents** can add, edit, and remove quick-pick items.

---

## 4. Input UX — Searchable Selects

To minimize typing throughout the grocery section, the following fields use a **searchable select** (typeahead) pattern rather than plain text inputs. A searchable select presents a filtered list of existing options as the user types; the user can select a match or continue typing to enter a new value.

| Field | Source of Options |
|---|---|
| Item name (when adding to a list) | The family's full history of previously added item names across all stores |
| Store (when adding an item, or associating an ingredient in Meal Planning) | The family's configured stores |
| Quick-pick item name (when managing quick-pick entries) | The family's item name history for that store |

**Behavior:**
- Typing two or more characters filters the option list in real time.
- The full option list is browsable before typing begins.
- Selecting an existing item populates the field; the user can still edit the value before saving.
- If no match is found, the typed value is accepted as a new entry.
- Store selection is purely pick-from-list (stores cannot be free-typed in item forms; a store must first be created via Store Management).

---

## 5. Shopping Experience

When a family member goes shopping, they use the store's list view to track what they pick up.

### 5.1 Checking Off Items

- Each item has a checkbox. Tapping it marks the item as **complete**.
- On completion, the system records the **date and time** the item was checked off and the **user** who checked it.
- A completed item can be unchecked if it was marked by mistake.

### 5.2 List View Behavior

- Pending items appear prominently at the top of the list.
- Completed items are visually separated (e.g., shown with a strikethrough, dimmed, or collapsible).
- A count of remaining items is shown for quick reference.
- The user can choose to hide completed items entirely.

---

## 6. Data & History

- Item records, including completion timestamps, are stored indefinitely.
- Completion date/time data is intended for future analysis of purchase frequency (e.g., how often a family buys a given item, which items are always bought together).
- No aggregation or analytics UI is required in the initial release; the data must be stored correctly to support it later.

---

## 7. AI: Shopping Suggestions

The **AI Shopping Suggestions** feature proactively surfaces items the family likely needs to buy, based on purchase frequency and how recently each item was last purchased.

### 7.1 How It Works

The AI analyzes the family's full purchase history across all stores and identifies items that:

- Are purchased on a regular pattern (e.g., every 1–2 weeks), and
- Have not been purchased recently relative to that pattern.

For each such item, the AI calculates a "likely needed" signal and ranks suggestions by urgency.

### 7.2 Suggestions UI

- A **"What do we need?"** prompt on the main grocery screen triggers the AI analysis.
- The result is a suggested list of items grouped by store, with an indication of how overdue each item is (e.g., "Usually bought every 10 days — last purchased 14 days ago").
- Each suggestion shows the item name, the store it's typically purchased from, and the typical quantity.
- The parent can:
  - **Add** individual items directly to the relevant store's shopping list.
  - **Add All** to add all suggestions at once.
  - **Dismiss** suggestions they don't need.

### 7.3 Data Requirements

This feature requires sufficient purchase history to be useful. If a family has fewer than a few weeks of data, the feature should indicate that suggestions will improve over time rather than presenting low-confidence results.

---

## 8. Integration with Meal Planning

Ingredients from meal plans can flow into grocery shopping lists via the **AI Shop for This** feature. See [Meal Planning §5](./meal-planning.md) for the full workflow. From the grocery shopping side, these AI-generated items arrive pre-populated with name, quantity, and store — and behave identically to manually added items once on the list.

---

## 9. Access Control Summary

| Action | Parent | Child |
|---|---|---|
| Add / edit / remove stores | ✓ | ✗ |
| Add items to a list | ✓ | ✓ |
| Edit / remove items on a list | ✓ | ✗ |
| Mark items complete | ✓ | ✓ |
| Add / edit / remove quick-pick items | ✓ | ✗ |
| Use AI Shopping Suggestions | ✓ | ✗ |
| View shopping history | ✓ | ✓ |
