import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  writeBatch,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { updateProfile } from 'firebase/auth'
import { nanoid } from 'nanoid'
import { httpsCallable } from 'firebase/functions'
import { auth, db, storage, functions } from '@/shared/lib/firebase'
import { FAMILIES, USERS, INVITE_CODES, pendingProfiles as pendingProfilesCol } from '@/shared/lib/collections'
import type { UserRole, PendingProfile } from '@/shared/types'

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
): Promise<{ familyId: string; role: UserRole; familyName: string }> {
  const codeRef = doc(db, INVITE_CODES, code)
  const codeSnap = await getDoc(codeRef)

  if (!codeSnap.exists()) {
    throw new Error('Invalid invite code.')
  }

  const data = codeSnap.data()
  const isReusable: boolean = data.reusable === true

  if (!isReusable && data.used) {
    throw new Error('This invite code has already been used.')
  }

  if (!isReusable) {
    const now = Timestamp.now()
    if (data.expiresAt && data.expiresAt.toMillis() < now.toMillis()) {
      throw new Error('This invite code has expired.')
    }
  }

  const familyId: string = data.familyId
  const role: UserRole = data.role

  const batch = writeBatch(db)

  // Only consume single-use codes; reusable (child) codes stay active until revoked
  if (!isReusable) {
    batch.update(codeRef, {
      used: true,
      usedBy: uid,
      usedAt: serverTimestamp(),
    })
  }

  // Add user to family memberIds — arrayUnion avoids reading the family doc first
  const familyRef = doc(db, FAMILIES, familyId)
  batch.update(familyRef, {
    memberIds: arrayUnion(uid),
    updatedAt: serverTimestamp(),
  })

  // Update user profile
  batch.update(doc(db, USERS, uid), {
    familyId,
    role,
    updatedAt: serverTimestamp(),
  })

  await batch.commit()

  // User is now a member — read family name for the success toast
  const familySnap = await getDoc(familyRef)
  const familyName = familySnap.exists()
    ? (familySnap.data().name as string)
    : 'your family'

  return { familyId, role, familyName }
}

export async function generateInviteCode(
  familyId: string,
  createdBy: string,
  role: UserRole,
): Promise<string> {
  const code = generateCode()
  const isReusable = role === 'child'

  const codeData: Record<string, unknown> = {
    code,
    familyId,
    role,
    createdBy,
    createdAt: serverTimestamp(),
    used: false,
    usedBy: null,
    usedAt: null,
    reusable: isReusable,
    expiresAt: isReusable
      ? null
      : Timestamp.fromMillis(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000),
  }

  await setDoc(doc(db, INVITE_CODES, code), codeData)

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
    .filter((d) => d.reusable === true || (d.expiresAt && d.expiresAt.toMillis() > now.toMillis()))
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

export async function addPendingProfile(
  familyId: string,
  createdBy: string,
  params: { displayName: string; role: UserRole; photoBlob?: Blob },
): Promise<PendingProfile> {
  const profileId = nanoid()
  let photoUrl: string | null = null

  if (params.photoBlob) {
    const fileRef = storageRef(storage, `avatars/pending/${profileId}`)
    await uploadBytes(fileRef, params.photoBlob)
    photoUrl = await getDownloadURL(fileRef)
  }

  const profileData = {
    id: profileId,
    familyId,
    displayName: params.displayName,
    photoUrl,
    role: params.role,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(db, pendingProfilesCol(familyId), profileId), profileData)
  return { ...profileData, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as PendingProfile
}

export async function updatePendingProfile(
  familyId: string,
  profileId: string,
  params: { displayName?: string; photoBlob?: Blob },
): Promise<Partial<PendingProfile>> {
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() }

  if (params.displayName !== undefined) {
    updates.displayName = params.displayName
  }

  if (params.photoBlob) {
    const fileRef = storageRef(storage, `avatars/pending/${profileId}`)
    await uploadBytes(fileRef, params.photoBlob)
    updates.photoUrl = await getDownloadURL(fileRef)
  }

  await updateDoc(doc(db, pendingProfilesCol(familyId), profileId), updates)
  return updates as Partial<PendingProfile>
}

export async function deletePendingProfile(
  familyId: string,
  profileId: string,
): Promise<void> {
  await deleteDoc(doc(db, pendingProfilesCol(familyId), profileId))
}

export async function claimPendingProfile(
  familyId: string,
  profileId: string,
  uid: string,
  profile: Pick<PendingProfile, 'displayName' | 'photoUrl'>,
): Promise<void> {
  const batch = writeBatch(db)

  batch.update(doc(db, USERS, uid), {
    displayName: profile.displayName,
    photoUrl: profile.photoUrl,
    updatedAt: serverTimestamp(),
  })

  batch.delete(doc(db, pendingProfilesCol(familyId), profileId))

  await batch.commit()

  // Sync Firebase Auth profile — non-critical, ignore failure
  if (auth.currentUser) {
    try {
      await updateProfile(auth.currentUser, {
        displayName: profile.displayName,
        photoURL: profile.photoUrl ?? undefined,
      })
    } catch {
      // Auth profile update is cosmetic; Firestore is the source of truth
    }
  }
}

export async function deleteFamily(familyId: string): Promise<void> {
  const fn = httpsCallable<{ familyId: string }, { success: boolean }>(
    functions,
    'deleteFamily',
  )
  await fn({ familyId })
}
