import type { Timestamp } from 'firebase/firestore'

export interface Store {
  storeId: string
  familyId: string
  name: string
  notes: string
  archived: boolean
  needsPurchased: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface GroceryItem {
  itemId: string
  familyId: string
  storeId: string
  name: string
  quantity: string
  note: string
  addedBy: string
  addedAt: Timestamp
  completed: boolean
  completedAt: Timestamp | null
  completedBy: string | null
}

export interface QuickPickItem {
  itemId: string
  familyId: string
  storeId: string
  name: string
  defaultQuantity: string
  defaultNote: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PurchasePattern {
  itemName: string
  storeId: string
  storeName: string
  typicalQuantity: string
  avgDaysBetweenPurchases: number
  lastPurchasedAt: Timestamp
  purchaseCount: number
}

export interface PurchasePatternsAggregate {
  /** keyed by normalized item name (lowercase, trimmed) */
  patterns: Record<string, PurchasePattern>
  updatedAt: Timestamp
}
