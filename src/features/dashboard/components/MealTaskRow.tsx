import { AssigneePicker } from "@/shared/components/AssigneePicker";
import type { MealTask } from "@/shared/types/meals";
import type { UserProfile } from "@/shared/types";

export interface MealTaskRowProps {
  task: MealTask;
  notes?: string;
  isParent: boolean;
  userId: string;
  familyMembers: UserProfile[];
  isPending?: boolean;
  onAssign: (assigneeId: string | null, assigneeName: string | null) => void;
}

export function MealTaskRow({
  task,
  notes,
  isParent,
  userId,
  familyMembers,
  isPending,
  onAssign,
}: MealTaskRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
      <div className="min-w-0 flex-1">
        <span className="text-sm text-foreground">{task.description}</span>
        {notes && (
          <p className="text-xs text-muted-foreground mt-0.5">{notes}</p>
        )}
      </div>

      <AssigneePicker
        assigneeId={task.assigneeId ?? null}
        assigneeName={task.assigneeName ?? null}
        familyMembers={familyMembers}
        isParent={isParent}
        currentUserId={userId}
        disabled={isPending}
        onAssign={onAssign}
      />
    </div>
  );
}
