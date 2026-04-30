import { useRef, useState } from "react";
import { Pencil, Trash2, Check, RefreshCw } from "lucide-react";
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
  onEdit: () => void;
  onArchive: () => void;
  onRotateNow?: () => void;
}

export function ChoreGroupCard({
  group,
  familyId,
  memberNames,
  onEdit,
  onArchive,
  onRotateNow,
}: ChoreGroupCardProps) {
  const [deletingChoreId, setDeletingChoreId] = useState<string | null>(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [newChoreName, setNewChoreName] = useState("");
  const [addingSaving, setAddingSaving] = useState(false);
  const addNameRef = useRef<HTMLInputElement>(null);

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

  return (
    <>
      <Card className="gap-2 pb-0">
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-semibold text-foreground flex-1">
                  {group.name}
                </span>
                <Badge variant={group.assignmentType === "fixed" ? "secondary" : "outline"}>
                  {group.assignmentType === "fixed"
                    ? group.fixedAssignees.length > 0
                      ? group.fixedAssignees.map((id) => memberNames[id] ?? id).join(", ")
                      : "Unassigned"
                    : "Rotation"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {group.assignmentType === 'rotation' && onRotateNow && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRotateNow}
                  aria-label="Rotate now"
                  title="Rotate now"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
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

        <CardContent className="pt-0 px-0">
          <div >
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
            <div className="flex items-center gap-1 py-3 px-4 bg-input">
              <Input
                ref={addNameRef}
                value={newChoreName}
                onChange={(e) => setNewChoreName(e.target.value)}
                onKeyDown={handleAddKeyDown}
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
