import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
} from "@/shared/components/ui/sheet";
import { ChoreGroupSection } from "@/features/chores/components/ChoreGroupSection";
import type { UserProfile } from "@/shared/types";
import type { ChoreItem, WeeklyChoreDoc } from "@/shared/types/chores";

interface ChoreSheetContext {
  familyId: string;
  weekId: string;
  isParent: boolean;
  currentUserId: string;
  choreNameMap: Record<string, { name: string; description: string }>;
  memberNames: Record<string, string>;
  memberPhotos: Record<string, string | null>;
  groupChoresMap: Record<string, ChoreItem[]>;
}

interface ChildChoreCardProps {
  member: UserProfile;
  weekDoc: WeeklyChoreDoc | null;
  isOverdue: boolean;
  sheetContext: ChoreSheetContext;
}

export function ChildChoreCard({
  member,
  weekDoc,
  isOverdue,
  sheetContext,
}: ChildChoreCardProps) {
  const [open, setOpen] = useState(false);

  const memberAssignments = Object.entries(weekDoc?.assignments ?? {}).filter(
    ([, a]) => a.assigneeId === member.userId,
  );

  // Total uses live group definition; done count uses week doc completion status
  const totalCount = memberAssignments.reduce((sum, [groupId, a]) => {
    const liveChores = sheetContext.groupChoresMap[groupId];
    return sum + (liveChores?.length ?? Object.keys(a.chores).length);
  }, 0);
  const doneCount = memberAssignments.reduce(
    (sum, [, a]) =>
      sum + Object.values(a.chores).filter((c) => c.status === "complete").length,
    0,
  );
  const allDone = totalCount > 0 && doneCount === totalCount;
  const showOverdue = isOverdue && totalCount > 0 && !allDone;

  const initial = member.displayName.charAt(0).toUpperCase();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-xl border border-border bg-card p-3 flex flex-col gap-2 hover:border-primary/40 hover:bg-primary/5 transition-colors"
        aria-label={`View chores for ${member.displayName}`}
      >
        <div className="flex items-center gap-2">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.displayName}
              className="h-8 w-8 rounded-sm object-cover shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-sm bg-primary/15 flex items-center justify-center text-primary font-semibold text-base shrink-0">
              {initial}
            </div>
          )}
          <p className="text-base font-semibold text-foreground truncate flex-1 min-w-0">
            {member.displayName}
          </p>
          {totalCount > 0 && (
            <span className="shrink-0 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {doneCount}/{totalCount} complete
            </span>
          )}
        </div>

        {totalCount > 0 && (
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
            />
          </div>
        )}

        {showOverdue && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-xs font-medium text-destructive">Chores overdue</span>
          </div>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <div className="space-y-6 p-5 pt-3">
            {memberAssignments.map(([groupId, assignment], index) => (
              <ChoreGroupSection
                key={groupId}
                groupId={groupId}
                assignment={assignment}
                familyId={sheetContext.familyId}
                weekId={sheetContext.weekId}
                isParent={sheetContext.isParent}
                currentUserId={sheetContext.currentUserId}
                choreNameMap={sheetContext.choreNameMap}
                memberNames={sheetContext.memberNames}
                memberPhotos={sheetContext.memberPhotos}
                groupChores={sheetContext.groupChoresMap[groupId]}
                onClose={index === 0 ? () => setOpen(false) : undefined}
              />
            ))}
            {memberAssignments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No chores assigned this week.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
