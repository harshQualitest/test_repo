import { Box, Skeleton, Stack } from '@mui/material';

/** Loading placeholder shaped like a single dashboard metric card (icon + value + label). */
function MetricCardSkeleton() {
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
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="text" width={60} height={20} />
            </Stack>
            <Skeleton variant="text" width="40%" height={40} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="70%" height={20} />
        </Box>
    );
}

/** Loading placeholder shaped like a single workspace card (widget view mode). */
function WorkspaceCardSkeleton() {
    return (
        <Box
            sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Stack direction="row" gap={1.5} alignItems="center">
                    <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 2 }} />
                    <Box>
                        <Skeleton variant="text" width={140} height={24} />
                        <Skeleton variant="text" width={80} height={18} />
                    </Box>
                </Stack>
                <Skeleton variant="rounded" width={60} height={24} sx={{ borderRadius: 4 }} />
            </Stack>
            <Skeleton variant="text" width="80%" height={18} />
            <Skeleton variant="text" width="60%" height={18} sx={{ mb: 2 }} />
            <Stack direction="row" gap={2}>
                <Skeleton variant="text" width={80} height={18} />
                <Skeleton variant="text" width={80} height={18} />
            </Stack>
        </Box>
    );
}

/** Loading placeholder shaped like a single row of the dashboard's list view. */
function ListRowSkeleton() {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 1.5, flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="30%" height={20} />
                <Skeleton variant="text" width="50%" height={16} />
            </Box>
            <Skeleton variant="rounded" width={60} height={22} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rounded" width={60} height={22} sx={{ borderRadius: 1 }} />
            <Skeleton variant="text" width={80} height={20} />
            <Skeleton variant="text" width={80} height={20} />
            <Skeleton variant="circular" width={32} height={32} />
        </Box>
    );
}

interface DashboardSkeletonProps {
    viewMode?: 'widget' | 'list' | 'gantt' | 'kanban';
    metricsCount?: number;
}

/**
 * Component: DashboardSkeleton
 *
 * Purpose: Loading-placeholder UI for the main Dashboard page, shown while
 * dashboard data (metrics/workspaces) is being fetched, so the layout doesn't
 * jump once real content arrives.
 *
 * Props:
 * - `viewMode?: 'widget' | 'list' | 'gantt' | 'kanban'` — mirrors the
 *   dashboard's current view mode so the skeleton matches its layout
 *   (only 'widget' and 'list' have dedicated skeleton layouts here).
 * - `metricsCount?: number` — number of metric-card skeletons to render.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function DashboardSkeleton({ viewMode = 'widget', metricsCount = 2 }: DashboardSkeletonProps) {
    return (
        <Box>
            {/* Metrics cards */}
            <Box
                sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: `repeat(${Math.min(metricsCount, 2)}, 1fr)`,
                        md: `repeat(${metricsCount}, 1fr)`,
                    },
                    mb: 3,
                }}
            >
                {Array.from({ length: metricsCount }).map((_, i) => (
                    <MetricCardSkeleton key={i} />
                ))}
            </Box>

            {/* View type toggle placeholder */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" width={36} height={36} sx={{ borderRadius: 1 }} />
                ))}
            </Box>

            {/* Widget/List content */}
            {viewMode === 'widget' && (
                <Box
                    sx={{
                        display: 'grid',
                        gap: 3,
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                        py: 2,
                        px: 2,
                    }}
                >
                    {Array.from({ length: 4 }).map((_, i) => (
                        <WorkspaceCardSkeleton key={i} />
                    ))}
                </Box>
            )}

            {viewMode === 'list' && (
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    {/* Table header */}
                    <Box sx={{ display: 'flex', gap: 2, p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        {['Workspace Name', 'Type', 'Visibility', 'Projects', 'Members'].map((col) => (
                            <Skeleton key={col} variant="text" width={80} height={20} />
                        ))}
                    </Box>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <ListRowSkeleton key={i} />
                    ))}
                </Box>
            )}
        </Box>
    );
}

export { MetricCardSkeleton, WorkspaceCardSkeleton };
