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
} from "@/features/auth/hooks/useFamilyQueries";
import { InviteManagementCard } from "@/features/auth/components/InviteManagementCard";
import {
  renameFamilyName,
  removeMember,
} from "@/features/auth/familyFunctions";

const renameSchema = z.object({
  name: z.string().min(2, "Family name must be at least 2 characters.").max(60),
});
type RenameValues = z.infer<typeof renameSchema>;

export function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isParent = user?.role === "parent";

  const { data: family, isLoading: familyLoading } = useFamily(
    user?.familyId ?? null,
  );
  const { data: members, isLoading: membersLoading } = useFamilyMembers(
    user?.familyId ?? null,
  );

  const [renameSaved, setRenameSaved] = useState(false);

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
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-1">
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
                  className="flex items-end gap-3"
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
                    size="sm"
                    disabled={renameForm.formState.isSubmitting}
                  >
                    {renameSaved ? "Saved!" : "Rename"}
                  </Button>
                </form>
              </Form>
            </section>
            <Separator />
          </>
        )}

        {/* Members */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-1">
            Members
          </h2>
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
              {members.map((m) => {
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
            </ul>
          )}
        </section>

        {isParent && user?.familyId && (
          <>
            <Separator />
            <section className="space-y-4">
              <InviteManagementCard
                familyId={user.familyId}
                currentUserId={user.uid}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
