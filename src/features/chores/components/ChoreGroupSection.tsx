import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Button } from '@/shared/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { ChoreRow } from "./ChoreRow";
import type { ChoreItem, WeeklyChoreAssignment, WeeklyChoreEntry } from "@/shared/types/chores";

const PENDING_ENTRY: WeeklyChoreEntry = {
  status: 'pending',
  submittedAt: null,
  submittedBy: null,
  mediaUrl: null,
  verifiedAt: null,
  verifiedBy: null,
};
import {
  submitChore,
  verifyChore,
  unapproveChore,
  requestResubmit,
} from "../hooks/useWeeklyChores";

interface ChoreGroupSectionProps {
  groupId: string;
  assignment: WeeklyChoreAssignment;
  familyId: string;
  weekId: string;
  isParent: boolean;
  currentUserId: string;
  choreNameMap: Record<string, { name: string; description: string }>;
  memberNames: Record<string, string>;
  memberPhotos: Record<string, string | null>;
  /** Live chore definitions from the group — drives the displayed list */
  groupChores?: ChoreItem[];
  /** All assignees for fixed groups with multiple people */
  fixedAssigneeIds?: string[];
  /** Pool members for rotation groups — enables parent reassign UI */
  rotationPool?: Array<{ id: string; name: string }>;
  onReassign?: (newAssigneeId: string, anchorPoolIndex: number) => Promise<void>;
  onClose?: () => void;
}

export function ChoreGroupSection({
  groupId,
  assignment,
  familyId,
  weekId,
  isParent,
  currentUserId,
  choreNameMap,
  memberNames,
  memberPhotos,
  groupChores,
  fixedAssigneeIds,
  rotationPool,
  onReassign,
  onClose,
}: ChoreGroupSectionProps) {
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  // Always derive the chore list from the live group definition when available,
  // so additions/renames in the manage page are reflected immediately.
  const choreList = groupChores ?? Object.keys(assignment.chores).map((id) => ({
    choreId: id,
    ...(({ name, description }) => ({ name, description }))(choreNameMap[id] ?? { name: id, description: '' }),
  }));
  const completedCount = choreList.filter(
    (c) => (assignment.chores[c.choreId]?.status ?? 'pending') === 'complete',
  ).length;
  const totalCount = choreList.length;
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // For fixed groups, use all assignees; for rotation groups use just the single assignee
  const assigneeIds = fixedAssigneeIds && fixedAssigneeIds.length > 0
    ? fixedAssigneeIds
    : [assignment.assigneeId];
  const displayNames = assigneeIds
    .map((id) => memberNames[id] ?? (id === assignment.assigneeId ? assignment.assigneeName : id))
    .filter(Boolean)
    .join(', ');

  const header = (
    <div className="mb-4">
      <div className="flex items-center mt-1 gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <div className={assigneeIds.length > 1 ? "flex -space-x-2" : undefined}>
            {assigneeIds.map((id) => (
              <Avatar key={id} className={`h-8 w-8 ${assigneeIds.length > 1 ? "ring-2 ring-background" : ""}`}>
                <AvatarImage
                  src={memberPhotos[id] ?? undefined}
                  alt={memberNames[id] ?? ''}
                />
                <AvatarFallback className="text-[10px]">
                  {(memberNames[id] ?? '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <div className="text-xl">{displayNames || '—'}</div>
          {isParent && rotationPool && rotationPool.length > 0 && (
            <Popover open={reassignOpen} onOpenChange={setReassignOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    aria-label="Reassign group"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                }
              />
              <PopoverContent className="w-44 p-1" align="start">
                <p className="text-xs text-muted-foreground px-2 py-1">Reassign to…</p>
                {rotationPool.map((person, poolIndex) => (
                  <button
                    key={person.id}
                    disabled={reassigning}
                    className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                    onClick={async () => {
                      setReassigning(true)
                      try {
                        await onReassign?.(person.id, poolIndex)
                        setReassignOpen(false)
                      } finally {
                        setReassigning(false)
                      }
                    }}
                  >
                    {person.name}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {assignment.groupName}
        </span>

        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />

        <span className={`text-sm text-muted-foreground ${onClose ? "mr-7" : ""}`}>
          {completedCount}/{totalCount}
        </span>
      </div>
      <Progress value={progress} className="h-1.5 mt-2" />
    </div>
  );

  const rows = (
    <>
        {choreList.map((chore) => {
          const entry = assignment.chores[chore.choreId] ?? PENDING_ENTRY;
          return (
            <ChoreRow
              key={chore.choreId}
              choreId={chore.choreId}
              choreName={chore.name}
              choreDescription={chore.description}
              entry={entry}
              isParent={isParent}
              currentUserId={currentUserId}
              memberNames={memberNames}
              onSubmit={async (cid, file) => {
                await submitChore({
                  familyId,
                  weekId,
                  groupId,
                  choreId: cid,
                  submittedBy: currentUserId,
                  mediaFile: file,
                });
              }}
              onVerify={async (cid) => {
                await verifyChore({
                  familyId,
                  weekId,
                  groupId,
                  choreId: cid,
                  verifiedBy: currentUserId,
                });
              }}
              onUnapprove={async (cid) => {
                await unapproveChore({
                  familyId,
                  weekId,
                  groupId,
                  choreId: cid,
                });
              }}
              onRequestResubmit={async (cid) => {
                await requestResubmit({
                  familyId,
                  weekId,
                  groupId,
                  choreId: cid,
                });
              }}
            />
          );
        })}
      </>
  );

  if (onClose) {
    return (
      <div>
        {header}
        {rows}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">{header}</CardHeader>
      <CardContent className="pt-0">{rows}</CardContent>
    </Card>
  );
}
