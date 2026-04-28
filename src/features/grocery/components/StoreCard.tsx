import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreHorizontal, Pencil, Trash2, ShoppingCart } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
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
import { AddEditStoreDialog } from './AddEditStoreDialog'
import { usePendingItemCount } from '../hooks/usePendingItemCount'
import type { Store } from '@/shared/types/grocery'

interface StoreCardProps {
  store: Store
  familyId: string
  isParent: boolean
  onEdit: (name: string, notes: string) => Promise<void>
  onRemove: () => Promise<void>
}

export function StoreCard({
  store,
  familyId,
  isParent,
  onEdit,
  onRemove,
}: StoreCardProps) {
  const navigate = useNavigate()
  const pendingCount = usePendingItemCount(familyId, store.storeId)
  const [editOpen, setEditOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)

  return (
    <>
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">{store.name}</CardTitle>
            {isParent && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Store options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setRemoveOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {store.notes && (
            <CardDescription className="text-xs">{store.notes}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="pb-2">
          {pendingCount !== null && pendingCount > 0 ? (
            <Badge variant="secondary" className="rounded-full text-xs">
              {pendingCount} item{pendingCount !== 1 ? 's' : ''} needed
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">No items pending</span>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => navigate(`/grocery/${store.storeId}`)}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Shop
          </Button>
        </CardFooter>
      </Card>

      <AddEditStoreDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={onEdit}
        store={store}
      />

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {store.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The store will be archived. All items and history are kept, but this store
              won't appear as an active option.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
