import { useState } from 'react'
import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import {
  LayoutDashboard,
  CheckSquare,
  ShoppingCart,
  UtensilsCrossed,
  BookOpen,
  Users,
  LogOut,
  ChevronRight,
  Settings,
  UserCircle,
} from 'lucide-react'
import { auth } from '@/shared/lib/firebase'
import { useAuthStore } from '@/shared/lib/authStore'
import { AppLogo } from '@/shared/components/AppLogo'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet'
import { Separator } from '@/shared/components/ui/separator'

const parentNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chores', label: 'Chores', icon: CheckSquare },
  { to: '/grocery', label: 'Grocery', icon: ShoppingCart },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed, end: true as const },
  { to: '/recipes', label: 'Recipes', icon: BookOpen },
]

const childNavItems = [
  { to: '/child-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chores', label: 'Chores', icon: CheckSquare },
  { to: '/meals', label: 'Meals', icon: UtensilsCrossed, end: true as const },
  { to: '/recipes', label: 'Recipes', icon: BookOpen },
]

export function MobileHeader() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navItems = user?.role === 'child' ? childNavItems : parentNavItems
  const isParent = user?.role === 'parent'

  function closeAndNavigate(to: string) {
    setDrawerOpen(false)
    navigate(to)
  }

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 border-b border-sidebar-border bg-sidebar pt-safe">
        <div className="flex h-14 items-center justify-between px-4 pb-1.5">
          {/* Logo — tapping opens the nav drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center"
            aria-label="Open navigation menu"
          >
            <AppLogo iconSize="h-5 w-5" textSize="text-lg" />
          </button>

          {/* Profile avatar */}
          {user && (
            <NavLink
              to={`/profile/${user.uid}`}
              aria-label={`${user.displayName}'s profile`}
              className="flex items-center"
            >
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.displayName}
                  className="h-7 w-7 rounded-full object-cover ring-2 ring-border"
                />
              ) : (
                <div
                  className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-medium ring-2 ring-border"
                  aria-hidden="true"
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </NavLink>
          )}
        </div>
      </header>

      {/* Navigation drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="px-4 py-4 border-b border-border">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AppLogo iconSize="h-5 w-5" textSize="text-lg" />
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="App navigation">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <React.Fragment key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-foreground hover:bg-muted'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
                {to === '/chores' && isParent && (
                  <NavLink
                    to="/chores/manage"
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg pl-10 pr-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <Settings className="h-3.5 w-3.5 shrink-0" />
                    Manage chores
                  </NavLink>
                )}
              </React.Fragment>
            ))}

            <Separator className="my-2" />

            {user && (
              <NavLink
                to={`/profile/${user.uid}`}
                onClick={() => setDrawerOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-foreground hover:bg-muted'
                  }`
                }
              >
                <UserCircle className="h-4 w-4 shrink-0" />
                Account
              </NavLink>
            )}

            {isParent && (
              <button
                onClick={() => closeAndNavigate('/settings')}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Users className="h-4 w-4 shrink-0" />
                Family settings
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </button>
            )}
          </nav>

          <div className="border-t border-border p-3">
            <button
              onClick={() => { setDrawerOpen(false); signOut(auth) }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
