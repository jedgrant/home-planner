import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { useAuthStore } from "@/shared/lib/authStore";
import { usePendingProfiles } from "@/features/auth/hooks/useFamilyQueries";
import { claimPendingProfile } from "@/features/auth/familyFunctions";
import type { PendingProfile } from "@/shared/types";

export function ClaimProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const { data: profiles, isLoading } = usePendingProfiles(
    user?.familyId ?? null,
  );

  if (!isLoading && (!profiles || profiles.length === 0)) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleClaim(profile: PendingProfile) {
    if (!user?.familyId) return;
    try {
      await claimPendingProfile(user.familyId, profile.id, user.uid, {
        displayName: profile.displayName,
        photoUrl: profile.photoUrl,
      });
      setUser({
        ...user,
        displayName: profile.displayName,
        photoUrl: profile.photoUrl,
      });
      await queryClient.invalidateQueries({
        queryKey: ["userProfile", user.uid],
      });
      await queryClient.invalidateQueries({
        queryKey: ["familyMembers", user.familyId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["pendingProfiles", user.familyId],
      });
      toast.success(`Welcome, ${profile.displayName}!`);
      navigate("/dashboard");
    } catch (err) {
      console.error('Failed to claim profile:', err)
      toast.error("Failed to claim profile. Please try again.");
    }
  }

  function handleSkip() {
    navigate("/dashboard");
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm space-y-3">
        <div className="rounded-xl bg-background/85 shadow-lg backdrop-blur-sm md:bg-card md:backdrop-blur-none px-6 py-6 space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Is this you?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              A profile may already be set up for you. Claim it to use your name
              and photo.
            </p>
          </div>

          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          )}

          {profiles && profiles.length > 0 && (
            <ul className="space-y-2">
              {profiles.map((p) => {
                const initials = p.displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={p.photoUrl ?? undefined}
                          alt={p.displayName}
                        />
                        <AvatarFallback className="text-sm font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {p.displayName}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleClaim(p)}>
                      This is me
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            type="button"
            className="w-full text-center text-sm text-primary hover:filter-[brightness(0.75)] transition-colors"
            onClick={handleSkip}
          >
            None of these are me — start fresh
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
