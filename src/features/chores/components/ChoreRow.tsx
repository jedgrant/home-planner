import { useRef, useState } from 'react'
import { AlertCircle, Camera, Check, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import type { WeeklyChoreEntry } from '@/shared/types/chores'
import { format } from 'date-fns'
import type { Timestamp } from 'firebase/firestore'

interface ChoreRowProps {
  choreId: string
  choreName: string
  choreDescription: string
  entry: WeeklyChoreEntry
  isParent: boolean
  currentUserId: string
  memberNames: Record<string, string>
  onSubmit: (choreId: string, file?: File) => Promise<void>
  onVerify: (choreId: string) => Promise<void>
  onUnapprove: (choreId: string) => Promise<void>
  onRequestResubmit: (choreId: string) => Promise<void>
}

function formatTimestamp(ts: Timestamp | null): string {
  if (!ts) return ''
  try {
    return format(ts.toDate(), 'MMM d, h:mm a')
  } catch {
    return ''
  }
}

export function ChoreRow({
  choreId,
  choreName,
  entry,
  isParent,
  memberNames,
  onVerify,
  onUnapprove,
  onSubmit,
  onRequestResubmit,
}: ChoreRowProps) {
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isComplete = entry.status === 'complete'

  async function handleVerify() {
    setBusy(true)
    try {
      await onVerify(choreId)
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(file?: File) {
    setBusy(true)
    try {
      await onSubmit(choreId, file)
    } finally {
      setBusy(false)
    }
  }

  async function handleUnapprove() {
    setBusy(true)
    try {
      await onUnapprove(choreId)
    } finally {
      setBusy(false)
    }
  }

  async function handleResubmit() {
    setBusy(true)
    try {
      await onRequestResubmit(choreId)
    } finally {
      setBusy(false)
    }
  }

  // ── Parent view: todo-style checkbox ──────────────────────────────────────
  if (isParent) {
    return (
      <div className="flex items-start gap-3 py-2.5 border-b last:border-0">
        <button
          role="checkbox"
          aria-checked={isComplete}
          aria-label={isComplete ? `Remove approval for ${choreName}` : `Mark ${choreName} complete`}
          disabled={busy}
          onClick={isComplete ? handleUnapprove : handleVerify}
          className={cn(
            'mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
            isComplete
              ? 'bg-primary border-primary'
              : 'border-border hover:border-primary cursor-pointer',
          )}
        >
          {isComplete && <Check className="h-3 w-3 text-primary-foreground" />}
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">
            {choreName}
          </span>
          {isComplete && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <CheckCircle className="h-3 w-3 shrink-0 text-primary" />
              Approved by {(entry.verifiedBy && memberNames[entry.verifiedBy]) || entry.verifiedBy}
              {entry.verifiedAt ? ` · ${formatTimestamp(entry.verifiedAt)}` : ''}
            </p>
          )}
          {entry.status === 'submitted' && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Clock className="h-3 w-3 shrink-0 text-amber-600" />
              Approval requested
            </p>
          )}
          {entry.status === 'needs_resubmission' && (
            <p className="flex items-center gap-1 text-xs text-destructive mt-0.5">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Needs work
            </p>
          )}
        </div>
        {entry.status === 'submitted' && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground"
            disabled={busy}
            onClick={handleResubmit}
            aria-label="Request resubmission"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    )
  }

  // ── Child view: camera upload ─────────────────────────────────────────────
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            'text-sm font-medium',
            isComplete && 'line-through text-muted-foreground',
          )}
        >
          {choreName}
        </span>
        {entry.status === 'needs_resubmission' && (
          <p className="text-xs text-destructive mt-0.5">Please redo this chore</p>
        )}
        {entry.status === 'submitted' && (
          <p className="text-xs text-muted-foreground mt-0.5">Awaiting review</p>
        )}
        {isComplete && (
          <p className="text-xs text-muted-foreground mt-0.5">Done ✓</p>
        )}
      </div>

      <div className="shrink-0 flex items-center">
        {(entry.status === 'pending' || entry.status === 'needs_resubmission') && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload photo or video"
            >
              <Camera className="h-5 w-5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                void handleSubmit(file)
                e.target.value = ''
              }}
            />
          </>
        )}
        {entry.status === 'submitted' && (
          <Clock className="h-4 w-4 text-muted-foreground" aria-label="Awaiting review" />
        )}
        {isComplete && (
          <CheckCircle className="h-5 w-5 text-primary" aria-label="Complete" />
        )}
      </div>
    </div>
  )
}
