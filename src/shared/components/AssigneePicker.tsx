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
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import type { UserProfile } from '@/shared/types'

export interface AssigneePickerProps {
  assigneeId: string | null
  assigneeName: string | null
  familyMembers: UserProfile[]
  isParent: boolean
  currentUserId: string
  disabled?: boolean
  /**
   * Controls the order of avatar and name in the assigned trigger and read-only display.
   * Default `false` = name before avatar.
   */
  avatarFirst?: boolean
  onAssign: (assigneeId: string | null, assigneeName: string | null) => void
}

export function AssigneePicker({
  assigneeId,
  assigneeName,
  familyMembers,
  isParent,
  currentUserId,
  disabled = false,
  avatarFirst = false,
  onAssign,
}: AssigneePickerProps) {
  const isMe = assigneeId === currentUserId
  const isClaimed = assigneeId !== null && !isMe
  const photoUrl = familyMembers.find((m) => m.userId === assigneeId)?.photoUrl ?? undefined
  const fallback = (assigneeName ?? '?').charAt(0).toUpperCase()
  const currentUserName = familyMembers.find((m) => m.userId === currentUserId)?.displayName ?? ''

  const avatarEl = (
    <Avatar size="sm">
      <AvatarImage src={photoUrl} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  )

  const nameEl = <span className="truncate text-foreground">{assigneeName}</span>

  const assignedTriggerContent = assigneeId ? (
    avatarFirst ? (
      <>{avatarEl}{nameEl}</>
    ) : (
      <>{nameEl}{avatarEl}</>
    )
  ) : (
    <span className="text-muted-foreground flex items-center gap-1">
      <UserRoundPlus className="h-3.5 w-3.5 shrink-0" />
      Assign…
    </span>
  )

  if (isParent) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted transition-colors shrink-0 max-w-36 disabled:opacity-50"
              aria-label={assigneeId ? 'Change assignee' : 'Assign person'}
              disabled={disabled}
            />
          }
        >
          {assignedTriggerContent}
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
                {assigneeId === member.userId && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          {assigneeId && (
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
    )
  }

  // Non-parent: if disabled and nothing is assigned, render nothing
  if (disabled && !assigneeId) return null

  if (isMe) {
    return (
      <Button
        size="sm"
        variant="ghost"
        aria-label="Remove volunteer"
        className="text-primary shrink-0"
        disabled={disabled}
        onClick={() => onAssign(null, null)}
      >
        Undo
      </Button>
    )
  }

  if (!isClaimed) {
    return (
      <Button
        size="sm"
        variant="outline"
        aria-label="Volunteer for this task"
        className="shrink-0"
        disabled={disabled}
        onClick={() => onAssign(currentUserId, currentUserName)}
      >
        <HandHelping className="h-3.5 w-3.5 mr-1.5" />
        Volunteer
      </Button>
    )
  }

  // Claimed by someone else — read-only display
  const readOnlyAvatarEl = (
    <Avatar size="sm">
      <AvatarImage src={photoUrl} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  )

  return (
    <div className="flex items-center gap-1.5 text-xs shrink-0">
      {avatarFirst ? (
        <>{readOnlyAvatarEl}<span className="text-muted-foreground">{assigneeName}</span></>
      ) : (
        <><span className="text-muted-foreground">{assigneeName}</span>{readOnlyAvatarEl}</>
      )}
    </div>
  )
}
