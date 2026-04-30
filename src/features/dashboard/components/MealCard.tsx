import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import {
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import mealPrepIllustration from "@/assets/illustration-meal-prep.png";
import { MealTaskRow } from "./MealTaskRow";
import { MealRecipeList } from "./MealRecipeList";
import { MealSuggestionItem } from "./MealSuggestionItem";
import { SuggestEntreeDialog } from "./SuggestEntreeDialog";
import { AISuggestMealsSheet } from "@/features/meals/components/AISuggestMealsSheet";
import {
  useVoteMealSuggestion,
  useAcceptMealSuggestion,
  useRemoveMealSuggestion,
  useAssignMealTask,
  useAssignCleanupTask,
  useCreateMeal,
} from "@/features/meals/hooks/useMeals";
import { useRecipes } from "@/features/meals/hooks/useRecipes";
import { useFamilyMembers } from "@/features/auth/hooks/useFamilyQueries";
import { useAuthStore } from "@/shared/lib/authStore";
import type { Meal, MealSuggestion } from "@/shared/types/meals";
import type { Timestamp } from "firebase/firestore";

export interface MealCardProps {
  familyId: string;
  userId: string;
  userName: string;
  /** When undefined the card shows the empty/no-meal state. */
  meal: Meal | undefined;
  /** Required when meal is undefined so the empty state knows which date to create for. */
  date: string;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function MealCard({
  familyId,
  userId,
  // userName no longer used internally — kept on interface for API stability
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userName: _userName,
  meal,
  date,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: MealCardProps) {
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [tasksExpanded, setTasksExpanded] = useState(false);
  const [aiSuggestOpen, setAiSuggestOpen] = useState(false);
  // Optimistic local meal created on-the-fly before the query refetches
  const [localMeal, setLocalMeal] = useState<Meal | null>(null);

  const { user } = useAuthStore();
  const isParent = user?.role === "parent";
  const navigate = useNavigate();

  const activeMeal = meal ?? localMeal;
  const activeDate = activeMeal?.date ?? date;
  const today = activeDate === format(new Date(), "yyyy-MM-dd");

  const { data: familyMembers = [] } = useFamilyMembers(familyId || null);

  const createMeal = useCreateMeal(familyId);
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

  function handleViewDetails() {
    if (activeMeal) {
      navigate(`/meals/${activeMeal.mealId}`);
      return;
    }
    if (!user) return;
    createMeal.mutate(
      { name: "Dinner", date, createdBy: user.uid },
      {
        onSuccess: (mealId) => {
          navigate(`/meals/${mealId}`);
        },
      },
    );
  }

  function handleAddSuggestion() {
    if (!user) return;
    if (activeMeal) {
      setSuggestOpen(true);
      return;
    }
    // No meal yet — create one on-the-fly then open the dialog
    createMeal.mutate(
      { name: "Dinner", date, createdBy: user.uid },
      {
        onSuccess: (mealId) => {
          const newMeal: Meal = {
            mealId,
            familyId,
            name: "Dinner",
            date,
            status: "planned",
            servedAt: null,
            items: [],
            suggestions: [],
            createdBy: user.uid,
            createdAt: null as unknown as Timestamp,
            updatedAt: null as unknown as Timestamp,
          };
          setLocalMeal(newMeal);
          setSuggestOpen(true);
        },
      },
    );
  }

  function handleOpenAISuggest() {
    if (!user || !isParent) return;
    if (activeMeal) {
      setAiSuggestOpen(true);
      return;
    }
    // No meal yet — create one on-the-fly then open the AI sheet
    createMeal.mutate(
      { name: "Dinner", date, createdBy: user.uid },
      {
        onSuccess: (mealId) => {
          const newMeal: Meal = {
            mealId,
            familyId,
            name: "Dinner",
            date,
            status: "planned",
            servedAt: null,
            items: [],
            suggestions: [],
            createdBy: user.uid,
            createdAt: null as unknown as Timestamp,
            updatedAt: null as unknown as Timestamp,
          };
          setLocalMeal(newMeal);
          setAiSuggestOpen(true);
        },
      },
    );
  }

  function handleVote(suggestion: MealSuggestion) {
    if (!user || !activeMeal) return;
    voteSuggestion.mutate({
      meal: activeMeal,
      suggestionId: suggestion.suggestionId,
      voter: {
        userId: user.uid,
        userName: user.displayName,
        photoUrl: user.photoUrl,
      },
    });
  }

  function handleAccept(suggestion: MealSuggestion) {
    if (!activeMeal) return;
    acceptSuggestion.mutate({ meal: activeMeal, suggestion, allRecipes });
  }

  function handleRemove(suggestion: MealSuggestion) {
    if (!activeMeal) return;
    removeSuggestion.mutate({
      meal: activeMeal,
      suggestionId: suggestion.suggestionId,
    });
  }

  // ── Navigation header — shared between filled and empty states ─────────────
  const navigationHeader = (
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-semibold truncate">
        {format(parseISO(activeDate), "EEE, MMM d")}
      </h2>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous day"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={handleViewDetails}
          disabled={createMeal.isPending}
          className="text-xs text-primary hover:underline underline-offset-4 px-1 disabled:opacity-50"
        >
          View details
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Next day"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const pendingSuggestions = useMemo(
    () => (activeMeal?.suggestions ?? []).filter((s) => !s.accepted),
    [activeMeal?.suggestions],
  );

  const hasEntries = (activeMeal?.items?.length ?? 0) > 0;

  const allTasks = activeMeal
    ? [
        ...(activeMeal.items ?? []).flatMap((item) =>
          item.components.flatMap((comp) => {
            // Component with no tasks — show as a single assignable entry
            if (comp.tasks.length === 0) {
              return [
                {
                  key: `comp-${item.itemId}-${comp.componentId}`,
                  task: {
                    taskId: "__component__",
                    description:
                      item.components.length > 1
                        ? `${item.name} › ${comp.name}`
                        : item.name,
                    assigneeId: comp.assigneeId ?? null,
                    assigneeName: comp.assigneeName ?? null,
                    completedAt: null,
                  } as (typeof activeMeal.items)[0]["components"][0]["tasks"][0],
                  notes: comp.notes,
                  onAssign: (
                    assigneeId: string | null,
                    assigneeName: string | null,
                  ) =>
                    assignRecipeTask.mutate({
                      meal: activeMeal,
                      itemId: item.itemId,
                      componentId: comp.componentId,
                      taskId: "__component__",
                      assigneeId,
                      assigneeName,
                    }),
                },
              ];
            }
            return comp.tasks.map((t) => ({
              key: `item-${item.itemId}-${comp.componentId}-${t.taskId}`,
              task: t,
              notes: comp.notes,
              onAssign: (
                assigneeId: string | null,
                assigneeName: string | null,
              ) =>
                assignRecipeTask.mutate({
                  meal: activeMeal,
                  itemId: item.itemId,
                  componentId: comp.componentId,
                  taskId: t.taskId,
                  assigneeId,
                  assigneeName,
                }),
            }));
          }),
        ),
        ...(activeMeal.cleanupTasks ?? []).map((t, ti) => ({
          key: `cleanup-${t.taskId}`,
          task: t,
          notes: undefined as string | undefined,
          onAssign: (assigneeId: string | null, assigneeName: string | null) =>
            assignCleanupTask.mutate({
              meal: activeMeal,
              taskIndex: ti,
              assigneeId,
              assigneeName,
            }),
        })),
      ]
    : [];

  // Tasks assigned to the current user — shown prominently by default
  const myTasks = allTasks.filter(({ task }) => task.assigneeId === userId);

  return (
    <>
      <div
        className={`rounded-xl border p-4 space-y-3 ${
          today ? "border-primary/50 bg-primary/5" : "border-border bg-card"
        }`}
      >
        {navigationHeader}

        {/* ── No meal yet: empty state ──────────────────────────── */}
        {!activeMeal && (
          <div className="flex flex-col items-center space-y-3 my-4">
            <img
              src={mealPrepIllustration}
              alt="Meal prep illustration"
              width={1247}
              height={848}
              className="w-full max-w-75 rounded-lg object-cover"
            />
            <div className="space-y-2 w-full">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Suggestions
                </p>
                <div className="flex items-center gap-1">
                  {isParent && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleOpenAISuggest}
                        disabled={createMeal.isPending}
                        className="h-7 w-7 text-primary sm:hidden"
                        aria-label="AI meal ideas"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleOpenAISuggest}
                        disabled={createMeal.isPending}
                        className="hidden sm:flex h-7 px-2 text-xs text-primary"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        AI Ideas
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    onClick={handleAddSuggestion}
                    disabled={createMeal.isPending}
                    className="h-7 px-2 text-xs text-primary"
                  >
                    <Lightbulb className="h-3.5 w-3.5 mr-1" />
                    Add suggestion
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                No suggestions yet
              </p>
            </div>
          </div>
        )}

        {/* ── Meal exists: recipes or illustration + suggestions ─── */}
        {activeMeal && (
          <>
            {hasEntries ? (
              <MealRecipeList meal={activeMeal} />
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
                    <div className="flex items-center gap-1">
                      {isParent && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleOpenAISuggest}
                            className="h-7 w-7 text-primary sm:hidden"
                            aria-label="AI meal ideas"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={handleOpenAISuggest}
                            className="hidden sm:flex h-7 px-2 text-xs text-primary"
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                            AI Ideas
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => setSuggestOpen(true)}
                        className="h-7 px-2 text-xs text-primary"
                      >
                        <Lightbulb className="h-3.5 w-3.5 mr-1" />
                        Add suggestion
                      </Button>
                    </div>
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
              <div className="mt-4 space-y-3">
                {/* My assignments — always visible when present */}
                {myTasks.length > 0 && (
                  <>
                    <div className="border bg-background rounded-md p-4">
                      <h4 className="text-xs font-semibold uppercase -mb-1">
                        Your assignments
                      </h4>
                      {myTasks.map(({ key, task, notes, onAssign }) => (
                        <MealTaskRow
                          key={key}
                          task={task}
                          notes={notes}
                          isParent={isParent}
                          userId={userId}
                          familyMembers={familyMembers}
                          isPending={isMutating}
                          onAssign={onAssign}
                        />
                      ))}
                    </div>
                  </>
                )}
                {/* Expandable full task list */}
                <div>
                  <button
                    onClick={() => setTasksExpanded((v) => !v)}
                    className={`flex w-full items-center justify-between p-4 text-primary bg-background hover:opacity-80 transition-opacity border rounded-md ${tasksExpanded ? "rounded-b-none" : ""}`}
                    aria-expanded={tasksExpanded}
                  >
                    <span className="text-xs font-semibold uppercase">
                      All tasks ({allTasks.length})
                    </span>
                    {tasksExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <AnimatePresence>
                    {tasksExpanded && (
                      <motion.div
                        key="task-list"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 bg-background border border-t-0 rounded-b-md divide-y pb-2">
                          {allTasks.map(({ key, task, notes, onAssign }) => (
                            <MealTaskRow
                              key={key}
                              task={task}
                              notes={notes}
                              isParent={isParent}
                              userId={userId}
                              familyMembers={familyMembers}
                              isPending={isMutating}
                              onAssign={onAssign}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {activeMeal && (
        <SuggestEntreeDialog
          meal={activeMeal}
          open={suggestOpen}
          onOpenChange={setSuggestOpen}
        />
      )}

      {activeMeal && isParent && (
        <AISuggestMealsSheet
          meal={activeMeal}
          open={aiSuggestOpen}
          onOpenChange={setAiSuggestOpen}
        />
      )}
    </>
  );
}
