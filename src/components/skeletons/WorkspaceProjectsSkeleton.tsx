import { Box, Skeleton, Stack } from '@mui/material';

/** Loading placeholder shaped like a single project card (grid view mode). */
function ProjectCardSkeleton() {
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
            {/* Card header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                <Stack direction="row" gap={1.5} alignItems="center">
                    <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 1.5 }} />
                    <Box>
                        <Skeleton variant="text" width={130} height={20} />
                        <Skeleton variant="rounded" width={80} height={20} sx={{ borderRadius: 4, mt: 0.5 }} />
                    </Box>
                </Stack>
                <Skeleton variant="circular" width={28} height={28} />
            </Stack>
            {/* Description */}
            <Skeleton variant="text" width="90%" height={16} />
            <Skeleton variant="text" width="70%" height={16} sx={{ mb: 2 }} />
            {/* Dates */}
            <Stack direction="row" gap={2} sx={{ mb: 1.5 }}>
                <Skeleton variant="text" width={90} height={16} />
                <Skeleton variant="text" width={90} height={16} />
            </Stack>
            {/* Status chip */}
            <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 4 }} />
        </Box>
    );
}

interface WorkspaceProjectsSkeletonProps {
    viewMode?: 'grid' | 'table';
}

/**
 * Component: WorkspaceProjectsSkeleton
 *
 * Purpose: Loading-placeholder UI for the Workspace Projects list, shown
 * while the projects for a workspace are being fetched.
 *
 * Props:
 * - `viewMode?: 'grid' | 'table'` — mirrors the page's current view mode so
 *   the skeleton matches (card grid vs table layout with header/rows).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function WorkspaceProjectsSkeleton({ viewMode = 'grid' }: WorkspaceProjectsSkeletonProps) {
    return (
        <Box sx={{ width: '100%', py: 3, px: { xs: 2, md: 4 } }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Box>
                    <Skeleton variant="text" width={220} height={36} />
                    <Skeleton variant="text" width={140} height={20} sx={{ mt: 0.5 }} />
                </Box>
                <Stack direction="row" gap={1.5}>
                    <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 1 }} />
                    <Skeleton variant="rounded" width={140} height={36} sx={{ borderRadius: 2 }} />
                    <Skeleton variant="rounded" width={160} height={36} sx={{ borderRadius: 2 }} />
                </Stack>
            </Stack>

            {/* Filters bar */}
            <Box sx={{ mb: 3 }}>
                <Stack direction="row" gap={2}>
                    <Skeleton variant="rounded" width="100%" height={40} sx={{ flex: 1, borderRadius: 2 }} />
                    <Skeleton variant="rounded" width={140} height={40} sx={{ borderRadius: 2 }} />
                    <Skeleton variant="rounded" width={140} height={40} sx={{ borderRadius: 2 }} />
                </Stack>
            </Box>

            {/* Project grid */}
            {viewMode === 'grid' && (
                <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                    }}
                >
                    {Array.from({ length: 6 }).map((_, i) => (
                        <ProjectCardSkeleton key={i} />
                    ))}
                </Box>
            )}

            {/* Table view */}
            {viewMode === 'table' && (
                <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                    {/* Header row */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr 1fr',
                            gap: 1,
                            px: 2,
                            py: 1.5,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                        }}
                    >
                        {['Project Name', 'Description', 'Template', 'Start', 'End', 'Status', 'Actions'].map((h) => (
                            <Skeleton key={h} variant="text" width="70%" height={18} />
                        ))}
                    </Box>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Box
                            key={i}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr 1fr',
                                gap: 1,
                                px: 2,
                                py: 2,
                                borderBottom: i < 7 ? '1px solid' : 'none',
                                borderColor: 'divider',
                                alignItems: 'center',
                            }}
                        >
                            <Stack direction="row" gap={1} alignItems="center">
                                <Skeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 1.5, flexShrink: 0 }} />
                                <Skeleton variant="text" width="70%" height={18} />
                            </Stack>
                            <Skeleton variant="text" width="80%" height={18} />
                            <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 4 }} />
                            <Skeleton variant="text" width="80%" height={18} />
                            <Skeleton variant="text" width="80%" height={18} />
                            <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 4 }} />
                            <Stack direction="row" gap={0.5}>
                                <Skeleton variant="circular" width={28} height={28} />
                                <Skeleton variant="circular" width={28} height={28} />
                                <Skeleton variant="circular" width={28} height={28} />
                            </Stack>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}

export { ProjectCardSkeleton };
