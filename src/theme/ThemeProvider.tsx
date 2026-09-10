import React, { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { lightTheme } from "./index";
import type { ThemeContextType } from "./index";

/**
 * App-wide MUI theme provider.
 *
 * Wraps the app in MUI's `ThemeProvider` (supplying `lightTheme` from
 * `./index.ts`) plus `CssBaseline` for a consistent style reset, and exposes
 * a (currently empty) React context via `useThemeContext` as an extension
 * point. The app intentionally ships light-mode only today — see
 * `ThemeContextType`/`contextValue` below — but the context plumbing is kept
 * in place so dark-mode/theme-switching can be added later without touching
 * every consumer of `useThemeContext`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Provides the MUI theme (and CSS baseline reset) to the component tree.
 *
 * @param children - Subtree to render under the theme/context.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Always use light theme - no dark mode functionality
  const theme = lightTheme;

  // Empty object since no theme switching — memoized so the context value's
  // identity stays stable across renders (avoids needlessly re-rendering
  // consumers that use this context in a dependency array).
  const contextValue = useMemo(() => ({}), []); // Empty object since no theme switching

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access the theme context.
 *
 * @throws {Error} If called outside of a `ThemeProvider` ancestor — guards
 *   against silently reading `undefined` context.
 * @returns The current (currently empty) `ThemeContextType` value.
 */
export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
};