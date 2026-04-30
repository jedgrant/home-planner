import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAuthStore } from "@/shared/lib/authStore";
import {
  useFamily,
  useFamilyMembers,
  usePendingProfiles,
} from "@/features/auth/hooks/useFamilyQueries";
import { InviteManagementCard } from "@/features/auth/components/InviteManagementCard";
import { AddMemberDialog } from "@/features/auth/components/AddMemberDialog";
import { DeleteFamilySection } from "@/features/auth/components/DeleteFamilySection";
import { EditPendingProfileDialog } from "@/features/auth/components/EditPendingProfileDialog";
import type { PendingProfile } from "@/shared/types";
import {
  renameFamilyName,
  removeMember,
  deletePendingProfile,
} from "@/features/auth/familyFunctions";

const renameSchema = z.object({
  name: z.string().min(2, "Family name must be at least 2 characters.").max(60),
});
type RenameValues = z.infer<typeof renameSchema>;

export function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const isParent = user?.role === "parent";

  const { data: family, isLoading: familyLoading } = useFamily(
    user?.familyId ?? null,
  );
  const { data: members, isLoading: membersLoading } = useFamilyMembers(
    user?.familyId ?? null,
  );
  const { data: pendingProfiles } = usePendingProfiles(user?.familyId ?? null);

  const [renameSaved, setRenameSaved] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editingPending, setEditingPending] = useState<PendingProfile | null>(null);

  const renameForm = useForm<RenameValues>({
    resolver: zodResolver(renameSchema),
    values: { name: family?.name ?? "" },
  });

  async function onRename(values: RenameValues) {
    if (!user?.familyId) return;
    await renameFamilyName(user.familyId, values.name);
    await queryClient.invalidateQueries({
      queryKey: ["family", user.familyId],
    });
    setRenameSaved(true);
    setTimeout(() => setRenameSaved(false), 2000);
  }

  async function handleRemoveMember(targetUid: string) {
    if (!user?.familyId) return;
    await removeMember(user.familyId, targetUid);
    await queryClient.invalidateQueries({
      queryKey: ["familyMembers", user.familyId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["family", user.familyId],
    });
  }

  async function handleDeletePending(profileId: string) {
    if (!user?.familyId) return;
    await deletePendingProfile(user.familyId, profileId);
    await queryClient.invalidateQueries({
      queryKey: ["pendingProfiles", user.familyId],
    });
  }

  if (familyLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full max-w-sm" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
        Family settings
      </h1>
      <div className="space-y-6">
        {/* Family name */}
        {isParent && (
          <>
            <section className="space-y-4">
              <Form {...renameForm}>
                <form
                  onSubmit={renameForm.handleSubmit(onRename)}
                  className="flex items-center gap-2"
                >
                  <FormField
                    control={renameForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={renameForm.formState.isSubmitting}
                  >
                    {renameSaved ? "Saved!" : "Rename"}
                  </Button>
                </form>
              </Form>
            </section>
            <Separator />
            {user?.familyId && (
              <>
                <section className="space-y-4">
                  <InviteManagementCard
                    familyId={user.familyId}
                    currentUserId={user.uid}
                  />
                </section>
                <Separator />
              </>
            )}
          </>
        )}

        {/* Members */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-foreground">Members</h2>
            {isParent && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddMemberOpen(true)}
              >
                Add member
              </Button>
            )}
          </div>
          <div className="space-y-4">
            {membersLoading && (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            )}
          </div>
          {members && (
            <ul className="space-y-2">
              {[...members]
                .sort((a, b) => {
                  if (a.role !== b.role) return a.role === "parent" ? -1 : 1;
                  return a.displayName.localeCompare(b.displayName);
                })
                .map((m) => {
                  const initials = m.displayName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <li
                      key={m.userId}
                      className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                    >
                      <button
                        type="button"
                        className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                        onClick={() => navigate(`/profile/${m.userId}`)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={m.photoUrl ?? undefined}
                            alt={m.displayName}
                          />
                          <AvatarFallback className="text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {m.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {m.email}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="rounded-full text-xs capitalize"
                        >
                          {m.role ?? "member"}
                        </Badge>
                        {isParent && m.userId !== user?.uid && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveMember(m.userId)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              {pendingProfiles?.map((p) => {
                const initials = p.displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 opacity-70"
                  >
                    <button
                      type="button"
                      className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                      onClick={() => setEditingPending(p)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={p.photoUrl ?? undefined}
                          alt={p.displayName}
                        />
                        <AvatarFallback className="text-xs font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {p.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {p.role}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-full text-xs text-muted-foreground"
                      >
                        Unclaimed
                      </Badge>
                      {isParent && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeletePending(p.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {isParent && user?.familyId && (
        <AddMemberDialog
          open={addMemberOpen}
          familyId={user.familyId}
          createdBy={user.uid}
          onOpenChange={setAddMemberOpen}
        />
      )}

      {editingPending && user?.familyId && (
        <EditPendingProfileDialog
          open
          onOpenChange={(open) => { if (!open) setEditingPending(null); }}
          profile={editingPending}
          familyId={user.familyId}
        />
      )}

      {isParent && user?.familyId && family && (
        <>
          <Separator className="mt-6" />
          <div className="mt-6">
            <DeleteFamilySection
              familyId={user.familyId}
              familyName={family.name}
              onDeleted={() => {
                setUser({ ...user, familyId: null, role: null })
                navigate('/')
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
