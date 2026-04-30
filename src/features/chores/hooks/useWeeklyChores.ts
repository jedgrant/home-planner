import { useState, useEffect, useRef } from 'react'
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/shared/lib/firebase'
import { weeklyChores, choreGroups, FAMILIES } from '@/shared/lib/collections'
import type { WeeklyChoreDoc, WeeklyChoreAssignment, ChoreGroup } from '@/shared/types/chores'
import { getCurrentAssignee, weekIdToStartDate, dateToWeekId } from '../utils/rotation'

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
  // Prevent infinite re-creation loop when there are genuinely no groups
  const recreationAttempted = useRef(false)

  useEffect(() => {
    if (!familyId || !weekId) return
    recreationAttempted.current = false

    const docRef = doc(db, weeklyChores(familyId), weekId)

    const unsub = onSnapshot(docRef, async (snap) => {
      if (snap.exists()) {
        const weekData = { ...snap.data(), weekId: snap.id } as WeeklyChoreDoc
        // If the doc was created with no groups (stale/empty), re-create it once
        if (
          Object.keys(weekData.assignments).length === 0 &&
          !recreationAttempted.current
        ) {
          recreationAttempted.current = true
          await createWeekDoc(familyId, weekId, memberNames)
          // onSnapshot will fire again with the updated doc
          return
        }
        setData(weekData)
        setIsLoading(false)
      } else {
        // Don't auto-create docs for past weeks — show empty state instead
        const currentWeekId = dateToWeekId(new Date())
        if (weekId < currentWeekId) {
          setData(null)
          setIsLoading(false)
          return
        }
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
  const [groupsSnap, familySnap] = await Promise.all([
    getDocs(query(collection(db, choreGroups(familyId)), where('archived', '==', false))),
    getDoc(doc(db, FAMILIES, familyId)),
  ])

  const familyData = familySnap.data()
  const rotationPool: string[] = familyData?.choreRotationPool ?? []
  const rotationDuration: number = familyData?.choreRotationDurationWeeks ?? 1

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
      assigneeId = getCurrentAssignee(group, weekId, rotationPool, rotationDuration)
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

// ─── Patch an existing week doc with any groups added since it was created ────

export async function patchWeekDoc(
  familyId: string,
  weekId: string,
  memberNames: Record<string, string>,
): Promise<void> {
  const [groupsSnap, weekSnap] = await Promise.all([
    getDocs(query(collection(db, choreGroups(familyId)), where('archived', '==', false))),
    getDoc(doc(db, weeklyChores(familyId), weekId)),
  ])

  if (!weekSnap.exists()) {
    await createWeekDoc(familyId, weekId, memberNames)
    return
  }

  const familySnap = await getDoc(doc(db, FAMILIES, familyId))
  const familyData = familySnap.data()
  const rotationPool: string[] = familyData?.choreRotationPool ?? []
  const rotationDuration: number = familyData?.choreRotationDurationWeeks ?? 1

  const existingAssignments = (weekSnap.data() as WeeklyChoreDoc).assignments ?? {}
  const weekStart = weekIdToStartDate(weekId)
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() }
  let hasPatch = false

  for (const groupDoc of groupsSnap.docs) {
    const group = { ...groupDoc.data(), groupId: groupDoc.id } as ChoreGroup
    const existing = existingAssignments[group.groupId]

    if (!existing) {
      // Group is entirely new — add the full assignment
      hasPatch = true
      let assigneeId: string
      let assigneeName: string

      if (group.assignmentType === 'fixed') {
        assigneeId = group.fixedAssignees[0] ?? ''
        assigneeName = memberNames[assigneeId] ?? assigneeId
      } else {
        assigneeId = getCurrentAssignee(group, weekId, rotationPool, rotationDuration)
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
        d.setDate(d.getDate() + 5)
        return d.toISOString().slice(0, 10)
      })()

      updates[`assignments.${group.groupId}`] = {
        assigneeId,
        assigneeName,
        groupName: group.name,
        chores,
        expectedDueDate,
        completedAt: null,
      }
    } else {
      // Group already exists — add any chores that were created after the week doc
      const existingChoreIds = new Set(Object.keys(existing.chores))
      for (const chore of group.chores) {
        if (!existingChoreIds.has(chore.choreId)) {
          hasPatch = true
          updates[`assignments.${group.groupId}.chores.${chore.choreId}`] = {
            status: 'pending',
            submittedAt: null,
            submittedBy: null,
            mediaUrl: null,
            verifiedAt: null,
            verifiedBy: null,
          }
        }
      }
    }
  }

  if (hasPatch) {
    await updateDoc(doc(db, weeklyChores(familyId), weekId), updates)
  }
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

// ─── Unapprove chore ─────────────────────────────────────────────────────────

interface UnapproveChoreParams {
  familyId: string
  weekId: string
  groupId: string
  choreId: string
}

export async function unapproveChore({
  familyId,
  weekId,
  groupId,
  choreId,
}: UnapproveChoreParams): Promise<void> {
  const docRef = doc(db, weeklyChores(familyId), weekId)
  await updateDoc(docRef, {
    [`assignments.${groupId}.chores.${choreId}.status`]: 'pending',
    [`assignments.${groupId}.chores.${choreId}.verifiedAt`]: null,
    [`assignments.${groupId}.chores.${choreId}.verifiedBy`]: null,
    [`assignments.${groupId}.completedAt`]: null,
    updatedAt: serverTimestamp(),
  })
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
