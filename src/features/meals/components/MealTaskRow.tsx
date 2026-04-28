import { format } from 'date-fns'
import { Check } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { MealTask } from '@/shared/types/meals'
import type { UserProfile } from '@/shared/types'

const difficultyLabel: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

const difficultyVariant: Record<string, 'secondary' | 'outline' | 'destructive'> = {
  easy: 'secondary',
  medium: 'outline',
  hard: 'destructive',
}

export interface MealTaskRowProps {
  task: MealTask
  isServed: boolean
  isParent: boolean
  currentUserId: string
  familyMembers: UserProfile[]
  onAssign: (assigneeId: string | null) => void
  onComplete: (completed: boolean) => void
}

export function MealTaskRow({
  task,
  isServed,
  isParent,
  currentUserId,
  familyMembers,
  onAssign,
  onComplete,
}: MealTaskRowProps) {
  const canComplete = !isServed && (isParent || currentUserId === task.assigneeId)
  const canAssign = !isServed && isParent
  const isCompleted = task.completedAt !== null
  const isUnassigned = task.assigneeId === null

  return (
    <div
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
        isCompleted ? 'bg-muted/40 text-muted-foreground' : 'bg-background'
      } ${isUnassigned && !isServed ? 'border border-destructive/30' : 'border border-transparent'}`}
    >
      {/* Completion checkbox */}
      <Checkbox
        checked={isCompleted}
        disabled={!canComplete || (isCompleted && !isParent)}
        onCheckedChange={(checked) => onComplete(Boolean(checked))}
        aria-label={`Mark "${task.description}" as complete`}
      />

      {/* Description */}
      <span className={`flex-1 ${isCompleted ? 'line-through' : ''}`}>
        {task.description}
      </span>

      {/* Difficulty badge */}
      <Badge variant={difficultyVariant[task.difficulty] ?? 'outline'} className="shrink-0">
        {difficultyLabel[task.difficulty] ?? task.difficulty}
      </Badge>

      {/* Assignee */}
      {canAssign ? (
        <Select
          value={task.assigneeId ?? ''}
          onValueChange={(v) => onAssign(v === '' ? null : v)}
        >
          <SelectTrigger className="h-7 w-36 text-xs">
            <SelectValue placeholder="Assign…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassigned</SelectItem>
            {familyMembers.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-xs text-muted-foreground w-28 text-right shrink-0">
          {task.assigneeName ?? (
            <span className="text-destructive">Unassigned</span>
          )}
        </span>
      )}

      {/* Completed-by info */}
      {isCompleted && task.completedAt && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Check className="h-3 w-3" />
          {format(task.completedAt.toDate(), 'h:mm a')}
        </span>
      )}
    </div>
  )
}
