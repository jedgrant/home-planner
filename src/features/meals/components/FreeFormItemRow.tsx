import { Check, Pencil, Trash2, UserRoundPlus, UserRoundX } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/components/ui/avatar'
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
import type { FreeFormItem } from '@/shared/types/meals'
import type { UserProfile } from '@/shared/types'

const courseTypeLabel: Record<string, string> = {
  entree: 'Entrée',
  side: 'Side',
  topping: 'Topping',
  dessert: 'Dessert',
}

interface FreeFormItemRowProps {
  item: FreeFormItem
  isServed: boolean
  isParent: boolean
  familyMembers: UserProfile[]
  onAssign: (assigneeId: string | null, assigneeName: string | null) => void
  onEdit: () => void
  onRemove: () => void
}

export function FreeFormItemRow({
  item,
  isServed,
  isParent,
  familyMembers,
  onAssign,
  onEdit,
  onRemove,
}: FreeFormItemRowProps) {
  const canAssign = !isServed && isParent

  return (
    <div
      className="rounded-lg border bg-card px-3 py-2.5 flex items-center gap-3 text-sm"
    >
      {/* Description */}
      <div className="flex-1 min-w-0">
        <RichTextContent html={item.description} />
      </div>

      {/* Course type badge — right of description */}
      <Badge variant="outline" className="shrink-0 text-xs">
        {courseTypeLabel[item.courseType] ?? item.courseType}
      </Badge>

      {/* Assignee — inline dropdown for parents, read-only chip otherwise */}
      {canAssign ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted transition-colors shrink-0 max-w-36"
                aria-label="Change assignee"
              />
            }
          >
            {item.assigneeId ? (
              <>
                <Avatar size="sm">
                  <AvatarImage
                    src={familyMembers.find((m) => m.userId === item.assigneeId)?.photoUrl ?? undefined}
                  />
                  <AvatarFallback>
                    {(item.assigneeName ?? '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate text-foreground">{item.assigneeName}</span>
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
                  {item.assigneeId === member.userId && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            {item.assigneeId && (
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
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          {item.assigneeId ? (
            <>
              <Avatar size="sm">
                <AvatarImage
                  src={familyMembers.find((m) => m.userId === item.assigneeId)?.photoUrl ?? undefined}
                />
                <AvatarFallback>
                  {(item.assigneeName ?? '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{item.assigneeName}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}
        </div>
      )}

      {/* Edit / Remove */}
      {isParent && !isServed && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            aria-label={`Edit ${courseTypeLabel[item.courseType] ?? item.courseType} item`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRemove}
            aria-label={`Remove ${courseTypeLabel[item.courseType] ?? item.courseType} item`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

