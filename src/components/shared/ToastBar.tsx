import React, { createContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';
import type { AlertColor, SlideProps } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';

/** Options accepted by `showToast` to configure a single toast notification. */
export interface ToastOptions {
    message: string;
    severity?: AlertColor;
    duration?: number;
    position?: {
        vertical: 'top' | 'bottom';
        horizontal: 'left' | 'center' | 'right';
    };
}

/**
 * Shape of the value exposed via `ToastContext`. Consumed through the
 * project's `useToast()` hook (see `src/hooks/useToast`), which is how pages
 * are expected to trigger notifications per project convention.
 */
export interface ToastContextType {
    showSuccess: (message: string, duration?: number) => void;
    showError: (message: string, duration?: number) => void;
    showWarning: (message: string, duration?: number) => void;
    showInfo: (message: string, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Slide transition component
/** MUI `Slide` transition configured to slide down from the top, used by the Snackbar below. */
function SlideTransition(props: Readonly<SlideProps>) {
    return <Slide {...props} direction="down" />;
}

/**
 * Component: ToastProvider
 *
 * Purpose: Context provider that powers the app-wide toast/notification
 * system. Wraps the app (see provider tree in `src/main.tsx`) and renders a
 * single shared MUI `Snackbar`/`Alert`, exposing `showSuccess`/`showError`/
 * `showWarning`/`showInfo` helpers via `ToastContext` for the `useToast()` hook.
 *
 * Responsibilities:
 * - Hold the current toast's message/severity/duration/position in state.
 * - Provide convenience methods per severity that all funnel through `showToast`.
 * - Render one `Snackbar` + `Alert` for the whole app, so only one toast is
 *   visible at a time (a new toast replaces the previous one's content).
 * - Ignore `clickaway` dismissals so toasts don't disappear from an incidental click.
 *
 * Props:
 * - `children: ReactNode` — the app subtree that gains access to toast context.
 *
 * State:
 * - `open: boolean` — whether the Snackbar is currently visible.
 * - `toastConfig: ToastOptions` — the active toast's message/severity/duration/position.
 *
 * Contexts used: provides `ToastContext` (does not consume any).
 *
 * Business logic: the exposed context value is memoized (see `contextValue`
 * below) so consumers of `useToast()` don't re-render just because this
 * provider re-rendered for an unrelated reason.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const [toastConfig, setToastConfig] = useState<ToastOptions>({
        message: '',
        severity: 'info',
        duration: 4000,
        position: { vertical: 'top', horizontal: 'right' },
    });

    /**
     * Configures and opens the shared toast with the given options, applying
     * sensible defaults (info severity, 4s duration, top-right position) for
     * any fields the caller omits.
     * @param options - Toast content/appearance options.
     */
    const showToast = useCallback((options: ToastOptions) => {
        setToastConfig({
            message: options.message,
            severity: options.severity || 'info',
            duration: options.duration || 4000,
            position: options.position || { vertical: 'top', horizontal: 'right' },
        });
        setOpen(true);
    }, []);

    /**
     * Shows a success-styled toast.
     * @param message - Text to display.
     * @param duration - Auto-hide duration in ms (default 4000).
     */
    const showSuccess = useCallback(
        (message: string, duration = 4000) => {
            showToast({ message, severity: 'success', duration });
        },
        [showToast],
    );

    /**
     * Shows an error-styled toast.
     * @param message - Text to display.
     * @param duration - Auto-hide duration in ms (default 4000).
     */
    const showError = useCallback(
        (message: string, duration = 4000) => {
            showToast({ message, severity: 'error', duration });
        },
        [showToast],
    );

    /**
     * Shows a warning-styled toast.
     * @param message - Text to display.
     * @param duration - Auto-hide duration in ms (default 4000).
     */
    const showWarning = useCallback(
        (message: string, duration = 4000) => {
            showToast({ message, severity: 'warning', duration });
        },
        [showToast],
    );

    /**
     * Shows an info-styled toast.
     * @param message - Text to display.
     * @param duration - Auto-hide duration in ms (default 4000).
     */
    const showInfo = useCallback(
        (message: string, duration = 4000) => {
            showToast({ message, severity: 'info', duration });
        },
        [showToast],
    );

    /**
     * Closes the Snackbar, except when triggered by a "clickaway" (clicking
     * outside the toast) — that dismissal reason is intentionally ignored so
     * users don't lose a toast to an unrelated click elsewhere on the page.
     * @param _event - Native close event (unused).
     * @param reason - MUI-provided close reason, e.g. 'clickaway' or 'timeout'.
     */
    const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    };

    // Memoize the context value to prevent unnecessary re-renders
    // Recomputes only if one of the callback references changes (they're all
    // stable via useCallback, so in practice this rarely recalculates).
    const contextValue = useMemo(
        () => ({ showToast, showSuccess, showError, showWarning, showInfo }),
        [showToast, showSuccess, showError, showWarning, showInfo],
    );

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <Snackbar
                open={open}
                autoHideDuration={toastConfig.duration}
                onClose={handleClose}
                anchorOrigin={toastConfig.position}
                slots={{
                    transition: SlideTransition,
                }}
                sx={{
                    '& .MuiSnackbarContent-root': {
                        minWidth: '300px',
                    },
                }}
            >
                <Alert
                    onClose={handleClose}
                    severity={toastConfig.severity}
                    variant="filled"
                    elevation={6}
                    sx={{
                        minWidth: '300px',
                        borderRadius: 2,
                        fontWeight: 500,
                        alignItems: 'center',
                        boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.15)}`,
                        '& .MuiAlert-icon': {
                            fontSize: '1.5rem',
                        },
                        '& .MuiAlert-message': {
                            fontSize: '0.95rem',
                            py: 0.5,
                        },
                        '& .MuiAlert-action': {
                            paddingTop: 0,
                            paddingBottom: 0,
                        },
                    }}
                >
                    {toastConfig.message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
