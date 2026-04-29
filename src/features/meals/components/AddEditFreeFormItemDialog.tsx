import { useState, useEffect, useRef } from 'react'
import { nanoid } from 'nanoid'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Label } from '@/shared/components/ui/label'
import { Combobox } from '@/shared/components/Combobox'
import { PrepTaskTiptap } from './PrepTaskTiptap'
import type { FreeFormCourseType, FreeFormItem } from '@/shared/types/meals'
import type { UserProfile } from '@/shared/types'

const courseOptions: { value: FreeFormCourseType; label: string }[] = [
  { value: 'entree', label: 'Entrée' },
  { value: 'side', label: 'Side' },
  { value: 'topping', label: 'Topping' },
  { value: 'dessert', label: 'Dessert' },
]

interface AddEditFreeFormItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingItem?: FreeFormItem
  /** True if any recipe or free-form item already has courseType 'entree' */
  hasEntree: boolean
  /** True if any recipe or free-form item already has courseType 'dessert' */
  hasDessert: boolean
  familyMembers: UserProfile[]
  onSave: (item: FreeFormItem) => void
  onDelete?: () => void
}

export function AddEditFreeFormItemDialog({
  open,
  onOpenChange,
  existingItem,
  hasEntree,
  hasDessert,
  familyMembers,
  onSave,
  onDelete,
}: AddEditFreeFormItemDialogProps) {
  const isEditing = Boolean(existingItem)

  // Determine default course type on open: prefer first available type
  function getDefaultCourseType(): FreeFormCourseType {
    if (existingItem) return existingItem.courseType
    if (!hasEntree) return 'entree'
    if (!hasDessert) return 'dessert'
    return 'side'
  }

  const [courseType, setCourseType] = useState<FreeFormCourseType>(getDefaultCourseType)
  const [description, setDescription] = useState(existingItem?.description ?? '')
  const [assigneeId, setAssigneeId] = useState(existingItem?.assigneeId ?? '')

  // Re-sync state when existingItem or open changes
  useEffect(() => {
    if (open) {
      setCourseType(getDefaultCourseType())
      setDescription(existingItem?.description ?? '')
      setAssigneeId(existingItem?.assigneeId ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingItem])

  // Flush tiptap HTML via ref
  const descriptionRef = useRef(description)
  descriptionRef.current = description

  const availableCourseOptions = courseOptions.filter((o) => {
    if (o.value === 'entree' && hasEntree && existingItem?.courseType !== 'entree') return false
    if (o.value === 'dessert' && hasDessert && existingItem?.courseType !== 'dessert') return false
    return true
  })

  const assigneeOptions = familyMembers.map((m) => ({
    value: m.userId,
    label: m.displayName,
  }))

  function handleSave() {
    const trimmed = descriptionRef.current.trim()
    if (!trimmed || trimmed === '<p></p>') return

    const member = familyMembers.find((m) => m.userId === assigneeId)

    const item: FreeFormItem = {
      itemId: existingItem?.itemId ?? nanoid(),
      courseType,
      description: trimmed,
      assigneeId: assigneeId || null,
      assigneeName: member?.displayName ?? null,
    }
    onSave(item)
    onOpenChange(false)
  }

  const isDescriptionEmpty =
    !description || description.trim() === '' || description.trim() === '<p></p>'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit item' : 'Add item'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Course type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={courseType} onValueChange={(v) => setCourseType(v as FreeFormCourseType)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {courseOptions.find((o) => o.value === courseType)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableCourseOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description — rich text */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <div className="rounded-md border px-3 py-2 text-sm min-h-20">
              <PrepTaskTiptap
                key={open ? 'open' : 'closed'}
                content={description}
                editable
                onDebouncedChange={(html) => setDescription(html)}
              />
            </div>
          </div>

          {/* Optional assignee */}
          <div className="space-y-1.5">
            <Label>Assign to <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Combobox
              options={[{ value: '', label: 'Unassigned' }, ...assigneeOptions]}
              value={assigneeId}
              onChange={(v) => setAssigneeId(v)}
              placeholder="Select person…"
              searchPlaceholder="Search…"
              emptyText="No members found."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            {isEditing && onDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete()
                  onOpenChange(false)
                }}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isDescriptionEmpty}>
              {isEditing ? 'Save' : 'Add'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
