import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/shared/components/ui/form'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { updateDisplayName } from '@/features/auth/authFunctions'
import { updateMemberRole } from '@/features/auth/familyFunctions'
import type { UserProfile, UserRole } from '@/shared/types'

interface EditProfileCardProps {
  profile: UserProfile
  isParent: boolean
}

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters.').max(40),
})

type FormValues = z.infer<typeof schema>

export function EditProfileCard({ profile, isParent }: EditProfileCardProps) {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: profile.displayName },
  })

  async function onSubmit(values: FormValues) {
    await updateDisplayName(profile.userId, values.displayName)
    await queryClient.invalidateQueries({ queryKey: ['userProfile', profile.userId] })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleRoleToggle() {
    if (!isParent) return
    const newRole: UserRole = profile.role === 'parent' ? 'child' : 'parent'
    await updateMemberRole(profile.userId, newRole)
    await queryClient.invalidateQueries({ queryKey: ['userProfile', profile.userId] })
    await queryClient.invalidateQueries({ queryKey: ['familyMembers', profile.familyId] })
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            size="sm"
            disabled={form.formState.isSubmitting}
          >
            {saved ? 'Saved!' : form.formState.isSubmitting ? 'Saving…' : 'Save name'}
          </Button>
        </form>
      </Form>

      {isParent && profile.role !== null && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Role</p>
            <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRoleToggle}>
            Make {profile.role === 'parent' ? 'child' : 'parent'}
          </Button>
        </div>
      )}
    </div>
  )
}
