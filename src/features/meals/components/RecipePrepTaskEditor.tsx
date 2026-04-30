import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState, useRef } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import type { PrepTask } from '@/shared/types/recipes'

// ── Sortable row ──────────────────────────────────────────────────────────────

interface SortableTaskRowProps {
  task: PrepTask
  onRemove: () => void
  onDescriptionChange: (text: string) => void
  disabled: boolean
}

function SortableTaskRow({
  task,
  onRemove,
  onDescriptionChange,
  disabled,
}: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.taskId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
    >
      {!disabled && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground mt-2 shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <Textarea
        value={task.description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none overflow-hidden"
        placeholder="Describe the step…"
      />

      {!disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive mt-1 shrink-0"
          onClick={onRemove}
          aria-label="Remove task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────

interface RecipePrepTaskEditorProps {
  tasks: PrepTask[]
  /** Called immediately whenever tasks change structurally (add/remove/reorder/difficulty). */
  onChange: (tasks: PrepTask[]) => void
  /** Called after 1.5 s debounce when a task's rich-text description changes, and also immediately on structural changes. */
  onSave: (tasks: PrepTask[]) => void
  disabled?: boolean
}

export function RecipePrepTaskEditor({
  tasks,
  onChange,
  onSave,
  disabled = false,
}: RecipePrepTaskEditorProps) {
  const [newText, setNewText] = useState('')
  const newInputRef = useRef<HTMLTextAreaElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex((t) => t.taskId === active.id)
    const newIndex = tasks.findIndex((t) => t.taskId === over.id)
    const reordered = arrayMove(tasks, oldIndex, newIndex).map((t, i) => ({
      ...t,
      order: i,
    }))
    onChange(reordered)
    onSave(reordered)
  }

  function handleAdd() {
    const trimmed = newText.trim()
    if (!trimmed) return
    const updated = [
      ...tasks,
      { taskId: nanoid(), description: trimmed, order: tasks.length },
    ]
    onChange(updated)
    onSave(updated)
    setNewText('')
    newInputRef.current?.focus()
  }

  function handleRemove(taskId: string) {
    const updated = tasks
      .filter((t) => t.taskId !== taskId)
      .map((t, i) => ({ ...t, order: i }))
    onChange(updated)
    onSave(updated)
  }

  function handleDescriptionChange(taskId: string, text: string) {
    const updated = tasks.map((t) => (t.taskId === taskId ? { ...t, description: text } : t))
    onChange(updated)
    onSave(updated)
  }

  const sorted = [...tasks].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sorted.map((t) => t.taskId)}
          strategy={verticalListSortingStrategy}
        >
          {sorted.map((task) => (
            <SortableTaskRow
              key={task.taskId}
              task={task}
              onRemove={() => handleRemove(task.taskId)}
              onDescriptionChange={(text) => handleDescriptionChange(task.taskId, text)}
              disabled={disabled}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!disabled && (
        <div className="flex items-start gap-2 pt-1">
          <Textarea
            ref={newInputRef}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={1}
            className="flex-1 resize-none overflow-hidden"
            placeholder="Add a step…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleAdd()
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
