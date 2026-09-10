import { Box, Skeleton, Stack } from '@mui/material';

/**
 * Component: ProjectDetailsSkeleton
 *
 * Purpose: Loading-placeholder UI for the Project Details page, mirroring its
 * layout (back button, project header, detail cards, project information
 * card, tasks table, members section) while real project data is fetched.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function ProjectDetailsSkeleton() {
    return (
        <Box sx={{ py: 4, px: { xs: 2, md: 4 } }}>
            {/* Back button */}
            <Skeleton variant="rounded" width={100} height={36} sx={{ borderRadius: 2, mb: 3 }} />

            {/* Project header */}
            <Box sx={{ mb: 4 }}>
                <Stack direction="row" gap={2.5} alignItems="flex-start" sx={{ mb: 2.5 }}>
                    <Skeleton variant="rounded" width={60} height={60} sx={{ borderRadius: 2, flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width="50%" height={40} sx={{ mb: 1 }} />
                        <Skeleton variant="text" width="80%" height={20} />
                        <Skeleton variant="text" width="65%" height={20} sx={{ mb: 2 }} />
                        <Stack direction="row" gap={1.5}>
                            <Skeleton variant="rounded" width={100} height={30} sx={{ borderRadius: 4 }} />
                            <Skeleton variant="rounded" width={80} height={30} sx={{ borderRadius: 4 }} />
                        </Stack>
                    </Box>
                </Stack>
            </Box>

            {/* Detail cards (3 columns) */}
            <Box
                sx={{
                    display: 'grid',
                    gap: 2.5,
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                    mb: 4,
                }}
            >
                {Array.from({ length: 3 }).map((_, i) => (
                    <Box
                        key={i}
                        sx={{
                            p: 2,
                            borderRadius: 2.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                        }}
                    >
                        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                            <Skeleton variant="circular" width={18} height={18} />
                            <Skeleton variant="text" width={80} height={18} />
                        </Stack>
                        <Skeleton variant="text" width="60%" height={28} />
                    </Box>
                ))}
            </Box>

            {/* Project information card */}
            <Box
                sx={{
                    p: 3,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    mb: 4,
                }}
            >
                <Skeleton variant="text" width={180} height={28} sx={{ mb: 2 }} />
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Box key={i}>
                            <Skeleton variant="text" width={120} height={18} sx={{ mb: 0.5 }} />
                            <Skeleton variant="text" width="70%" height={22} />
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Tasks table */}
            <Box
                sx={{
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    mb: 4,
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Skeleton variant="text" width={120} height={24} />
                </Box>
                {/* Table header */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: 1,
                        px: 2,
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} variant="text" width="60%" height={18} />
                    ))}
                </Box>
                {/* Table rows */}
                {Array.from({ length: 5 }).map((_, i) => (
                    <Box
                        key={i}
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: 1,
                            px: 2,
                            py: 1.5,
                            borderBottom: i < 4 ? '1px solid' : 'none',
                            borderColor: 'divider',
                        }}
                    >
                        {Array.from({ length: 5 }).map((_, j) => (
                            <Skeleton key={j} variant="text" width={j === 0 ? '80%' : '55%'} height={20} />
                        ))}
                    </Box>
                ))}
            </Box>

            {/* Members section */}
            <Box
                sx={{
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    p: 3,
                }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Skeleton variant="text" width={160} height={28} />
                    <Skeleton variant="rounded" width={120} height={36} sx={{ borderRadius: 2 }} />
                </Stack>
                {Array.from({ length: 4 }).map((_, i) => (
                    <Stack key={i} direction="row" alignItems="center" gap={2} sx={{ mb: 1.5 }}>
                        <Skeleton variant="circular" width={36} height={36} />
                        <Box sx={{ flex: 1 }}>
                            <Skeleton variant="text" width="35%" height={18} />
                            <Skeleton variant="text" width="50%" height={14} />
                        </Box>
                        <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 4 }} />
                    </Stack>
                ))}
            </Box>
        </Box>
    );
}
