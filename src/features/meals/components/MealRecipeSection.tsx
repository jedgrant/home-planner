import { useState } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible'
import { MealTaskRow } from './MealTaskRow'
import type { MealRecipe } from '@/shared/types/meals'
import type { UserProfile } from '@/shared/types'

const courseTypeLabel: Record<string, string> = {
  entree: 'Entrée',
  side: 'Side',
  salad: 'Salad',
  fruit: 'Fruit',
  dessert: 'Dessert',
}

export interface MealRecipeSectionProps {
  recipe: MealRecipe
  recipeIndex: number
  isServed: boolean
  isParent: boolean
  currentUserId: string
  familyMembers: UserProfile[]
  onRemoveRecipe: () => void
  onAssignTask: (taskIndex: number, assigneeId: string | null, assigneeName: string | null) => void
}

export function MealRecipeSection({
  recipe,
  isServed,
  isParent,
  currentUserId,
  familyMembers,
  onRemoveRecipe,
  onAssignTask,
}: MealRecipeSectionProps) {
  const [open, setOpen] = useState(true)
  const totalCount = recipe.tasks.length

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center gap-2 p-3">
          <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity">
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="font-medium">{recipe.recipeName}</span>
            <Badge variant="outline" className="text-xs">
              {courseTypeLabel[recipe.courseType] ?? recipe.courseType}
            </Badge>
          </CollapsibleTrigger>

          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalCount} {totalCount === 1 ? 'task' : 'tasks'}
            </span>
          )}

          {!isServed && isParent && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onRemoveRecipe}
              aria-label={`Remove ${recipe.recipeName}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Tasks */}
        <CollapsibleContent>
          <div className="border-t p-3 space-y-2">
            {recipe.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 text-center">
                No tasks for this recipe.
              </p>
            ) : (
              recipe.tasks.map((task, ti) => (
                <MealTaskRow
                  key={task.taskId}
                  task={task}
                  isServed={isServed}
                  isParent={isParent}
                  currentUserId={currentUserId}
                  familyMembers={familyMembers}
                  onAssign={(assigneeId) => {
                    const member = familyMembers.find((m) => m.userId === assigneeId)
                    onAssignTask(ti, assigneeId, member?.displayName ?? null)
                  }}
                />
              ))
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
