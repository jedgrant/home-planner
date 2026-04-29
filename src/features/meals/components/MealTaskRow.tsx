import { Check, HandHelping, UserRoundPlus, UserRoundX, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import type { MealTask } from '@/shared/types/meals'
import type { UserProfile } from '@/shared/types'
import { RichTextContent } from '@/shared/components/RichTextContent'

export interface MealTaskRowProps {
  task: MealTask
  isServed: boolean
  isParent: boolean
  currentUserId: string
  familyMembers: UserProfile[]
  onAssign: (assigneeId: string | null) => void
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
  const canParentAssign = !isServed && isParent
  const isAssignedToMe = task.assigneeId === currentUserId
  const canSelfVolunteer = !isServed && !isParent && !task.assigneeId
  const canSelfUndo = !isServed && !isParent && isAssignedToMe

  return (
    <div
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors bg-background border border-transparent"
    >
      {/* Completion checkbox */}
      {/* removed — meal tasks no longer tracked for completion */}

      {/* Description */}
      <div className="flex-1 min-w-0">
        <RichTextContent html={task.description} className="text-sm" />
      </div>

      {/* Difficulty badge */}
      {/* <Badge variant={difficultyVariant[task.difficulty] ?? 'outline'} className="shrink-0">
        {difficultyLabel[task.difficulty] ?? task.difficulty}
      </Badge> */}

      {/* Assignee */}
      {canParentAssign ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted transition-colors shrink-0 max-w-36"
                aria-label="Change assignee"
              />
            }
          >
            {task.assigneeId ? (
              <>
                <Avatar size="sm">
                  <AvatarImage
                    src={familyMembers.find((m) => m.userId === task.assigneeId)?.photoUrl ?? undefined}
                  />
                  <AvatarFallback>
                    {(task.assigneeName ?? '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-foreground">{task.assigneeName}</span>
              </>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1">
                <UserRoundPlus className="h-3.5 w-3.5 shrink-0" />
                Assign…
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Assign to</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {familyMembers.map((member) => (
              <DropdownMenuItem
                key={member.userId}
                onClick={() => onAssign(member.userId)}
                className="flex items-center gap-2"
              >
                <Avatar size="sm">
                  <AvatarImage src={member.photoUrl ?? undefined} />
                  <AvatarFallback>{member.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1">{member.displayName}</span>
                {task.assigneeId === member.userId && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
            </DropdownMenuGroup>
            {task.assigneeId && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onAssign(null)}
                  className="text-muted-foreground"
                >
                  <UserRoundX className="h-3.5 w-3.5 mr-2" />
                  Unassign
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : canSelfUndo ? (
        <Button
          size="sm"
          variant="ghost"
          aria-label="Remove volunteer"
          className="text-primary shrink-0"
          onClick={() => onAssign(null)}
        >
          Undo
        </Button>
      ) : canSelfVolunteer ? (
        <Button
          size="sm"
          variant="outline"
          aria-label="Volunteer for this task"
          className="shrink-0"
          onClick={() => onAssign(currentUserId)}
        >
          <HandHelping className="h-3.5 w-3.5 mr-1.5" />
          Volunteer
        </Button>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          {task.assigneeId ? (
            <>
              <Avatar size="sm">
                <AvatarImage
                  src={familyMembers.find((m) => m.userId === task.assigneeId)?.photoUrl ?? undefined}
                />
                <AvatarFallback>
                  {(task.assigneeName ?? '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{task.assigneeName}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}
        </div>
      )}

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
