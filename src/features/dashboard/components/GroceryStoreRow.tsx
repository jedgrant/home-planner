import { Link } from 'react-router-dom'
import { ShoppingCart, ChevronRight } from 'lucide-react'
import type { Store } from '@/shared/types/grocery'

interface GroceryStoreRowProps {
  store: Store
  count: number
}

export function GroceryStoreRow({ store, count }: GroceryStoreRowProps) {
  const shouldShow = store.needsPurchased || count > 3
  if (!shouldShow) return null

  return (
    <Link
      to={`/grocery/${store.storeId}`}
      className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <ShoppingCart className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-base font-medium text-foreground">{store.name}</p>
          <p className="text-sm text-muted-foreground">{count} items needed</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  )
}
