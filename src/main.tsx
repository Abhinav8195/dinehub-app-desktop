import { useState, useEffect, StrictMode } from 'react'
import { SplashScreen } from '@/components/brand/SplashScreen'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { store } from '@/store'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/providers/AuthProvider'
import { OfflineBanner } from '@/components/common/OfflineBanner'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false }
  }
})

function ThemeInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const darkMode = store.getState().app.darkMode
    document.documentElement.classList.toggle('dark', darkMode)
    const unsubscribe = store.subscribe(() => {
      document.documentElement.classList.toggle('dark', store.getState().app.darkMode)
    })
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <ThemeInitializer>
              <AppBootstrap>
                <OfflineBanner />
                <App />
                <Toaster position="top-right" richColors closeButton />
              </AppBootstrap>
            </ThemeInitializer>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
)
