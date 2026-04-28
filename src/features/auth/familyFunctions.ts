import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { nanoid } from 'nanoid'
import { db } from '@/shared/lib/firebase'
import { FAMILIES, USERS, INVITE_CODES } from '@/shared/lib/collections'
import type { UserRole } from '@/shared/types'

const INVITE_TTL_HOURS = 48

function generateCode(): string {
  // Format: HOME-XXXXX (5 uppercase alphanumeric chars)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `HOME-${suffix}`
}

export async function createFamily(
  uid: string,
  familyName: string,
): Promise<string> {
  const familyId = nanoid()
  const batch = writeBatch(db)

  batch.set(doc(db, FAMILIES, familyId), {
    familyId,
    name: familyName,
    memberIds: [uid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  batch.update(doc(db, USERS, uid), {
    familyId,
    role: 'parent' as UserRole,
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
  return familyId
}

export async function joinFamilyWithCode(
  uid: string,
  code: string,
): Promise<void> {
  const codeRef = doc(db, INVITE_CODES, code)
  const codeSnap = await getDoc(codeRef)

  if (!codeSnap.exists()) {
    throw new Error('Invalid invite code.')
  }

  const data = codeSnap.data()

  if (data.used) {
    throw new Error('This invite code has already been used.')
  }

  const now = Timestamp.now()
  if (data.expiresAt.toMillis() < now.toMillis()) {
    throw new Error('This invite code has expired.')
  }

  const familyId: string = data.familyId
  const role: UserRole = data.role

  const batch = writeBatch(db)

  // Mark code as used
  batch.update(codeRef, {
    used: true,
    usedBy: uid,
    usedAt: serverTimestamp(),
  })

  // Add user to family memberIds
  const familyRef = doc(db, FAMILIES, familyId)
  const familySnap = await getDoc(familyRef)
  if (!familySnap.exists()) throw new Error('Family not found.')
  const currentMembers: string[] = familySnap.data().memberIds ?? []
  batch.update(familyRef, {
    memberIds: [...currentMembers, uid],
    updatedAt: serverTimestamp(),
  })

  // Update user profile
  batch.update(doc(db, USERS, uid), {
    familyId,
    role,
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
}

export async function generateInviteCode(
  familyId: string,
  createdBy: string,
  role: UserRole,
): Promise<string> {
  const code = generateCode()
  const expiresAt = Timestamp.fromMillis(
    Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000,
  )

  await setDoc(doc(db, INVITE_CODES, code), {
    code,
    familyId,
    role,
    createdBy,
    createdAt: serverTimestamp(),
    expiresAt,
    used: false,
    usedBy: null,
    usedAt: null,
  })

  return code
}

export async function revokeInviteCode(code: string): Promise<void> {
  await updateDoc(doc(db, INVITE_CODES, code), {
    used: true,
    usedAt: serverTimestamp(),
  })
}

export async function getActiveCodes(familyId: string) {
  const now = Timestamp.now()
  const snap = await getDocs(
    query(
      collection(db, INVITE_CODES),
      where('familyId', '==', familyId),
      where('used', '==', false),
    ),
  )
  return snap.docs
    .map((d) => d.data())
    .filter((d) => d.expiresAt.toMillis() > now.toMillis())
}

export async function removeMember(
  familyId: string,
  targetUid: string,
): Promise<void> {
  const familyRef = doc(db, FAMILIES, familyId)
  const familySnap = await getDoc(familyRef)
  if (!familySnap.exists()) throw new Error('Family not found.')

  const currentMembers: string[] = familySnap.data().memberIds ?? []
  const batch = writeBatch(db)

  batch.update(familyRef, {
    memberIds: currentMembers.filter((id) => id !== targetUid),
    updatedAt: serverTimestamp(),
  })

  batch.update(doc(db, USERS, targetUid), {
    familyId: null,
    role: null,
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
}

export async function renameFamilyName(
  familyId: string,
  name: string,
): Promise<void> {
  await updateDoc(doc(db, FAMILIES, familyId), {
    name,
    updatedAt: serverTimestamp(),
  })
}

export async function updateMemberRole(
  uid: string,
  role: UserRole,
): Promise<void> {
  await updateDoc(doc(db, USERS, uid), {
    role,
    updatedAt: serverTimestamp(),
  })
}

export async function getFamilyMembers(familyId: string) {
  const familySnap = await getDoc(doc(db, FAMILIES, familyId))
  if (!familySnap.exists()) return []

  const memberIds: string[] = familySnap.data().memberIds ?? []
  const memberDocs = await Promise.all(
    memberIds.map((id) => getDoc(doc(db, USERS, id))),
  )
  return memberDocs
    .filter((d) => d.exists())
    .map((d) => d.data())
}
