import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { useAuthStore } from '@/shared/lib/authStore'
import { useStores } from '../hooks/useStores'
import { useStoreMutations } from '../hooks/useStoreMutations'
import { StoreCard } from './StoreCard'
import { AddEditStoreDialog } from './AddEditStoreDialog'

export function GroceryPage() {
  const user = useAuthStore((s) => s.user)
  const familyId = user?.familyId ?? ''
  const isParent = user?.role === 'parent'

  const { data: storeList = [], isLoading } = useStores(familyId)
  const { addStore, editStore, archiveStore } = useStoreMutations(familyId)

  const [addOpen, setAddOpen] = useState(false)

  if (!familyId) return null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Grocery list</h1>
          <p className="text-sm text-muted-foreground">
            Manage stores and shopping lists
          </p>
        </div>
        {isParent && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Store
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : storeList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground text-sm">No stores yet.</p>
          {isParent && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add your first store
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {storeList.map((store) => (
            <StoreCard
              key={store.storeId}
              store={store}
              familyId={familyId}
              isParent={isParent}
              onEdit={(name, notes) =>
                editStore.mutateAsync({ storeId: store.storeId, name, notes })
              }
              onRemove={() => archiveStore.mutateAsync(store.storeId)}
            />
          ))}
        </div>
      )}

      {isParent && (
        <AddEditStoreDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onSave={(name, notes) => addStore.mutateAsync({ name, notes })}
          isPending={addStore.isPending}
        />
      )}
    </div>
  )
}
