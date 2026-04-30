import type { Timestamp } from 'firebase/firestore'

export type UserRole = 'parent' | 'child'

export interface UserProfile {
  userId: string
  displayName: string
  email: string
  photoUrl: string | null
  familyId: string | null
  role: UserRole | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Family {
  familyId: string
  name: string
  memberIds: string[]
  choreRotationPool?: string[]         // Ordered list of user IDs in the rotation
  choreRotationDurationWeeks?: number  // Weeks each person holds before rotating
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PendingProfile {
  id: string
  familyId: string
  displayName: string
  photoUrl: string | null
  role: UserRole
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface InviteCode {
  code: string
  familyId: string
  role: UserRole
  createdBy: string
  createdAt: Timestamp
  expiresAt: Timestamp | null  // null for reusable (child) codes
  used: boolean
  usedBy: string | null
  usedAt: Timestamp | null
  reusable: boolean
}
