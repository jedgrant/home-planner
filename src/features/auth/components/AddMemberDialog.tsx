import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { PhotoCropDialog } from '@/features/profiles/components/PhotoCropDialog'
import { addPendingProfile } from '@/features/auth/familyFunctions'

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters.').max(60),
  role: z.enum(['parent', 'child']),
})

type FormValues = z.infer<typeof schema>

interface AddMemberDialogProps {
  open: boolean
  familyId: string
  createdBy: string
  onOpenChange: (open: boolean) => void
}

export function AddMemberDialog({
  open,
  familyId,
  createdBy,
  onOpenChange,
}: AddMemberDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', role: 'child' },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function handleCropConfirm(blob: Blob) {
    setPhotoBlob(blob)
    setPhotoPreview(URL.createObjectURL(blob))
    setCropSrc(null)
  }

  async function onSubmit(values: FormValues) {
    try {
      await addPendingProfile(familyId, createdBy, {
        displayName: values.displayName,
        role: values.role,
        photoBlob: photoBlob ?? undefined,
      })
      await queryClient.invalidateQueries({ queryKey: ['pendingProfiles', familyId] })
      toast.success(`${values.displayName} added to the family.`)
      handleClose()
    } catch (err) {
      console.error('Failed to add member:', err)
      toast.error('Failed to add member. Please try again.')
    }
  }

  function handleClose() {
    form.reset()
    setPhotoBlob(null)
    setPhotoPreview(null)
    setCropSrc(null)
    onOpenChange(false)
  }

  const nameValue = form.watch('displayName')
  const initials = nameValue
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add family member</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Photo picker */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  aria-label="Upload photo"
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={photoPreview ?? undefined} />
                    <AvatarFallback className="text-lg font-semibold">
                      {initials || '?'}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? 'Change photo' : 'Add photo (optional)'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </div>

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Family member's name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="child">Child</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Add member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {cropSrc && (
        <PhotoCropDialog
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </>
  )
}
