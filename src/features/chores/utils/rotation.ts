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
 *
 * The family's choreRotationPool provides the ordered list of who rotates.
 * The anchor (rotationAnchorWeekId + rotationAnchorPoolIndex) records who
 * was assigned at a known week; the rotation advances one slot per duration
 * from there. Parents can rotate early, which resets the anchor.
 *
 * @param group         The chore group
 * @param weekId        Target week, e.g. "2026-W17"
 * @param pool          Ordered user IDs from the family's choreRotationPool
 * @param durationWeeks How many weeks each person holds (from family settings)
 */
export function getCurrentAssignee(
  group: ChoreGroup,
  weekId: string,
  pool: string[],
  durationWeeks: number,
): string {
  if (group.assignmentType !== 'rotation') return ''
  if (pool.length === 0) return ''

  const currentAbs = weekIdToAbsoluteWeek(weekId)
  const duration = durationWeeks > 0 ? durationWeeks : 1

  if (group.rotationAnchorWeekId != null && group.rotationAnchorPoolIndex != null) {
    const anchorAbs = weekIdToAbsoluteWeek(group.rotationAnchorWeekId)
    const weeksFromAnchor = currentAbs - anchorAbs
    const slot = Math.floor(weeksFromAnchor / duration)
    const index = ((group.rotationAnchorPoolIndex + slot) % pool.length + pool.length) % pool.length
    return pool[index]
  }

  // Fallback for groups without an anchor (legacy data)
  const EPOCH = '2020-W01'
  const epochAbs = weekIdToAbsoluteWeek(EPOCH)
  const weeksFromEpoch = currentAbs - epochAbs
  const index = ((weeksFromEpoch % pool.length) + pool.length) % pool.length
  return pool[index]
}

/**
 * Returns a schedule of upcoming rotation assignments.
 * memberNames keyed by userId for display.
 */
export function getRotationSchedule(
  group: ChoreGroup,
  weeksAhead: number,
  memberNames: Record<string, string>,
  pool: string[],
  durationWeeks: number,
  fromWeekId?: string,
): RotationEntry[] {
  if (group.assignmentType !== 'rotation' || pool.length === 0) {
    return []
  }

  const startWeekId = fromWeekId ?? dateToWeekId(new Date())
  const entries: RotationEntry[] = []

  for (let i = 0; i < weeksAhead; i++) {
    const weekStart = weekIdToStartDate(startWeekId)
    weekStart.setDate(weekStart.getDate() + i * 7)
    const weekId = dateToWeekId(weekStart)
    const assigneeId = getCurrentAssignee(group, weekId, pool, durationWeeks)
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
