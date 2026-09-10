import { useState, useEffect } from 'react';
import { Box, Toolbar, useMediaQuery, useTheme, alpha } from '@mui/material';

import Header from '../shared/Header';
import Sidenav from '../shared/Sidenav';
import { useToast } from '../../hooks/useToast';

import type { ReactNode } from 'react';

const drawerWidth = 300;

/**
 * Component: Layout
 *
 * Purpose: Top-level authenticated app shell. Renders the `Sidenav` and
 * `Header` around the routed page content (`children`), handles the
 * responsive desktop/mobile drawer behavior, and bridges a global
 * `show-toast` DOM event (dispatched by the axios interceptor, e.g. on
 * permission errors) into the app's toast notification system.
 *
 * Responsibilities:
 * - Switch the sidenav between a permanent desktop drawer and a temporary
 *   (openable/closable) mobile drawer based on viewport width.
 * - Track and toggle the mobile drawer's open state.
 * - Listen for a global `show-toast` custom event and forward it to the
 *   appropriate `useToast()` method by severity, so non-component code
 *   (like the axios interceptor) can surface notifications without needing
 *   direct access to React context.
 * - Provide the scrollable main content area (with custom scrollbar styling)
 *   that hosts routed pages.
 *
 * Props:
 * - `children: ReactNode` — the routed page content rendered inside the shell.
 *
 * State:
 * - `mobileOpen: boolean` — whether the mobile (temporary) sidenav drawer is open.
 *
 * Custom hooks: `useToast()` for `showError`/`showSuccess`/`showInfo`/`showWarning`.
 *
 * Major child components rendered: `Sidenav`, `Header`, plus the `children` page content.
 *
 * Side effects: see the `show-toast` event listener `useEffect` below.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const Layout = ({ children }: { children: ReactNode }) => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const { showError, showSuccess, showInfo, showWarning } = useToast();

    // Global event listener for permission errors from axios interceptor
    // Bridges non-React code (e.g. the axios response interceptor, which has
    // no access to React context) into the toast system via a plain DOM
    // CustomEvent. Cleans up the listener on unmount to avoid duplicate
    // handlers/leaks; re-subscribes if any of the toast callbacks change identity.
    useEffect(() => {
        /**
         * Dispatches a global 'show-toast' CustomEvent to the matching
         * `useToast()` method based on its `severity` detail, defaulting to
         * an error toast for unrecognized severities.
         * @param event - The 'show-toast' CustomEvent, with `detail.message`/`detail.severity`.
         */
        const handleToastEvent = (event: Event) => {
            const customEvent = event as CustomEvent<{ message: string; severity: string }>;
            const { message, severity } = customEvent.detail;

            switch (severity) {
                case 'error':
                    showError(message);
                    break;
                case 'success':
                    showSuccess(message);
                    break;
                case 'info':
                    showInfo(message);
                    break;
                case 'warning':
                    showWarning(message);
                    break;
                default:
                    showError(message);
            }
        };

        globalThis.addEventListener('show-toast', handleToastEvent);

        return () => {
            globalThis.removeEventListener('show-toast', handleToastEvent);
        };
    }, [showError, showSuccess, showInfo, showWarning]);

    /** Toggles the mobile (temporary) sidenav drawer open/closed. */
    const handleToggleMenu = () => {
        setMobileOpen((prev) => !prev);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                minHeight: '100vh',
                width: '100%',
                maxWidth: '100vw',
                overflow: 'hidden',
                background:
                    theme.palette.mode === 'light'
                        ? `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.9)} 0%, ${alpha(
                              theme.palette.grey[100],
                              0.9,
                          )} 100%)`
                        : 'linear-gradient(160deg, rgba(11,11,18,0.95) 0%, rgba(5,5,12,0.98) 100%)',
            }}
        >
            {/* Desktop: sidenav is always open ('permanent'); mobile: it's an overlay
                drawer toggled via mobileOpen ('temporary') */}
            <Sidenav
                width={drawerWidth}
                variant={isDesktop ? 'permanent' : 'temporary'}
                open={isDesktop ? true : mobileOpen}
                onClose={handleToggleMenu}
            />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    width: { lg: `calc(100% - ${drawerWidth}px)`, xs: '100%' },
                    minWidth: 0, // Prevents flex items from overflowing
                    height: '100vh', // Set explicit height
                    px: 0, // Remove horizontal padding to allow pages to use full width
                    pb: 0, // Remove bottom padding
                    overflow: 'hidden', // Prevent overflow on main container
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Toolbar sx={{ flexShrink: 0 }} />
                <Header
                    onToggleMenu={handleToggleMenu}
                    offsetLeft={isDesktop ? drawerWidth : 0}
                    isDesktop={isDesktop}
                />

                <Box
                    sx={{
                        flexGrow: 1,
                        width: '100vw',
                        maxWidth: '100%',
                        overflow: 'auto', // Only allow scrolling in content area
                        height: 'calc(100vh - 64px)', // Subtract toolbar height
                        '&::-webkit-scrollbar': {
                            width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            background: alpha(theme.palette.divider, 0.1),
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: alpha(theme.palette.divider, 0.3),
                            borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                            background: alpha(theme.palette.divider, 0.5),
                        },
                    }}
                >
                    {children}
                </Box>
            </Box>
        </Box>
    );
};

export default Layout;
