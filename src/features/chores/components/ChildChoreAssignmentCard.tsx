import { useRef, useState } from 'react'
import { format, isPast, parseISO } from 'date-fns'
import { CheckCircle2, Clock, AlertTriangle, UploadCloud, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { submitChore } from '@/features/chores/hooks/useWeeklyChores'
import type { OpenAssignment } from '@/features/chores/hooks/useChildChoreAssignments'
import type { WeeklyChoreStatus } from '@/shared/types/chores'

interface ChildChoreAssignmentCardProps {
  familyId: string
  userId: string
  openAssignment: OpenAssignment
  choreNameMap: Record<string, { name: string; description: string }>
}

const STATUS_CONFIG: Record<
  WeeklyChoreStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  pending: { label: 'To do', variant: 'outline' },
  submitted: { label: 'Awaiting approval', variant: 'secondary' },
  complete: { label: 'Approved', variant: 'default' },
  needs_resubmission: { label: 'Redo needed', variant: 'destructive' },
}

export function ChildChoreAssignmentCard({
  familyId,
  userId,
  openAssignment,
  choreNameMap,
}: ChildChoreAssignmentCardProps) {
  const qc = useQueryClient()
  const [busyChoreId, setBusyChoreId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingSubmitChoreId, setPendingSubmitChoreId] = useState<string | null>(null)

  const { weekId, weekStartDate, expectedDueDate, groupId, assignment } = openAssignment
  const chores = Object.entries(assignment.chores)
  const doneCount = chores.filter(([, c]) => c.status === 'complete').length
  const isOverdue = isPast(parseISO(expectedDueDate + 'T23:59:59'))

  async function handleSubmit(choreId: string, file?: File) {
    setBusyChoreId(choreId)
    try {
      await submitChore({ familyId, weekId, groupId, choreId, submittedBy: userId, mediaFile: file })
      qc.invalidateQueries({ queryKey: ['weeklyChores', familyId, weekId] })
    } finally {
      setBusyChoreId(null)
      setPendingSubmitChoreId(null)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-foreground">{assignment.groupName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Week of {format(parseISO(weekStartDate), 'MMM d')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              isOverdue
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {isOverdue && <AlertTriangle className="h-3 w-3" />}
            {isOverdue
              ? 'Overdue · due ' + format(parseISO(expectedDueDate), 'MMM d')
              : 'Due ' + format(parseISO(expectedDueDate), 'EEE, MMM d')}
          </span>
          <span className="text-xs text-muted-foreground">
            {doneCount}/{chores.length} approved
          </span>
        </div>
      </div>

      {/* Chore list */}
      <div className="space-y-0">
        {chores.map(([choreId, entry]) => {
          const info = choreNameMap[choreId] ?? { name: choreId, description: '' }
          const config = STATUS_CONFIG[entry.status]
          const canSubmit = entry.status === 'pending' || entry.status === 'needs_resubmission'
          const isBusy = busyChoreId === choreId

          return (
            <div
              key={choreId}
              className="flex items-center justify-between gap-3 py-3 border-b last:border-0"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {entry.status === 'complete' ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : entry.status === 'submitted' ? (
                  <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{info.name}</p>
                  {info.description && (
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  )}
                  {entry.status === 'complete' && entry.verifiedBy && (
                    <p className="text-xs text-muted-foreground">Verified by {entry.verifiedBy}</p>
                  )}
                  {entry.status === 'needs_resubmission' && (
                    <p className="text-xs text-destructive">Parent asked you to redo this</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={config.variant}>{config.label}</Badge>
                {canSubmit && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBusy}
                      aria-label="Mark chore as done"
                      onClick={() => handleSubmit(choreId)}
                    >
                      {isBusy && !pendingSubmitChoreId ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        'Done'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isBusy}
                      aria-label="Upload photo proof"
                      onClick={() => {
                        setPendingSubmitChoreId(choreId)
                        fileInputRef.current?.click()
                      }}
                    >
                      {isBusy && pendingSubmitChoreId === choreId ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UploadCloud className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Hidden file input for photo submissions */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && pendingSubmitChoreId) {
            void handleSubmit(pendingSubmitChoreId, file)
          }
          e.target.value = ''
        }}
      />
    </div>
  )
}
