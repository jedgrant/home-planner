import { useMemo, useState } from 'react'
import { format, addDays, startOfDay } from 'date-fns'
import { useAuthStore } from '@/shared/lib/authStore'
import { useMeals } from '@/features/meals/hooks/useMeals'
import { useChoreGroups } from '@/features/chores/hooks/useChoreGroups'
import { useOpenChoreAssignments } from '@/features/chores/hooks/useChildChoreAssignments'
import { ChildChoreAssignmentCard } from '@/features/chores/components/ChildChoreAssignmentCard'
import { dateToWeekId } from '@/features/chores/utils/rotation'
import { MealCard } from '@/features/dashboard/components/MealCard'
import { Skeleton } from '@/shared/components/ui/skeleton'

// ─── Child dashboard page ─────────────────────────────────────────────────────

export function ChildDashboardPage() {
  const { user } = useAuthStore()
  const familyId = user?.familyId ?? ''
  const userId = user?.uid ?? ''
  const userName = user?.displayName ?? ''

  // Upcoming meals — next 7 days
  const today = startOfDay(new Date())
  const startDate = format(today, 'yyyy-MM-dd')
  const endDate = format(addDays(today, 6), 'yyyy-MM-dd')
  const { data: meals, isLoading: mealsLoading } = useMeals(familyId, startDate, endDate)

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(today, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startDate],
  )

  const mealByDate = useMemo(() => {
    const map: Record<string, import('@/shared/types/meals').Meal> = {}
    for (const m of meals ?? []) map[m.date] = m
    return map
  }, [meals])

  const [selectedIndex, setSelectedIndex] = useState(0)
  const displayIndex = Math.max(0, Math.min(selectedIndex, days.length - 1))

  // Family members for avatar lookup — now fetched inside MealCard

  const currentWeekId = useMemo(() => dateToWeekId(new Date()), [])

  // Open chore assignments (current + prior incomplete weeks)
  const { openAssignments: allOpenAssignments, isLoading: choresLoading } = useOpenChoreAssignments(familyId, userId)
  const openAssignments = useMemo(
    () => allOpenAssignments.filter((oa) => oa.weekId === currentWeekId),
    [allOpenAssignments, currentWeekId],
  )

  // Chore groups for name lookup
  const { data: choreGroups } = useChoreGroups(familyId)

  const choreNameMapByGroup = useMemo(() => {
    const map: Record<string, Record<string, { name: string; description: string }>> = {}
    for (const group of choreGroups ?? []) {
      map[group.groupId] = Object.fromEntries(
        group.chores.map((c) => [c.choreId, { name: c.name, description: c.description }]),
      )
    }
    return map
  }, [choreGroups])

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
          Hey, {userName.split(' ')[0]}!
        </h1>
        <p className="text-base text-muted-foreground">
          {format(today, 'EEEE, MMMM d')}
        </p>
      </div>

      {/* ── Chores ─────────────────────────────────────────── */}
      <section>
        {choresLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : openAssignments.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">
              No pending or incomplete chore assignments.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {openAssignments.map((oa) => (
              <ChildChoreAssignmentCard
                key={`${oa.weekId}-${oa.groupId}`}
                familyId={familyId}
                userId={userId}
                openAssignment={oa}
                choreNameMap={choreNameMapByGroup[oa.groupId] ?? {}}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Meals ──────────────────────────────────────────── */}
      <section>
        {mealsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : (
          <MealCard
            familyId={familyId}
            userId={userId}
            userName={userName}
            meal={mealByDate[format(days[displayIndex], 'yyyy-MM-dd')]}
            date={format(days[displayIndex], 'yyyy-MM-dd')}
            hasPrev={displayIndex > 0}
            hasNext={displayIndex < days.length - 1}
            onPrev={() => setSelectedIndex((i) => Math.max(0, i - 1))}
            onNext={() => setSelectedIndex((i) => Math.min(days.length - 1, i + 1))}
          />
        )}
      </section>
    </div>
  )
}
