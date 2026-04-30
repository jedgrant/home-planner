import { Trash2 } from 'lucide-react'
import { AssigneePicker } from '@/shared/components/AssigneePicker'
import type { MealTask } from '@/shared/types/meals'
import type { UserProfile } from '@/shared/types'

export interface MealTaskRowProps {
  task: MealTask
  isServed: boolean
  isParent: boolean
  currentUserId: string
  familyMembers: UserProfile[]
  onAssign: (assigneeId: string | null, assigneeName: string | null) => void
  onRemove?: () => void
}

export function MealTaskRow({
  task,
  isServed,
  isParent,
  currentUserId,
  familyMembers,
  onAssign,
  onRemove,
}: MealTaskRowProps) {


  return (
    <div
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors bg-background border border-transparent"
    >
      {/* Completion checkbox */}
      {/* removed — meal tasks no longer tracked for completion */}

      {/* Description */}
      <div className="flex-1 min-w-0">
        <span className="text-sm">{task.description}</span>
      </div>

      {/* Assignee */}
      <AssigneePicker
        assigneeId={task.assigneeId ?? null}
        assigneeName={task.assigneeName ?? null}
        familyMembers={familyMembers}
        isParent={isParent}
        currentUserId={currentUserId}
        disabled={isServed}
        onAssign={onAssign}
      />

      {/* Remove button (e.g. extra Dishes entries) */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Remove task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
