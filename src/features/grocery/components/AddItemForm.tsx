import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Combobox } from '@/shared/components/Combobox'
import type { ComboboxOption } from '@/shared/components/Combobox'

interface AddItemFormProps {
  nameHistory: string[]
  onAdd: (name: string, quantity: string, note: string) => Promise<void>
  isPending?: boolean
}

export function AddItemForm({ nameHistory, onAdd, isPending = false }: AddItemFormProps) {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')

  const nameOptions: ComboboxOption[] = nameHistory.map((n) => ({
    value: n,
    label: n,
  }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await onAdd(name.trim(), quantity.trim(), note.trim())
    setName('')
    setQuantity('')
    setNote('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-card rounded-xl p-4 shadow-sm">
      <div className="space-y-1.5">
        <Label htmlFor="item-name">Item</Label>
        <Combobox
          options={nameOptions}
          value={name}
          onChange={setName}
          placeholder="What do you need?"
          searchPlaceholder="Search or type a new item…"
          emptyText="Type to add a new item"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="item-qty">Quantity</Label>
          <Input
            id="item-qty"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 2 lbs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="item-note">Note</Label>
          <Input
            id="item-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. organic"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={!name.trim() || isPending}>
        {isPending ? 'Adding…' : 'Add to List'}
      </Button>
    </form>
  )
}
