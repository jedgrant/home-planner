import { useEffect, useRef, useState } from "react";
import { StickyNote, Trash2 } from "lucide-react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/shared/lib/utils";
import type { GroceryItem } from "@/shared/types/grocery";

const QUANTITIES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

const SWIPE_REVEAL = 72;
const SWIPE_COMMIT = 160;

interface GroceryItemRowProps {
  item: GroceryItem;
  isParent: boolean;
  onComplete: () => void;
  onUncomplete: () => void;
  onEdit: (name: string, quantity: string, note: string) => Promise<void>;
  onRemove: () => void;
}

export function GroceryItemRow({
  item,
  isParent,
  onComplete,
  onUncomplete,
  onEdit,
  onRemove,
}: GroceryItemRowProps) {
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [showNote, setShowNote] = useState(Boolean(item.note));
  const [editNote, setEditNote] = useState(item.note);
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const swipeRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const axisLocked = useRef<"h" | "v" | null>(null);

  useEffect(() => {
    setEditName(item.name);
  }, [item.name]);
  useEffect(() => {
    setEditNote(item.note);
  }, [item.note]);

  useEffect(() => {
    if (!isParent) return;
    const el = swipeRef.current;
    if (!el) return;
    el.addEventListener("touchmove", onTouchMoveNative, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMoveNative);
  });

  function startEditingName() {
    if (!isParent) return;
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  async function saveName() {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditName(item.name);
      setEditingName(false);
      return;
    }
    setEditingName(false);
    if (trimmed !== item.name) await onEdit(trimmed, item.quantity, item.note);
  }

  async function saveNote(value: string) {
    if (value !== item.note) await onEdit(item.name, item.quantity, value);
  }

  async function changeQuantity(qty: string) {
    if (qty !== item.quantity) await onEdit(item.name, qty, item.note);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    axisLocked.current = null;
    setSwiping(true);
  }

  function onTouchMoveNative(e: TouchEvent) {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!axisLocked.current) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      axisLocked.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (axisLocked.current === "v") return;
    e.preventDefault();
    setSwipeX(Math.min(0, dx));
  }

  function onTouchEnd() {
    setSwiping(false);
    if (swipeX <= -SWIPE_COMMIT) {
      setSwipeX(-window.innerWidth);
      setTimeout(() => onRemove(), 220);
    } else if (swipeX <= -SWIPE_REVEAL / 2) {
      setSwipeX(-SWIPE_REVEAL);
    } else {
      setSwipeX(0);
    }
  }

  const deleteProgress = Math.min(1, -swipeX / SWIPE_COMMIT);
  const showDeleteHint = isParent && swipeX < -8;

  return (
    <div className="relative overflow-hidden border-b border-border/40 last:border-0 px-4">
      {showDeleteHint && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-5 bg-destructive cursor-pointer"
          onClick={onRemove}
          aria-label={`Remove ${item.name}`}
          role="button"
        >
          <Trash2
            className="h-5 w-5 text-white transition-transform duration-150"
            style={{ transform: `scale(${0.8 + deleteProgress * 0.4})` }}
          />
        </div>
      )}
      <div
        className="group flex flex-col gap-0.5 py-2.5 bg-card"
        ref={swipeRef}
        style={
          isParent
            ? {
                transform: `translateX(${swipeX}px)`,
                transition: swiping ? "none" : "transform 220ms ease",
              }
            : undefined
        }
        onTouchStart={isParent ? onTouchStart : undefined}
        onTouchEnd={isParent ? onTouchEnd : undefined}
      >
        <div className="flex items-center gap-2">
          {/* Complete checkbox */}
          <Checkbox
            checked={item.completed}
            onCheckedChange={(checked) => {
              if (checked) onComplete();
              else onUncomplete();
            }}
            aria-label={`Mark ${item.name} as ${item.completed ? "pending" : "complete"}`}
            className="shrink-0"
          />

          {/* Name — click to edit (parents only) */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                ref={nameInputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") {
                    setEditName(item.name);
                    setEditingName(false);
                  }
                }}
                className="w-full text-sm bg-transparent border-b border-primary outline-none py-0.5 text-foreground"
              />
            ) : (
              <span
                onClick={startEditingName}
                title={isParent ? "Click to edit" : undefined}
                className={cn(
                  "text-sm text-foreground truncate block select-none",
                  isParent && "cursor-text",
                  item.completed && "opacity-50",
                )}
              >
                {item.name}
              </span>
            )}
          </div>
          {/* Note toggle (parents only) */}
          {isParent && (
            <button
              onClick={() => setShowNote((s) => !s)}
              className={cn(
                "shrink-0 transition-all",
                item.note || showNote
                  ? "text-primary"
                  : "text-muted-foreground/30 opacity-0 group-hover:opacity-100",
              )}
              aria-label="Toggle note"
            >
              <StickyNote className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Quantity select (parents) or read-only label (children) */}
          {isParent ? (
            <select
              value={
                item.quantity && QUANTITIES.includes(item.quantity)
                  ? item.quantity
                  : "1"
              }
              onChange={(e) => changeQuantity(e.target.value)}
              className="text-xs text-muted-foreground bg-transparent border border-border/60 rounded px-1 py-0.5 cursor-pointer hover:border-primary/50 focus:outline-none shrink-0 w-11"
              aria-label="Quantity"
            >
              {QUANTITIES.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          ) : (
            item.quantity &&
            item.quantity !== "1" && (
              <span className="text-xs text-muted-foreground shrink-0">
                ×{item.quantity}
              </span>
            )
          )}

          {/* Remove (parents only; desktop hover-reveal, mobile uses swipe) */}
          {isParent && (
            <button
              onClick={onRemove}
              className="hidden md:block shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
              aria-label={`Remove ${item.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Editable note */}
        {isParent && showNote && (
          <div className="pl-6">
            <input
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              onBlur={(e) => saveNote(e.target.value.trim())}
              placeholder="Add a note…"
              className="w-full text-xs text-muted-foreground bg-transparent border-b border-border/40 outline-none py-0.5 placeholder:text-muted-foreground/40"
            />
          </div>
        )}

        {/* Read-only note for children */}
        {!isParent && item.note && (
          <p className="pl-6 text-xs text-muted-foreground">{item.note}</p>
        )}
      </div>
    </div>
  );
}
