import AppRouter from "./routes/AppRouter";

/**
 * Root application component.
 *
 * Thin wrapper that mounts the SPA's route tree. All provider setup (Redux
 * store, MUI theme, CSP nonce, error boundary, toast context) happens above
 * this component in `main.tsx` — `App` itself owns no state and only exists
 * so `main.tsx` has a single component to render into the DOM root.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
function App() {
  return <AppRouter />;
}

export default App;

