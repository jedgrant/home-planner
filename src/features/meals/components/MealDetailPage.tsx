import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Separator } from "@/shared/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Combobox } from "@/shared/components/Combobox";
import { useAuthStore } from "@/shared/lib/authStore";
import { useFamilyMembers } from "@/features/auth/hooks/useFamilyQueries";
import { useRecipes } from "../hooks/useRecipes";
import {
  useMeal,
  useUpdateMeal,
  useVoteMealSuggestion,
  useAcceptMealSuggestion,
} from "../hooks/useMeals";
import { MealSuggestionItem, SuggestEntreeDialog } from "@/features/dashboard";
import { useAIAssignTasks } from "../hooks/useMealAI";
import { MealItemSection } from "./MealItemSection";
import { MealTaskRow } from "./MealTaskRow";
import { CleanupDishesRow } from "./CleanupDishesRow";
import { AddEditItemDialog } from "./AddEditItemDialog";
import { DishRecipeSheet } from "./DishRecipeSheet";
import { deriveMealStatus } from "../utils";
import { InlineErrorBoundary } from "@/app/SectionErrorBoundary";
import type { MealItem, MealTask, MealSuggestion } from "@/shared/types/meals";
import type { MealComponent } from "@/shared/types/meals";

const CLEANUP_TASK_DEFAULTS: MealTask[] = [
  {
    taskId: "cleanup-dishes",
    description: "Dishes",
    assigneeId: null,
    assigneeName: null,
    completedAt: null,
  },
  {
    taskId: "cleanup-put-away",
    description: "Put away food",
    assigneeId: null,
    assigneeName: null,
    completedAt: null,
  },
  {
    taskId: "cleanup-cooktop",
    description: "Clean cooktop",
    assigneeId: null,
    assigneeName: null,
    completedAt: null,
  },
  {
    taskId: "cleanup-wipe-counters",
    description: "Wipe down counters",
    assigneeId: null,
    assigneeName: null,
    completedAt: null,
  },
];

const statusVariant: Record<string, "secondary" | "outline" | "default"> = {
  incomplete: "secondary",
  planned: "outline",
  in_progress: "secondary",
  served: "default",
};

const statusLabel: Record<string, string> = {
  incomplete: "Incomplete",
  planned: "Planned",
  in_progress: "In Progress",
  served: "Served",
};

