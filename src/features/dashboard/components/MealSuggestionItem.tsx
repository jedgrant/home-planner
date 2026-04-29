import { ThumbsUp, Check, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/shared/components/ui/avatar";
import type { MealSuggestion } from "@/shared/types/meals";

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

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
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
          className="h-8 w-8 p-0"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        {isParent && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAccept}
            disabled={isPending}
            aria-label="Accept this suggestion"
            className="h-8 px-2 text-xs gap-1"
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </Button>
        )}
        {suggestion.suggestedById === currentUserId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            disabled={isPending}
            aria-label="Remove your suggestion"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
