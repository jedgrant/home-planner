import { Printer } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Separator } from "@/shared/components/ui/separator";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAuthStore } from "@/shared/lib/authStore";
import { useRecipe } from "../hooks/useRecipes";
import type { MealItem } from "@/shared/types/meals";

interface DishRecipeSheetProps {
  item: MealItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DishRecipeSheet({
  item,
  open,
  onOpenChange,
}: DishRecipeSheetProps) {
  const familyId = useAuthStore((s) => s.user?.familyId ?? "");
  const { data: recipe, isLoading } = useRecipe(familyId, item?.recipeId ?? "");

  const components = recipe?.components ?? [];

  function handlePrint() {
    window.print();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto gap-0"
      >
        <SheetHeader className="flex flex-row items-center justify-between pr-12 pb-0 pt-3">
          <SheetTitle className="text-xl">{item?.name ?? "Recipe"}</SheetTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="shrink-0 print:hidden"
            aria-label="Print recipe"
          >
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </SheetHeader>

        <div className="print:block space-y-6 pb-8 px-4">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {!isLoading && !recipe && (
            <p className="text-sm text-muted-foreground">
              Recipe details not available.
            </p>
          )}

          {recipe && (
            <>
              {recipe.description && (
                <p className="text-sm text-muted-foreground">
                  {recipe.description}
                </p>
              )}

              {recipe.servingSize && (
                <p className="text-sm">
                  <span className="font-medium">Serves:</span>{" "}
                  {recipe.servingSize}
                </p>
              )}

              {components.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No components added yet.
                </p>
              )}

              {components.map((comp, ci) => (
                <div key={comp.componentId} className="space-y-4">
                  {ci > 0 && <Separator />}
                  <div>
                    {comp.name !== recipe.name && (
                      <h3 className="text-lg font-semibold">{comp.name}</h3>
                    )}
                    {comp.notes && (
                      <p className="text-sm text-muted-foreground">
                        {comp.notes}
                      </p>
                    )}
                  </div>
                  {comp.ingredients.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Ingredients
                      </h4>
                      <ul className="space-y-0.5">
                        {comp.ingredients.map((ing) => (
                          <li
                            key={ing.ingredientId}
                            className="text-sm flex gap-2"
                          >
                            <span>{ing.name}</span>
                            <span className="text-muted-foreground">
                              &bull;
                            </span>
                            <span className="shrink-0">
                              {ing.quantity}
                              {ing.unit ? ` ${ing.unit}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {comp.tasks.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Steps
                      </h4>
                      <ol className="space-y-1.5 list-decimal list-inside">
                        {comp.tasks.map((task) => (
                          <li
                            key={task.taskId}
                            className="text-sm [&>p]:inline"
                            dangerouslySetInnerHTML={{
                              __html: task.description,
                            }}
                          />
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
