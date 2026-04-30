import { ChefHat, Utensils } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { Recipe, CourseType } from "@/shared/types/recipes";

const courseLabels: Record<CourseType, string> = {
  entree: "Entrée",
  side: "Side",
  salad: "Salad",
  fruit: "Fruit",
  dessert: "Dessert",
};

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onFork?: () => void;
}

export function RecipeCard({ recipe, onClick, onFork }: RecipeCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow py-0"
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`View ${recipe.name} recipe`}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground leading-snug line-clamp-2">
            {recipe.name}
          </h3>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {courseLabels[recipe.courseType]}
          </Badge>
        </div>

        {recipe.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {recipe.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Utensils className="h-3 w-3" />
            {(recipe.components ?? []).reduce(
              (n, c) => n + c.ingredients.length,
              0,
            )}{" "}
            {(recipe.components ?? []).reduce(
              (n, c) => n + c.ingredients.length,
              0,
            ) === 1
              ? "ingredient"
              : "ingredients"}
          </span>
          <span className="flex items-center gap-1">
            <ChefHat className="h-3 w-3" />
            {(recipe.components ?? []).reduce(
              (n, c) => n + c.tasks.length,
              0,
            )}{" "}
            {(recipe.components ?? []).reduce(
              (n, c) => n + c.tasks.length,
              0,
            ) === 1
              ? "task"
              : "tasks"}
          </span>
        </div>

        {onFork && (
          <button
            className="mt-3 text-xs text-primary underline-offset-2 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onFork();
            }}
            aria-label={`Save ${recipe.name} to My Recipes`}
          >
            Save to My Recipes
          </button>
        )}
      </CardContent>
    </Card>
  );
}
