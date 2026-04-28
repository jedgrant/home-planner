import { useEffect, useRef, useState } from "react";
import { Pencil, RotateCcw, Trash2, Check } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import type { ChoreGroup } from "@/shared/types/chores";
import type { RotationEntry } from "../utils/rotation";
import { InlineChoreRow } from "./InlineChoreRow";
import {
  useAddChore,
  useUpdateChore,
  useDeleteChore,
} from "../hooks/useChoreGroups";

interface ChoreGroupCardProps {
  group: ChoreGroup;
  familyId: string;
  memberNames: Record<string, string>;
  rotationSchedule: RotationEntry[];
  onEdit: () => void;
  onArchive: () => void;
}

export function ChoreGroupCard({
  group,
  familyId,
  memberNames,
  rotationSchedule,
  onEdit,
  onArchive,
}: ChoreGroupCardProps) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [deletingChoreId, setDeletingChoreId] = useState<string | null>(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [newChoreName, setNewChoreName] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);
  const addNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    addNameRef.current?.focus();
  }, []);

  async function commitAddChore() {
    const trimmed = newChoreName.trim();
    if (!trimmed) return;
    setAddingSaving(true);
    try {
      await addChore.mutateAsync({
        familyId,
        groupId: group.groupId,
        currentChores: group.chores,
        name: trimmed,
        description: "",
      });
      setNewChoreName("");
    } finally {
      setAddingSaving(false);
      setTimeout(() => addNameRef.current?.focus(), 0);
    }
  }

  function handleAddKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void commitAddChore();
    }
  }

  const addChore = useAddChore();
  const updateChore = useUpdateChore();
  const deleteChore = useDeleteChore();

  const currentAssignee =
    group.assignmentType === "fixed"
      ? group.fixedAssignees.map((id) => memberNames[id] ?? id).join(", ")
      : (memberNames[rotationSchedule[0]?.assigneeId ?? ""] ?? "—");

  return (
    <>
      <Card className="gap-2">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-semibold text-foreground flex-1">
                  {group.name}
                </span>
                
                {/* Rotation schedule preview */}
                {group.assignmentType === "rotation" &&
                  rotationSchedule.length > 0 && (
                    <>
                      <button
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowSchedule((v) => !v)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Rotation schedule
                      </button>
                      {showSchedule && (
                        <div className="pl-5 space-y-1">
                          {rotationSchedule.slice(0, 8).map((entry) => (
                            <div
                              key={entry.weekId}
                              className="flex items-center gap-3 text-sm"
                            >
                              <span className="text-muted-foreground w-20">
                                {entry.weekId}
                              </span>
                              <span className="text-foreground">
                                {entry.assigneeName}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  <Badge
                  variant={
                    group.assignmentType === "fixed" ? "secondary" : "outline"
                  }
                >
                  {currentAssignee || "—"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                aria-label="Edit group"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setArchiveConfirmOpen(true)}
                aria-label="Archive group"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-2">
          <div className="space-y-1">
            {group.chores.map((chore) => (
              <InlineChoreRow
                key={chore.choreId}
                chore={chore}
                onSave={async (name) => {
                  await updateChore.mutateAsync({
                    familyId,
                    groupId: group.groupId,
                    currentChores: group.chores,
                    choreId: chore.choreId,
                    name,
                    description: "",
                  });
                }}
                onDelete={() => setDeletingChoreId(chore.choreId)}
              />
            ))}

            {/* Always-visible add row */}
            <div className="flex items-center gap-1 pt-1">
              <Input
                ref={addNameRef}
                value={newChoreName}
                onChange={(e) => setNewChoreName(e.target.value)}
                onKeyDown={handleAddKeyDown}
                className="h-7 text-sm"
                placeholder="Add a chore…"
                disabled={addingSaving}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-primary"
                onClick={() => void commitAddChore()}
                disabled={addingSaving || !newChoreName.trim()}
                aria-label="Add chore"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete chore confirm */}
      <AlertDialog
        open={!!deletingChoreId}
        onOpenChange={(open) => !open && setDeletingChoreId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chore</AlertDialogTitle>
            <AlertDialogDescription>
              This chore will be removed from the group. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingChoreId) {
                  await deleteChore.mutateAsync({
                    familyId,
                    groupId: group.groupId,
                    currentChores: group.chores,
                    choreId: deletingChoreId,
                  });
                  setDeletingChoreId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive group confirm */}
      <AlertDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Group</AlertDialogTitle>
            <AlertDialogDescription>
              This group will be archived and no longer appear in the weekly
              view. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
