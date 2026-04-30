import { useState } from "react";
import { Sparkles, RefreshCw, BookOpen, Wand2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Toggle } from "@/shared/components/ui/toggle";
import { useAISuggestMeals, type AIMealIdea } from "../hooks/useMealAI";
import { useAddMealSuggestion } from "../hooks/useMeals";
import { useAuthStore } from "@/shared/lib/authStore";
import type { Meal } from "@/shared/types/meals";
import { toast } from "sonner";

export interface AISuggestMealsSheetProps {
  meal: Meal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MealStyle = "quick" | "full";

export function AISuggestMealsSheet({
  meal,
  open,
  onOpenChange,
}: AISuggestMealsSheetProps) {
  const { user } = useAuthStore();
  const familyId = user?.familyId ?? "";

  const [mealStyle, setMealStyle] = useState<MealStyle>("quick");
  const [cuisine, setCuisine] = useState("");
  const [ideas, setIdeas] = useState<AIMealIdea[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const suggest = useAISuggestMeals();
  const addSuggestion = useAddMealSuggestion(familyId);

  const alreadySuggested = new Set(
    (meal.suggestions ?? [])
      .filter((s) => !s.accepted && s.recipeId !== null)
      .map((s) => s.recipeId as string),
  );

  async function handleGenerate(variety = false) {
    const cuisineInput = variety ? "" : cuisine.trim();
    try {
      const result = await suggest.mutateAsync({
        familyId,
        mealStyle,
        cuisinePreference: cuisineInput,
      });
      setIdeas(result.ideas);
      setAddedIds(new Set());
    } catch {
      toast.error("Failed to generate suggestions. Please try again.");
    }
  }

  function handleAddIdea(idea: AIMealIdea) {
    if (!user) return;

    // Add the entree as a MealSuggestion
    addSuggestion.mutate(
      {
        meal,
        suggestion: {
          recipeId: idea.entree.recipeId,
          name: idea.entree.name,
          courseType: "entree",
          suggestedById: user.uid,
          suggestedByName: user.displayName,
        },
        suggestedByPhotoUrl: user.photoUrl ?? null,
      },
      {
        onSuccess: () => {
          setAddedIds((prev) => new Set(prev).add(idea.ideaId));
          toast.success(`"${idea.entree.name}" added to suggestions.`);
        },
        onError: () => {
          toast.error("Failed to add suggestion.");
        },
      },
    );
  }

  // function handleClose() {
  //   onOpenChange(false);
  // }

  const isGenerating = suggest.isPending;
  const hasIdeas = ideas.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto gap-0 flex flex-col pt-safe"
      >
        <SheetHeader className="pb-0 pt-4 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <SheetTitle>AI Meal Ideas</SheetTitle>
          </div>
          <SheetDescription>
            Get 10 varied dinner ideas based on your family&apos;s recipes and
            preferences.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pt-4 pb-6 flex-1">
          {/* Style toggle */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Meal style</p>
            <div className="flex gap-2">
              <Toggle
                pressed={mealStyle === "quick"}
                onPressedChange={(v) => v && setMealStyle("quick")}
                variant="outline"
                className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                aria-label="Quick and easy meals"
              >
                ⚡ Quick &amp; Easy
              </Toggle>
              <Toggle
                pressed={mealStyle === "full"}
                onPressedChange={(v) => v && setMealStyle("full")}
                variant="outline"
                className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                aria-label="Full meals with sides"
              >
                Full Meal
              </Toggle>
            </div>
          </div>

          {/* Cuisine input */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Cuisine preference</p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Mexican, Italian, Asian…"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isGenerating) handleGenerate();
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => handleGenerate(true)}
                disabled={isGenerating}
                aria-label="Give me a variety"
                className="shrink-0 text-primary"
              >
                <RefreshCw className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Variety</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank or click &ldquo;Variety&rdquo; for a mix of cuisines.
            </p>
          </div>

          <Button
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                Generating ideas…
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                {hasIdeas ? "Regenerate" : "Generate 10 Ideas"}
              </>
            )}
          </Button>

          {/* Loading skeletons */}
          {isGenerating && (
            <div className="space-y-3 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Ideas list */}
          {!isGenerating && hasIdeas && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {ideas.length} ideas — click to add to suggestions
                </p>
                {ideas.map((idea) => {
                  const isAdded = addedIds.has(idea.ideaId);
                  const isDuplicate =
                    idea.entree.recipeId !== null &&
                    alreadySuggested.has(idea.entree.recipeId);

                  return (
                    <IdeaCard
                      key={idea.ideaId}
                      idea={idea}
                      isAdded={isAdded}
                      isDuplicate={isDuplicate}
                      isPending={addSuggestion.isPending}
                      onAdd={() => handleAddIdea(idea)}
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* Empty prompt */}
          {!isGenerating && !hasIdeas && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 opacity-30" />
              <p className="text-sm">
                Set your preferences above and generate ideas.
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── IdeaCard ──────────────────────────────────────────────────────────────────

interface IdeaCardProps {
  idea: AIMealIdea;
  isAdded: boolean;
  isDuplicate: boolean;
  isPending: boolean;
  onAdd: () => void;
}

function IdeaCard({
  idea,
  isAdded,
  isDuplicate,
  isPending,
  onAdd,
}: IdeaCardProps) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <p className="text-sm font-medium leading-tight">{idea.entree.name}</p>
          <p className="text-xs text-muted-foreground leading-tight">
            {idea.title}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {idea.entree.isFromRecipes && (
            <Badge
              variant="outline"
              className="text-xs rounded-full px-1.5 py-0 h-5 text-primary border-primary/30"
            >
              <BookOpen className="h-3 w-3 mr-1" />
              Saved
            </Badge>
          )}
          <Button
            size="sm"
            variant={isAdded ? "outline" : "default"}
            onClick={onAdd}
            disabled={isAdded || isDuplicate || isPending}
            className="h-7 px-2.5 text-xs"
          >
            {isAdded
              ? "Added ✓"
              : isDuplicate
                ? "Already suggested"
                : "Add"}
          </Button>
        </div>
      </div>

      {idea.sides.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {idea.sides.map((side, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="text-xs font-normal rounded-full"
            >
              {side.isFromRecipes && <BookOpen className="h-2.5 w-2.5 mr-1" />}
              {side.name}
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground italic leading-relaxed">
        {idea.rationale}
      </p>

      {idea.entree.lastServedDate && (
        <p className="text-xs text-muted-foreground">
          Last served:{" "}
          {new Date(idea.entree.lastServedDate + "T12:00:00").toLocaleDateString(
            undefined,
            { month: "short", day: "numeric" },
          )}
        </p>
      )}
    </div>
  );
}
