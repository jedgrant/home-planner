import type { Timestamp } from 'firebase/firestore'

export type AssignmentType = 'fixed' | 'rotation'

export type WeeklyChoreStatus =
  | 'pending'
  | 'submitted'
  | 'complete'
  | 'needs_resubmission'

export interface ChoreItem {
  choreId: string
  name: string
  description: string
}

export interface ChoreGroup {
  groupId: string
  familyId: string
  name: string
  description: string
  assignmentType: AssignmentType
  /** User IDs for fixed assignment */
  fixedAssignees: string[]
  /** User IDs eligible for rotation */
  rotationPool: string[]
  rotationDurationWeeks: number
  rotationStartDate: string | null
  chores: ChoreItem[]
  archived: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface WeeklyChoreEntry {
  status: WeeklyChoreStatus
  submittedAt: Timestamp | null
  submittedBy: string | null
  mediaUrl: string | null
  verifiedAt: Timestamp | null
  verifiedBy: string | null
}

export interface WeeklyChoreAssignment {
  assigneeId: string
  assigneeName: string
  groupName: string
  /** keyed by choreId */
  chores: Record<string, WeeklyChoreEntry>
  /** ISO date string for the Saturday this assignment is due. */
  expectedDueDate?: string
  /** Set when every chore in this assignment has been verified complete by a parent. */
  completedAt?: Timestamp | null
}

export interface WeeklyChoreDoc {
  /** ISO week identifier, e.g. "2026-W17" */
  weekId: string
  weekStartDate: string
  /** keyed by groupId */
  assignments: Record<string, WeeklyChoreAssignment>
  createdAt: Timestamp
  updatedAt: Timestamp
}
