import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/shared/lib/authStore'
import { AppLogo } from '@/shared/components/AppLogo'

export function MobileHeader() {
  const { user } = useAuthStore()

  return (
    <header className="md:hidden shrink-0 z-40 border-b border-sidebar-border bg-sidebar pt-safe">
      <div className="flex h-14 items-center justify-between px-4 pb-1.5">
      {/* App name */}
      <NavLink
        to="/dashboard"
        className="flex items-center"
        aria-label="Haven home"
      >
        <AppLogo iconSize="h-5 w-5" textSize="text-lg" />
      </NavLink>

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
  )
}
