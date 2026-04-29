import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useAuthStore } from '@/shared/lib/authStore'
import { useFamilyMembers } from '@/features/auth/hooks/useFamilyQueries'
import { useChoreGroups } from '../hooks/useChoreGroups'
import { useWeeklyChoreDoc } from '../hooks/useWeeklyChores'
import { dateToWeekId, weekIdToStartDate } from '../utils/rotation'
import { ChoreGroupSection } from './ChoreGroupSection'
import { format, addWeeks, subWeeks } from 'date-fns'

export function ChoresPage() {
  const { user } = useAuthStore()
  const familyId = user?.familyId ?? ''
  const isParent = user?.role === 'parent'

  const [weekOffset, setWeekOffset] = useState(0)
  const currentWeekId = useMemo(() => {
    const d = new Date()
    if (weekOffset === 0) return dateToWeekId(d)
    const shifted = weekOffset > 0 ? addWeeks(d, weekOffset) : subWeeks(d, -weekOffset)
    return dateToWeekId(shifted)
  }, [weekOffset])

  const weekStart = weekIdToStartDate(currentWeekId)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const { data: members } = useFamilyMembers(familyId)
  const { data: groups } = useChoreGroups(familyId)
  const memberNames = useMemo(
    () => Object.fromEntries((members ?? []).map((m) => [m.userId, m.displayName])),
    [members],
  )
  const memberPhotos = useMemo(
    () => Object.fromEntries((members ?? []).map((m) => [m.userId, m.photoUrl ?? null])),
    [members],
  )

  const { data: weekDoc, isLoading } = useWeeklyChoreDoc(familyId, currentWeekId, memberNames)

  // Build a map of choreId → {name, description} from loaded groups
  const choreNameMap = useMemo(() => {
    const map: Record<string, { name: string; description: string }> = {}
    for (const group of groups ?? []) {
      for (const chore of group.chores) {
        map[chore.choreId] = { name: chore.name, description: chore.description }
      }
    }
    return map
  }, [groups])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Chores</h1>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')} · {currentWeekId}
          </p>
        </div>
        {isParent && (
          <Link
            to="/chores/manage"
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground border border-border rounded-lg px-2.5 h-7 bg-background hover:bg-muted transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Manage
          </Link>
        )}
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((o) => o - 1)}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={weekOffset === 0}
          onClick={() => setWeekOffset(0)}
        >
          This Week
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((o) => o + 1)}
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {/* Group sections */}
      {!isLoading && weekDoc && (
        <div className="space-y-4">
          {Object.entries(weekDoc.assignments)
            .sort(([, a], [, b]) => a.groupName.localeCompare(b.groupName))
            .map(([groupId, assignment]) => (
            <ChoreGroupSection
              key={groupId}
              groupId={groupId}
              assignment={assignment}
              familyId={familyId}
              weekId={currentWeekId}
              isParent={isParent}
              currentUserId={user?.uid ?? ''}
              choreNameMap={choreNameMap}
              memberNames={memberNames}
              memberPhotos={memberPhotos}
            />
          ))}
          {Object.keys(weekDoc.assignments).length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No chore groups for this week.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
