import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Provider } from 'react-redux'
import { store } from './redux/store.ts'
import { ThemeProvider } from './theme/ThemeProvider.tsx'
import { ToastProvider } from './components/shared/ToastBar.tsx'
import { CspNonceProvider } from './providers/CspNonceProvider.tsx'
import ErrorBoundary from './components/common/ErrorBoundary.tsx'

/**
 * SPA bootstrap entry point.
 *
 * Mounts the React tree into `#root` (see `index.html`) and establishes the
 * app-wide provider order. Order is deliberate, outermost first:
 *  1. `StrictMode` — surfaces unsafe lifecycle/effect usage in dev.
 *  2. `ErrorBoundary` — outermost so it can catch render errors thrown by
 *     any provider or component beneath it, including theme/store setup.
 *  3. `CspNonceProvider` — must wrap `ThemeProvider` so the Emotion cache it
 *     creates (with the CSP nonce applied) is in place before MUI's
 *     `ThemeProvider`/`CssBaseline` inject any style tags.
 *  4. `ThemeProvider` — supplies the MUI theme/CssBaseline to everything
 *     below, including Redux-connected components and toasts.
 *  5. `Provider` (Redux) — store is available to all page/feature components.
 *  6. `ToastProvider` — user-visible notifications, nested last so toasts can
 *     read theme + store context if ever needed.
 *  7. `App` — renders the route tree (see `routes/AppRouter.tsx`).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary showDetails={true}>
      <CspNonceProvider>
        <ThemeProvider>
          <Provider store={store}>
            <ToastProvider>
              <App />
            </ToastProvider>
          </Provider>
        </ThemeProvider>
      </CspNonceProvider>
    </ErrorBoundary>
  </StrictMode>,
)
