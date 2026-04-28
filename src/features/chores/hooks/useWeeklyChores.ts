import { useState, useEffect } from 'react'
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/shared/lib/firebase'
import { weeklyChores, choreGroups } from '@/shared/lib/collections'
import type { WeeklyChoreDoc, WeeklyChoreAssignment, ChoreGroup } from '@/shared/types/chores'
import { getCurrentAssignee, weekIdToStartDate } from '../utils/rotation'

// ─── Real-time weekly chore snapshot ─────────────────────────────────────────

interface UseWeeklyChoreDocReturn {
  data: WeeklyChoreDoc | null
  isLoading: boolean
}

export function useWeeklyChoreDoc(
  familyId: string,
  weekId: string,
  memberNames: Record<string, string>,
): UseWeeklyChoreDocReturn {
  const [data, setData] = useState<WeeklyChoreDoc | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!familyId || !weekId) return

    const docRef = doc(db, weeklyChores(familyId), weekId)

    const unsub = onSnapshot(docRef, async (snap) => {
      if (snap.exists()) {
        setData({ ...snap.data(), weekId: snap.id } as WeeklyChoreDoc)
        setIsLoading(false)
      } else {
        // Auto-create the week doc from current group state
        await createWeekDoc(familyId, weekId, memberNames)
        // onSnapshot will fire again once the doc is written
      }
    })

    return unsub
  }, [familyId, weekId, memberNames])

  return { data, isLoading }
}

async function createWeekDoc(
  familyId: string,
  weekId: string,
  memberNames: Record<string, string>,
) {
  const groupsSnap = await getDocs(
    query(collection(db, choreGroups(familyId)), where('archived', '==', false)),
  )

  const assignments: Record<string, WeeklyChoreAssignment> = {}
  const weekStart = weekIdToStartDate(weekId)

  for (const groupDoc of groupsSnap.docs) {
    const group = { ...groupDoc.data(), groupId: groupDoc.id } as ChoreGroup

    let assigneeId: string
    let assigneeName: string

    if (group.assignmentType === 'fixed') {
      assigneeId = group.fixedAssignees[0] ?? ''
      assigneeName = memberNames[assigneeId] ?? assigneeId
    } else {
      assigneeId = getCurrentAssignee(group, weekId)
      assigneeName = memberNames[assigneeId] ?? assigneeId
    }

    const chores: WeeklyChoreAssignment['chores'] = {}
    for (const chore of group.chores) {
      chores[chore.choreId] = {
        status: 'pending',
        submittedAt: null,
        submittedBy: null,
        mediaUrl: null,
        verifiedAt: null,
        verifiedBy: null,
      }
    }

    const expectedDueDate = (() => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + 5) // Monday + 5 = Saturday
      return d.toISOString().slice(0, 10)
    })()

    assignments[group.groupId] = {
      assigneeId,
      assigneeName,
      groupName: group.name,
      chores,
      expectedDueDate,
      completedAt: null,
    }
  }

  await setDoc(doc(db, weeklyChores(familyId), weekId), {
    weekId,
    weekStartDate: weekStart.toISOString().slice(0, 10),
    assignments,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// ─── Submit chore (with optional media upload) ────────────────────────────────

interface SubmitChoreParams {
  familyId: string
  weekId: string
  groupId: string
  choreId: string
  submittedBy: string
  mediaFile?: File
}

export async function submitChore({
  familyId,
  weekId,
  groupId,
  choreId,
  submittedBy,
  mediaFile,
}: SubmitChoreParams): Promise<void> {
  let mediaUrl: string | null = null

  if (mediaFile) {
    const path = `chores/${familyId}/${weekId}/${groupId}/${choreId}`
    const fileRef = storageRef(storage, path)
    await uploadBytes(fileRef, mediaFile)
    mediaUrl = await getDownloadURL(fileRef)
  }

  const docRef = doc(db, weeklyChores(familyId), weekId)
  await updateDoc(docRef, {
    [`assignments.${groupId}.chores.${choreId}.status`]: 'submitted',
    [`assignments.${groupId}.chores.${choreId}.submittedAt`]: serverTimestamp(),
    [`assignments.${groupId}.chores.${choreId}.submittedBy`]: submittedBy,
    [`assignments.${groupId}.chores.${choreId}.mediaUrl`]: mediaUrl,
    updatedAt: serverTimestamp(),
  })
}

// ─── Verify chore ─────────────────────────────────────────────────────────────

interface VerifyChoreParams {
  familyId: string
  weekId: string
  groupId: string
  choreId: string
  verifiedBy: string
}

export async function verifyChore({
  familyId,
  weekId,
  groupId,
  choreId,
  verifiedBy,
}: VerifyChoreParams): Promise<void> {
  const docRef = doc(db, weeklyChores(familyId), weekId)

  // Read current state to detect if all chores will be complete after this verify
  const snap = await getDoc(docRef)
  const weekData = snap.data() as import('@/shared/types/chores').WeeklyChoreDoc
  const assignment = weekData?.assignments?.[groupId]

  const updates: Record<string, unknown> = {
    [`assignments.${groupId}.chores.${choreId}.status`]: 'complete',
    [`assignments.${groupId}.chores.${choreId}.verifiedAt`]: serverTimestamp(),
    [`assignments.${groupId}.chores.${choreId}.verifiedBy`]: verifiedBy,
    updatedAt: serverTimestamp(),
  }

  if (assignment) {
    const allComplete = Object.entries(assignment.chores).every(([cId, c]) =>
      cId === choreId ? true : c.status === 'complete',
    )
    if (allComplete) {
      updates[`assignments.${groupId}.completedAt`] = serverTimestamp()
    }
  }

  await updateDoc(docRef, updates)
}

// ─── Request resubmission ─────────────────────────────────────────────────────

interface RequestResubmitParams {
  familyId: string
  weekId: string
  groupId: string
  choreId: string
}

export async function requestResubmit({
  familyId,
  weekId,
  groupId,
  choreId,
}: RequestResubmitParams): Promise<void> {
  const docRef = doc(db, weeklyChores(familyId), weekId)
  await updateDoc(docRef, {
    [`assignments.${groupId}.chores.${choreId}.status`]: 'needs_resubmission',
    [`assignments.${groupId}.chores.${choreId}.verifiedAt`]: null,
    [`assignments.${groupId}.chores.${choreId}.verifiedBy`]: null,
    updatedAt: serverTimestamp(),
  })
}
