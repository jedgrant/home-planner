import { House } from 'lucide-react'

interface AppLogoProps {
  /** Icon size class, e.g. "h-5 w-5". Defaults to "h-5 w-5". */
  iconSize?: string
  /** Text size class, e.g. "text-lg". Defaults to "text-lg". */
  textSize?: string
  /** Layout direction. Defaults to "row". */
  direction?: 'row' | 'column'
  className?: string
}

export function AppLogo({
  iconSize = 'h-5 w-5',
  textSize = 'text-lg',
  direction = 'row',
  className,
}: AppLogoProps) {
  return (
    <div
      className={[
        'flex items-center text-primary',
        direction === 'column' ? 'flex-col gap-0' : 'flex-row gap-1',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <House className={`${iconSize} shrink-0`} aria-hidden="true" />
      <h1 className={`${textSize} font-semibold tracking-tight`}>Haven</h1>
    </div>
  )
}
