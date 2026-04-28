# Authentication & User Profiles

**Version:** 0.1 (Draft)
**Last Updated:** April 27, 2026
**Parent Document:** [README.md](./README.md)

---

## Overview

All access to Home Manager is gated behind authentication. After creating an account, a user must either **create a new family** or **join an existing one** using an invite code before they can access any application features. A user belongs to exactly one family at a time. This document covers user onboarding, family creation, membership management, roles, profile management, and the history views surfaced on each user's profile.

---

## 1. Authentication

### 1.1 Requirements

- Users must be authenticated before accessing any part of the application.
- The application must support secure login with email and password.
- Session persistence should be supported across browser/app restarts where the platform allows.
- Password reset via email link must be supported.

### 1.2 Registration & Onboarding Flow

A newly registered user who is not yet part of a family is shown an intermediate screen — before reaching any app features — that presents two options:

**Option A — Create a new family:**
1. User registers with name, email, and password.
2. User is prompted to create a family by entering a family name (e.g., "The Grants").
3. The user is automatically assigned the **Parent** role and becomes the first member of the new family.
4. They are taken into the app and can begin inviting other members.

**Option B — Join an existing family:**
1. User registers with name, email, and password (or signs into an existing account).
2. User is prompted to enter the **invite code** shared with them by a family parent.
3. The system validates the code — checking that it exists, has not expired, and has not already been used.
4. On success, the user is joined to the family with the role assigned when the invite was created.
5. If the code is invalid, expired, or already used, the user sees a clear error and can request a new code from the inviting parent.

A signed-in user who is not part of any family is always redirected to this choice screen and cannot navigate elsewhere in the app until they create or join a family.

---

## 2. Family & Membership

### 2.1 Family Unit

- A family is a shared workspace. All chores, grocery lists, and meal plans are scoped to that family.
- A user belongs to exactly one family at a time.
- Each family must have at least one parent at all times.
- The family has a **display name** (set at creation) that is shown throughout the app. A parent can rename it.

### 2.2 Family Creation

- Any newly registered user who is not part of a family can create one.
- The creating user supplies a family name and is automatically assigned the **Parent** role.
- No other members are required at creation time; the parent can invite others afterward.
- Family creation is only available to users not currently in a family. There is no way to be a member of multiple families.

### 2.3 Invitations & Invite Codes

- Only parent users can generate invite codes.
- When creating an invite code, the parent assigns the intended role for the recipient: **Parent** or **Child**.
- An invite code is a short, human-readable alphanumeric string (e.g., `HOME-4X9KZ`) that the parent shares out-of-band (e.g., text message, verbally).
- Invite codes are time-limited (expiry duration to be determined during build).
- Each code is single-use — once accepted it is invalidated.
- A parent can view all pending (unused, unexpired) invite codes and revoke any of them.
- Invite links (a URL containing the code) may optionally be generated alongside the raw code to simplify the join flow for less tech-savvy family members.

### 2.4 Removing a Member

- Parents can remove a member from the family.
- Removing a member revokes their access immediately.
- Historical data attributable to that user (chore completions, meal task history, etc.) is retained and remains associated with their display name.

---

## 3. User Roles

| Role | Key Capabilities |
|---|---|
| **Parent (Admin)** | Invite/remove users, manage all household data, approve chore completions, assign roles to other users. Full access to all sections of the application. |
| **Child (Member)** | View their own assignments, submit chore completion evidence, participate in tasks. Can only modify their own name and profile photo. |

- A parent can promote a child to parent or demote a parent to child, provided at least one parent remains in the family at all times.

---

## 4. User Profiles

### 4.1 Profile Data

Every user has a profile containing:

| Field | Editable By |
|---|---|
| Display name | Parent (for any user); User themselves |
| Profile photo | Parent (for any user); User themselves |
| Role | Parent only |
| Email address | Parent only |

- Profile photos should support upload from device file system; photo or video capture from device camera (mobile) is also desirable.
- Images should be resized and stored at a reasonable resolution for display purposes.

### 4.2 Profile Page

Each user's profile page displays:
- Their display name and profile photo.
- Their current role.
- A **Chore History** section.
- A **Meal Task History** section.

---

## 5. Profile History

### 5.1 Chore History

The chore history on a profile presents a week-by-week view of that user's chore assignments and completions.

- Each row represents one week and shows:
  - The week date range.
  - The chore group(s) assigned to the user that week.
  - Each individual chore within those groups, and whether it was marked complete.
  - The timestamp and approving parent for any verified completions.
- Display: **10 entries per page** with pagination controls to view older history.
- Entries are ordered most-recent first.

### 5.2 Meal Task History

The meal task history on a profile presents a day-by-day view of that user's meal preparation assignments.

- Each row represents one day and shows:
  - The date.
  - The meal(s) they contributed to that day.
  - The specific tasks they were assigned for each meal.
  - Whether each task was marked complete.
- Display: **10 entries per page** with pagination controls to view older history.
- Entries are ordered most-recent first.

---

## 6. Access Control Summary

| Action | Parent | Child |
|---|---|---|
| Create a new family (unaffiliated user) | ✓ | ✓ |
| Join a family via invite code (unaffiliated user) | ✓ | ✓ |
| Rename the family | ✓ | ✗ |
| Generate invite codes | ✓ | ✗ |
| View all pending invite codes | ✓ | ✗ |
| Revoke an invite code | ✓ | ✗ |
| Remove members | ✓ | ✗ |
| Change any user's role | ✓ | ✗ |
| View own profile | ✓ | ✓ |
| Edit own name & photo | ✓ | ✓ |
| Edit another user's name & photo | ✓ | ✗ |
| View another user's profile | ✓ | ✗ |
