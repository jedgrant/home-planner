import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@/shared/lib/firebase'
import { choreGroups, weeklyChores } from '@/shared/lib/collections'
import type { ChoreGroup, ChoreItem } from '@/shared/types/chores'
import { dateToWeekId } from '../utils/rotation'

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useChoreGroups(familyId: string) {
  return useQuery({
    queryKey: ['choreGroups', familyId],
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, choreGroups(familyId)),
          where('archived', '==', false),
        ),
      )
      return snap.docs.map((d) => ({ ...d.data(), groupId: d.id }) as ChoreGroup)
    },
    enabled: !!familyId,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

interface CreateChoreGroupInput {
  familyId: string
  name: string
  assignmentType: ChoreGroup['assignmentType']
  fixedAssignees: string[]
}

export function useCreateChoreGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateChoreGroupInput) => {
      const { familyId, ...fields } = input
      const anchorWeekId = dateToWeekId(new Date())
      await addDoc(collection(db, choreGroups(familyId)), {
        ...fields,
        description: '',
        familyId,
        chores: [],
        archived: false,
        // Anchor the rotation to this week so it progresses correctly from creation
        rotationAnchorWeekId: fields.assignmentType === 'rotation' ? anchorWeekId : null,
        rotationAnchorPoolIndex: fields.assignmentType === 'rotation' ? 0 : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['choreGroups', variables.familyId] })
    },
  })
}

interface UpdateChoreGroupInput {
  familyId: string
  groupId: string
  updates: Partial<
    Pick<
      ChoreGroup,
      | 'name'
      | 'assignmentType'
      | 'fixedAssignees'
      | 'rotationAnchorWeekId'
      | 'rotationAnchorPoolIndex'
    >
  >
}

export function useUpdateChoreGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ familyId, groupId, updates }: UpdateChoreGroupInput) => {
      const ref = doc(db, choreGroups(familyId), groupId)
      await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() })
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['choreGroups', variables.familyId] })
    },
  })
}

export function useArchiveChoreGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ familyId, groupId }: { familyId: string; groupId: string }) => {
      const ref = doc(db, choreGroups(familyId), groupId)
      await updateDoc(ref, { archived: true, updatedAt: serverTimestamp() })
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['choreGroups', variables.familyId] })
    },
  })
}

// ─── Chore item mutations (embedded in group doc) ─────────────────────────────

interface AddChoreInput {
  familyId: string
  groupId: string
  currentChores: ChoreItem[]
  name: string
  description: string
}

export function useAddChore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ familyId, groupId, currentChores, name, description }: AddChoreInput) => {
      const ref = doc(db, choreGroups(familyId), groupId)
      const newChore: ChoreItem = {
        choreId: crypto.randomUUID(),
        name,
        description,
      }
      await updateDoc(ref, {
        chores: [...currentChores, newChore],
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['choreGroups', variables.familyId] })
    },
  })
}

interface UpdateChoreInput {
  familyId: string
  groupId: string
  currentChores: ChoreItem[]
  choreId: string
  name: string
  description: string
}

export function useUpdateChore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      familyId,
      groupId,
      currentChores,
      choreId,
      name,
      description,
    }: UpdateChoreInput) => {
      const ref = doc(db, choreGroups(familyId), groupId)
      const updatedChores = currentChores.map((c) =>
        c.choreId === choreId ? { ...c, name, description } : c,
      )
      await updateDoc(ref, { chores: updatedChores, updatedAt: serverTimestamp() })
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['choreGroups', variables.familyId] })
    },
  })
}

interface DeleteChoreInput {
  familyId: string
  groupId: string
  currentChores: ChoreItem[]
  choreId: string
}

export function useDeleteChore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ familyId, groupId, currentChores, choreId }: DeleteChoreInput) => {
      const ref = doc(db, choreGroups(familyId), groupId)
      const updatedChores = currentChores.filter((c) => c.choreId !== choreId)
      await updateDoc(ref, { chores: updatedChores, updatedAt: serverTimestamp() })
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['choreGroups', variables.familyId] })
    },
  })
}

// ─── Rotation override (reassign a group for a week + set anchor) ─────────────

interface ReassignGroupInput {
  familyId: string
  weekId: string
  groupId: string
  newAssigneeId: string
  newAssigneeName: string
  anchorPoolIndex: number
}

export function useReassignGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      familyId,
      weekId,
      groupId,
      newAssigneeId,
      newAssigneeName,
      anchorPoolIndex,
    }: ReassignGroupInput) => {
      // Update the week doc so the display changes immediately
      const weekRef = doc(db, weeklyChores(familyId), weekId)
      await updateDoc(weekRef, {
        [`assignments.${groupId}.assigneeId`]: newAssigneeId,
        [`assignments.${groupId}.assigneeName`]: newAssigneeName,
        updatedAt: serverTimestamp(),
      })
      // Set the anchor on the group so future weeks rotate from this new position
      const groupRef = doc(db, choreGroups(familyId), groupId)
      await updateDoc(groupRef, {
        rotationAnchorWeekId: weekId,
        rotationAnchorPoolIndex: anchorPoolIndex,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['choreGroups', variables.familyId] })
    },
  })
}
