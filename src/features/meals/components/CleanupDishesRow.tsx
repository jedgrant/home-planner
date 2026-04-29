import { UserRoundPlus, X } from "lucide-react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { MealTask } from "@/shared/types/meals";
import type { UserProfile } from "@/shared/types";

export interface DishEntry {
  task: MealTask;
  globalIndex: number;
}

export interface CleanupDishesRowProps {
  entries: DishEntry[]
  isServed: boolean
  isParent: boolean
  currentUserId: string
  familyMembers: UserProfile[]
  onAssignPerson: (assigneeId: string, assigneeName: string) => void
  onUnassignPerson: (globalIndex: number) => void
}

export function CleanupDishesRow({
  entries,
  isServed,
  isParent,
  currentUserId: _currentUserId,
  familyMembers,
  onAssignPerson,
  onUnassignPerson,
}: CleanupDishesRowProps) {
  const assignedIds = new Set(
    entries.map((e) => e.task.assigneeId).filter(Boolean) as string[]
  )
  const unassignedMembers = familyMembers.filter((m) => !assignedIds.has(m.userId))
  const canAssign = !isServed && isParent && unassignedMembers.length > 0
  const hasAnyAssignee = entries.some((e) => e.task.assigneeId !== null)

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors bg-background ${
        !hasAnyAssignee && !isServed ? 'border border-transparent rounded-md' : 'border border-transparent rounded-md'
      }`}
    >
      {/* Label */}
      <span className="flex-1">Dishes</span>
      {/* Assign dropdown */}
      {canAssign && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors shrink-0"
                aria-label="Assign someone to Dishes"
              />
            }
          >
            <UserRoundPlus className="h-3.5 w-3.5 shrink-0" />
            {hasAnyAssignee ? "Add" : "Assign"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Assign to Dishes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {unassignedMembers.map((member) => (
                <DropdownMenuItem
                  key={member.userId}
                  onClick={() =>
                    onAssignPerson(member.userId, member.displayName)
                  }
                  className="flex items-center gap-2"
                >
                  <Avatar size="sm">
                    <AvatarImage src={member.photoUrl ?? undefined} />
                    <AvatarFallback>
                      {member.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{member.displayName}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {/* Assignee chips */}
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        {entries
          .filter((e) => e.task.assigneeId !== null)
          .map((e) => {
            const member = familyMembers.find((m) => m.userId === e.task.assigneeId)
            const canRemove = isParent && !isServed
            return (
              <span
                key={e.task.taskId}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                <Avatar size="sm">
                  <AvatarImage src={member?.photoUrl ?? undefined} />
                  <AvatarFallback>
                    {(e.task.assigneeName ?? '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{e.task.assigneeName}</span>
                {canRemove && (
                  <button
                    onClick={() => onUnassignPerson(e.globalIndex)}
                    className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`Remove ${e.task.assigneeName} from Dishes`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            )
          })}

        {!hasAnyAssignee && !canAssign && (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        )}
      </div>
    </div>
  );
}
