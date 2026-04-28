import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'
import type { GroceryItem } from '@/shared/types/grocery'

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
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(item.name)
  const [editQty, setEditQty] = useState(item.quantity)
  const [editNote, setEditNote] = useState(item.note)

  function handleCheckChange(checked: boolean) {
    if (checked) {
      onComplete()
    } else {
      onUncomplete()
    }
  }

  async function handleSaveEdit() {
    await onEdit(editName.trim(), editQty.trim(), editNote.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 py-3 border-b last:border-0">
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Item name" />
        <div className="grid grid-cols-2 gap-2">
          <Input value={editQty} onChange={(e) => setEditQty(e.target.value)} placeholder="Quantity" />
          <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSaveEdit} disabled={!editName.trim()}>Save</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-3 border-b last:border-0',
        item.completed && 'opacity-60'
      )}
    >
      <Checkbox
        id={`item-${item.itemId}`}
        checked={item.completed}
        onCheckedChange={(checked) => handleCheckChange(Boolean(checked))}
        aria-label={`Mark ${item.name} as ${item.completed ? 'pending' : 'complete'}`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium text-foreground truncate',
            item.completed && 'line-through'
          )}
        >
          {item.name}
          {item.quantity && (
            <span className="ml-1.5 text-muted-foreground font-normal">
              · {item.quantity}
            </span>
          )}
        </p>
        {item.note && (
          <p className="text-xs text-muted-foreground truncate">{item.note}</p>
        )}
      </div>
      {isParent && (
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Edit ${item.name}`}
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            aria-label={`Remove ${item.name}`}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
