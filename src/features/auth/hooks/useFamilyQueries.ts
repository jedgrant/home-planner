import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, getDocs, updateDoc, collection, query, where, Timestamp, serverTimestamp } from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { FAMILIES, USERS, INVITE_CODES, pendingProfiles as pendingProfilesCol } from '@/shared/lib/collections'
import type { UserProfile, Family, InviteCode, PendingProfile } from '@/shared/types'

export function useFamily(familyId: string | null) {
  return useQuery<Family | null>({
    queryKey: ['family', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const snap = await getDoc(doc(db, FAMILIES, familyId!))
      if (!snap.exists()) return null
      return { ...snap.data(), familyId: snap.id } as Family
    },
  })
}

export function useFamilyMembers(familyId: string | null) {
  return useQuery<UserProfile[]>({
    queryKey: ['familyMembers', familyId],
    enabled: !!familyId,
    staleTime: Infinity, // load once per session; invalidate explicitly on profile changes
    queryFn: async () => {
      const familySnap = await getDoc(doc(db, FAMILIES, familyId!))
      if (!familySnap.exists()) return []
      const memberIds: string[] = familySnap.data().memberIds ?? []
      const docs = await Promise.all(
        memberIds.map((id) => getDoc(doc(db, USERS, id))),
      )
      return docs
        .filter((d) => d.exists())
        .map((d) => ({ ...d.data(), userId: d.id }) as UserProfile)
    },
  })
}

export function useUserProfile(uid: string | null) {
  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', uid],
    enabled: !!uid,
    queryFn: async () => {
      const snap = await getDoc(doc(db, USERS, uid!))
      if (!snap.exists()) return null
      return { ...snap.data(), userId: snap.id } as UserProfile
    },
  })
}

export function useActiveCodes(familyId: string | null) {
  return useQuery<InviteCode[]>({
    queryKey: ['activeCodes', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const now = Timestamp.now()
      const snap = await getDocs(
        query(
          collection(db, INVITE_CODES),
          where('familyId', '==', familyId!),
          where('used', '==', false),
        ),
      )
      return snap.docs
        .map((d) => d.data() as InviteCode)
        .filter((d) => d.reusable === true || (d.expiresAt != null && d.expiresAt.toMillis() > now.toMillis()))
    },
  })
}

export function usePendingProfiles(familyId: string | null) {
  return useQuery<PendingProfile[]>({
    queryKey: ['pendingProfiles', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const snap = await getDocs(collection(db, pendingProfilesCol(familyId!)))
      return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as PendingProfile)
    },
  })
}

export function useUpdateFamilyRotationSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      familyId,
      rotationPool,
      rotationDurationWeeks,
    }: {
      familyId: string
      rotationPool: string[]
      rotationDurationWeeks: number
    }) => {
      await updateDoc(doc(db, FAMILIES, familyId), {
        choreRotationPool: rotationPool,
        choreRotationDurationWeeks: rotationDurationWeeks,
        updatedAt: serverTimestamp(),
      })
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['family', variables.familyId] })
    },
  })
}