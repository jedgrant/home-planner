import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  UtensilsCrossed,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import mealPrepIllustration from "@/assets/illustration-meal-prep.png";
import { MealTaskRow } from "./MealTaskRow";
import { MealRecipeList } from "./MealRecipeList";
import { MealSuggestionItem } from "./MealSuggestionItem";
import { SuggestEntreeDialog } from "./SuggestEntreeDialog";
import {
  useVoteMealSuggestion,
  useAcceptMealSuggestion,
  useRemoveMealSuggestion,
  useAssignMealTask,
  useAssignCleanupTask,
} from "@/features/meals/hooks/useMeals";
import { useRecipes } from "@/features/meals/hooks/useRecipes";
import { useFamilyMembers } from "@/features/auth/hooks/useFamilyQueries";
import { useAuthStore } from "@/shared/lib/authStore";
import type { Meal, MealSuggestion } from "@/shared/types/meals";

export interface MealCardProps {
  meal: Meal;
  userId: string;
  userName: string;
  familyId: string;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function MealCard({
  meal,
  userId,
  userName,
  familyId,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: MealCardProps) {
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const { user } = useAuthStore();
  const isParent = user?.role === "parent";

  const { data: familyMembers = [] } = useFamilyMembers(familyId || null);
  const photoUrlById = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const m of familyMembers) map[m.userId] = m.photoUrl;
    return map;
  }, [familyMembers]);

  const voteSuggestion = useVoteMealSuggestion(familyId);
  const acceptSuggestion = useAcceptMealSuggestion(familyId);
  const removeSuggestion = useRemoveMealSuggestion(familyId);
  const assignRecipeTask = useAssignMealTask(familyId);
  const assignCleanupTask = useAssignCleanupTask(familyId);
  const { data: allRecipes = [] } = useRecipes(familyId);

  const isMutating =
    voteSuggestion.isPending ||
    acceptSuggestion.isPending ||
    removeSuggestion.isPending ||
    assignRecipeTask.isPending ||
    assignCleanupTask.isPending;

  const pendingSuggestions = useMemo(
    () => (meal.suggestions ?? []).filter((s) => !s.accepted),
    [meal.suggestions],
  );

  const allTasks = [
    ...meal.recipes.flatMap((r, ri) =>
      r.tasks.map((t, ti) => ({
        key: `recipe-${r.recipeId}-${t.taskId}`,
        task: t,
        onAssign: (assigneeId: string | null, assigneeName: string | null) =>
          assignRecipeTask.mutate({
            meal,
            recipeIndex: ri,
            taskIndex: ti,
            assigneeId,
            assigneeName,
          }),
      })),
    ),
    ...(meal.cleanupTasks ?? []).map((t, ti) => ({
      key: `cleanup-${t.taskId}`,
      task: t,
      onAssign: (assigneeId: string | null, assigneeName: string | null) =>
        assignCleanupTask.mutate({
          meal,
          taskIndex: ti,
          assigneeId,
          assigneeName,
        }),
    })),
  ];

  const hasEntries =
    meal.recipes.length > 0 || (meal.freeFormItems ?? []).length > 0;
  const isToday = meal.date === format(new Date(), "yyyy-MM-dd");

  function handleVote(suggestion: MealSuggestion) {
    if (!user) return;
    voteSuggestion.mutate({
      meal,
      suggestionId: suggestion.suggestionId,
      voter: {
        userId: user.uid,
        userName: user.displayName,
        photoUrl: user.photoUrl,
      },
    });
  }

  function handleAccept(suggestion: MealSuggestion) {
    acceptSuggestion.mutate({ meal, suggestion, allRecipes });
  }

  function handleRemove(suggestion: MealSuggestion) {
    removeSuggestion.mutate({ meal, suggestionId: suggestion.suggestionId });
  }

  return (
    <>
      <div
        className={`rounded-xl border p-4 space-y-3 ${
          isToday ? "border-primary/50 bg-primary/5" : "border-border bg-card"
        }`}
      >
        <div className="flex items-center gap-1">
          <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <UtensilsCrossed className="h-5 w-5 text-primary shrink-0" />
              <h2 className="text-xl font-semibold truncate">
                {format(
                  new Date(meal.date + "T00:00:00"),
                  isToday ? "'Dinner'" : "EEE, MMM d",
                )}
              </h2>
            </div>
            {(onPrev || onNext) && (
              <button
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label="Previous meal"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              {isToday && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(meal.date + "T00:00:00"), "EEEE, MMM d")}
                </p>
              )}
              <Link
                to={`/meals/${meal.mealId}`}
                className="text-xs text-primary hover:underline underline-offset-4"
              >
                View details
              </Link>
            </div>
          </div>
          {(onPrev || onNext) && (
            <button
              onClick={onNext}
              disabled={!hasNext}
              aria-label="Next meal"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasEntries ? (
          <MealRecipeList meal={meal} />
        ) : (
          <div className="flex flex-col items-center space-y-3 my-6">
            <img
              src={mealPrepIllustration}
              alt="Meal prep illustration"
              width={1247}
              height={848}
              className="w-full max-w-90 rounded-lg object-cover"
            />
            <div className="space-y-2 w-full">
              <div className="flex items-center justify-between">
                <p className="text-md font-medium text-foreground">
                  Suggestions
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setSuggestOpen(true)}
                  className="h-7 px-2 text-xs text-primary"
                >
                  <Lightbulb className="h-3.5 w-3.5 mr-1" />
                  Add suggestion
                </Button>
              </div>
              {pendingSuggestions.length > 0 ? (
                pendingSuggestions.map((s) => (
                  <MealSuggestionItem
                    key={s.suggestionId}
                    suggestion={s}
                    currentUserId={userId}
                    isParent={isParent}
                    onVote={() => handleVote(s)}
                    onAccept={() => handleAccept(s)}
                    onRemove={() => handleRemove(s)}
                    isPending={isMutating}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No suggestions available
                </p>
              )}
            </div>
          </div>
        )}

        {allTasks.length > 0 && (
          <div>
            <button
              onClick={() => setTasksExpanded((v) => !v)}
              className="flex w-full items-center justify-between py-1 text-md font-medium text-primary hover:filter-[brightness(0.75)] transition-colors"
              aria-expanded={tasksExpanded}
            >
              <span>Assignments ({allTasks.length})</span>
              {tasksExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {tasksExpanded && (
              <div className="mt-1">
                {allTasks.map(({ key, task, onAssign }) => (
                  <MealTaskRow
                    key={key}
                    task={task}
                    isParent={isParent}
                    userId={userId}
                    userName={userName}
                    familyMembers={familyMembers}
                    isPending={isMutating}
                    photoUrlById={photoUrlById}
                    onAssign={onAssign}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <SuggestEntreeDialog
        meal={meal}
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
      />
    </>
  );
}
