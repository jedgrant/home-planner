import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Key this on the current route pathname so the boundary resets on navigation. */
  resetKey?: string
}

interface State {
  hasError: boolean
  error: Error | null
  resetKey: string | undefined
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, resetKey: props.resetKey }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  // Reset whenever the parent passes a new resetKey (i.e. navigation happened).
  static getDerivedStateFromProps(
    props: Props,
    state: State
  ): Partial<State> | null {
    if (props.resetKey !== state.resetKey) {
      return { hasError: false, error: null, resetKey: props.resetKey }
    }
    return null
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SectionErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  override render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 px-6 text-center">
        <div className="rounded-full bg-muted p-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m0 3.75h.007v.008H12V16.5zm9-3.75a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">
            This section ran into a problem
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Navigate to a different page or try again.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-3 max-w-md overflow-x-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
        </div>

        <button
          onClick={this.handleRetry}
          className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }
}
