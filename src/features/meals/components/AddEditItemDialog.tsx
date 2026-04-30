import { useState, useEffect } from 'react'
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
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import type { CourseType } from '@/shared/types/recipes'
import type { MealItem } from '@/shared/types/meals'

const COURSE_OPTIONS: { value: CourseType; label: string }[] = [
  { value: 'entree', label: 'Entrée' },
  { value: 'side', label: 'Side' },
  { value: 'salad', label: 'Salad' },
  { value: 'fruit', label: 'Fruit' },
  { value: 'dessert', label: 'Dessert' },
]

interface AddEditItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Provide to edit an existing item; omit to create a new one. */
  existingItem?: MealItem
  /** Pre-selects a course type when true (skips entree if one already exists). */
  hasEntree: boolean
  onSave: (item: MealItem) => void
  onDelete?: () => void
}

function getDefaultCourseType(hasEntree: boolean, existingItem?: MealItem): CourseType {
  if (existingItem) return existingItem.courseType
  if (!hasEntree) return 'entree'
  return 'side'
}

export function AddEditItemDialog({
  open,
  onOpenChange,
  existingItem,
  hasEntree,
  onSave,
  onDelete,
}: AddEditItemDialogProps) {
  const isEditing = Boolean(existingItem)

  const [name, setName] = useState(existingItem?.name ?? '')
  const [courseType, setCourseType] = useState<CourseType>(
    getDefaultCourseType(hasEntree, existingItem)
  )

  useEffect(() => {
    if (open) {
      setName(existingItem?.name ?? '')
      setCourseType(getDefaultCourseType(hasEntree, existingItem))
    }
  }, [open, existingItem, hasEntree])

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return

    const item: MealItem = {
      itemId: existingItem?.itemId ?? nanoid(),
      courseType,
      name: trimmed,
      recipeId: existingItem?.recipeId ?? null,
      notes: existingItem?.notes,
      components: existingItem?.components ?? [],
    }
    onSave(item)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit item' : 'Add item'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="item-course">Course</Label>
            <Select value={courseType} onValueChange={(v) => setCourseType(v as CourseType)}>
              <SelectTrigger id="item-course">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COURSE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              placeholder="e.g. Chicken Fajitas, Caesar Salad…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              className="mr-auto"
              onClick={() => {
                onDelete()
                onOpenChange(false)
              }}
            >
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {isEditing ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
