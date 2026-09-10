import type { ReactNode, ErrorInfo } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { Box, Button, Paper, Typography, alpha } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';

interface PageErrorBoundaryProps {
    children: ReactNode;
    pageName?: string;
}

/**
 * Component: PageErrorBoundary
 *
 * Purpose: A lighter error boundary for individual pages/routes. Wraps a
 * single page's content (per `withPageErrorBoundary`) in an `ErrorBoundary`
 * with a compact, less intrusive fallback so a crash on one page doesn't
 * blank the whole app shell and the user can still navigate elsewhere.
 *
 * Responsibilities:
 * - Catches render-time errors thrown by `children` via the underlying `ErrorBoundary`
 *   (same catch semantics/limitations as that component — no event handler or async errors).
 * - Shows a compact "Unable to Load {pageName}" card with a Reload action instead of
 *   the full-page error screen used at the app root, allowing navigation to continue.
 * - Logs the error to the console, tagged with `pageName` for easier triage.
 *
 * Props:
 * - children (ReactNode): the page content this boundary protects.
 * - pageName (string, optional): human-readable name used in the error log and fallback heading.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const PageErrorBoundary = ({ children, pageName }: PageErrorBoundaryProps) => {
    /**
     * `onError` callback passed to the underlying `ErrorBoundary`; called from
     * `componentDidCatch` when a descendant of this page throws during render.
     * @param error - the error thrown by a descendant component.
     * @param errorInfo - React-provided info including `componentStack`.
     */
    const handleError = (error: Error, errorInfo: ErrorInfo) => {
        // Log page-specific errors
        console.error(`Error in ${pageName || 'page'}:`, error, errorInfo);

        // You could also send to analytics or error tracking service
        // trackError({ page: pageName, error, errorInfo });
    };

    /** Forces a full page reload, triggered by the "Reload Page" button in the fallback card. */
    const handleReload = () => {
        globalThis.location.reload();
    };

    const fallback = (
        <Box
            sx={{
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    borderRadius: 3,
                    textAlign: 'center',
                    maxWidth: 500,
                    width: '100%',
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
            >
                {/* Warning Icon */}
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        backgroundColor: (theme) => alpha(theme.palette.warning.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                    }}
                >
                    <WarningAmberIcon
                        sx={{
                            fontSize: 36,
                            color: 'warning.main',
                        }}
                    />
                </Box>

                {/* Error Title */}
                <Typography variant="h6" fontWeight={600} gutterBottom>
                    Unable to Load {pageName || 'Page'}
                </Typography>

                {/* Error Description */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    We encountered an error while loading this page. Please try refreshing or navigate to another section.
                </Typography>

                {/* Reload Button */}
                <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={handleReload}
                    size="medium"
                >
                    Reload Page
                </Button>

                {/* Help Text */}
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 2 }}
                >
                    If the issue continues, please contact support.
                </Typography>
            </Paper>
        </Box>
    );

    return (
        <ErrorBoundary fallback={fallback} onError={handleError} showDetails={false}>
            {children}
        </ErrorBoundary>
    );
};

export default PageErrorBoundary;
