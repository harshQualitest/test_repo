import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Box, Button, Container, Paper, Typography, alpha } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    showDetails?: boolean;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Component: ErrorBoundary
 *
 * Purpose: Top-level React class-based error boundary that catches any
 * uncaught JavaScript error thrown during rendering, in lifecycle methods, or
 * in constructors of the component tree beneath it, and replaces the crashed
 * subtree with a recoverable fallback UI instead of a blank white screen.
 *
 * Responsibilities:
 * - Catches render-phase errors via `getDerivedStateFromError` /
 *   `componentDidCatch` (does NOT catch errors in event handlers, async code,
 *   SSR, or errors thrown in the boundary itself — standard React error
 *   boundary limitations).
 * - Renders `props.fallback` if supplied, otherwise a default full-page error
 *   screen with Reload/Go Home actions and (optionally) the error stack in dev.
 * - Reports the error upward via the optional `onError` callback, and logs to
 *   the console only in development builds.
 *
 * Props:
 * - children (ReactNode): the subtree this boundary protects.
 * - fallback (ReactNode, optional): custom UI to show instead of the default screen.
 * - onError ((error: Error, errorInfo: ErrorInfo) => void, optional): hook for
 *   forwarding errors to an external error-reporting service.
 * - showDetails (boolean, optional): when true (and in DEV), renders the raw
 *   error message and component stack for debugging.
 *
 * State:
 * - hasError (boolean): whether an error has been caught; controls fallback rendering.
 * - error (Error | null): the caught error object.
 * - errorInfo (ErrorInfo | null): React's component stack info for the error.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    /**
     * React lifecycle hook invoked after a descendant throws during render.
     * Returns the state update that flips the boundary into its error-rendering mode.
     * @param error - the error thrown by a descendant component.
     * @returns Partial state marking `hasError` true and storing the error.
     */
    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    /**
     * React lifecycle hook invoked after a descendant throws, with access to the
     * component stack. Used for side effects: dev-only console logging and
     * forwarding the error to the optional `onError` reporting callback.
     * @param error - the error thrown by a descendant component.
     * @param errorInfo - React-provided info including `componentStack`.
     */
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console in development
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }

        // Call optional error handler
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Update state with error info
        this.setState({
            error,
            errorInfo,
        });

        // You can also log the error to an error reporting service here
        // Example: logErrorToService(error, errorInfo);
    }

    /** Forces a full page reload, triggered by the "Reload Page" button in the fallback UI. */
    handleReload = () => {
        globalThis.location.reload();
    };

    /** Hard-navigates the browser to the app root, triggered by the "Go Home" button in the fallback UI. */
    handleGoHome = () => {
        globalThis.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <Container maxWidth="md">
                    <Box
                        sx={{
                            minHeight: '100vh',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            py: 4,
                        }}
                    >
                        <Paper
                            elevation={3}
                            sx={{
                                p: 4,
                                borderRadius: 3,
                                textAlign: 'center',
                                maxWidth: 600,
                                width: '100%',
                            }}
                        >
                            {/* Error Icon */}
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    backgroundColor: (theme) => alpha(theme.palette.error.main, 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 24px',
                                }}
                            >
                                <ErrorOutlineIcon
                                    sx={{
                                        fontSize: 48,
                                        color: 'error.main',
                                    }}
                                />
                            </Box>

                            {/* Error Title */}
                            <Typography variant="h4" fontWeight={600} gutterBottom>
                                Oops! Something went wrong
                            </Typography>

                            {/* Error Description */}
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                                We're sorry for the inconvenience. An unexpected error has occurred.
                            </Typography>

                            {/* Error Details (Development Only) */}
                            {this.props.showDetails && import.meta.env.DEV && this.state.error && (
                                <Box
                                    sx={{
                                        mt: 3,
                                        p: 2,
                                        backgroundColor: (theme) => alpha(theme.palette.error.main, 0.05),
                                        borderRadius: 2,
                                        textAlign: 'left',
                                        maxHeight: 200,
                                        overflow: 'auto',
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        component="pre"
                                        sx={{
                                            fontFamily: 'monospace',
                                            fontSize: '0.75rem',
                                            color: 'error.main',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {this.state.error.toString()}
                                        {this.state.errorInfo && '\n\n'}
                                        {this.state.errorInfo?.componentStack}
                                    </Typography>
                                </Box>
                            )}

                            {/* Action Buttons */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 2,
                                    justifyContent: 'center',
                                    mt: 4,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Button
                                    variant="contained"
                                    startIcon={<RefreshIcon />}
                                    onClick={this.handleReload}
                                    size="large"
                                >
                                    Reload Page
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<HomeIcon />}
                                    onClick={this.handleGoHome}
                                    size="large"
                                >
                                    Go Home
                                </Button>
                            </Box>

                            {/* Additional Help Text */}
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mt: 3 }}
                            >
                                If the problem persists, please contact support.
                            </Typography>
                        </Paper>
                    </Box>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
