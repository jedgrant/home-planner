import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import type { ChoreItem } from "@/shared/types/chores";
import { Trash2 } from "lucide-react";

const SWIPE_REVEAL = 72;   // px — how far to reveal the delete zone
const SWIPE_COMMIT = 160;  // px — how far to trigger delete

interface InlineChoreRowProps {
  chore: ChoreItem;
  onSave: (name: string) => Promise<void>;
  onDelete: () => void;
}

export function InlineChoreRow({
  chore,
  onSave,
  onDelete,
}: InlineChoreRowProps) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(chore.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeRowRef = useRef<HTMLDivElement>(null);
  const axisLocked = useRef<"h" | "v" | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setNameVal(chore.name);
  }, [chore.name, editing]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setNameVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = val.trim();
      if (trimmed && trimmed !== chore.name) void onSave(trimmed);
    }, 600);
  }

  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== chore.name) void onSave(trimmed);
    else if (!trimmed) setNameVal(chore.name);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      inputRef.current?.blur();
    }
  }

  // ── Swipe handlers ────────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    axisLocked.current = null;
    setSwiping(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Lock scroll axis on first significant move
    if (!axisLocked.current) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      axisLocked.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (axisLocked.current === "v") return;

    e.preventDefault();
    // Only allow left swipe
    const clamped = Math.min(0, dx);
    setSwipeX(clamped);
  }

  function onTouchEnd() {
    setSwiping(false);
    if (swipeX <= -SWIPE_COMMIT) {
      // Animate fully off then delete
      setSwipeX(-window.innerWidth);
      setTimeout(() => onDelete(), 220);
    } else if (swipeX <= -SWIPE_REVEAL / 2) {
      // Snap to reveal zone
      setSwipeX(-SWIPE_REVEAL);
    } else {
      setSwipeX(0);
    }
  }

  // Tap anywhere outside the swipe zone to reset
  function onRowClick() {
    if (swipeX !== 0) {
      setSwipeX(0);
      return;
    }
    setEditing(true);
  }

  const deleteProgress = Math.min(1, -swipeX / SWIPE_COMMIT);
  const showDeleteHint = swipeX < -8;

  if (editing) {
    return (
      <div className="flex items-center justify-between border-b border-border px-4 bg-background">
        <input
          ref={inputRef}
          value={nameVal}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 py-3 text-base md:text-sm text-foreground bg-transparent outline-none"
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden border-b border-border">
      {/* Delete backdrop — only rendered while swiping */}
      {showDeleteHint && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-5 bg-destructive"
          aria-hidden="true"
        >
          <Trash2
            className="h-5 w-5 text-white transition-transform duration-150"
            style={{ transform: `scale(${0.8 + deleteProgress * 0.4})` }}
          />
        </div>
      )}

      {/* Swipeable row */}
      <div
        ref={swipeRowRef}
        className="relative flex items-center justify-between px-4 bg-card group/chore"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swiping ? "none" : "transform 220ms ease",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex-1 min-w-0 cursor-pointer py-3 text-base md:text-sm text-foreground"
          onClick={onRowClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
          aria-label={`Edit ${chore.name}`}
        >
          {chore.name}
        </div>
        {/* Desktop-only action buttons */}
        <div className="hidden md:flex items-center gap-1 opacity-0 group-hover/chore:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete chore"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {/* Mobile fallback: always-visible trash when swiped open to reveal zone */}
      </div>
    </div>
  );
}

