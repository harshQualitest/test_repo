import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Component: LazyLoadFallback
 *
 * Purpose: Full-viewport loading placeholder shown while a `React.lazy`
 * route/component chunk is being fetched (used as the `fallback` for
 * `Suspense` boundaries around lazily-loaded routes in `AppRouter`).
 *
 * Responsibilities:
 * - Renders a centered spinner and "Loading..." label, fixed to cover the
 *   full viewport so no layout shift is visible once the real content mounts.
 *
 * Props: none.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const LazyLoadFallback = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                width: '100%',
                position: 'fixed',
                top: 0,
                left: 0,
                gap: 2,
            }}
        >
            <CircularProgress size={60} />
            <Typography variant="body1" color="text.secondary">
                Loading...
            </Typography>
        </Box>
    );
};

export default LazyLoadFallback;
