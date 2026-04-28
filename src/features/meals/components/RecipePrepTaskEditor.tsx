import { useState } from 'react'
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
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { PrepTask, TaskDifficulty } from '@/shared/types/recipes'

// ── Sortable row ──────────────────────────────────────────────────────────────

interface SortableTaskRowProps {
  task: PrepTask
  onRemove: () => void
  onChangeDifficulty: (d: TaskDifficulty) => void
  disabled: boolean
}

function SortableTaskRow({
  task,
  onRemove,
  onChangeDifficulty,
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
      className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
    >
      {!disabled && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <p className="min-w-0 flex-1 text-sm">{task.description}</p>
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
          aria-label={`Remove task: ${task.description}`}
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
  onChange: (tasks: PrepTask[]) => void
  disabled?: boolean
}

export function RecipePrepTaskEditor({
  tasks,
  onChange,
  disabled = false,
}: RecipePrepTaskEditorProps) {
  const [newDesc, setNewDesc] = useState('')
  const [newDifficulty, setNewDifficulty] = useState<TaskDifficulty>('easy')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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
  }

  function handleAdd() {
    if (!newDesc.trim()) return
    onChange([
      ...tasks,
      {
        taskId: nanoid(),
        description: newDesc.trim(),
        difficulty: newDifficulty,
        order: tasks.length,
      },
    ])
    setNewDesc('')
    setNewDifficulty('easy')
  }

  function handleRemove(taskId: string) {
    const updated = tasks
      .filter((t) => t.taskId !== taskId)
      .map((t, i) => ({ ...t, order: i }))
    onChange(updated)
  }

  function handleChangeDifficulty(taskId: string, difficulty: TaskDifficulty) {
    onChange(tasks.map((t) => (t.taskId === taskId ? { ...t, difficulty } : t)))
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
              disabled={disabled}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!disabled && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Task description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            className="flex-1"
            aria-label="New task description"
          />
          <Select
            value={newDifficulty}
            onValueChange={(v) => setNewDifficulty(v as TaskDifficulty)}
          >
            <SelectTrigger className="w-24">
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
            disabled={!newDesc.trim()}
            aria-label="Add task"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
