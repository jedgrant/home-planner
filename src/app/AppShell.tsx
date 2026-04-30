import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { SectionErrorBoundary } from "./SectionErrorBoundary";
import {
  LayoutDashboard,
  CheckSquare,
  ShoppingCart,
  UtensilsCrossed,
  BookOpen,
  LogOut,
  House,
  Users,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/shared/lib/firebase";
import { useAuthStore } from "@/shared/lib/authStore";
import illustrationChores from "@/assets/illustration-chores.png";
import illustrationGroceries from "@/assets/illustration-groceries.png";
import illustrationMeals from "@/assets/illustration-meal-prep.png";
import illustrationFamilyHug from "@/assets/illustration-family-hug-outdoors.jpg";
import { BottomNav } from "./BottomNav";
import { MobileHeader } from "./MobileHeader";
import { UpdatePrompt } from "./UpdatePrompt";

const ROUTE_ILLUSTRATIONS: { prefix: string; src: string }[] = [
  { prefix: "/chores", src: illustrationChores },
  { prefix: "/grocery", src: illustrationGroceries },
  { prefix: "/meals", src: illustrationMeals },
];

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chores", label: "Chores", icon: CheckSquare },
  { to: "/grocery", label: "Grocery list", icon: ShoppingCart },
  { to: "/meals", label: "Meals", icon: UtensilsCrossed, end: true },
  { to: "/recipes", label: "Recipes", icon: BookOpen },
];

export function AppShell() {
  const { user } = useAuthStore();
  const { pathname } = useLocation();

  const handleSignOut = () => signOut(auth);

  const illustration = ROUTE_ILLUSTRATIONS.find(({ prefix }) =>
    pathname.startsWith(prefix),
  )?.src;

  return (
    <div className="flex h-dvh flex-col md:flex-row bg-background">
      {/* Mobile top header — sits outside main so it never scrolls */}
      <MobileHeader />
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-sidebar">
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
        <nav className="flex-none space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Illustration — fills space between nav and footer */}
        <div
          className="flex-1 min-h-0 opacity-50"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${illustrationFamilyHug})`,
            backgroundSize: "cover",
            backgroundPosition: "center calc(50%)",
            backgroundRepeat: "no-repeat",
            maskImage: "linear-gradient(to top, black 55%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to top, black 55%, transparent 100%)",
          }}
        />

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60"
              }`
            }
          >
            <Users className="h-4 w-4 shrink-0" />
            Family
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
              {user.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.displayName}
                  className="h-6 w-6 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium shrink-0">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="truncate">{user.displayName}</span>
            </NavLink>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-0 overflow-auto [scrollbar-gutter:stable] relative flex flex-col pt-header-safe md:pt-0 pb-nav-safe md:pb-0 bg-background">
        {illustration && (
          <motion.img
            key={illustration}
            src={illustration}
            aria-hidden="true"
            className="pointer-events-none fixed bottom-16 md:hidden left-1/2 -translate-x-1/2 md:bottom-0 md:left-auto md:translate-x-0 md:right-0 w-[90vw] md:w-125 md:max-w-[40vw] select-none z-0 opacity-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        )}
        <motion.div
          key={pathname}
          className="relative z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <SectionErrorBoundary resetKey={pathname}>
            <Outlet />
          </SectionErrorBoundary>
        </motion.div>
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav />

      {/* PWA update prompt */}
      <UpdatePrompt />
    </div>
  );
}
