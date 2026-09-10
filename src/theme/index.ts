import { createTheme, alpha } from "@mui/material/styles";
import type { ThemeOptions } from "@mui/material/styles";

/**
 * MUI theme configuration (light mode only — see `theme/ThemeProvider.tsx`
 * for why dark mode isn't wired up).
 *
 * Structure:
 *  - `colors` — the app's palette (primary/secondary/status colors), reused
 *    for both semantic MUI palette slots and any place a raw brand color is
 *    needed.
 *  - `baseTheme` — typography scale, shape/border-radius defaults, and
 *    per-component `styleOverrides` (buttons, cards, tabs, etc.) shared
 *    regardless of palette.
 *  - `lightTheme` — the actual theme MUI consumes, combining `baseTheme`
 *    with the light-mode palette, background/text colors, and an explicit
 *    elevation `shadows` array.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

// Custom color palette
// Primary/secondary intentionally use black/dark-gray for a neutral, high-
// contrast brand look; success/warning/error/info follow common semantic
// conventions (green/amber/red/blue) so status colors read consistently
// with user expectations across the app.
const colors = {
  primary: {
    main: "#000000", // Black
    light: "#424242",
    dark: "#000000",
    contrastText: "#FFFFFF",
  },
  secondary: {
    main: "#333333", // Dark Gray
    light: "#666666",
    dark: "#000000",
    contrastText: "#FFFFFF",
  },
  success: {
    main: "#10B981", // Emerald
    light: "#34D399",
    dark: "#059669",
    contrastText: "#FFFFFF",
  },
  warning: {
    main: "#F59E0B", // Amber
    light: "#FCD34D",
    dark: "#D97706",
    contrastText: "#000000",
  },
  error: {
    main: "#EF4444", // Red
    light: "#F87171",
    dark: "#DC2626",
    contrastText: "#FFFFFF",
  },
  info: {
    main: "#3B82F6", // Blue
    light: "#60A5FA",
    dark: "#2563EB",
    contrastText: "#FFFFFF",
  },
};

// Base theme configuration
// Palette-independent options (typography, shape, component style overrides)
// spread into both light theme today and any future dark theme.
const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: "1.75rem",
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: "1.125rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
    },
  },
  shape: {
    borderRadius: 5,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none",
          fontWeight: 600,
          padding: "5px 16px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          },
        },
        contained: {
          "&:hover": {
            boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          backgroundColor: '#ececf0',
          borderRadius: '14px',
          minHeight: 36,
          padding: '3px',
        },
        flexContainer: {
          height: '100%',
        },
        indicator: {
          display: 'none',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 30,
          fontSize: '0.875rem',
          textTransform: 'none',
          fontWeight: 500,
          color: '#717182',
          borderRadius: '12px',
          border: '1px solid transparent',
          outline: 'none',
          gap: '8px',
          '&:focus, &:focus-visible': {
            outline: 'none',
          },
          '&.Mui-focusVisible': {
            outline: 'none',
            boxShadow: 'none',
            backgroundColor: 'transparent',
          },
          '&.Mui-selected': {
            backgroundColor: '#ffffff',
            color: '#030213',
            border: '1px solid rgba(0,0,0,0.1)',
          },
        },
      },
    },
  },
};

// Light theme
// The theme actually consumed by ThemeProvider — merges baseTheme with the
// light-mode palette/background/text/divider/grey scale and a custom
// elevation `shadows` array (24 entries, index 0 = "none" through MUI's
// standard shadow depth, per MUI's Theme.shadows contract).
export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: "light",
    ...colors,
    background: {
      default: "#FFFFFF",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#000000",
      secondary: "#333333",
    },
    divider: alpha("#000000", 0.12),
    grey: {
      50: "#FAFAFA",
      100: "#F5F5F5",
      200: "#EEEEEE",
      300: "#E0E0E0",
      400: "#BDBDBD",
      500: "#9E9E9E",
      600: "#757575",
      700: "#616161",
      800: "#424242",
      900: "#212121",
    },
  },
  shadows: [
    "none",
    "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
    "0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)",
    "0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)",
    "0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)",
    "0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22)",
    "0 2px 8px rgba(0,0,0,0.1)",
    "0 4px 16px rgba(0,0,0,0.1)",
    "0 8px 24px rgba(0,0,0,0.12)",
    "0 16px 32px rgba(0,0,0,0.14)",
    "0 24px 48px rgba(0,0,0,0.16)",
    "0 32px 64px rgba(0,0,0,0.18)",
    "0 2px 4px rgba(0,0,0,0.06)",
    "0 4px 8px rgba(0,0,0,0.08)",
    "0 8px 16px rgba(0,0,0,0.1)",
    "0 16px 24px rgba(0,0,0,0.12)",
    "0 20px 32px rgba(0,0,0,0.14)",
    "0 24px 40px rgba(0,0,0,0.16)",
    "0 28px 48px rgba(0,0,0,0.18)",
    "0 32px 56px rgba(0,0,0,0.2)",
    "0 36px 64px rgba(0,0,0,0.22)",
    "0 40px 72px rgba(0,0,0,0.24)",
    "0 44px 80px rgba(0,0,0,0.26)",
    "0 48px 88px rgba(0,0,0,0.28)",
    "0 52px 96px rgba(0,0,0,0.3)",
  ],
});

// Theme context type (simplified - no dark mode)
// Intentionally empty: `ThemeProvider`'s context currently exposes no
// values, but the type/context plumbing is kept as an extension point for
// a future dark-mode toggle (see theme/ThemeProvider.tsx).
export interface ThemeContextType {
  // Removed dark mode properties since we only use light theme
}

// Export default theme (light only)
export default lightTheme;