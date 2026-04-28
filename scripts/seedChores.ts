/**
 * Seed script — Generates Grant family chore data in Firestore Emulator.
 *
 * Run with:
 *   npx tsx scripts/seedChores.ts
 *
 * Requires emulators to be running on the configured ports.
 */
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore'

// ─── Emulator config ──────────────────────────────────────────────────────────

const app = initializeApp({
  apiKey: 'fake',
  authDomain: 'localhost',
  projectId: 'home-manager-dev',
})

const db = getFirestore(app)
connectFirestoreEmulator(db, 'localhost', 18080)

// ─── Grant family data ────────────────────────────────────────────────────────

const FAMILY_ID = 'grant-family'

const MEMBERS = [
  { userId: 'jed-001', displayName: 'Jed', role: 'parent' as const },
  { userId: 'brittany-001', displayName: 'Brittany', role: 'parent' as const },
  { userId: 'brook-001', displayName: 'Brook', role: 'child' as const },
  { userId: 'nate-001', displayName: 'Nate', role: 'child' as const },
  { userId: 'ty-001', displayName: 'Ty', role: 'child' as const },
  { userId: 'spence-001', displayName: 'Spence', role: 'child' as const },
]

// ─── Week ID helpers ──────────────────────────────────────────────────────────

function dateToWeekId(date: Date): string {
  const d = new Date(date)
  d.setDate(d.getDate() + 4 - ((d.getDay() + 6) % 7))
  const year = d.getFullYear()
  const jan1 = new Date(year, 0, 1)
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function weekIdToStartDate(weekId: string): Date {
  const [yearStr, weekStr] = weekId.split('-W')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekStr, 10)
  const jan4 = new Date(year, 0, 4)
  const dayOfWeek = (jan4.getDay() + 6) % 7
  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - dayOfWeek)
  const result = new Date(week1Monday)
  result.setDate(week1Monday.getDate() + (week - 1) * 7)
  return result
}

