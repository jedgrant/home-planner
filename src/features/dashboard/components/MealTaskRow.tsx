import { Check, HandHelping, UserRoundPlus, UserRoundX } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { RichTextContent } from '@/shared/components/RichTextContent'
import { Button } from '@/shared/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/components/ui/avatar'
import type { MealTask } from '@/shared/types/meals'
import type { UserProfile } from '@/shared/types'

export interface MealTaskRowProps {
  task: MealTask
  isParent: boolean
  userId: string
  userName: string
  familyMembers: UserProfile[]
  isPending?: boolean
  photoUrlById: Record<string, string | null>
  onAssign: (assigneeId: string | null, assigneeName: string | null) => void
}

export function MealTaskRow({
  task,
  isParent,
  userId,
  userName,
  familyMembers,
  isPending,
  photoUrlById,
  onAssign,
}: MealTaskRowProps) {
  const isMe = task.assigneeId === userId
  const isClaimed = task.assigneeId !== null && !isMe

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
      <div className="min-w-0 flex-1">
        <RichTextContent
          html={task.description}
          className="text-sm text-foreground"
        />
        {(isClaimed || isMe) && (
          <div className="flex items-center gap-1.5 mt-1">
            <Avatar size="sm">
              <AvatarImage src={photoUrlById[task.assigneeId!] ?? undefined} />
              <AvatarFallback>{(task.assigneeName ?? '?').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            {isClaimed ? (
              <p className="text-xs text-muted-foreground">Claimed by {task.assigneeName}</p>
            ) : (
              <p className="text-xs text-primary font-medium">You volunteered</p>
            )}
          </div>
        )}
      </div>

      {isParent ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted transition-colors shrink-0 max-w-36 disabled:opacity-50"
                aria-label="Change assignee"
                disabled={isPending}
              />
            }
          >
            {task.assigneeId ? (
              <>
                <Avatar size="sm">
                  <AvatarImage src={photoUrlById[task.assigneeId] ?? undefined} />
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
                  onClick={() => onAssign(member.userId, member.displayName)}
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
                  onClick={() => onAssign(null, null)}
                  className="text-muted-foreground"
                >
                  <UserRoundX className="h-3.5 w-3.5 mr-2" />
                  Unassign
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : isMe ? (
        <Button
          size="sm"
          variant="ghost"
          aria-label="Remove volunteer"
          className="text-primary"
          disabled={isPending}
          onClick={() => onAssign(null, null)}
        >
          Undo
        </Button>
      ) : !isClaimed ? (
        <Button
          size="sm"
          variant="outline"
          aria-label="Volunteer for this task"
          disabled={isPending}
          onClick={() => onAssign(userId, userName)}
        >
          <HandHelping className="h-3.5 w-3.5 mr-1.5" />
          Volunteer
        </Button>
      ) : null}
    </div>
  )
}
