import { useState } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import { ComponentIngredientList } from "./ComponentIngredientList";
import { RecipePrepTaskEditor } from "./RecipePrepTaskEditor";
import type { RecipeComponent } from "@/shared/types/recipes";
import type { Store } from "@/shared/types/grocery";

// ── Per-component card ────────────────────────────────────────────────────────

interface ComponentCardProps {
  component: RecipeComponent;
  stores: Store[];
  disabled: boolean;
  onRemove: () => void;
  onChange: (patch: Partial<RecipeComponent>) => void;
  onSave: (patch: Partial<RecipeComponent>) => void;
}

function ComponentCard({
  component,
  stores,
  disabled,
  onRemove,
  onChange,
  onSave,
}: ComponentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const taskCount = component.tasks.length;
  const ingCount = component.ingredients.length;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground shrink-0"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {!disabled ? (
            <Input
              value={component.name}
              onChange={(e) => onChange({ name: e.target.value })}
              onBlur={(e) => onSave({ name: e.target.value })}
              className="h-7 text-sm font-medium border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent"
              aria-label="Component name"
            />
          ) : (
            <span className="text-sm font-medium">{component.name}</span>
          )}
        </div>

        <span className="text-xs text-muted-foreground shrink-0">
          {ingCount > 0 && `${ingCount} ing`}
          {ingCount > 0 && taskCount > 0 && " · "}
          {taskCount > 0 && `${taskCount} tasks`}
        </span>

        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label={`Remove ${component.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {expanded && (
        <div className="border-t px-3 pb-3 space-y-4 pt-3">
          {/* Ingredients */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Ingredients
            </h4>
            <ComponentIngredientList
              ingredients={component.ingredients}
              onChange={(ingredients) => onSave({ ingredients })}
              stores={stores}
              disabled={disabled}
            />
          </div>

          {(!disabled || component.notes) && (
            <>
              <Separator />
              <Textarea
                placeholder="Notes or preparation tips for this component…"
                value={component.notes ?? ""}
                onChange={(e) =>
                  onChange({ notes: e.target.value || undefined })
                }
                onBlur={(e) => onSave({ notes: e.target.value || undefined })}
                className="text-sm resize-none min-h-16"
                disabled={disabled}
              />
            </>
          )}
          <Separator />

          {/* Tasks */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Prep Tasks (For assignments)
            </h4>
            <RecipePrepTaskEditor
              tasks={component.tasks}
              onChange={(tasks) => onChange({ tasks })}
              onSave={(tasks) => onSave({ tasks })}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

interface RecipeComponentEditorProps {
  components: RecipeComponent[];
  /** Called immediately on structural changes (add/remove). */
  onChange: (components: RecipeComponent[]) => void;
  /** Called after debounced or structural changes to persist. */
  onSave: (components: RecipeComponent[]) => void;
  stores: Store[];
  disabled?: boolean;
}

export function RecipeComponentEditor({
  components,
  onChange,
  onSave,
  stores,
  disabled = false,
}: RecipeComponentEditorProps) {
  const [newName, setNewName] = useState("");

  function handleAdd() {
    if (!newName.trim()) return;
    const updated: RecipeComponent[] = [
      ...components,
      {
        componentId: nanoid(),
        name: newName.trim(),
        ingredients: [],
        tasks: [],
      },
    ];
    onChange(updated);
    onSave(updated);
    setNewName("");
  }

  function handleRemove(componentId: string) {
    const updated = components.filter((c) => c.componentId !== componentId);
    onChange(updated);
    onSave(updated);
  }

  function applyPatch(componentId: string, patch: Partial<RecipeComponent>) {
    return components.map((c) =>
      c.componentId === componentId ? { ...c, ...patch } : c,
    );
  }

  return (
    <div className="space-y-2">
      {components.map((comp) => (
        <ComponentCard
          key={comp.componentId}
          component={comp}
          stores={stores}
          disabled={disabled}
          onRemove={() => handleRemove(comp.componentId)}
          onChange={(patch) => onChange(applyPatch(comp.componentId, patch))}
          onSave={(patch) => onSave(applyPatch(comp.componentId, patch))}
        />
      ))}

      {!disabled && (
        <div className="flex gap-2 pt-1 items-center">
          <div className="flex-1">
            <Input
              placeholder="Component name (e.g. Chicken, Lettuce, Pasta…)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <Button type="button" variant="outline" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
