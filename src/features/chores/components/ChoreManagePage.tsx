import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useAuthStore } from '@/shared/lib/authStore'
import { useFamilyMembers } from '@/features/auth/hooks/useFamilyQueries'
import {
  useChoreGroups,
  useCreateChoreGroup,
  useUpdateChoreGroup,
  useArchiveChoreGroup,
} from '../hooks/useChoreGroups'
import { getRotationSchedule, dateToWeekId } from '../utils/rotation'
import { ChoreGroupCard } from './ChoreGroupCard'
import { CreateEditChoreGroupDialog } from './CreateEditChoreGroupDialog'
import type { ChoreGroup } from '@/shared/types/chores'

export function ChoreManagePage() {
  const { user } = useAuthStore()
  const familyId = user?.familyId ?? ''

  const { data: groups, isLoading: groupsLoading } = useChoreGroups(familyId)
  const { data: members, isLoading: membersLoading } = useFamilyMembers(familyId)
  const createGroup = useCreateChoreGroup()
  const updateGroup = useUpdateChoreGroup()
  const archiveGroup = useArchiveChoreGroup()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ChoreGroup | null>(null)

  const isLoading = groupsLoading || membersLoading
  const memberNames: Record<string, string> = Object.fromEntries(
    (members ?? []).map((m) => [m.userId, m.displayName]),
  )
  const currentWeekId = dateToWeekId(new Date())

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Manage Chores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {groups?.length ?? 0} group{groups?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Group
        </Button>
      </div>

      {groups?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No chore groups yet. Create one to get started.</p>
        </div>
      )}

      <div className="space-y-4">
        {groups?.map((group) => {
          const rotationSchedule =
            group.assignmentType === 'rotation'
              ? getRotationSchedule(group, 8, memberNames, currentWeekId)
              : []

          return (
            <ChoreGroupCard
              key={group.groupId}
              group={group}
              familyId={familyId}
              memberNames={memberNames}
              rotationSchedule={rotationSchedule}
              onEdit={() => setEditingGroup(group)}
              onArchive={async () => {
                await archiveGroup.mutateAsync({ familyId, groupId: group.groupId })
              }}
            />
          )
        })}
      </div>

      {/* Create group dialog */}
      <CreateEditChoreGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={members ?? []}
        onSubmit={async (values) => {
          await createGroup.mutateAsync({ familyId, ...values })
        }}
      />

      {/* Edit group dialog */}
      {editingGroup && (
        <CreateEditChoreGroupDialog
          open={!!editingGroup}
          onOpenChange={(open) => !open && setEditingGroup(null)}
          members={members ?? []}
          existingGroup={editingGroup}
          onSubmit={async (values) => {
            await updateGroup.mutateAsync({
              familyId,
              groupId: editingGroup.groupId,
              updates: values,
            })
          }}
        />
      )}
    </div>
  )
}
