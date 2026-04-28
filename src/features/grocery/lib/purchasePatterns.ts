import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/shared/lib/firebase'
import { aggregatePurchasePatterns } from '@/shared/lib/collections'
import type { PurchasePatternsAggregate, PurchasePattern } from '@/shared/types/grocery'

interface UpdatePurchasePatternInput {
  itemName: string
  storeId: string
  storeName: string
  quantity: string
  completedAt: Timestamp
}

/**
 * Updates the purchasePatterns aggregate document on item completion.
 * Recalculates avgDaysBetweenPurchases and lastPurchasedAt for the item.
 */
export async function updatePurchasePattern(
  familyId: string,
  input: UpdatePurchasePatternInput
): Promise<void> {
  const key = normalizeItemName(input.itemName)
  const aggRef = doc(db, aggregatePurchasePatterns(familyId))

  const snap = await getDoc(aggRef)
  const existing = snap.exists()
    ? (snap.data() as PurchasePatternsAggregate)
    : ({ patterns: {}, updatedAt: null } as Pick<PurchasePatternsAggregate, 'patterns'> & { updatedAt: null })

  const prev: PurchasePattern | undefined = (existing.patterns as Record<string, PurchasePattern>)[key]

  let newAvgDays: number
  let newPurchaseCount: number

  if (prev) {
    const prevMs = prev.lastPurchasedAt.toMillis()
    const nowMs = input.completedAt.toMillis()
    const daysSinceLast = Math.max(1, (nowMs - prevMs) / (1000 * 60 * 60 * 24))
    newPurchaseCount = prev.purchaseCount + 1
    // Rolling average: blend old average with new interval
    newAvgDays =
      prev.purchaseCount === 1
        ? daysSinceLast
        : (prev.avgDaysBetweenPurchases * (prev.purchaseCount - 1) + daysSinceLast) /
          (prev.purchaseCount)
  } else {
    newAvgDays = 0
    newPurchaseCount = 1
  }

  const updatedPattern: PurchasePattern = {
    itemName: input.itemName,
    storeId: input.storeId,
    storeName: input.storeName,
    typicalQuantity: input.quantity || (prev?.typicalQuantity ?? ''),
    avgDaysBetweenPurchases: Math.round(newAvgDays * 10) / 10,
    lastPurchasedAt: input.completedAt,
    purchaseCount: newPurchaseCount,
  }

  await setDoc(
    aggRef,
    {
      patterns: {
        ...existing.patterns,
        [key]: updatedPattern,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

function normalizeItemName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}
