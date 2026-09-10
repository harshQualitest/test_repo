import { Box, Skeleton, Stack } from '@mui/material';

/** Loading placeholder shaped like a single workspace info/stat card. */
function InfoCardSkeleton() {
    return (
        <Box
            sx={{
                p: 3,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                <Skeleton variant="text" width="50%" height={20} />
                <Skeleton variant="circular" width={20} height={20} />
            </Stack>
            <Skeleton variant="text" width="60%" height={44} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="40%" height={16} />
            <Skeleton variant="text" width="30%" height={14} sx={{ mt: 0.5 }} />
        </Box>
    );
}

/** Loading placeholder shaped like a single row in the portfolio summary list. */
function PortfolioRowSkeleton() {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
            <Skeleton variant="text" width="25%" height={20} />
            <Skeleton variant="rounded" width={50} height={22} sx={{ borderRadius: 4, flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
                <Skeleton variant="rounded" width="100%" height={8} sx={{ borderRadius: 4 }} />
            </Box>
            <Skeleton variant="text" width={40} height={20} sx={{ flexShrink: 0 }} />
            <Skeleton variant="text" width={70} height={20} sx={{ flexShrink: 0 }} />
        </Box>
    );
}

/**
 * Component: WorkspaceDashboardSkeleton
 *
 * Purpose: Loading-placeholder UI for the Workspace Dashboard page, mirroring
 * its layout (header, info cards, portfolio summary, chart row, queue depth
 * card) while real workspace data is being fetched.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function WorkspaceDashboardSkeleton() {
    return (
        <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Skeleton variant="text" width={220} height={32} />
                        <Skeleton variant="text" width={160} height={20} sx={{ mt: 0.5 }} />
                    </Box>
                    <Skeleton variant="rounded" width={160} height={40} sx={{ borderRadius: 1 }} />
                </Box>

                {/* Info Cards (3 cards) */}
                <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                    }}
                >
                    {Array.from({ length: 3 }).map((_, i) => (
                        <InfoCardSkeleton key={i} />
                    ))}
                </Box>

                {/* Portfolio Summary */}
                <Box
                    sx={{
                        p: 3,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Skeleton variant="text" width={180} height={28} sx={{ mb: 2 }} />
                    {Array.from({ length: 4 }).map((_, i) => (
                        <PortfolioRowSkeleton key={i} />
                    ))}
                </Box>

                {/* Charts row */}
                <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Box
                            key={i}
                            sx={{
                                p: 3,
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                            }}
                        >
                            <Skeleton variant="text" width={160} height={24} sx={{ mb: 2 }} />
                            <Skeleton variant="rounded" width="100%" height={180} sx={{ borderRadius: 2 }} />
                        </Box>
                    ))}
                </Box>

                {/* Queue Depth card */}
                <Box
                    sx={{
                        p: 3,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Skeleton variant="text" width={180} height={24} sx={{ mb: 2 }} />
                    <Skeleton variant="rounded" width="100%" height={200} sx={{ borderRadius: 2 }} />
                </Box>
            </Box>
        </Box>
    );
}
