import { useEffect, useRef, useState } from "react";
import { ThumbsUp, Check, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/shared/components/ui/avatar";
import type { MealSuggestion } from "@/shared/types/meals";

const SWIPE_REVEAL = 72;
const SWIPE_COMMIT = 160;

export interface MealSuggestionItemProps {
  suggestion: MealSuggestion;
  currentUserId: string;
  isParent: boolean;
  onVote: () => void;
  onAccept: () => void;
  onRemove: () => void;
  isPending: boolean;
}

export function MealSuggestionItem({
  suggestion,
  currentUserId,
  isParent,
  onVote,
  onAccept,
  onRemove,
  isPending,
}: MealSuggestionItemProps) {
  const hasVoted = suggestion.votes.some((v) => v.userId === currentUserId);
  const visibleVoters = suggestion.votes.slice(0, 4);
  const extraVotes = suggestion.votes.length - visibleVoters.length;
  const canSwipe = suggestion.suggestedById === currentUserId;

  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const swipeRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const axisLocked = useRef<"h" | "v" | null>(null);

  useEffect(() => {
    if (!canSwipe) return
    const el = swipeRef.current
    if (!el) return
    el.addEventListener('touchmove', onTouchMoveNative, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMoveNative)
  })

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
  const showDeleteHint = canSwipe && swipeX < -8;

  return (
    <div className="relative overflow-hidden rounded-lg border border-border">
      {showDeleteHint && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-4 bg-destructive cursor-pointer"
          onClick={onRemove}
          aria-label="Remove your suggestion"
          role="button"
        >
          <Trash2
            className="h-5 w-5 text-white transition-transform duration-150"
            style={{ transform: `scale(${0.8 + deleteProgress * 0.4})` }}
          />
        </div>
      )}
      <div
        className="flex items-center gap-3 bg-card p-3"
        ref={swipeRef}
        style={canSwipe ? { transform: `translateX(${swipeX}px)`, transition: swiping ? "none" : "transform 220ms ease" } : undefined}
        onTouchStart={canSwipe ? onTouchStart : undefined}
        onTouchEnd={canSwipe ? onTouchEnd : undefined}
      >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {suggestion.name}
          </span>

          <p className="text-xs text-muted-foreground">
            suggested by {suggestion.suggestedByName}
          </p>
        </div>
        {suggestion.votes.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex -space-x-1">
              {visibleVoters.map((v) => (
                <Avatar key={v.userId} className="h-5 w-5 ring-2 ring-card">
                  <AvatarImage src={v.photoUrl ?? undefined} />
                  <AvatarFallback className="text-[10px]">
                    {v.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {extraVotes > 0 && (
                <div className="h-5 w-5 rounded-full bg-muted ring-2 ring-card flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">
                    +{extraVotes}
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {suggestion.votes.length}{" "}
              {suggestion.votes.length === 1 ? "vote" : "votes"}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant={hasVoted ? "default" : "outline"}
          onClick={onVote}
          disabled={isPending}
          aria-label={hasVoted ? "Remove vote" : "Vote for this suggestion"}
          className="h-9 w-9 p-0 md:h-8 md:w-8"
        >
          <ThumbsUp className="h-4 w-4 md:h-3.5 md:w-3.5" />
        </Button>
        {isParent && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAccept}
            disabled={isPending}
            aria-label="Accept this suggestion"
            className="h-9 w-9 p-0 md:h-8 md:w-auto md:px-2 md:gap-1 text-xs"
          >
            <Check className="h-4 w-4 md:h-3.5 md:w-3.5" />
            <span className="hidden md:inline">Accept</span>
          </Button>
        )}
        {suggestion.suggestedById === currentUserId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            disabled={isPending}
            aria-label="Remove your suggestion"
            className="hidden md:inline-flex h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      </div>
    </div>
  );
}
