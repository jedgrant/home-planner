import { useState, useRef, useEffect } from 'react'
import { GripVertical, Trash2, StickyNote } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { cn } from '@/shared/lib/utils'
import type { GroceryItem } from '@/shared/types/grocery'

const QUANTITIES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

interface CardGroceryItemRowProps {
  item: GroceryItem
  onComplete: () => void
  onEdit: (name: string, quantity: string, note: string) => Promise<void>
  onRemove: () => void
}

export function CardGroceryItemRow({
  item,
  onComplete,
  onEdit,
  onRemove,
}: CardGroceryItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.itemId,
  })

  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [showNote, setShowNote] = useState(Boolean(item.note))
  const [editNote, setEditNote] = useState(item.note)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Keep local state in sync when Firestore data changes
  useEffect(() => { setEditName(item.name) }, [item.name])
  useEffect(() => { setEditNote(item.note) }, [item.note])

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function startEditingName() {
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
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex flex-col gap-0.5 py-2 border-b border-border/40 last:border-0',
        isDragging && 'opacity-25',
      )}
    >
      <div className="flex items-center gap-1.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors touch-none shrink-0 -ml-0.5"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Complete checkbox */}
        <Checkbox
          checked={false}
          onCheckedChange={(v) => { if (v) onComplete() }}
          className="shrink-0"
          aria-label={`Mark ${item.name} as complete`}
        />

        {/* Name — click to edit */}
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
              title="Click to edit"
              className="text-sm text-foreground cursor-text truncate block select-none"
            >
              {item.name}
            </span>
          )}
        </div>

        {/* Quantity */}
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

        {/* Note toggle */}
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

        {/* Remove */}
        <button
          onClick={onRemove}
          className="shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Note inline */}
      {showNote && (
        <div className="pl-8 pr-2">
          <input
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            onBlur={(e) => saveNote(e.target.value.trim())}
            placeholder="Add a note…"
            className="w-full text-xs text-muted-foreground bg-transparent border-b border-border/40 outline-none py-0.5 placeholder:text-muted-foreground/40"
          />
        </div>
      )}
    </div>
  )
}
