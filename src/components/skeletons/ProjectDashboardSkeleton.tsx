import { Box, Skeleton, Stack } from '@mui/material';

/** Loading placeholder shaped like a single project metric chip/card. */
function MetricChipSkeleton() {
    return (
        <Box
            sx={{
                p: 2.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            <Skeleton variant="text" width="55%" height={18} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="40%" height={36} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="65%" height={16} />
        </Box>
    );
}

/**
 * Component: ProjectDashboardSkeleton
 *
 * Purpose: Loading-placeholder UI for the Project Dashboard page, mirroring
 * its layout (header, progress/ETA bar, metric cards, reviewer-outcome
 * charts, throughput trend, queue status/top performers) while real project
 * data is being fetched.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function ProjectDashboardSkeleton() {
    return (
        <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Skeleton variant="text" width={280} height={34} />
                        <Skeleton variant="text" width={180} height={20} sx={{ mt: 0.5 }} />
                    </Box>
                    <Skeleton variant="rounded" width={120} height={36} sx={{ borderRadius: 2 }} />
                </Box>

                {/* Progress / ETA bar */}
                <Box
                    sx={{
                        p: 3,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                        <Skeleton variant="text" width={160} height={24} />
                        <Skeleton variant="text" width={80} height={24} />
                    </Stack>
                    <Skeleton variant="rounded" width="100%" height={10} sx={{ borderRadius: 5, mb: 2 }} />
                    <Stack direction="row" gap={3}>
                        <Skeleton variant="text" width={100} height={18} />
                        <Skeleton variant="text" width={100} height={18} />
                        <Skeleton variant="text" width={100} height={18} />
                    </Stack>
                </Box>

                {/* Metrics cards (2 cards) */}
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
                    <MetricChipSkeleton />
                    <MetricChipSkeleton />
                </Box>

                {/* Reviewer outcomes / chart grid */}
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' } }}>
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
                            <Skeleton variant="text" width={180} height={24} sx={{ mb: 2 }} />
                            <Skeleton variant="rounded" width="100%" height={160} sx={{ borderRadius: 2 }} />
                        </Box>
                    ))}
                </Box>

                {/* Throughput trend (full width) */}
                <Box
                    sx={{
                        p: 3,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Skeleton variant="text" width={200} height={24} sx={{ mb: 2 }} />
                    <Skeleton variant="rounded" width="100%" height={200} sx={{ borderRadius: 2 }} />
                </Box>

                {/* Queue status + Top performers */}
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' } }}>
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
                            {Array.from({ length: 4 }).map((_, j) => (
                                <Box key={j} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                    <Skeleton variant="circular" width={32} height={32} />
                                    <Box sx={{ flex: 1 }}>
                                        <Skeleton variant="text" width="50%" height={18} />
                                        <Skeleton variant="text" width="35%" height={14} />
                                    </Box>
                                    <Skeleton variant="text" width={40} height={18} />
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
}