export function MealDetailPage() {
  const { mealId } = useParams<{ mealId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId ?? "";
  const isParent = user?.role === "parent";

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MealItem | undefined>();
  const [addFromRecipesOpen, setAddFromRecipesOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [recipeSheetItem, setRecipeSheetItem] = useState<MealItem | null>(null);
  const [aiProposal, setAiProposal] = useState<
    ReturnType<typeof useAIAssignTasks>["data"] | null
  >(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const { data: meal, isLoading } = useMeal(familyId, mealId ?? "");
  const { data: familyMembers = [] } = useFamilyMembers(familyId);
  const { data: recipes = [] } = useRecipes(familyId);
  const updateMeal = useUpdateMeal(familyId);
  const voteSuggestion = useVoteMealSuggestion(familyId);
  const acceptSuggestion = useAcceptMealSuggestion(familyId);
  const aiAssign = useAIAssignTasks();

  if (!mealId) return null;

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-muted-foreground">Meal not found.</p>
        <Button variant="outline" onClick={() => navigate("/meals")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Planner
        </Button>
      </div>
    );
  }

  const m = meal;
  const displayStatus = deriveMealStatus(m);
  const isServed = displayStatus === "served";
  const items: MealItem[] = m.items ?? [];
  const cleanupTasks: MealTask[] = m.cleanupTasks ?? CLEANUP_TASK_DEFAULTS;
  const hasEntree = items.some((i) => i.courseType === "entree");
  const hasTasks = items.some((i) =>
    i.components.some((c) => c.tasks.length > 0),
  );
  const pendingSuggestions = (m.suggestions ?? []).filter((s) => !s.accepted);
  const isSuggestionMutating =
    voteSuggestion.isPending || acceptSuggestion.isPending;

  const recipeOptions = recipes
    .filter((r) => !items.some((i) => i.recipeId === r.recipeId))
    .map((r) => ({ value: r.recipeId, label: r.name }));

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSaveItem(item: MealItem) {
    const existing = items.findIndex((i) => i.itemId === item.itemId);
    const updated =
      existing >= 0
        ? items.map((i, idx) => (idx === existing ? item : i))
        : [...items, item];
    updateMeal.mutate({ mealId: m.mealId, updates: { items: updated } });
  }

  function handleRemoveItem(itemId: string) {
    updateMeal.mutate({
      mealId: m.mealId,
      updates: { items: items.filter((i) => i.itemId !== itemId) },
    });
  }

  function handleAddFromRecipe() {
    const recipe = recipes.find((r) => r.recipeId === selectedRecipeId);
    if (!recipe) return;
    const mealComponents: MealComponent[] = (recipe.components ?? []).map(
      (rc) => ({
        componentId: nanoid(),
        name: rc.name,
        ...(rc.notes !== undefined && { notes: rc.notes }),
        ingredients: rc.ingredients ?? [],
        tasks: (rc.tasks ?? []).map((t) => ({
          taskId: t.taskId,
          description: t.description,
          assigneeId: null,
          assigneeName: null,
          completedAt: null,
        })),
      }),
    );
    const newItem: MealItem = {
      itemId: nanoid(),
      courseType: recipe.courseType,
      name: recipe.name,
      recipeId: recipe.recipeId,
      components: mealComponents,
    };
    updateMeal.mutate({
      mealId: m.mealId,
      updates: { items: [...items, newItem] },
    });
    setSelectedRecipeId("");
    setAddFromRecipesOpen(false);
  }

  function handleAssignTask(
    itemId: string,
    componentId: string,
    taskId: string,
    assigneeId: string | null,
    assigneeName: string | null,
  ) {
    const updated = items.map((item) => {
      if (item.itemId !== itemId) return item;
      return {
        ...item,
        components: item.components.map((comp) => {
          if (comp.componentId !== componentId) return comp;
          // '__component__' is a synthetic taskId meaning "assign the whole component"
          if (taskId === "__component__") {
            return {
              ...comp,
              ...(assigneeId !== null
                ? { assigneeId, assigneeName }
                : { assigneeId: null, assigneeName: null }),
            };
          }
          return {
            ...comp,
            tasks: comp.tasks.map((task) =>
              task.taskId === taskId
                ? { ...task, assigneeId, assigneeName }
                : task,
            ),
          };
        }),
      };
    });
    updateMeal.mutate({ mealId: m.mealId, updates: { items: updated } });
  }

  function handleAssignCleanupTask(
    taskIndex: number,
    assigneeId: string | null,
    assigneeName: string | null,
  ) {
    const updated = cleanupTasks.map((t, i) =>
      i === taskIndex ? { ...t, assigneeId, assigneeName } : t,
    );
    updateMeal.mutate({ mealId: m.mealId, updates: { cleanupTasks: updated } });
  }

  function handleDishAssignPerson(assigneeId: string, assigneeName: string) {
    let filled = false;
    const updated = cleanupTasks.map((t) => {
      if (!filled && t.description === "Dishes" && t.assigneeId === null) {
        filled = true;
        return { ...t, assigneeId, assigneeName };
      }
      return t;
    });
    if (!filled) {
      updated.push({
        taskId: `cleanup-dishes-${Date.now()}`,
        description: "Dishes",
        assigneeId,
        assigneeName,
        completedAt: null,
      });
    }
    updateMeal.mutate({ mealId: m.mealId, updates: { cleanupTasks: updated } });
  }

  function handleDishUnassignPerson(globalIndex: number) {
    const dishCount = cleanupTasks.filter(
      (t) => t.description === "Dishes",
    ).length;
    const updated =
      dishCount <= 1
        ? cleanupTasks.map((t, i) =>
            i === globalIndex
              ? { ...t, assigneeId: null, assigneeName: null }
              : t,
          )
        : cleanupTasks.filter((_, i) => i !== globalIndex);
    updateMeal.mutate({ mealId: m.mealId, updates: { cleanupTasks: updated } });
  }

  function handleVote(suggestion: MealSuggestion) {
    if (!user) return;
    voteSuggestion.mutate({
      meal: m,
      suggestionId: suggestion.suggestionId,
      voter: {
        userId: user.uid,
        userName: user.displayName,
        photoUrl: user.photoUrl,
      },
    });
  }

  function handleAccept(suggestion: MealSuggestion) {
    acceptSuggestion.mutate({ meal: m, suggestion, allRecipes: recipes });
  }

  function handleRemoveSuggestion(suggestion: MealSuggestion) {
    const updated = (m.suggestions ?? []).filter(
      (s) => s.suggestionId !== suggestion.suggestionId,
    );
    updateMeal.mutate({ mealId: m.mealId, updates: { suggestions: updated } });
  }

  async function handleAIAssign() {
    try {
      const result = await aiAssign.mutateAsync({ familyId, mealId: m.mealId });
      if (result.assignments.length === 0) {
        toast.info("No task assignments were suggested.");
        return;
      }
      setAiProposal(result);
      setAiDialogOpen(true);
    } catch {
      toast.error("Failed to get AI suggestions.");
    }
  }

  function applyAIAssignments() {
    if (!aiProposal) return;
    const updated = items.map((item) => ({
      ...item,
      components: item.components.map((comp) => ({
        ...comp,
        tasks: comp.tasks.map((task) => {
          const a = aiProposal.assignments.find(
            (x) =>
              x.itemId === item.itemId &&
              x.componentId === comp.componentId &&
              x.taskId === task.taskId,
          );
          if (!a) return task;
          return {
            ...task,
            assigneeId: a.assigneeId,
            assigneeName: a.assigneeName,
          };
        }),
      })),
    }));
    updateMeal.mutate({ mealId: m.mealId, updates: { items: updated } });
    setAiDialogOpen(false);
    setAiProposal(null);
    toast.success("Task assignments applied.");
  }

  // ── Flat ingredient list for Ingredients tab ─────────────────────────────────

  const allIngredients = items.flatMap((item) =>
    item.components.flatMap((comp) =>
      comp.ingredients.map((ing) => ({
        ...ing,
        itemName: item.name,
        componentName: comp.name,
      })),
    ),
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        {/* Back nav */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/meals")}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Meals
        </Button>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">Meal plan</h1>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={statusVariant[displayStatus] ?? "outline"}>
              {statusLabel[displayStatus] ?? displayStatus}
            </Badge>
            {isParent && hasTasks && !isServed && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAIAssign}
                      disabled={aiAssign.isPending}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      {aiAssign.isPending ? "Assigning…" : "Auto-assign"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Use AI to automatically assign tasks to family members
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(m.date + "T12:00:00"), "EEEE, MMMM d, yyyy")}
        </p>
        {isServed && m.servedAt && (
          <p className="text-xs text-muted-foreground">
            Served at {format(m.servedAt.toDate(), "h:mm a")}
          </p>
        )}
      </div>

      {/* Suggestions */}
      {(pendingSuggestions.length > 0 || !hasEntree) && (
        <>
          <Separator />
          <InlineErrorBoundary label="Suggested entrées failed to load">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Suggested entrées</h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-primary"
                  onClick={() => setSuggestOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add suggestion
                </Button>
              </div>
              {pendingSuggestions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No suggestions yet. Add one to get the family voting.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingSuggestions.map((s) => (
                    <MealSuggestionItem
                      key={s.suggestionId}
                      suggestion={s}
                      currentUserId={user?.uid ?? ""}
                      isParent={isParent}
                      onVote={() => handleVote(s)}
                      onAccept={() => handleAccept(s)}
                      onRemove={() => handleRemoveSuggestion(s)}
                      isPending={isSuggestionMutating}
                    />
                  ))}
                </div>
              )}
            </div>
          </InlineErrorBoundary>
        </>
      )}

      <Separator />

      {/* Main tabs */}
      <Tabs defaultValue="plan">
        <TabsList className="mb-4">
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="ingredients">
            Ingredients{" "}
            {allIngredients.length > 0 && `(${allIngredients.length})`}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks{" "}
            {hasTasks &&
              `(${items.reduce((n, i) => n + i.components.reduce((m, c) => m + c.tasks.length, 0), 0)})`}
          </TabsTrigger>
        </TabsList>

        {/* Plan tab */}
        <TabsContent value="plan">
          <InlineErrorBoundary label="Items section failed to load">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Items</h2>
                {!isServed && isParent && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingItem(undefined);
                        setAddItemOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Quick add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAddFromRecipesOpen(true)}
                      disabled={recipeOptions.length === 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      From recipes
                    </Button>
                  </div>
                )}
              </div>

              {items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No items added yet.
                  {isParent &&
                    !isServed &&
                    " Add a recipe or a quick item to get started."}
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <MealItemSection
                      key={item.itemId}
                      item={item}
                      isServed={isServed}
                      isParent={isParent}
                      currentUserId={user?.uid ?? ""}
                      familyMembers={familyMembers}
                      onRemoveItem={() => handleRemoveItem(item.itemId)}
                      onAssignTask={(
                        componentId,
                        taskId,
                        assigneeId,
                        assigneeName,
                      ) =>
                        handleAssignTask(
                          item.itemId,
                          componentId,
                          taskId,
                          assigneeId,
                          assigneeName,
                        )
                      }
                      onViewRecipe={
                        item.recipeId
                          ? () => setRecipeSheetItem(item)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </InlineErrorBoundary>
        </TabsContent>

        {/* Ingredients tab */}
        <TabsContent value="ingredients">
          {allIngredients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No ingredients added to this meal's recipes yet.
            </p>
          ) : (
            <div className="space-y-1">
              {allIngredients.map((ing) => (
                <div
                  key={ing.ingredientId}
                  className="flex items-center gap-2 text-sm py-1 border-b last:border-0"
                >
                  <span className="flex-1">{ing.name}</span>
                  {(ing.quantity || ing.unit) && (
                    <span className="text-muted-foreground shrink-0">
                      {ing.quantity}
                      {ing.unit ? ` ${ing.unit}` : ""}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {ing.componentName !== ing.itemName
                      ? `${ing.itemName} › ${ing.componentName}`
                      : ing.itemName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tasks tab */}
        <TabsContent value="tasks">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No items added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <MealItemSection
                  key={item.itemId}
                  item={item}
                  isServed={isServed}
                  isParent={isParent}
                  currentUserId={user?.uid ?? ""}
                  familyMembers={familyMembers}
                  onRemoveItem={() => handleRemoveItem(item.itemId)}
                  onAssignTask={(
                    componentId,
                    taskId,
                    assigneeId,
                    assigneeName,
                  ) =>
                    handleAssignTask(
                      item.itemId,
                      componentId,
                      taskId,
                      assigneeId,
                      assigneeName,
                    )
                  }
                  onViewRecipe={
                    item.recipeId ? () => setRecipeSheetItem(item) : undefined
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cleanup section — always visible */}
      <Separator />
      <InlineErrorBoundary label="Cleanup section failed to load">
        <div className="space-y-3">
          <h2 className="font-medium">Cleanup</h2>
          <div className="rounded-lg border bg-card space-y-2 p-3">
            <CleanupDishesRow
              entries={cleanupTasks
                .map((task, i) => ({ task, globalIndex: i }))
                .filter((e) => e.task.description === "Dishes")}
              isServed={isServed}
              isParent={isParent}
              currentUserId={user?.uid ?? ""}
              familyMembers={familyMembers}
              onAssignPerson={handleDishAssignPerson}
              onUnassignPerson={handleDishUnassignPerson}
            />
            {cleanupTasks
              .map((task, ti) => ({ task, ti }))
              .filter(({ task }) => task.description !== "Dishes")
              .map(({ task, ti }) => (
                <MealTaskRow
                  key={task.taskId}
                  task={task}
                  isServed={isServed}
                  isParent={isParent}
                  currentUserId={user?.uid ?? ""}
                  familyMembers={familyMembers}
                  onAssign={(assigneeId) => {
                    const member = familyMembers.find(
                      (fm) => fm.userId === assigneeId,
                    );
                    handleAssignCleanupTask(
                      ti,
                      assigneeId,
                      member?.displayName ?? null,
                    );
                  }}
                />
              ))}
          </div>
        </div>
      </InlineErrorBoundary>

      {/* Quick add / edit item dialog */}
      <AddEditItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        existingItem={editingItem}
        hasEntree={hasEntree}
        onSave={handleSaveItem}
        onDelete={
          editingItem ? () => handleRemoveItem(editingItem.itemId) : undefined
        }
      />

      {/* Add from recipes dialog */}
      <Dialog open={addFromRecipesOpen} onOpenChange={setAddFromRecipesOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add from Recipes</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Combobox
              options={recipeOptions}
              value={selectedRecipeId}
              onChange={setSelectedRecipeId}
              placeholder="Select a recipe…"
              searchPlaceholder="Search recipes…"
              emptyText="No recipes found."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddFromRecipesOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddFromRecipe}
              disabled={!selectedRecipeId || updateMeal.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suggest Entrée dialog */}
      <SuggestEntreeDialog
        meal={m}
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
      />

      {/* Dish recipe sheet */}
      <DishRecipeSheet
        item={recipeSheetItem}
        open={Boolean(recipeSheetItem)}
        onOpenChange={(v) => {
          if (!v) setRecipeSheetItem(null);
        }}
      />

      {/* AI Assignment Preview dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI Task Assignment Suggestions</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 max-h-80 overflow-y-auto">
            {aiProposal?.assignments.map((a, i) => (
              <div
                key={i}
                className="rounded-md border px-3 py-2 text-sm space-y-0.5"
              >
                <div className="font-medium">{a.taskDescription}</div>
                <div className="text-xs text-muted-foreground">
                  {a.itemName}
                  {a.componentName !== a.itemName
                    ? ` › ${a.componentName}`
                    : ""}
                </div>
                <div className="text-muted-foreground text-xs">
                  Assign to:{" "}
                  <span className="font-medium text-foreground">
                    {a.assigneeName}
                  </span>
                </div>
                {a.rationale && (
                  <div className="text-muted-foreground text-xs italic">
                    {a.rationale}
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyAIAssignments}>Apply All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
