import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { format, addDays, startOfDay } from "date-fns";
import { ShoppingCart } from "lucide-react";
import { useAuthStore } from "@/shared/lib/authStore";
import { useFamilyMembers } from "@/features/auth/hooks/useFamilyQueries";
import { useMeals } from "@/features/meals/hooks/useMeals";
import { useStores } from "@/features/grocery/hooks/useStores";
import { useWeeklyChoreDoc } from "@/features/chores/hooks/useWeeklyChores";
import { useChoreGroups } from "@/features/chores/hooks/useChoreGroups";
import {
  dateToWeekId,
  weekIdToStartDate,
} from "@/features/chores/utils/rotation";
import {
  GroceryStoreList,
  ChildChoreCard,
  ParentTodayMealCard,
} from "@/features/dashboard";
import type { Meal } from "@/shared/types/meals";
import { EmptyState } from "@/shared/components/EmptyState";
import choresIllustration from "@/assets/illustration-chores.png";
import groceryIllustration from "@/assets/illustration-groceries.png";
// ─── Dashboard page ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuthStore();

  if (user?.role === "child") {
    return <Navigate to="/child-dashboard" replace />;
  }

  const familyId = user?.familyId ?? "";

  // Meals — next 7 days
  const today = startOfDay(new Date());
  const startDate = format(today, "yyyy-MM-dd");
  const endDate = format(addDays(today, 6), "yyyy-MM-dd");
  const { data: meals } = useMeals(familyId, startDate, endDate);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(today, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startDate],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const displayIndex = Math.max(0, Math.min(selectedIndex, days.length - 1));

  const mealByDate = useMemo(() => {
    const map: Record<string, Meal> = {};
    for (const m of meals ?? []) map[m.date] = m;
    return map;
  }, [meals]);

  // Grocery
  const { data: stores } = useStores(familyId);

  // Chores — current week
  const { data: members } = useFamilyMembers(familyId);
  const { data: groups } = useChoreGroups(familyId);

  const memberNames = useMemo(
    () =>
      Object.fromEntries((members ?? []).map((m) => [m.userId, m.displayName])),
    [members],
  );

  const memberPhotos = useMemo(
    () =>
      Object.fromEntries(
        (members ?? []).map((m) => [m.userId, m.photoUrl ?? null]),
      ),
    [members],
  );

  const choreNameMap = useMemo(() => {
    const map: Record<string, { name: string; description: string }> = {};
    for (const group of groups ?? []) {
      for (const chore of group.chores) {
        map[chore.choreId] = {
          name: chore.name,
          description: chore.description,
        };
      }
    }
    return map;
  }, [groups]);

  const weekId = useMemo(() => dateToWeekId(new Date()), []);
  const { data: weekDoc } = useWeeklyChoreDoc(familyId, weekId, memberNames);

  const choresDueDate = useMemo(() => {
    const monday = weekIdToStartDate(weekId);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    return saturday;
  }, [weekId]);

  const isOverdue = new Date().getDay() === 0; // Sunday = still current week but past due

  const children = (members ?? []).filter((m) => m.role === "child");

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-4xl font-semibold text-foreground tracking-tight">
          Good {getTimeOfDay()}, {user?.displayName.split(" ")[0]}
        </h1>
        <p className="text-base text-muted-foreground">
          {format(today, "EEEE, MMMM d")}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:items-start pb-12 md:pb-0">
        {/* ── Left column ─────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-8">
          {/* Meals */}
          <section>
            <div className="space-y-3">
              <ParentTodayMealCard
                familyId={familyId}
                userId={user?.uid ?? ""}
                userName={user?.displayName ?? ""}
                meal={mealByDate[format(days[displayIndex], "yyyy-MM-dd")]}
                date={format(days[displayIndex], "yyyy-MM-dd")}
                hasPrev={displayIndex > 0}
                hasNext={displayIndex < days.length - 1}
                onPrev={() => setSelectedIndex((i) => Math.max(0, i - 1))}
                onNext={() =>
                  setSelectedIndex((i) => Math.min(days.length - 1, i + 1))
                }
              />
            </div>
          </section>

          {/* Grocery */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  Shopping
                </h2>
              </div>
              <Link
                to="/grocery"
                className="text-sm text-primary hover:underline underline-offset-4 transition-colors"
              >
                All lists
              </Link>
            </div>

            {stores && stores.length > 0 ? (
              <GroceryStoreList stores={stores} familyId={familyId} />
            ) : (
              <EmptyState
                image={groceryIllustration}
                imageAlt="Grocery illustration"
                aspectRatio="4/3"
                message="No stores set up yet"
                buttonLabel="Set up grocery"
                buttonRoute="/grocery"
              />
            )}
          </section>
        </div>

        {/* ── Right column — Chores ────────────────────────── */}
        <div className="w-full lg:w-72 lg:shrink-0 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground mb-0">
                Chores
              </h2>
              <Link
                to="/chores"
                className="text-sm text-primary hover:underline underline-offset-4 transition-colors"
              >
                Details
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Due {format(choresDueDate, "EEEE, MMM d")}
              {isOverdue && (
                <span className="text-destructive font-medium"> · Overdue</span>
              )}
            </p>
          </div>
          {groups !== undefined && children.length === 0 ? (
            <EmptyState
              image={choresIllustration}
              imageAlt="Chores illustration"
              aspectRatio="4/3"
              message="No children in the family yet"
              buttonLabel="Manage chores"
              buttonRoute="/chores"
            />
          ) : (
            <div className="space-y-3">
              {children.map((child) => (
                <ChildChoreCard
                  key={child.userId}
                  member={child}
                  weekDoc={weekDoc ?? null}
                  isOverdue={isOverdue}
                  sheetContext={{
                    familyId,
                    weekId,
                    isParent: user?.role === "parent",
                    currentUserId: user?.uid ?? "",
                    choreNameMap,
                    memberNames,
                    memberPhotos,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
