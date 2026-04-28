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
