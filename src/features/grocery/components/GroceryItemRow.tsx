import { useEffect, useRef, useState } from 'react'
import { StickyNote, Trash2 } from 'lucide-react'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { cn } from '@/shared/lib/utils'
import type { GroceryItem } from '@/shared/types/grocery'

const QUANTITIES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

interface GroceryItemRowProps {
  item: GroceryItem
  isParent: boolean
  onComplete: () => void
  onUncomplete: () => void
  onEdit: (name: string, quantity: string, note: string) => Promise<void>
  onRemove: () => void
}

export function GroceryItemRow({
  item,
  isParent,
  onComplete,
  onUncomplete,
  onEdit,
  onRemove,
}: GroceryItemRowProps) {
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [showNote, setShowNote] = useState(Boolean(item.note))
  const [editNote, setEditNote] = useState(item.note)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setEditName(item.name) }, [item.name])
  useEffect(() => { setEditNote(item.note) }, [item.note])

  function startEditingName() {
    if (!isParent) return
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.select(), 0)
  }

  async function saveName() {
    const trimmed = editName.trim()
    if (!trimmed) { setEditName(item.name); setEditingName(false); return }
    setEditingName(false)
    if (trimmed !== item.name) await onEdit(trimmed, item.quantity, item.note)
  }

  async function saveNote(value: string) {
    if (value !== item.note) await onEdit(item.name, item.quantity, value)
  }

  async function changeQuantity(qty: string) {
    if (qty !== item.quantity) await onEdit(item.name, qty, item.note)
  }

  return (
    <div className="group flex flex-col gap-0.5 py-2.5 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2">
        {/* Complete checkbox */}
        <Checkbox
          checked={item.completed}
          onCheckedChange={(checked) => {
            if (checked) onComplete()
            else onUncomplete()
          }}
          aria-label={`Mark ${item.name} as ${item.completed ? 'pending' : 'complete'}`}
          className="shrink-0"
        />

        {/* Name — click to edit (parents only) */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') { setEditName(item.name); setEditingName(false) }
              }}
              className="w-full text-sm bg-transparent border-b border-primary outline-none py-0.5 text-foreground"
            />
          ) : (
            <span
              onClick={startEditingName}
              title={isParent ? 'Click to edit' : undefined}
              className={cn(
                'text-sm text-foreground truncate block select-none',
                isParent && 'cursor-text',
                item.completed && 'opacity-50',
              )}
            >
              {item.name}
            </span>
          )}
        </div>

        {/* Quantity select (parents) or read-only label (children) */}
        {isParent ? (
          <select
            value={item.quantity && QUANTITIES.includes(item.quantity) ? item.quantity : '1'}
            onChange={(e) => changeQuantity(e.target.value)}
            className="text-xs text-muted-foreground bg-transparent border border-border/60 rounded px-1 py-0.5 cursor-pointer hover:border-primary/50 focus:outline-none shrink-0 w-11"
            aria-label="Quantity"
          >
            {QUANTITIES.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        ) : (
          item.quantity && item.quantity !== '1' && (
            <span className="text-xs text-muted-foreground shrink-0">×{item.quantity}</span>
          )
        )}

        {/* Note toggle (parents only) */}
        {isParent && (
          <button
            onClick={() => setShowNote((s) => !s)}
            className={cn(
              'shrink-0 transition-all',
              item.note || showNote
                ? 'text-primary'
                : 'text-muted-foreground/30 opacity-0 group-hover:opacity-100',
            )}
            aria-label="Toggle note"
          >
            <StickyNote className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Remove (parents only, hover-reveal) */}
        {isParent && (
          <button
            onClick={onRemove}
            className="shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Editable note */}
      {isParent && showNote && (
        <div className="pl-6">
          <input
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            onBlur={(e) => saveNote(e.target.value.trim())}
            placeholder="Add a note…"
            className="w-full text-xs text-muted-foreground bg-transparent border-b border-border/40 outline-none py-0.5 placeholder:text-muted-foreground/40"
          />
        </div>
      )}

      {/* Read-only note for children */}
      {!isParent && item.note && (
        <p className="pl-6 text-xs text-muted-foreground">{item.note}</p>
      )}
    </div>
  )
}
