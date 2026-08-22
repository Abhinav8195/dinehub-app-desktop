import { MonitorX } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function UnsupportedEnvironment() {
  return (
    <main className="min-h-screen grid place-items-center bg-muted/30 p-6">
      <Card className="max-w-lg">
        <CardHeader>
          <MonitorX className="h-10 w-10 text-primary mb-2" aria-hidden="true" />
          <CardTitle>DiningHub Desktop requires Electron</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>DiningHub Desktop must be launched through Electron.</p>
          <p>Run <code className="rounded bg-muted px-1.5 py-1 text-foreground">npm run dev</code> for development.</p>
        </CardContent>
      </Card>
    </main>
  )
}
