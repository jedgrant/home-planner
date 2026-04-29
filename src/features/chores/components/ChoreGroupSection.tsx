import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { ChoreRow } from "./ChoreRow";
import type { WeeklyChoreAssignment } from "@/shared/types/chores";
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
  onClose,
}: ChoreGroupSectionProps) {
  const completedCount = Object.values(assignment.chores).filter(
    (e) => e.status === "complete",
  ).length;
  const totalCount = Object.keys(assignment.chores).length;
  const progress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const header = (
    <div>
      <div className="flex items-center mt-1 gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={memberPhotos[assignment.assigneeId] ?? undefined}
              alt={
                memberNames[assignment.assigneeId] ||
                assignment.assigneeName ||
                ""
              }
            />
            <AvatarFallback className="text-[10px]">
              {(
                memberNames[assignment.assigneeId] ||
                assignment.assigneeName ||
                "?"
              )
                .charAt(0)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-xl">
            {memberNames[assignment.assigneeId] ||
              assignment.assigneeName ||
              "—"}
          </div>
        </div>
        <span className="text-sm text-muted-foreground">
          {assignment.groupName}
        </span>

        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />

        <span className={`text-sm text-muted-foreground ${onClose ? "mr-7" : ""}`}>
          {completedCount}/{totalCount}
        </span>

        {/* {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 -mr-1 shrink-0"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        )} */}
      </div>
      <Progress value={progress} className="h-1.5 mt-2" />
    </div>
  );

  const rows = (
    <>
        {Object.entries(assignment.chores).sort(([a], [b]) => a.localeCompare(b)).map(([choreId, entry]) => {
          const info = choreNameMap[choreId] ?? {
            name: choreId,
            description: "",
          };
          return (
            <ChoreRow
              key={choreId}
              choreId={choreId}
              choreName={info.name}
              choreDescription={info.description}
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
