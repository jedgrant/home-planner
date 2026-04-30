import { useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Archive,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { RecipeComponentEditor } from "./RecipeComponentEditor";
import {
  useRecipe,
  useGlobalRecipe,
  useUpdateRecipe,
  useArchiveRecipe,
  useSetRecipeVisibility,
} from "../hooks/useRecipes";
import { useAISuggestRecipe, useAISuggestTasks } from "../hooks/useRecipeAI";
import { useStores } from "@/features/grocery/hooks/useStores";
import { useAuthStore } from "@/shared/lib/authStore";
import { nanoid } from "nanoid";
import type { RecipeComponent, CourseType } from "@/shared/types/recipes";

const courseLabels: Record<CourseType, string> = {
  entree: "Entrée",
  side: "Side",
  salad: "Salad",
  fruit: "Fruit",
  dessert: "Dessert",
};

export function RecipeDetailPage() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const isGlobalView = searchParams.get("source") === "global";
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const familyId = user?.familyId ?? "";
  const isParent = user?.role === "parent";

  const familyQuery = useRecipe(familyId, id);
  const globalQuery = useGlobalRecipe(isGlobalView ? id : "");

  const recipe = isGlobalView ? globalQuery.data : familyQuery.data;
  const isLoading = isGlobalView
    ? globalQuery.isLoading
    : familyQuery.isLoading;

  const updateMutation = useUpdateRecipe(familyId);
  const archiveMutation = useArchiveRecipe(familyId);
  const visibilityMutation = useSetRecipeVisibility(familyId);
  const aiSuggestTasks = useAISuggestTasks();
  const aiSuggestRecipe = useAISuggestRecipe();

  const { data: stores = [] } = useStores(familyId);

  const [components, setComponents] = useState<RecipeComponent[]>([]); // seeded from recipe below
  const [seeded, setSeeded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  const [nameVal, setNameVal] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [servesVal, setServesVal] = useState("");
  const servesInputRef = useRef<HTMLInputElement>(null);

  // Seed local state once the recipe loads
  if (recipe && !seeded) {
    setComponents(recipe.components);
    setNameVal(recipe.name);
    setServesVal(recipe.servingSize > 0 ? String(recipe.servingSize) : "");
    setSeeded(true);
  }

  const saveToFirestore = useCallback(
    async (nextComponents: RecipeComponent[]) => {
      if (!recipe) return;
      setSaveStatus("saving");
      try {
        await updateMutation.mutateAsync({
          recipeId: recipe.recipeId,
          changes: { components: nextComponents },
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("idle");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipe?.recipeId, familyId],
  );

  function handleComponentsChange(next: RecipeComponent[]) {
    setComponents(next);
  }

  function handleComponentsSave(next: RecipeComponent[]) {
    setComponents(next);
    void saveToFirestore(next);
  }

  async function handleAISuggestRecipe() {
    if (!recipe) return;
    const result = await aiSuggestRecipe.mutateAsync({
      recipeName: recipe.name,
    });
    // Map flat ingredients + tasks into a single component named after the recipe
    const newComponents: RecipeComponent[] = [
      {
        componentId: nanoid(),
        name: recipe.name,
        ingredients: result.ingredients.map((ing) => ({
          ingredientId: nanoid(),
          name: ing.name,
          quantity: ing.quantity,
          unit: null,
          storeId: null,
          storeName: null,
        })),
        tasks: result.prepTasks.map((t, i) => ({
          taskId: nanoid(),
          description: t.description,
          order: t.order ?? i,
        })),
      },
    ];
    setComponents(newComponents);
    void saveToFirestore(newComponents);
    await updateMutation.mutateAsync({
      recipeId: recipe.recipeId,
      changes: {
        description: result.description,
        servingSize: result.servingSize,
      },
    });
  }

  async function handleAISuggestTasks() {
    if (!recipe) return;
    const allIngredients = recipe.components.flatMap((c) => c.ingredients);
    const result = await aiSuggestTasks.mutateAsync({
      recipeName: recipe.name,
      ingredients: allIngredients.map((i) => ({
        name: i.name,
        quantity: i.quantity,
      })),
      notes: recipe.description,
    });
    // Append suggested tasks to the first component, or create one if none exist
    const newTasks = result.prepTasks.map((t, i) => ({
      taskId: nanoid(),
      description: t.description,
      order: i,
    }));
    const next: RecipeComponent[] =
      components.length > 0
        ? components.map((c, i) =>
            i === 0
              ? {
                  ...c,
                  tasks: [
                    ...c.tasks,
                    ...newTasks.map((t, j) => ({
                      ...t,
                      order: c.tasks.length + j,
                    })),
                  ],
                }
              : c,
          )
        : [
            {
              componentId: nanoid(),
              name: recipe.name,
              ingredients: [],
              tasks: newTasks,
            },
          ];
    setComponents(next);
    void saveToFirestore(next);
  }

  async function handleNameBlur() {
    const trimmed = nameVal.trim();
    if (!trimmed) {
      setNameVal(recipe!.name);
      return;
    }
    if (trimmed !== recipe!.name) {
      await updateMutation.mutateAsync({
        recipeId: recipe!.recipeId,
        changes: { name: trimmed },
      });
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") nameInputRef.current?.blur();
    if (e.key === "Escape") {
      setNameVal(recipe!.name);
    }
  }

  async function handleCourseTypeChange(value: CourseType) {
    if (!recipe || value === recipe.courseType) return;
    await updateMutation.mutateAsync({
      recipeId: recipe.recipeId,
      changes: { courseType: value },
    });
  }

  async function handleServesBlur() {
    const num = parseInt(servesVal, 10);
    const next = isNaN(num) || num < 0 ? 0 : num;
    setServesVal(next > 0 ? String(next) : "");
    if (next !== recipe!.servingSize) {
      await updateMutation.mutateAsync({
        recipeId: recipe!.recipeId,
        changes: { servingSize: next },
      });
    }
  }

  function handleServesKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") servesInputRef.current?.blur();
    if (e.key === "Escape") {
      setServesVal(recipe!.servingSize > 0 ? String(recipe!.servingSize) : "");
    }
  }

  async function handleArchive() {
    if (!recipe) return;
    await archiveMutation.mutateAsync(recipe.recipeId);
    navigate("/recipes");
  }

  async function handleToggleVisibility() {
    if (!recipe) return;
    await visibilityMutation.mutateAsync({
      recipeId: recipe.recipeId,
      visibility: recipe.visibility === "global" ? "private" : "global",
    });
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Recipe not found.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/recipes")}
          className="mt-3"
        >
          Back to recipes
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div>
        {/* Back link */}
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2"
              onClick={() => navigate("/recipes")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              All Recipes
            </Button>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-3">
            {/* Title */}
            {isParent && !isGlobalView ? (
              <input
                ref={nameInputRef}
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onBlur={() => void handleNameBlur()}
                onKeyDown={handleNameKeyDown}
                className="font-heading text-3xl font-semibold text-foreground bg-transparent border-b border-transparent hover:text-primary focus:border-primary focus:outline-none leading-tight transition-colors cursor-text"
                aria-label="Recipe name"
              />
            ) : (
              <h1 className="text-3xl font-semibold text-foreground">{recipe.name}</h1>
            )}

            {/* Meta row: Type, Serves, visibility */}
            {isParent && !isGlobalView ? (
              <div className="flex flex-wrap items-center gap-3">
                {/* Type */}
                <div className="flex items-center h-9 rounded-lg border border-input bg-background overflow-hidden">
                  <span className="px-3 h-full flex items-center text-sm text-muted-foreground bg-muted border-r border-input shrink-0">
                    Type
                  </span>
                  <Select
                    value={recipe.courseType}
                    onValueChange={(v) => void handleCourseTypeChange(v as CourseType)}
                  >
                    <SelectTrigger className="border-0 rounded-none shadow-none h-9 gap-1.5 px-2.5 focus:ring-0">
                      <SelectValue>{courseLabels[recipe.courseType]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(courseLabels) as [CourseType, string][]).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Serves */}
                <div className="flex items-center h-9 rounded-lg border border-input bg-background overflow-hidden">
                  <span className="px-3 h-full flex items-center text-sm text-muted-foreground bg-muted border-r border-input shrink-0">
                    Serves
                  </span>
                  <input
                    ref={servesInputRef}
                    type="number"
                    min={0}
                    value={servesVal}
                    onChange={(e) => setServesVal(e.target.value)}
                    onBlur={() => void handleServesBlur()}
                    onKeyDown={handleServesKeyDown}
                    className="h-full w-16 bg-transparent px-2.5 text-sm text-foreground focus:outline-none"
                    placeholder="—"
                  />
                </div>

                {/* Visibility toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="recipe-visibility"
                    checked={recipe.visibility === "global"}
                    onCheckedChange={() => void handleToggleVisibility()}
                    disabled={visibilityMutation.isPending}
                  />
                  <Label htmlFor="recipe-visibility" className="text-sm cursor-pointer">
                    {recipe.visibility === "global" ? "Public" : "Private"}
                  </Label>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{courseLabels[recipe.courseType]}</Badge>
                {recipe.servingSize > 0 && (
                  <span className="text-sm text-muted-foreground">Serves {recipe.servingSize}</span>
                )}
              </div>
            )}
          </div>

          {isParent && !isGlobalView && (
            <div className="flex items-center gap-2 pt-1">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Saved
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setShowArchiveDialog(true)}
              >
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Description */}
      {recipe.description && (
        <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">
          {recipe.description}
        </p>
      )}

      {/* AI Suggest Recipe — shown for empty named recipes */}
      {isParent &&
        !isGlobalView &&
        !recipe.description &&
        components.length === 0 && (
          <div className="mt-4 rounded-xl border border-dashed p-5 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              This recipe is empty. Let AI fill in a description, ingredients,
              and prep tasks based on the name.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={aiSuggestRecipe.isPending}
              onClick={handleAISuggestRecipe}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {aiSuggestRecipe.isPending ? "Asking AI…" : "AI Suggest Recipe"}
            </Button>
          </div>
        )}

      {/* Components (replaces separate Ingredients + Prep Tasks sections) */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">Components</h2>
          {isParent && !isGlobalView && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={aiSuggestRecipe.isPending || aiSuggestTasks.isPending}
              onClick={handleAISuggestTasks}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {aiSuggestTasks.isPending ? "Asking AI…" : "Suggest Tasks"}
            </Button>
          )}
        </div>
        <RecipeComponentEditor
          components={components}
          onChange={handleComponentsChange}
          onSave={handleComponentsSave}
          stores={stores}
          disabled={!isParent || isGlobalView}
        />
      </section>

      {/* Archive confirm */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Recipe</AlertDialogTitle>
            <AlertDialogDescription>
              "{recipe.name}" will be archived and hidden from the recipe book.
              Past meal references are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
