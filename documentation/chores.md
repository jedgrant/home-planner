# Chores

**Version:** 0.1 (Draft)
**Last Updated:** April 27, 2026
**Parent Document:** [README.md](./README.md)

---

## Overview

The Chores section of Home Manager lets parents define household chores, organize them into groups, and configure how those groups are assigned to family members — including optional rotation for children. Separately, a weekly execution view gives every family member a clear picture of what needs to be done and allows children to submit completion evidence for parent review.

The feature is split into two distinct experiences:

1. **Chore Management** — Defining chores, groups, and assignment configuration. Intended primarily for parent use.
2. **Chore Execution** — The weekly view used by all family members to track, complete, and verify chore activity.

---

## 1. Chore Management

### 1.1 Chores

A **chore** is the base unit of recurring work. All chores repeat **weekly** — the expectation is that every chore in an assigned group needs to be completed once per week. Each chore has:

| Field | Description |
|---|---|
| Name | A short label for the chore (e.g., "Vacuum living room") |
| Description | Optional longer description with any relevant details or instructions |
| Chore Group | The group this chore belongs to |

- Parents can **create**, **edit**, and **delete** chores.
- Deleting a chore should be a soft-delete or require confirmation; historical week records referencing that chore must not be lost.

### 1.2 Chore Groups

A **chore group** is a named collection of chores that is assigned as a unit to one or more family members for a given week.

| Field | Description |
|---|---|
| Name | A short label for the group (e.g., "Kitchen Duties", "Bathroom") |
| Description | Optional description |
| Assignment Type | **Fixed** or **Rotating** (see §1.3) |
| Assigned Members | The user(s) or rotation pool this group is assigned to |

- Parents can **create**, **edit**, and **delete** chore groups.
- A chore group may contain any number of chores.
- A chore may belong to only one group at a time.

### 1.3 Assignment Types

#### Fixed Assignment

- The group is permanently assigned to one or more specific users.
- The same users are responsible for the group every week.
- Intended for parent-owned responsibilities.

#### Rotating Assignment

- The group cycles through a defined pool of users (typically children) on a parent-configured schedule.
- Only one user from the pool is assigned the group in any given week.
- Each user holds the group for a **configurable number of weeks** (e.g., 1 week, 2 weeks) before it passes to the next person in the rotation. This duration is set per group by a parent.
- The rotation order is managed by the system and is visible to parents.
- Parents can manually override a rotation assignment for a specific week without disrupting the future rotation sequence.

### 1.4 Rotation Configuration

When a group is set to rotating, parents configure:

| Setting | Description |
|---|---|
| Rotation Pool | The ordered list of family members who cycle through this group |
| Rotation Duration | How many consecutive weeks each member holds the group before it advances to the next person (e.g., 1 week, 2 weeks, 4 weeks) |
| Rotation Order | The sequence of members in the pool; parents can reorder the list at any time |

- The system automatically calculates who the current assignee is based on the rotation start date, the duration, and the pool order. This projected schedule is visible to parents.
- Multiple rotating groups can exist simultaneously. For example, three chore groups might each rotate through the same pool of three children, staggered so that each child has a different group each period. The system does not enforce exclusivity between groups — it is up to the parent to stagger the rotation pools and start dates as desired.

---

## 2. Chore Execution

### 2.1 Weekly View

The weekly view is the primary operational interface for chores. It displays one week at a time and shows:

- The week's date range.
- Each chore group assigned during that week, with the assigned family member(s) shown prominently.
- Each individual chore within each group, with a checkbox indicating completion status.
- Completion metadata: who verified it, and at what date/time.

**Navigation:**
- Users can move backward and forward through weeks.
- The current week is the default view.
- Past weeks are read-only for children; parents can make adjustments to past weeks if needed.

### 2.2 Chore Completion by Children

For each chore in their assigned group(s), a child can:

1. **Submit evidence** — Upload one or more photos or videos that demonstrate the chore was completed. Submission is open until the chore is verified.
2. **View submission status** — See whether their submission is pending review, approved, or requires resubmission.

Children cannot mark their own chores as officially complete — that authority belongs to parents.

### 2.3 Chore Verification by Parents

For each submitted chore, a parent can:

1. **Review submitted media** — View any photos or videos submitted by the child.
2. **Mark as complete** — Officially verify the chore as done. The system records:
   - Which parent verified the chore.
   - The date and time of verification.
3. **Request resubmission** — Reject the submission and prompt the child to resubmit (a note/reason is desirable but optional in initial release).

Parents may also mark a chore complete directly without requiring media submission (e.g., if they witnessed it done in person).

### 2.4 Completion States

Each chore in a given week has one of the following states:

| State | Description |
|---|---|
| **Pending** | Not yet completed or submitted |
| **Submitted** | Child has uploaded evidence; awaiting parent review |
| **Complete** | Verified by a parent; locked from further changes by children |
| **Needs Resubmission** | Parent rejected the submission; child must resubmit |

---

## 3. Data & History

- Records for each week's assignments, submissions, and verifications are stored indefinitely.
- Week records are immutable once the week has passed, except for parent adjustments.
- Chore completion history is surfaced on individual user profile pages (see [auth-and-profiles.md](./auth-and-profiles.md) §5.1).

---

## 4. Access Control Summary

| Action | Parent | Child |
|---|---|---|
| Create / edit / delete chores | ✓ | ✗ |
| Create / edit / delete chore groups | ✓ | ✗ |
| Configure assignment type and rotation | ✓ | ✗ |
| Override a week's rotation assignment | ✓ | ✗ |
| View any week's chore assignments | ✓ | ✓ (own assignments only) |
| Submit completion evidence | ✓ | ✓ (own chores only) |
| Mark a chore as complete (verify) | ✓ | ✗ |
| Request resubmission | ✓ | ✗ |
| View submitted media | ✓ | ✓ (own chores only) |
| Edit past week records | ✓ | ✗ |
