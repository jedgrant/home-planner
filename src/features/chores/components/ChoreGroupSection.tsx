import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { ChoreRow } from './ChoreRow'
import type { WeeklyChoreAssignment } from '@/shared/types/chores'
import { submitChore, verifyChore, requestResubmit } from '../hooks/useWeeklyChores'

interface ChoreGroupSectionProps {
  groupId: string
  assignment: WeeklyChoreAssignment
  familyId: string
  weekId: string
  isParent: boolean
  currentUserId: string
  choreNameMap: Record<string, { name: string; description: string }>
}

export function ChoreGroupSection({
  groupId,
  assignment,
  familyId,
  weekId,
  isParent,
  currentUserId,
  choreNameMap,
}: ChoreGroupSectionProps) {
  const completedCount = Object.values(assignment.chores).filter(
    (e) => e.status === 'complete',
  ).length
  const totalCount = Object.keys(assignment.chores).length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-foreground">{assignment.groupName}</span>
            <p className="text-sm text-muted-foreground mt-0.5">
              Assigned to:{' '}
              <span className="text-foreground">{assignment.assigneeName || '—'}</span>
            </p>
          </div>
          <Badge variant={completedCount === totalCount ? 'default' : 'outline'}>
            {completedCount}/{totalCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {Object.entries(assignment.chores).map(([choreId, entry]) => {
          const info = choreNameMap[choreId] ?? { name: choreId, description: '' }
          return (
            <ChoreRow
              key={choreId}
              choreId={choreId}
              choreName={info.name}
              choreDescription={info.description}
              entry={entry}
              isParent={isParent}
              currentUserId={currentUserId}
              onSubmit={async (cid, file) => {
                await submitChore({
                  familyId,
                  weekId,
                  groupId,
                  choreId: cid,
                  submittedBy: currentUserId,
                  mediaFile: file,
                })
              }}
              onVerify={async (cid) => {
                await verifyChore({
                  familyId,
                  weekId,
                  groupId,
                  choreId: cid,
                  verifiedBy: currentUserId,
                })
              }}
              onRequestResubmit={async (cid) => {
                await requestResubmit({ familyId, weekId, groupId, choreId: cid })
              }}
            />
          )
        })}
      </CardContent>
    </Card>
  )
}
