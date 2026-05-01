import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
} from "@/shared/components/ui/dialog";
import { useAuthStore } from "@/shared/lib/authStore";
import {
  useFamilyMembers,
  usePendingProfiles,
  useFamily,
  useUpdateFamilyRotationSettings,
} from "@/features/auth/hooks/useFamilyQueries";
import {
  useChoreGroups,
  useCreateChoreGroup,
  useUpdateChoreGroup,
  useArchiveChoreGroup,
} from "../hooks/useChoreGroups";
import { ChoreGroupCard } from "./ChoreGroupCard";
import { CreateEditChoreGroupDialog } from "./CreateEditChoreGroupDialog";
import { RotationSettingsPanel } from "./RotationSettingsPanel";
import { InlineErrorBoundary } from "@/app/SectionErrorBoundary";
import type { ChoreGroup } from "@/shared/types/chores";
import { getCurrentAssignee, dateToWeekId } from "../utils/rotation";

export function ChoreManagePage() {
  const { user } = useAuthStore();
  const familyId = user?.familyId ?? "";
  const navigate = useNavigate();

  const { data: family } = useFamily(familyId);
  const { data: groups, isLoading: groupsLoading } = useChoreGroups(familyId);
  const { data: members, isLoading: membersLoading } =
    useFamilyMembers(familyId);
  const { data: pendingProfiles } = usePendingProfiles(familyId);
  const createGroup = useCreateChoreGroup();
  const updateGroup = useUpdateChoreGroup();
  const archiveGroup = useArchiveChoreGroup();
  const updateRotationSettings = useUpdateFamilyRotationSettings();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ChoreGroup | null>(null);
  const [rotationSettingsOpen, setRotationSettingsOpen] = useState(false);

  // ── Global rotation settings local state ───────────────────────────────────
  const [rotationPool, setRotationPool] = useState<string[]>([]);
  const [rotationDuration, setRotationDuration] = useState(1);
  const [rotationSettingsDirty, setRotationSettingsDirty] = useState(false);

  // Sync local state when family data loads
  useEffect(() => {
    if (!family) return;
    setRotationPool(family.choreRotationPool ?? []);
    setRotationDuration(family.choreRotationDurationWeeks ?? 1);
    setRotationSettingsDirty(false);
  }, [family]);

  const isLoading = groupsLoading || membersLoading;

  // Merge claimed members + pending children for assignee lists
  const allAssignableMembers = [
    ...(members ?? []),
    ...(pendingProfiles ?? [])
      .filter((p) => p.role === "child")
      .map((p) => ({
        userId: p.id,
        displayName: p.displayName,
        email: "",
        photoUrl: p.photoUrl,
        familyId: p.familyId,
        role: p.role,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
  ];

  const memberNames: Record<string, string> = Object.fromEntries(
    allAssignableMembers.map((m) => [m.userId, m.displayName]),
  );

  async function saveRotationSettings() {
    const prevPool = family?.choreRotationPool ?? [];
    const poolChanged =
      JSON.stringify([...rotationPool].sort()) !==
      JSON.stringify([...prevPool].sort());

    await updateRotationSettings.mutateAsync({
      familyId,
      rotationPool,
      rotationDurationWeeks: rotationDuration,
    });

    // When the pool membership changes, reset all rotation group anchors so
    // the new pool takes effect from the current week
    if (poolChanged) {
      const nowWeekId = dateToWeekId(new Date());
      await Promise.all(
        (groups ?? [])
          .filter((g) => g.assignmentType === "rotation")
          .map((g) =>
            updateGroup.mutateAsync({
              familyId,
              groupId: g.groupId,
              updates: {
                rotationAnchorWeekId: nowWeekId,
                rotationAnchorPoolIndex: 0,
              },
            }),
          ),
      );
    }

    setRotationSettingsDirty(false);
  }

  async function rotateGroupNow(group: ChoreGroup) {
    const pool = family?.choreRotationPool ?? [];
    if (pool.length === 0) return;
    const duration = family?.choreRotationDurationWeeks ?? 1;
    const nowWeekId = dateToWeekId(new Date());
    const currentAssigneeId = getCurrentAssignee(group, nowWeekId, pool, duration);
    const currentIndex = pool.indexOf(currentAssigneeId);
    const nextIndex =
      currentIndex < 0 ? 0 : (currentIndex + 1) % pool.length;
    await updateGroup.mutateAsync({
      familyId,
      groupId: group.groupId,
      updates: {
        rotationAnchorWeekId: nowWeekId,
        rotationAnchorPoolIndex: nextIndex,
      },
    });
  }

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={() => navigate("/chores")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Chore assignments
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground truncate flex-1">
            Manage Chores
          </h1>
          {/* Mobile-only rotation settings button */}
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => setRotationSettingsOpen(true)}
            aria-label="Rotation settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-0.5" />
            <span className="hidden sm:inline">New </span>Group
          </Button>
        </div>
      </div>

      {/* ── Two-column layout on desktop ───────────────────────────── */}
      <div className="md:grid md:grid-cols-[1fr_280px] md:gap-6 md:items-start">
        {/* ── Group list ─────────────────────────────────────────── */}
        <InlineErrorBoundary label="Chore groups failed to load">
          <div className="space-y-4">
          {groups?.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">
                No chore groups yet. Create one to get started.
              </p>
            </div>
          )}

          {groups?.map((group) => (
            <ChoreGroupCard
              key={group.groupId}
              group={group}
              familyId={familyId}
              memberNames={memberNames}
              onEdit={() => setEditingGroup(group)}
              onArchive={async () => {
                await archiveGroup.mutateAsync({
                  familyId,
                  groupId: group.groupId,
                });
              }}
              onRotateNow={
                group.assignmentType === "rotation"
                  ? () => void rotateGroupNow(group)
                  : undefined
              }
            />
          ))}
          </div>
        </InlineErrorBoundary>

        {/* ── Desktop: inline rotation settings column ─────────────── */}
        <div className="hidden md:block border rounded-lg p-4">
          <RotationSettingsPanel
            members={allAssignableMembers}
            rotationPool={rotationPool}
            rotationDuration={rotationDuration}
            isDirty={rotationSettingsDirty}
            isSaving={updateRotationSettings.isPending}
            onPoolChange={(pool) => {
              setRotationPool(pool);
              setRotationSettingsDirty(true);
            }}
            onDurationChange={(weeks) => {
              setRotationDuration(weeks);
              setRotationSettingsDirty(true);
            }}
            onSave={() => void saveRotationSettings()}
          />
        </div>
      </div>

      {/* ── Mobile: rotation settings dialog ─────────────────────── */}
      <Dialog open={rotationSettingsOpen} onOpenChange={setRotationSettingsOpen}>
        <DialogContent>
          <RotationSettingsPanel
            members={allAssignableMembers}
            rotationPool={rotationPool}
            rotationDuration={rotationDuration}
            isDirty={rotationSettingsDirty}
            isSaving={updateRotationSettings.isPending}
            onPoolChange={(pool) => {
              setRotationPool(pool);
              setRotationSettingsDirty(true);
            }}
            onDurationChange={(weeks) => {
              setRotationDuration(weeks);
              setRotationSettingsDirty(true);
            }}
            onSave={() => {
              void saveRotationSettings();
              setRotationSettingsOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Create group dialog */}
      <CreateEditChoreGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        members={allAssignableMembers}
        onSubmit={async (values) => {
          await createGroup.mutateAsync({ familyId, ...values });
        }}
      />

      {/* Edit group dialog */}
      {editingGroup && (
        <CreateEditChoreGroupDialog
          open={!!editingGroup}
          onOpenChange={(open) => !open && setEditingGroup(null)}
          members={allAssignableMembers}
          existingGroup={editingGroup}
          onSubmit={async (values) => {
            await updateGroup.mutateAsync({
              familyId,
              groupId: editingGroup.groupId,
              updates: { ...values },
            });
            setEditingGroup(null);
          }}
        />
      )}
    </div>
  );
}
