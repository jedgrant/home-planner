import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Copy, Check, Trash2, Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useActiveCodes } from '../hooks/useFamilyQueries'
import { generateInviteCode, revokeInviteCode } from '../familyFunctions'
import type { UserRole } from '@/shared/types'

interface InviteManagementCardProps {
  familyId: string
  currentUserId: string
}

export function InviteManagementCard({
  familyId,
  currentUserId,
}: InviteManagementCardProps) {
  const queryClient = useQueryClient()
  const { data: codes, isLoading } = useActiveCodes(familyId)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  async function handleGenerate(role: UserRole) {
    setGenerating(true)
    try {
      await generateInviteCode(familyId, currentUserId, role)
      await queryClient.invalidateQueries({ queryKey: ['activeCodes', familyId] })
    } finally {
      setGenerating(false)
    }
  }

  async function handleRevoke(code: string) {
    await revokeInviteCode(code)
    await queryClient.invalidateQueries({ queryKey: ['activeCodes', familyId] })
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Invite codes</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={generating}
            onClick={() => handleGenerate('child')}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Child
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={generating}
            onClick={() => handleGenerate('parent')}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Parent
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      )}

      {!isLoading && (!codes || codes.length === 0) && (
        <p className="text-sm text-muted-foreground">No active invite codes.</p>
      )}

      {codes && codes.length > 0 && (
        <ul className="space-y-2">
          {codes.map((c) => (
            <li
              key={c.code}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium tracking-wider text-foreground">
                  {c.code}
                </span>
                <Badge variant="secondary" className="rounded-full text-xs capitalize">
                  {c.role}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => handleCopy(c.code)}
                  aria-label="Copy invite code"
                >
                  {copiedCode === c.code ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 hover:text-destructive"
                  onClick={() => handleRevoke(c.code)}
                  aria-label="Revoke invite code"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
