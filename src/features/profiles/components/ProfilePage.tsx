import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import { useAuthStore } from "@/shared/lib/authStore";
import { useUserProfile } from "@/features/auth/hooks/useFamilyQueries";
import { updateDisplayName, updatePhotoUrl } from "@/features/auth/authFunctions";
import { useQueryClient } from "@tanstack/react-query";
import { RoleToggle } from "./RoleToggle";

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useUserProfile(userId ?? null);

  const isOwnProfile = currentUser?.uid === userId;
  const canEdit = isOwnProfile || currentUser?.role === "parent";
  const isParent = currentUser?.role === "parent";

  const [displayName, setDisplayName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialName = useRef("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setPhotoUrl(profile.photoUrl);
      initialName.current = profile.displayName;
    }
  }, [profile]);

  // Debounced name save
  useEffect(() => {
    if (!profile || displayName === initialName.current || displayName.trim().length < 2) return;
    const timer = setTimeout(async () => {
      setNameSaving(true);
      try {
        await updateDisplayName(profile.userId, displayName.trim());
        initialName.current = displayName.trim();
        await queryClient.invalidateQueries({ queryKey: ["userProfile", profile.userId] });
        await queryClient.invalidateQueries({ queryKey: ["familyMembers", profile.familyId] });
      } finally {
        setNameSaving(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [displayName, profile, queryClient]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    e.target.value = "";
    setPhotoSaving(true);
    try {
      const url = await updatePhotoUrl(profile.userId, file);
      setPhotoUrl(url);
      await queryClient.invalidateQueries({ queryKey: ["userProfile", profile.userId] });
      await queryClient.invalidateQueries({ queryKey: ["familyMembers", profile.familyId] });
    } finally {
      setPhotoSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  const initials = (displayName || profile.displayName)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar className="h-16 w-16">
            <AvatarImage src={photoUrl ?? undefined} alt={displayName} />
            <AvatarFallback className="text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {canEdit && (
            <button
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoSaving}
              aria-label="Change profile photo"
            >
              <span className="text-[10px] font-medium text-white leading-tight text-center px-1">
                {photoSaving ? "…" : "Change"}
              </span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        <div className="flex-1 min-w-0">
          {canEdit ? (
            <div className="flex items-center gap-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-3xl font-semibold text-foreground bg-transparent border-b border-transparent focus:border-border focus:outline-none w-full leading-tight"
                aria-label="Display name"
              />
              {nameSaving && (
                <span className="text-xs text-muted-foreground shrink-0">Saving…</span>
              )}
            </div>
          ) : (
            <h1 className="text-3xl font-semibold text-foreground">{displayName}</h1>
          )}
          <Badge
            variant="secondary"
            className="mt-1 rounded-full text-xs capitalize"
          >
            {profile.role ?? "member"}
          </Badge>
        </div>
      </div>

      {isParent && profile.role !== null && (
        <RoleToggle profile={profile} />
      )}

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Chore history</h2>
        <p className="text-sm text-muted-foreground">Coming soon.</p>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Meal task history</h2>
        <p className="text-sm text-muted-foreground">Coming soon.</p>
      </section>
    </div>
  );
}
