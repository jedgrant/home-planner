import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  ShoppingCart,
  UtensilsCrossed,
  Settings,
} from 'lucide-react'
import { useAuthStore } from '@/shared/lib/authStore'

const parentNavItems = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/chores', label: 'Chores', icon: CheckSquare },
  { to: '/grocery', label: 'Grocery', icon: ShoppingCart },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed, end: true as const },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const childNavItems = [
  { to: '/child-dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/chores', label: 'Chores', icon: CheckSquare },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed, end: true as const },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const { user } = useAuthStore()
  const items = user?.role === 'child' ? childNavItems : parentNavItems

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex h-16 bg-sidebar border-t border-sidebar-border"
      aria-label="Main navigation"
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
              isActive
                ? 'text-primary font-medium'
                : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'
            }`
          }
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
