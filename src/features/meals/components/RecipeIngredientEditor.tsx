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
  const [newUnit, setNewUnit] = useState('')
  const [newStoreId, setNewStoreId] = useState('')

  const NONE = 'Select a store'
  const NO_UNIT = '__no_unit__'

  const UNIT_OPTIONS = [
    { value: NO_UNIT, label: '—' },
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

  const storeOptions = [
    { value: NONE, label: 'No store' },
    ...stores.map((s) => ({ value: s.storeId, label: s.name })),
  ]

  const ingredientNameOptions = Array.from(
    new Set(ingredients.map((i) => i.name))
  ).map((n) => ({ value: n, label: n }))

  function handleAdd() {
    if (!newName.trim()) return
    const resolvedStoreId = newStoreId === NONE ? null : newStoreId || null
    const store = stores.find((s) => s.storeId === resolvedStoreId)
    const resolvedUnit = newUnit === NO_UNIT ? null : newUnit || null
    onChange([
      ...ingredients,
      {
        ingredientId: nanoid(),
        name: newName.trim(),
        quantity: newQty.trim(),
        unit: resolvedUnit,
        storeId: resolvedStoreId,
        storeName: store?.name ?? null,
      },
    ])
    setNewName('')
    setNewQty('')
    setNewUnit(NO_UNIT)
    setNewStoreId(NONE)
  }

  function handleRemove(ingredientId: string) {
    onChange(ingredients.filter((i) => i.ingredientId !== ingredientId))
  }

  function handleUpdateStore(ingredientId: string, storeId: string) {
    const resolvedStoreId = storeId === NONE ? null : storeId || null
    const store = stores.find((s) => s.storeId === resolvedStoreId)
    onChange(
      ingredients.map((i) =>
        i.ingredientId === ingredientId
          ? { ...i, storeId: resolvedStoreId, storeName: store?.name ?? null }
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

  function handleUpdateUnit(ingredientId: string, raw: string) {
    const unit = raw === NO_UNIT ? null : raw || null
    onChange(
      ingredients.map((i) =>
        i.ingredientId === ingredientId ? { ...i, unit } : i
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
              {disabled ? (
                <span className="text-xs text-muted-foreground shrink-0">
                  {[ing.quantity, ing.unit].filter(Boolean).join(' ')}
                </span>
              ) : (
                <>
                  <Input
                    className="w-16 h-7 text-xs"
                    placeholder="Qty"
                    value={ing.quantity}
                    onChange={(e) => handleUpdateQty(ing.ingredientId, e.target.value)}
                    aria-label={`Quantity for ${ing.name}`}
                  />
                  <Select
                    value={ing.unit ?? NO_UNIT}
                    onValueChange={(v) => handleUpdateUnit(ing.ingredientId, v ?? NO_UNIT)}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue>
                        {UNIT_OPTIONS.find((o) => o.value === (ing.unit ?? NO_UNIT))?.label ?? '—'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Select
                value={ing.storeId ?? NONE}
                onValueChange={(v) => handleUpdateStore(ing.ingredientId, v ?? NONE)}
                disabled={disabled}
              >
                <SelectTrigger className="h-7 w-32 text-xs">
                  <SelectValue>
                    {storeOptions.find((o) => o.value === (ing.storeId ?? NONE))?.label ?? 'No store'}
                  </SelectValue>
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
            className="w-16"
            placeholder="Qty"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            aria-label="New ingredient quantity"
          />
          <Select value={newUnit || NO_UNIT} onValueChange={(v) => setNewUnit(v ?? NO_UNIT)}>
            <SelectTrigger className="w-24">
              <SelectValue>
                {UNIT_OPTIONS.find((o) => o.value === (newUnit || NO_UNIT))?.label ?? '—'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newStoreId || NONE} onValueChange={(v) => setNewStoreId(v ?? NONE)}>
            <SelectTrigger className="w-32">
              <SelectValue>
                {storeOptions.find((o) => o.value === (newStoreId || NONE))?.label ?? 'No store'}
              </SelectValue>
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
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      )}
    </div>
  )
}
