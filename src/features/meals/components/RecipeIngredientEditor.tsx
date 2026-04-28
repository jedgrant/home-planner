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
import { Combobox } from '@/shared/components/Combobox'
import type { Ingredient } from '@/shared/types/recipes'
import type { Store } from '@/shared/types/grocery'

interface RecipeIngredientEditorProps {
  ingredients: Ingredient[]
  onChange: (ingredients: Ingredient[]) => void
  stores: Store[]
  disabled?: boolean
}

export function RecipeIngredientEditor({
  ingredients,
  onChange,
  stores,
  disabled = false,
}: RecipeIngredientEditorProps) {
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newStoreId, setNewStoreId] = useState('')

  const storeOptions = [
    { value: '', label: 'No store' },
    ...stores.map((s) => ({ value: s.storeId, label: s.name })),
  ]

  const ingredientNameOptions = Array.from(
    new Set(ingredients.map((i) => i.name))
  ).map((n) => ({ value: n, label: n }))

  function handleAdd() {
    if (!newName.trim()) return
    const store = stores.find((s) => s.storeId === newStoreId)
    onChange([
      ...ingredients,
      {
        ingredientId: nanoid(),
        name: newName.trim(),
        quantity: newQty.trim(),
        storeId: newStoreId || null,
        storeName: store?.name ?? null,
      },
    ])
    setNewName('')
    setNewQty('')
    setNewStoreId('')
  }

  function handleRemove(ingredientId: string) {
    onChange(ingredients.filter((i) => i.ingredientId !== ingredientId))
  }

  function handleUpdateStore(ingredientId: string, storeId: string) {
    const store = stores.find((s) => s.storeId === storeId)
    onChange(
      ingredients.map((i) =>
        i.ingredientId === ingredientId
          ? { ...i, storeId: storeId || null, storeName: store?.name ?? null }
          : i
      )
    )
  }

  function handleUpdateQty(ingredientId: string, qty: string) {
    onChange(
      ingredients.map((i) =>
        i.ingredientId === ingredientId ? { ...i, quantity: qty } : i
      )
    )
  }

  return (
    <div className="space-y-2">
      {ingredients.length > 0 && (
        <div className="space-y-2">
          {ingredients.map((ing) => (
            <div
              key={ing.ingredientId}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <span className="min-w-0 flex-1 text-sm font-medium truncate">
                {ing.name}
              </span>
              <Input
                className="w-24 h-7 text-xs"
                placeholder="Qty"
                value={ing.quantity}
                onChange={(e) => handleUpdateQty(ing.ingredientId, e.target.value)}
                disabled={disabled}
                aria-label={`Quantity for ${ing.name}`}
              />
              <Select
                value={ing.storeId ?? ''}
                onValueChange={(v) => handleUpdateStore(ing.ingredientId, v ?? '')}
                disabled={disabled}
              >
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue placeholder="No store" />
                </SelectTrigger>
                <SelectContent>
                  {storeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(ing.ingredientId)}
                  aria-label={`Remove ${ing.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="flex items-center gap-2">
          <Combobox
            options={ingredientNameOptions}
            value={newName}
            onChange={setNewName}
            placeholder="Ingredient name"
            searchPlaceholder="Type name…"
            emptyText="Type to add a new ingredient"
            className="flex-1"
          />
          <Input
            className="w-24"
            placeholder="Qty"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            aria-label="New ingredient quantity"
          />
          <Select value={newStoreId} onValueChange={(v) => setNewStoreId(v ?? '')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Store" />
            </SelectTrigger>
            <SelectContent>
              {storeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAdd}
            disabled={!newName.trim()}
            aria-label="Add ingredient"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