function addWeeksToDate(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

// ─── Chore group definitions ──────────────────────────────────────────────────

const KIDS = ['brook-001', 'nate-001', 'ty-001', 'spence-001']

interface ChoreGroupDef {
  groupId: string
  name: string
  description: string
  assignmentType: 'fixed' | 'rotation'
  fixedAssignees: string[]
  rotationPool: string[]
  rotationDurationWeeks: number
  rotationStartDate: string | null
  chores: Array<{ choreId: string; name: string; description: string }>
}

const now = new Date()
const rotationStart = addWeeksToDate(now, -12)

const GROUPS: ChoreGroupDef[] = [
  {
    groupId: 'group-kitchen',
    name: 'Kitchen',
    description: 'Daily kitchen duties',
    assignmentType: 'rotation',
    fixedAssignees: [],
    rotationPool: KIDS,
    rotationDurationWeeks: 1,
    rotationStartDate: rotationStart.toISOString().slice(0, 10),
    chores: [
      { choreId: 'c-dishes', name: 'Dishes', description: 'Load/unload dishwasher' },
      { choreId: 'c-counters', name: 'Wipe counters', description: 'Wipe all kitchen surfaces' },
      { choreId: 'c-sweep-kitchen', name: 'Sweep', description: 'Sweep kitchen floor' },
    ],
  },
  {
    groupId: 'group-living',
    name: 'Living Room',
    description: 'Weekly living room tidy',
    assignmentType: 'rotation',
    fixedAssignees: [],
    rotationPool: KIDS,
    rotationDurationWeeks: 1,
    rotationStartDate: addWeeksToDate(rotationStart, 1).toISOString().slice(0, 10),
    chores: [
      { choreId: 'c-vacuum', name: 'Vacuum', description: 'Vacuum all rugs and carpet' },
      { choreId: 'c-tidy', name: 'Tidy up', description: 'Put away items, fluff pillows' },
    ],
  },
  {
    groupId: 'group-yard',
    name: 'Yard & Trash',
    description: 'Outdoor and trash duties — parents',
    assignmentType: 'fixed',
    fixedAssignees: ['jed-001', 'brittany-001'],
    rotationPool: [],
    rotationDurationWeeks: 1,
    rotationStartDate: null,
    chores: [
      { choreId: 'c-trash', name: 'Take out trash', description: 'All bins to curb by Monday' },
      { choreId: 'c-lawn', name: 'Mow lawn', description: 'Front and back yard' },
    ],
  },
]

// ─── Weekly doc helpers ───────────────────────────────────────────────────────

type ChoreStatus = 'pending' | 'submitted' | 'complete' | 'needs_resubmission'

function getRotationAssignee(group: ChoreGroupDef, weekId: string): string {
  if (group.assignmentType !== 'rotation' || group.rotationPool.length === 0) return ''
  if (!group.rotationStartDate) return group.rotationPool[0]

  const startWeekAbs =
    parseInt(group.rotationStartDate.slice(0, 4)) * 53 + parseInt(group.rotationStartDate.slice(6, 8))
  const [wy, ww] = weekId.split('-W').map(Number)
  const currentAbs = wy * 53 + ww
  const weeksElapsed = currentAbs - startWeekAbs
  const duration = group.rotationDurationWeeks > 0 ? group.rotationDurationWeeks : 1
  const idx =
    (((Math.floor(weeksElapsed / duration) % group.rotationPool.length) +
      group.rotationPool.length) %
      group.rotationPool.length)
  return group.rotationPool[idx]
}

function buildWeekDoc(
  weekId: string,
  weekStartDate: string,
  statusOverrides?: Record<string, Record<string, ChoreStatus>>,
) {
  const assignments: Record<string, unknown> = {}

  for (const group of GROUPS) {
    let assigneeId: string
    if (group.assignmentType === 'fixed') {
      assigneeId = group.fixedAssignees[0]
    } else {
      assigneeId = getRotationAssignee(group, weekId)
    }
    const assigneeName =
      MEMBERS.find((m) => m.userId === assigneeId)?.displayName ?? assigneeId

    const chores: Record<string, unknown> = {}
    for (const chore of group.chores) {
      const status: ChoreStatus =
        statusOverrides?.[group.groupId]?.[chore.choreId] ?? 'complete'

      const isComplete = status === 'complete'
      const isSubmitted = status === 'submitted' || isComplete

      const weekStart = new Date(weekStartDate)

      chores[chore.choreId] = {
        status,
        submittedAt: isSubmitted
          ? Timestamp.fromDate(new Date(weekStart.getTime() + 2 * 86400000))
          : null,
        submittedBy: isSubmitted ? assigneeId : null,
        mediaUrl: null,
        verifiedAt: isComplete
          ? Timestamp.fromDate(new Date(weekStart.getTime() + 3 * 86400000))
          : null,
        verifiedBy: isComplete ? 'jed-001' : null,
      }
    }

    assignments[group.groupId] = {
      assigneeId,
      assigneeName,
      groupName: group.name,
      chores,
    }
  }

  const weekStartTs = Timestamp.fromDate(new Date(weekStartDate))
  return {
    weekId,
    weekStartDate,
    assignments,
    createdAt: weekStartTs,
    updatedAt: weekStartTs,
  }
}

// ─── Main seed function ───────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding Grant family data to emulator...')

  // Write family doc
  await setDoc(doc(db, 'families', FAMILY_ID), {
    familyId: FAMILY_ID,
    name: 'The Grants',
    memberIds: MEMBERS.map((m) => m.userId),
    createdAt: Timestamp.fromDate(new Date('2026-01-01')),
    updatedAt: Timestamp.fromDate(new Date('2026-01-01')),
  })
  console.log('✓ Family doc')

  // Write user docs
  for (const member of MEMBERS) {
    await setDoc(doc(db, 'users', member.userId), {
      userId: member.userId,
      displayName: member.displayName,
      email: `${member.displayName.toLowerCase()}@grant.family`,
      photoUrl: null,
      familyId: FAMILY_ID,
      role: member.role,
      createdAt: Timestamp.fromDate(new Date('2026-01-01')),
      updatedAt: Timestamp.fromDate(new Date('2026-01-01')),
    })
  }
  console.log('✓ User docs')

  // Write chore groups
  for (const group of GROUPS) {
    const { groupId, ...fields } = group
    await setDoc(doc(db, `families/${FAMILY_ID}/choreGroups`, groupId), {
      ...fields,
      groupId,
      familyId: FAMILY_ID,
      archived: false,
      createdAt: Timestamp.fromDate(new Date('2026-01-01')),
      updatedAt: Timestamp.fromDate(new Date('2026-01-01')),
    })
  }
  console.log('✓ Chore groups')

  // Write 12 past weeks + current week with partial completions
  const today = new Date()

  for (let i = -12; i <= 0; i++) {
    const weekDate = addWeeksToDate(today, i)
    const weekId = dateToWeekId(weekDate)
    const weekStart = weekIdToStartDate(weekId)
    const weekStartStr = weekStart.toISOString().slice(0, 10)

    if (i === 0) {
      // Current week: partial completions
      const overrides: Record<string, Record<string, ChoreStatus>> = {
        'group-kitchen': {
          'c-dishes': 'complete',
          'c-counters': 'submitted',
          'c-sweep-kitchen': 'pending',
        },
        'group-living': {
          'c-vacuum': 'pending',
          'c-tidy': 'needs_resubmission',
        },
        'group-yard': {
          'c-trash': 'complete',
          'c-lawn': 'pending',
        },
      }
      const weekDoc = buildWeekDoc(weekId, weekStartStr, overrides)
      await setDoc(doc(db, `families/${FAMILY_ID}/weeklyChores`, weekId), weekDoc)
      console.log(`✓ Week ${weekId} (current — partial)`)
    } else {
      // Past weeks: all complete
      const weekDoc = buildWeekDoc(weekId, weekStartStr)
      await setDoc(doc(db, `families/${FAMILY_ID}/weeklyChores`, weekId), weekDoc)
      console.log(`✓ Week ${weekId}`)
    }
  }

  console.log('\nSeed complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
