import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useAuthStore } from '@/shared/lib/authStore'
import { useFamilyMembers, usePendingProfiles, useFamily } from '@/features/auth/hooks/useFamilyQueries'
import { useChoreGroups, useReassignGroup } from '../hooks/useChoreGroups'
import { useWeeklyChoreDoc, patchWeekDoc } from '../hooks/useWeeklyChores'
import { dateToWeekId, weekIdToStartDate } from '../utils/rotation'
import { ChoreGroupSection } from './ChoreGroupSection'
import { format, addWeeks, subWeeks } from 'date-fns'

export function ChoresPage() {
  const { user } = useAuthStore()
  const familyId = user?.familyId ?? ''
  const isParent = user?.role === 'parent'

  const queryClient = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
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
  const { data: pendingProfiles } = usePendingProfiles(familyId)
  const { data: family } = useFamily(familyId)
  const { data: groups } = useChoreGroups(familyId)
  const reassignGroup = useReassignGroup()

  const memberNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const m of members ?? []) map[m.userId] = m.displayName
    for (const p of (pendingProfiles ?? []).filter((p) => p.role === 'child')) {
      map[p.id] = p.displayName
    }
    return map
  }, [members, pendingProfiles])

  const memberPhotos = useMemo(() => {
    const map: Record<string, string | null> = {}
    for (const m of members ?? []) map[m.userId] = m.photoUrl ?? null
    for (const p of (pendingProfiles ?? []).filter((p) => p.role === 'child')) {
      map[p.id] = p.photoUrl ?? null
    }
    return map
  }, [members, pendingProfiles])

  const { data: weekDoc, isLoading } = useWeeklyChoreDoc(familyId, currentWeekId, memberNames)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await queryClient.refetchQueries({ queryKey: ['choreGroups', familyId] })
      await patchWeekDoc(familyId, currentWeekId, memberNames)
    } finally {
      setIsRefreshing(false)
    }
  }

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
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Chores</h1>
        {isParent && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Reload chore groups"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Link
              to="/chores/manage"
              className="inline-flex items-center gap-1 text-sm font-medium text-foreground border border-border rounded-lg px-2.5 h-7 bg-background hover:bg-muted transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Manage
            </Link>
          </div>
        )}
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-center gap-0">
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
          className="min-w-50 flex-col h-auto py-1 gap-0"
          disabled={weekOffset === 0}
          onClick={() => setWeekOffset(0)}
        >
          <span className="text-sm font-medium leading-tight">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <span className="text-xs text-muted-foreground font-normal leading-tight">{currentWeekId}</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((o) => o + 1)}
          disabled={weekOffset >= 1}
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
            .map(([groupId, assignment]) => {
              const group = groups?.find((g) => g.groupId === groupId)
              const isRotation = group?.assignmentType === 'rotation'
              const fixedAssigneeIds = group?.assignmentType === 'fixed' ? group.fixedAssignees : undefined
              return (
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
                  groupChores={group?.chores}
                  fixedAssigneeIds={fixedAssigneeIds}
                  rotationPool={
                    isParent && isRotation
                      ? (family?.choreRotationPool ?? []).map((id) => ({
                          id,
                          name: memberNames[id] ?? id,
                        }))
                      : undefined
                  }
                  onReassign={
                    isParent && isRotation
                      ? async (newAssigneeId, anchorPoolIndex) => {
                          await reassignGroup.mutateAsync({
                            familyId,
                            weekId: currentWeekId,
                            groupId,
                            newAssigneeId,
                            newAssigneeName: memberNames[newAssigneeId] ?? newAssigneeId,
                            anchorPoolIndex,
                          })
                        }
                      : undefined
                  }
                />
              )
            })}
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
