import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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
import { PhotoCropDialog } from "@/features/profiles/components/PhotoCropDialog";
import { updatePendingProfile } from "@/features/auth/familyFunctions";
import type { PendingProfile } from "@/shared/types";

interface EditPendingProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: PendingProfile;
  familyId: string;
}

const schema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters.").max(40),
});
type FormValues = z.infer<typeof schema>;

export function EditPendingProfileDialog({
  open,
  onOpenChange,
  profile,
  familyId,
}: EditPendingProfileDialogProps) {
  const queryClient = useQueryClient();
  const [photoUrl, setPhotoUrl] = useState<string | null>(profile.photoUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { displayName: profile.displayName },
  });

  async function onSubmit(values: FormValues) {
    await updatePendingProfile(familyId, profile.id, {
      displayName: values.displayName,
    });
    await queryClient.invalidateQueries({
      queryKey: ["pendingProfiles", familyId],
    });
    onOpenChange(false);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
  }

  async function handleCropConfirm(blob: Blob) {
    setCropSrc(null);
    setPhotoSaving(true);
    try {
      const result = await updatePendingProfile(familyId, profile.id, {
        photoBlob: blob,
      });
      if (result.photoUrl) setPhotoUrl(result.photoUrl);
      await queryClient.invalidateQueries({
        queryKey: ["pendingProfiles", familyId],
      });
    } finally {
      setPhotoSaving(false);
    }
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  const initials = profile.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Photo */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={photoSaving}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change photo"
              >
                <Avatar className="h-20 w-20 opacity-100 hover:opacity-80 transition-opacity">
                  <AvatarImage src={photoUrl ?? undefined} alt={profile.displayName} />
                  <AvatarFallback className="text-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
              <p className="text-xs text-muted-foreground">
                {photoSaving ? "Saving…" : "Tap photo to change"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Name */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? "Saving…" : "Save"}
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {cropSrc && (
        <PhotoCropDialog
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
