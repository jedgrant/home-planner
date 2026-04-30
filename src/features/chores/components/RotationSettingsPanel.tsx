import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import type { UserProfile } from '@/shared/types/auth'

interface RotationSettingsPanelProps {
  members: UserProfile[]
  rotationPool: string[]
  rotationDuration: number
  isDirty: boolean
  isSaving: boolean
  onPoolChange: (pool: string[]) => void
  onDurationChange: (weeks: number) => void
  onSave: () => void
}

export function RotationSettingsPanel({
  members,
  rotationPool,
  rotationDuration,
  isDirty,
  isSaving,
  onPoolChange,
  onDurationChange,
  onSave,
}: RotationSettingsPanelProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">Rotation Settings</h2>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Who rotates</p>
        <div className="space-y-2">
          {members.map((m) => (
            <label key={m.userId} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={rotationPool.includes(m.userId)}
                onCheckedChange={(checked) => {
                  onPoolChange(
                    checked
                      ? [...rotationPool, m.userId]
                      : rotationPool.filter((id) => id !== m.userId),
                  )
                }}
              />
              <span className="text-sm">{m.displayName}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1 flex flex-col">
        <label className="text-sm font-medium text-foreground" htmlFor="rotation-duration">
          Weeks per person
        </label>
        <Input
          id="rotation-duration"
          type="number"
          min={1}
          value={rotationDuration}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            onDurationChange(isNaN(v) || v < 1 ? 1 : v)
          }}
          className="w-24"
        />
      </div>

      <Button
        variant="outline"
        disabled={!isDirty || isSaving}
        onClick={onSave}
      >
        Save rotation settings
      </Button>
    </div>
  )
}
