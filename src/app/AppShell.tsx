import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { SectionErrorBoundary } from './SectionErrorBoundary'
import {
  LayoutDashboard,
  CheckSquare,
  ShoppingCart,
  UtensilsCrossed,
  BookOpen,
  Settings,
  LogOut,
  House,
} from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '@/shared/lib/firebase'
import { useAuthStore } from '@/shared/lib/authStore'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chores', label: 'Chores', icon: CheckSquare },
  { to: '/grocery', label: 'Grocery list', icon: ShoppingCart },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed, end: true },
  { to: '/meals/recipes', label: 'Recipes', icon: BookOpen },
]

export function AppShell() {
  const { user } = useAuthStore()
  const { pathname } = useLocation()

  const handleSignOut = () => signOut(auth)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <NavLink
            to="/home"
            className="flex items-center gap-2 text-xl font-semibold text-primary transition-opacity hover:opacity-70"
          >
            <House className="h-5 w-5 shrink-0" />
            Haven
          </NavLink>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
              }`
            }
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </NavLink>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>

          {user && (
            <NavLink
              to={`/profile/${user.uid}`}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-sidebar-foreground transition-colors"
            >
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium shrink-0">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{user.displayName}</span>
            </NavLink>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <SectionErrorBoundary resetKey={pathname}>
          <Outlet />
        </SectionErrorBoundary>
      </main>
    </div>
  )
}
