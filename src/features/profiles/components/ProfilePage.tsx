import { useParams } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Separator } from '@/shared/components/ui/separator'
import { useAuthStore } from '@/shared/lib/authStore'
import { useUserProfile } from '@/features/auth/hooks/useFamilyQueries'
import { EditProfileCard } from './EditProfileCard'

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuthStore()
  const { data: profile, isLoading } = useUserProfile(userId ?? null)

  const isOwnProfile = currentUser?.uid === userId
  const canEdit = isOwnProfile || currentUser?.role === 'parent'

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
    )
  }

  if (!profile) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Profile not found.</p>
      </div>
    )
  }

  const initials = profile.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.photoUrl ?? undefined} alt={profile.displayName} />
          <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{profile.displayName}</h1>
          <Badge variant="secondary" className="mt-1 rounded-full text-xs capitalize">
            {profile.role ?? 'member'}
          </Badge>
        </div>
      </div>

      {canEdit && (
        <>
          <Separator />
          <EditProfileCard profile={profile} isParent={currentUser?.role === 'parent'} />
        </>
      )}

      <Separator />

      {/* Chore History — populated in Phase 3 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Chore history</h2>
        <p className="text-sm text-muted-foreground">
          Chore history will appear here once Phase 3 is complete.
        </p>
      </section>

      <Separator />

      {/* Meal Task History — populated in Phase 6 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Meal task history</h2>
        <p className="text-sm text-muted-foreground">
          Meal task history will appear here once Phase 6 is complete.
        </p>
      </section>
    </div>
  )
}
