import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
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
import type { Ingredient } from '@/shared/types/recipes'
import type { Store } from '@/shared/types/grocery'

const UNIT_OPTIONS = [
  { value: 'tsp', label: 'tsp' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'fl oz', label: 'fl oz' },
  { value: 'cup', label: 'cup' },
  { value: 'pt', label: 'pt' },
  { value: 'qt', label: 'qt' },
  { value: 'gal', label: 'gal' },
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'L', label: 'L' },
  { value: 'pinch', label: 'pinch' },
  { value: 'clove', label: 'clove' },
  { value: 'slice', label: 'slice' },
  { value: 'piece', label: 'piece' },
  { value: 'can', label: 'can' },
  { value: 'pkg', label: 'pkg' },
]

interface ComponentIngredientListProps {
  ingredients: Ingredient[]
  onChange: (ingredients: Ingredient[]) => void
  stores: Store[]
  disabled?: boolean
}

export function ComponentIngredientList({
  ingredients,
  onChange,
  stores,
  disabled = false,
}: ComponentIngredientListProps) {
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newUnit, setNewUnit] = useState<string | null>(null)
  const [newStoreId, setNewStoreId] = useState<string | null>(null)

  const storeOptions = stores.map((s) => ({ value: s.storeId, label: s.name }))

  function handleAdd() {
    if (!newName.trim()) return
    const store = newStoreId ? stores.find((s) => s.storeId === newStoreId) : undefined
    onChange([
      ...ingredients,
      {
        ingredientId: nanoid(),
        name: newName.trim(),
        quantity: newQty.trim(),
        unit: newUnit,
        storeId: newStoreId,
        storeName: store?.name ?? null,
      },
    ])
    setNewName('')
    setNewQty('')
    setNewUnit(null)
    setNewStoreId(null)
  }

  function handleRemove(ingredientId: string) {
    onChange(ingredients.filter((i) => i.ingredientId !== ingredientId))
  }

  return (
    <div className="space-y-1.5">
      {ingredients.map((ing) => (
        <div key={ing.ingredientId} className="flex items-center gap-1.5 text-sm">
          <span className="flex-1 min-w-0 truncate">{ing.name}</span>
          {(ing.quantity || ing.unit) && (
            <span className="text-muted-foreground shrink-0">
              {ing.quantity}{ing.unit ? ` ${ing.unit}` : ''}
            </span>
          )}
          {ing.storeName && (
            <span className="text-xs text-muted-foreground shrink-0">· {ing.storeName}</span>
          )}
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemove(ing.ingredientId)}
              aria-label={`Remove ${ing.name}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}

      {!disabled && (
        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
          <div className="flex-[2] min-w-28">
          <Input
            placeholder="Ingredient name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          </div>
          <div className="w-16 shrink-0">
          <Input
            placeholder="Qty"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
          />
          </div>
          <div className="w-20 shrink-0">
          <Select value={newUnit ?? ''} onValueChange={(v) => setNewUnit(v || null)}>
            <SelectTrigger>
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
          {stores.length > 0 && (
            <div className="w-28 shrink-0">
            <Select value={newStoreId ?? ''} onValueChange={(v) => setNewStoreId(v || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Store">
                  {newStoreId ? (stores.find((s) => s.storeId === newStoreId)?.name ?? newStoreId) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {storeOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleAdd}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
