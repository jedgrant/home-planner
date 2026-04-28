import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import type { ChoreItem } from '@/shared/types/chores'

interface InlineChoreRowProps {
  chore: ChoreItem
  onSave: (name: string) => Promise<void>
  onDelete: () => void
}

export function InlineChoreRow({ chore, onSave, onDelete }: InlineChoreRowProps) {
  const [editing, setEditing] = useState(false)
  const [nameVal, setNameVal] = useState(chore.name)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) nameRef.current?.focus()
  }, [editing])

  function startEdit() {
    setNameVal(chore.name)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  async function commitEdit() {
    const trimmed = nameVal.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await onSave(trimmed)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); void commitEdit() }
    if (e.key === 'Escape') cancelEdit()
  }

  if (editing) {
    return (
      <div className="py-1">
        <div className="flex items-center gap-1">
          <Input
            ref={nameRef}
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onKeyDown={handleNameKeyDown}
            className="h-7 text-sm"
            placeholder="Chore name"
            disabled={saving}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-primary"
            onClick={() => void commitEdit()}
            disabled={saving || !nameVal.trim()}
            aria-label="Save"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            onClick={cancelEdit}
            disabled={saving}
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between group/chore py-0.5">
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={startEdit}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && startEdit()}
        aria-label={`Edit ${chore.name}`}
      >
        <p className="text-sm text-foreground">{chore.name}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover/chore:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={startEdit}
          aria-label="Edit chore"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:text-destructive"
          onClick={onDelete}
          aria-label="Delete chore"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
