import { useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import type { ChoreGroup, ChoreItem } from '@/shared/types/chores'
import type { RotationEntry } from '../utils/rotation'
import { AddEditChoreDialog } from './AddEditChoreDialog'
import { useAddChore, useUpdateChore, useDeleteChore } from '../hooks/useChoreGroups'

interface ChoreGroupCardProps {
  group: ChoreGroup
  familyId: string
  memberNames: Record<string, string>
  rotationSchedule: RotationEntry[]
  onEdit: () => void
  onArchive: () => void
}

export function ChoreGroupCard({
  group,
  familyId,
  memberNames,
  rotationSchedule,
  onEdit,
  onArchive,
}: ChoreGroupCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [addChoreOpen, setAddChoreOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<ChoreItem | null>(null)
  const [deletingChoreId, setDeletingChoreId] = useState<string | null>(null)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)

  const addChore = useAddChore()
  const updateChore = useUpdateChore()
  const deleteChore = useDeleteChore()

  const currentAssignee =
    group.assignmentType === 'fixed'
      ? group.fixedAssignees.map((id) => memberNames[id] ?? id).join(', ')
      : (memberNames[rotationSchedule[0]?.assigneeId ?? ''] ?? '—')

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{group.name}</span>
                <Badge variant={group.assignmentType === 'fixed' ? 'secondary' : 'outline'}>
                  {group.assignmentType === 'fixed' ? 'Fixed' : 'Rotating'}
                </Badge>
                <span className="text-sm text-muted-foreground">{group.chores.length} chores</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Current: <span className="text-foreground">{currentAssignee || '—'}</span>
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit group">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setArchiveConfirmOpen(true)}
                aria-label="Archive group"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-2">
          {/* Chore list toggle */}
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Chores
          </button>

          {expanded && (
            <div className="space-y-1 pl-5">
              {group.chores.map((chore) => (
                <div key={chore.choreId} className="flex items-center justify-between group/chore">
                  <div>
                    <p className="text-sm text-foreground">{chore.name}</p>
                    {chore.description && (
                      <p className="text-xs text-muted-foreground">{chore.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover/chore:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingChore(chore)}
                      aria-label="Edit chore"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setDeletingChoreId(chore.choreId)}
                      aria-label="Delete chore"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-7 px-2 text-xs"
                onClick={() => setAddChoreOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Chore
              </Button>
            </div>
          )}

          {/* Rotation schedule preview */}
          {group.assignmentType === 'rotation' && rotationSchedule.length > 0 && (
            <>
              <button
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowSchedule((v) => !v)}
              >
                <RotateCcw className="h-4 w-4" />
                Rotation schedule
              </button>
              {showSchedule && (
                <div className="pl-5 space-y-1">
                  {rotationSchedule.slice(0, 8).map((entry) => (
                    <div key={entry.weekId} className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground w-20">{entry.weekId}</span>
                      <span className="text-foreground">{entry.assigneeName}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add chore dialog */}
      <AddEditChoreDialog
        open={addChoreOpen}
        onOpenChange={setAddChoreOpen}
        onSubmit={async (values) => {
          await addChore.mutateAsync({
            familyId,
            groupId: group.groupId,
            currentChores: group.chores,
            ...values,
          })
        }}
      />

      {/* Edit chore dialog */}
      {editingChore && (
        <AddEditChoreDialog
          open={!!editingChore}
          onOpenChange={(open) => !open && setEditingChore(null)}
          existingChore={editingChore}
          onSubmit={async (values) => {
            await updateChore.mutateAsync({
              familyId,
              groupId: group.groupId,
              currentChores: group.chores,
              choreId: editingChore.choreId,
              ...values,
            })
          }}
        />
      )}

      {/* Delete chore confirm */}
      <AlertDialog
        open={!!deletingChoreId}
        onOpenChange={(open) => !open && setDeletingChoreId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chore</AlertDialogTitle>
            <AlertDialogDescription>
              This chore will be removed from the group. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingChoreId) {
                  await deleteChore.mutateAsync({
                    familyId,
                    groupId: group.groupId,
                    currentChores: group.chores,
                    choreId: deletingChoreId,
                  })
                  setDeletingChoreId(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive group confirm */}
      <AlertDialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Group</AlertDialogTitle>
            <AlertDialogDescription>
              This group will be archived and no longer appear in the weekly view. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
