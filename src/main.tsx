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
      // Soft-nav still refreshes when stale, but avoid hammering the API on every
      // focus/remount (was causing HTTP 429 "Too many requests" on POS).
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => {
        const status = (error as { statusCode?: number } | null)?.statusCode
        if (status === 429 || status === 401 || status === 403) return false
        return failureCount < 1
      },
      networkMode: 'always',
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      networkMode: 'always',
      retry: 0,
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
