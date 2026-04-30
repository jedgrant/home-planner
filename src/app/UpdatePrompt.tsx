import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

const COUNTDOWN_SECONDS = 5

/**
 * Shows a full-width banner when a new version is available.
 * Counts down 5 seconds, then reloads automatically.
 * The user can also tap the banner to reload immediately.
 */
export function UpdatePrompt() {
  const [countdown, setCountdown] = useState<number | null>(null)

  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      // Poll every 5 minutes so long-lived sessions pick up deploys quickly
      setInterval(() => {
        registration.update().catch(console.error)
      }, 5 * 60 * 1000)

      // Also check immediately when the user returns to the tab
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(console.error)
        }
      }
      document.addEventListener('visibilitychange', handleVisibility)
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    },
  })

  // When the new SW takes control, reload to apply it.
  // This is more reliable than relying on updateServiceWorker() alone,
  // which can silently succeed without triggering a navigation on desktop.
  useEffect(() => {
    const handleControllerChange = () => window.location.reload()
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
  }, [])

  // Start the countdown as soon as a refresh is available
  useEffect(() => {
    if (!needRefresh) return
    setCountdown(COUNTDOWN_SECONDS)
  }, [needRefresh])

  // Tick down each second; reload when it hits 0
  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      updateServiceWorker(true)
      return
    }
    const id = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown, updateServiceWorker])

  if (!needRefresh || countdown === null) return null

  return (
    <button
      type="button"
      onClick={() => updateServiceWorker(true)}
      className="fixed top-0 left-0 right-0 z-100 flex w-full items-center justify-center gap-2.5 bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-md transition-opacity hover:opacity-90 active:opacity-80"
      aria-live="assertive"
      aria-label="New version available — updating now"
    >
      <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />
      New version available — updating in {countdown}s
    </button>
  )
}
