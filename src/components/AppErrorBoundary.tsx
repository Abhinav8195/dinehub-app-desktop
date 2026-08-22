import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BRAND } from '@/constants/brand'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Prevents a blank white window when a route throws after login. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[DiningHub] UI crash', error, info.componentStack)
  }

  private reload = () => {
    this.setState({ error: null })
    window.location.hash = '#/app'
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {BRAND.name} hit an unexpected error after sign-in. Reload to continue — your session is kept.
            </p>
            <p className="rounded-md bg-muted p-2 font-mono text-[11px] text-muted-foreground break-all">
              {this.state.error.message || 'Unknown render error'}
            </p>
            <Button type="button" onClick={this.reload}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reload workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
}
