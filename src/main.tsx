import { useState, useEffect, StrictMode } from 'react'
import { SplashScreen } from '@/components/brand/SplashScreen'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { store } from '@/store'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/providers/AuthProvider'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { UpdateNotifier } from '@/components/updates/UpdateNotifier'
import App from './App'
import { UnsupportedEnvironment } from '@/components/UnsupportedEnvironment'
import './index.css'
import { installBrowserBridge } from '@/platform/browserBridge'

installBrowserBridge()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Soft navigation must always refresh — a 5-minute stale cache made pages
      // (Inventory, etc.) look empty until a hard refresh.
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
})

function applyDocumentTheme() {
  const forceLight = document.documentElement.dataset.forceLight === '1'
  const darkMode = !forceLight && store.getState().app.darkMode
  document.documentElement.classList.toggle('dark', darkMode)
}

function ThemeInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyDocumentTheme()
    const unsubscribe = store.subscribe(() => applyDocumentTheme())
    return unsubscribe
  }, [])
  return <>{children}</>
}

function AppBootstrap({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  if (showSplash) return <SplashScreen />
  return <>{children}</>
}

const application = window.electronAPI ? (
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <ThemeInitializer>
              <AppErrorBoundary>
                <AppBootstrap>
                  <UpdateNotifier />
                  <App />
                  <Toaster position="top-right" richColors closeButton />
                </AppBootstrap>
              </AppErrorBoundary>
            </ThemeInitializer>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
) : <UnsupportedEnvironment />

createRoot(document.getElementById('root')!).render(application)
