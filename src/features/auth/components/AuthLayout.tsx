import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import familyHugImg from '@/assets/illustration-family-hug-outdoors.jpg'
import { AppLogo } from '@/shared/components/AppLogo'

interface AuthLayoutProps {
  children: ReactNode
}

/**
 * Shared layout for all unauthenticated pages (login, register, onboarding).
 * - Mobile: family-hug illustration as full-bleed background, content anchored to bottom.
 * - Desktop: plain bg-background, content centred vertically.
 * - App logo fixed at top centre on both breakpoints.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { pathname } = useLocation()

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      {/* Full-bleed background — mobile only */}
      <img
        src={familyHugImg}
        alt=""
        aria-hidden="true"
        className="md:hidden fixed inset-0 cover object-center"
      />

      {/* App logo — top centre on all breakpoints, below status bar */}
      <div className="fixed top-[calc(env(safe-area-inset-top)+2rem)] inset-x-0 z-20 flex flex-col items-center pointer-events-none">
        <AppLogo iconSize="h-12 w-12" textSize="text-5xl" direction="column" />
      </div>

      {/* Content slot — bottom on mobile, vertically centred on desktop */}
      <div className="relative z-10 h-full flex items-end justify-center px-4 pb-6 md:items-center md:py-12">
        <motion.div
          key={pathname}
          className="w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
