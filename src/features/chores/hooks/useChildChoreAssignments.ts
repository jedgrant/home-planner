import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { weeklyChores } from '@/shared/lib/collections'
import { dateToWeekId } from '../utils/rotation'
import type { WeeklyChoreDoc, WeeklyChoreAssignment } from '@/shared/types/chores'

export interface OpenAssignment {
  weekId: string
  weekStartDate: string
  /** Saturday of the week — falls back to computed value if not on the doc. */
  expectedDueDate: string
  groupId: string
  assignment: WeeklyChoreAssignment
}

function computeSaturday(weekStartDate: string): string {
  const d = new Date(weekStartDate + 'T00:00:00')
  d.setDate(d.getDate() + 5)
  return d.toISOString().slice(0, 10)
}

function isAssignmentComplete(assignment: WeeklyChoreAssignment): boolean {
  if (assignment.completedAt) return true
  const chores = Object.values(assignment.chores)
  return chores.length > 0 && chores.every((c) => c.status === 'complete')
}

/**
 * Fetches the last 5 weekly chore docs and returns every assignment belonging
 * to `userId` that is not yet fully verified. Results are sorted oldest-first
 * so overdue items appear at the top.
 */
export function useOpenChoreAssignments(
  familyId: string,
  userId: string,
): { openAssignments: OpenAssignment[]; isLoading: boolean } {
  // Compute last 5 week IDs (current + 4 prior). Stable per mount.
  const weekIds = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - i * 7)
      return dateToWeekId(d)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const results = useQueries({
    queries: weekIds.map((weekId) => ({
      queryKey: ['weeklyChores', familyId, weekId],
      queryFn: async (): Promise<WeeklyChoreDoc | null> => {
        if (!familyId) return null
        const snap = await getDoc(doc(db, weeklyChores(familyId), weekId))
        if (!snap.exists()) return null
        return { ...snap.data(), weekId: snap.id } as WeeklyChoreDoc
      },
      enabled: Boolean(familyId) && Boolean(userId),
      staleTime: 30_000,
    })),
  })

  const openAssignments: OpenAssignment[] = []

  for (const result of results) {
    const weekDoc = result.data
    if (!weekDoc) continue
    for (const [groupId, assignment] of Object.entries(weekDoc.assignments)) {
      if (assignment.assigneeId !== userId) continue
      if (isAssignmentComplete(assignment)) continue
      openAssignments.push({
        weekId: weekDoc.weekId,
        weekStartDate: weekDoc.weekStartDate,
        expectedDueDate:
          assignment.expectedDueDate ?? computeSaturday(weekDoc.weekStartDate),
        groupId,
        assignment,
      })
    }
  }

  // Oldest week first so overdue assignments surface at the top
  openAssignments.sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))

  const isLoading = results.some((r) => r.isLoading)

  return { openAssignments, isLoading }
}
