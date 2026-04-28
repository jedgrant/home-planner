import { useRef, useState } from 'react'
import { CheckCircle, Clock, RefreshCw, Upload, XCircle } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import type { WeeklyChoreEntry, WeeklyChoreStatus } from '@/shared/types/chores'

interface ChoreRowProps {
  choreId: string
  choreName: string
  choreDescription: string
  entry: WeeklyChoreEntry
  isParent: boolean
  currentUserId: string
  onSubmit: (choreId: string, file?: File) => Promise<void>
  onVerify: (choreId: string) => Promise<void>
  onRequestResubmit: (choreId: string) => Promise<void>
}

const STATUS_LABELS: Record<WeeklyChoreStatus, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  complete: 'Done',
  needs_resubmission: 'Redo',
}

function StatusBadge({ status }: { status: WeeklyChoreStatus }) {
  const variants: Record<WeeklyChoreStatus, 'default' | 'secondary' | 'outline' | 'destructive'> =
    {
      pending: 'outline',
      submitted: 'secondary',
      complete: 'default',
      needs_resubmission: 'destructive',
    }
  return <Badge variant={variants[status]}>{STATUS_LABELS[status]}</Badge>
}

export function ChoreRow({
  choreId,
  choreName,
  choreDescription,
  entry,
  isParent,
  onSubmit,
  onVerify,
  onRequestResubmit,
}: ChoreRowProps) {
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(file?: File) {
    setBusy(true)
    try {
      await onSubmit(choreId, file)
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify() {
    setBusy(true)
    try {
      await onVerify(choreId)
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

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{choreName}</span>
          <StatusBadge status={entry.status} />
        </div>
        {choreDescription && (
          <p className="text-xs text-muted-foreground mt-0.5">{choreDescription}</p>
        )}
        {entry.status === 'complete' && entry.verifiedAt && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-600" />
            Verified by {entry.verifiedBy}
          </p>
        )}
        {entry.status === 'submitted' && entry.mediaUrl && (
          <a
            href={entry.mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline mt-0.5 block"
          >
            View submission
          </a>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Pending or needs_resubmission → submit button */}
        {(entry.status === 'pending' || entry.status === 'needs_resubmission') && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload and submit chore"
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              Submit
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                void handleSubmit(file)
                e.target.value = ''
              }}
            />
          </>
        )}

        {/* Submitted → parent can verify or request resubmission */}
        {entry.status === 'submitted' && isParent && (
          <>
            <Button
              size="sm"
              disabled={busy}
              onClick={handleVerify}
              aria-label="Verify chore"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Verify
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={handleResubmit}
              aria-label="Request resubmission"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Redo
            </Button>
          </>
        )}

        {/* Submitted → non-parent sees pending indicator */}
        {entry.status === 'submitted' && !isParent && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Awaiting review
          </span>
        )}

        {/* Complete → icon only */}
        {entry.status === 'complete' && (
          <CheckCircle className="h-5 w-5 text-green-600" aria-label="Complete" />
        )}

        {/* Needs resubmission indicator for parent */}
        {entry.status === 'needs_resubmission' && isParent && (
          <XCircle className="h-5 w-5 text-destructive" aria-label="Needs resubmission" />
        )}
      </div>
    </div>
  )
}
