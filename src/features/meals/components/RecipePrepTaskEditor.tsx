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
import { useState } from 'react'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { PrepTaskTiptap } from './PrepTaskTiptap'
import type { PrepTask, TaskDifficulty } from '@/shared/types/recipes'

// ── Sortable row ──────────────────────────────────────────────────────────────

interface SortableTaskRowProps {
  task: PrepTask
  onRemove: () => void
  onChangeDifficulty: (d: TaskDifficulty) => void
  onDescriptionChange: (html: string) => void
  disabled: boolean
}

function SortableTaskRow({
  task,
  onRemove,
  onChangeDifficulty,
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
          className="cursor-grab touch-none text-muted-foreground mt-1 shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <PrepTaskTiptap
        content={task.description}
        editable={!disabled}
        onDebouncedChange={onDescriptionChange}
      />

      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        <Select
          value={task.difficulty}
          onValueChange={(v) => onChangeDifficulty(v as TaskDifficulty)}
          disabled={disabled}
        >
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
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
  const [newDifficulty, setNewDifficulty] = useState<TaskDifficulty>('easy')
  const [pendingHtml, setPendingHtml] = useState('')

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
    const trimmed = pendingHtml.trim().replace(/^<p><\/p>$/, '')
    if (!trimmed) return
    const updated = [
      ...tasks,
      {
        taskId: nanoid(),
        description: trimmed,
        difficulty: newDifficulty,
        order: tasks.length,
      },
    ]
    onChange(updated)
    onSave(updated)
    setPendingHtml('')
    setNewDifficulty('easy')
  }

  function handleRemove(taskId: string) {
    const updated = tasks
      .filter((t) => t.taskId !== taskId)
      .map((t, i) => ({ ...t, order: i }))
    onChange(updated)
    onSave(updated)
  }

  function handleChangeDifficulty(taskId: string, difficulty: TaskDifficulty) {
    const updated = tasks.map((t) => (t.taskId === taskId ? { ...t, difficulty } : t))
    onChange(updated)
    onSave(updated)
  }

  function handleDescriptionChange(taskId: string, html: string) {
    const updated = tasks.map((t) => (t.taskId === taskId ? { ...t, description: html } : t))
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
              onChangeDifficulty={(d) => handleChangeDifficulty(task.taskId, d)}
              onDescriptionChange={(html) => handleDescriptionChange(task.taskId, html)}
              disabled={disabled}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!disabled && (
        <div className="flex items-start gap-2 pt-1">
          <div className="flex-1 rounded-lg border border-border bg-background px-3 py-2">
            <PrepTaskTiptap
              content={pendingHtml}
              editable
              onDebouncedChange={setPendingHtml}
            />
          </div>
          <Select
            value={newDifficulty}
            onValueChange={(v) => setNewDifficulty(v as TaskDifficulty)}
          >
            <SelectTrigger className="w-24 mt-0.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAdd}
            className="mt-0.5"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
