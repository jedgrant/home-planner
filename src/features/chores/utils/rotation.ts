import type { ChoreGroup } from '@/shared/types/chores'

export interface RotationEntry {
  weekId: string
  weekStartDate: string
  assigneeId: string
  assigneeName: string
}

/**
 * Parses a weekId string like "2026-W17" into a zero-based week number since epoch.
 * Uses ISO 8601 week numbering where week 1 contains the first Thursday.
 */
function weekIdToAbsoluteWeek(weekId: string): number {
  const [yearStr, weekStr] = weekId.split('-W')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekStr, 10)
  return year * 53 + week
}

/**
 * Returns the ISO week start date (Monday) for a weekId like "2026-W17".
 */
export function weekIdToStartDate(weekId: string): Date {
  const [yearStr, weekStr] = weekId.split('-W')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekStr, 10)
  // Jan 4 is always in week 1 (ISO 8601)
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = (jan4.getDay() + 6) % 7 // Mon=0
  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - dayOfWeek)
  const result = new Date(week1Monday)
  result.setDate(week1Monday.getDate() + (week - 1) * 7)
  return result
}

/**
 * Converts a Date into an ISO week ID like "2026-W17".
 */
export function dateToWeekId(date: Date): string {
  const d = new Date(date)
  // Set to nearest Thursday to determine the year
  d.setDate(d.getDate() + 4 - ((d.getDay() + 6) % 7))
  const year = d.getFullYear()
  const jan1 = new Date(year, 0, 1)
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/**
 * Returns the current assignee ID for a rotation group on the given week.
 * Returns empty string if the group is not a rotation group or pool is empty.
 */
export function getCurrentAssignee(group: ChoreGroup, weekId: string): string {
  if (group.assignmentType !== 'rotation') return ''
  if (group.rotationPool.length === 0) return ''
  if (!group.rotationStartDate) return group.rotationPool[0]

  const startWeekId = dateToWeekId(new Date(group.rotationStartDate))
  const startAbs = weekIdToAbsoluteWeek(startWeekId)
  const currentAbs = weekIdToAbsoluteWeek(weekId)

  const weeksElapsed = currentAbs - startAbs
  const duration = group.rotationDurationWeeks > 0 ? group.rotationDurationWeeks : 1
  const poolSize = group.rotationPool.length

  // Each member stays for `duration` weeks; cycle through pool
  const totalSlots = weeksElapsed / duration
  const index = ((Math.floor(totalSlots) % poolSize) + poolSize) % poolSize

  return group.rotationPool[index]
}

/**
 * Returns a schedule of upcoming rotation assignments.
 * memberNames keyed by userId for display.
 */
export function getRotationSchedule(
  group: ChoreGroup,
  weeksAhead: number,
  memberNames: Record<string, string>,
  fromWeekId?: string,
): RotationEntry[] {
  if (group.assignmentType !== 'rotation' || group.rotationPool.length === 0) {
    return []
  }

  const startWeekId = fromWeekId ?? dateToWeekId(new Date())
  const entries: RotationEntry[] = []

  for (let i = 0; i < weeksAhead; i++) {
    const weekStart = weekIdToStartDate(startWeekId)
    weekStart.setDate(weekStart.getDate() + i * 7)
    const weekId = dateToWeekId(weekStart)
    const assigneeId = getCurrentAssignee(group, weekId)
    const assigneeName = memberNames[assigneeId] ?? assigneeId

    entries.push({
      weekId,
      weekStartDate: weekStart.toISOString().slice(0, 10),
      assigneeId,
      assigneeName,
    })
  }

  return entries
}
