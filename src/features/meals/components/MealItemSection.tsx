import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Separator } from "@/shared/components/ui/separator";
import { AssigneePicker } from "@/shared/components/AssigneePicker";
import { MealTaskRow } from "./MealTaskRow";
import type { MealItem } from "@/shared/types/meals";
import type { UserProfile } from "@/shared/types";

const courseTypeLabel: Record<string, string> = {
  entree: "Entrée",
  side: "Side",
  salad: "Salad",
  fruit: "Fruit",
  dessert: "Dessert",
};

export interface MealItemSectionProps {
  item: MealItem;
  isServed: boolean;
  isParent: boolean;
  currentUserId: string;
  familyMembers: UserProfile[];
  onRemoveItem: () => void;
  /** taskId is '__component__' when assigning the whole component (no-tasks case) */
  onAssignTask: (
    componentId: string,
    taskId: string,
    assigneeId: string | null,
    assigneeName: string | null,
  ) => void;
  onViewRecipe?: () => void;
}

export function MealItemSection({
  item,
  isServed,
  isParent,
  currentUserId,
  familyMembers,
  onRemoveItem,
  onAssignTask,
  onViewRecipe,
}: MealItemSectionProps) {
  const [open, setOpen] = useState(true);

  const totalTasks = item.components.reduce((n, c) => n + c.tasks.length, 0);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center gap-2 p-3">
          <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity">
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="font-medium">{item.name}</span>
            <Badge variant="outline" className="text-xs">
              {courseTypeLabel[item.courseType] ?? item.courseType}
            </Badge>
          </CollapsibleTrigger>

          {totalTasks > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
            </span>
          )}

          {item.recipeId && onViewRecipe && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={onViewRecipe}
              aria-label="View full recipe"
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          )}

          {!isServed && isParent && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onRemoveItem}
              aria-label={`Remove ${item.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Component sections */}
        <CollapsibleContent>
          {item.components.length === 0 ? (
            <div className="border-t px-3 py-3 text-sm text-muted-foreground text-center">
              No tasks for this item.
            </div>
          ) : (
            <div className="border-t divide-y">
              {item.components.map((comp, ci) => (
                <div key={comp.componentId} className="px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {/* Name + notes */}
                    <div className="flex-1 min-w-0">
                      {item.components.length > 1 && (
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {comp.name}
                        </p>
                      )}
                      {comp.notes && (
                        <p className="text-xs text-muted-foreground">
                          {comp.notes}
                        </p>
                      )}
                    </div>

                    {/* Assignment control — inline right, only for no-task components */}
                    {comp.tasks.length === 0 && (
                      <div className="shrink-0">
                        <AssigneePicker
                          assigneeId={comp.assigneeId ?? null}
                          assigneeName={comp.assigneeName ?? null}
                          familyMembers={familyMembers}
                          isParent={isParent}
                          currentUserId={currentUserId}
                          disabled={isServed}
                          onAssign={(id, name) =>
                            onAssignTask(comp.componentId, "__component__", id, name)
                          }
                        />
                      </div>
                    )}
                  </div>

                  {comp.tasks.length > 0 &&
                    comp.tasks.map((task) => (
                      <MealTaskRow
                        key={task.taskId}
                        task={task}
                        isServed={isServed}
                        isParent={isParent}
                        currentUserId={currentUserId}
                        familyMembers={familyMembers}
                        onAssign={(assigneeId, assigneeName) => {
                          onAssignTask(
                            comp.componentId,
                            task.taskId,
                            assigneeId,
                            assigneeName,
                          );
                        }}
                      />
                    ))}

                  {ci < item.components.length - 1 && comp.tasks.length > 0 && (
                    <Separator className="mt-1.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
