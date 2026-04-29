import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/components/ui/button'
import { updateMemberRole } from '@/features/auth/familyFunctions'
import type { UserProfile, UserRole } from '@/shared/types'

interface RoleToggleProps {
  profile: UserProfile
}

export function RoleToggle({ profile }: RoleToggleProps) {
  const queryClient = useQueryClient()

  async function handleRoleToggle() {
    const newRole: UserRole = profile.role === 'parent' ? 'child' : 'parent'
    await updateMemberRole(profile.userId, newRole)
    await queryClient.invalidateQueries({ queryKey: ['userProfile', profile.userId] })
    await queryClient.invalidateQueries({ queryKey: ['familyMembers', profile.familyId] })
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">Role</p>
        <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
      </div>
      <Button size="sm" variant="outline" onClick={handleRoleToggle}>
        Make {profile.role === 'parent' ? 'child' : 'parent'}
      </Button>
    </div>
  )
}
