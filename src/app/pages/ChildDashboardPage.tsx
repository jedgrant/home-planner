import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format, addDays, startOfDay } from 'date-fns'
import { ClipboardList, UtensilsCrossed, HandHelping } from 'lucide-react'
import { useAuthStore } from '@/shared/lib/authStore'
import { useMeals, useAssignMealTask } from '@/features/meals/hooks/useMeals'
import { useChoreGroups } from '@/features/chores/hooks/useChoreGroups'
import { useOpenChoreAssignments } from '@/features/chores/hooks/useChildChoreAssignments'
import { ChildChoreAssignmentCard } from '@/features/chores/components/ChildChoreAssignmentCard'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { Button } from '@/shared/components/ui/button'
import type { Meal, MealTask } from '@/shared/types/meals'

// ─── Meal task row — shows one task a child can volunteer for ─────────────────

interface MealTaskRowProps {
  meal: Meal
  recipeIndex: number
  task: MealTask
  taskIndex: number
  userId: string
  userName: string
  familyId: string
}

function MealTaskRow({ meal, recipeIndex, task, taskIndex, userId, userName, familyId }: MealTaskRowProps) {
  const assignMeal = useAssignMealTask(familyId)
  const isMe = task.assigneeId === userId
  const isClaimed = task.assigneeId !== null && !isMe

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{task.description}</p>
        {isClaimed && (
          <p className="text-xs text-muted-foreground">Claimed by {task.assigneeName}</p>
        )}
        {isMe && <p className="text-xs text-primary font-medium">You volunteered</p>}
      </div>
      {isMe ? (
        <Button
          size="sm"
          variant="ghost"
          aria-label="Remove volunteer"
          disabled={assignMeal.isPending}
          onClick={() => assignMeal.mutate({ meal, recipeIndex, taskIndex, assigneeId: null, assigneeName: null })}
        >
          Undo
        </Button>
      ) : !isClaimed ? (
        <Button
          size="sm"
          variant="outline"
          aria-label="Volunteer for this task"
          disabled={assignMeal.isPending}
          onClick={() => assignMeal.mutate({ meal, recipeIndex, taskIndex, assigneeId: userId, assigneeName: userName })}
        >
          <HandHelping className="h-3.5 w-3.5 mr-1.5" />
          Volunteer
        </Button>
      ) : null}
    </div>
  )
}

// ─── Per-meal card showing volunteerable tasks ────────────────────────────────

interface ChildMealCardProps {
  meal: Meal
  userId: string
  userName: string
  familyId: string
}

function ChildMealCard({ meal, userId, userName, familyId }: ChildMealCardProps) {
  const allTasks = meal.recipes.flatMap((r, ri) =>
    r.tasks.map((t, ti) => ({ recipe: r, recipeIndex: ri, task: t, taskIndex: ti })),
  )

  if (allTasks.length === 0) return null

  const isToday = meal.date === format(new Date(), 'yyyy-MM-dd')

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        isToday ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
            {format(new Date(meal.date + 'T00:00:00'), isToday ? "'Today'" : 'EEE, MMM d')}
          </p>
          <p className="text-base font-medium text-foreground">{meal.name}</p>
        </div>
        <Link
          to={`/meals/${meal.mealId}`}
          className="text-xs text-primary hover:underline underline-offset-4 shrink-0"
        >
          View meal
        </Link>
      </div>

      <div>
        {allTasks.map(({ recipe, recipeIndex, task, taskIndex }) => (
          <MealTaskRow
            key={`${recipe.recipeId}-${task.taskId}`}
            meal={meal}
            recipeIndex={recipeIndex}
            task={task}
            taskIndex={taskIndex}
            userId={userId}
            userName={userName}
            familyId={familyId}
          />
        ))}
      </div>
    </div>
  )
}

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

  const mealsWithTasks = useMemo(
    () => (meals ?? []).filter((m) => m.recipes.some((r) => r.tasks.length > 0)),
    [meals],
  )

  // Open chore assignments (current + prior incomplete weeks)
  const { openAssignments, isLoading: choresLoading } = useOpenChoreAssignments(familyId, userId)

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
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">
          Hey, {userName.split(' ')[0]}!
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          {format(today, 'EEEE, MMMM d')}
        </p>
      </div>

      {/* ── Chores ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">My chores</h2>
          </div>
          <Link to="/chores" className="text-sm text-primary hover:underline underline-offset-4">
            Full view
          </Link>
        </div>

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Upcoming meals</h2>
          </div>
          <Link to="/meals" className="text-sm text-primary hover:underline underline-offset-4">
            View planner
          </Link>
        </div>

        {mealsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : mealsWithTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No meals with tasks planned for the next 7 days.
          </p>
        ) : (
          <div className="space-y-3">
            {mealsWithTasks.map((meal) => (
              <ChildMealCard
                key={meal.mealId}
                meal={meal}
                userId={userId}
                userName={userName}
                familyId={familyId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
