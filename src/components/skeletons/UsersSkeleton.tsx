import { Box, Skeleton, Stack } from '@mui/material';

/**
 * Component: UsersSkeleton
 *
 * Purpose: Loading-placeholder UI for the Users management page, mirroring
 * its layout (header, search/filter bar, users table with checkbox/name/
 * email/role/actions columns) while the user list is being fetched.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function UsersSkeleton() {
    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                px: { xs: 2, sm: 3, md: 4 },
                py: { xs: 2, md: 3 },
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Skeleton variant="text" width={120} height={44} sx={{ mb: 0.5 }} />
                <Skeleton variant="text" width={340} height={22} />
            </Box>

            {/* Search and filter bar */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 3 }}>
                <Skeleton variant="rounded" sx={{ flex: 1, height: 40, borderRadius: 2 }} />
                <Skeleton variant="rounded" width={200} height={40} sx={{ borderRadius: 2 }} />
                <Skeleton variant="rounded" width={130} height={40} sx={{ borderRadius: 2 }} />
            </Stack>

            {/* Table */}
            <Box
                sx={{
                    flex: 1,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                }}
            >
                {/* Table header */}
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: '48px 2fr 2fr 1fr 80px',
                        gap: 1,
                        px: 2,
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Skeleton variant="rounded" width={18} height={18} sx={{ borderRadius: 0.5 }} />
                    {['Name', 'Email', 'Role', 'Actions'].map((col) => (
                        <Skeleton key={col} variant="text" width="50%" height={18} />
                    ))}
                </Box>

                {/* Table rows */}
                {Array.from({ length: 10 }).map((_, i) => (
                    <Box
                        key={i}
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '48px 2fr 2fr 1fr 80px',
                            gap: 1,
                            px: 2,
                            py: 1.75,
                            borderBottom: i < 9 ? '1px solid' : 'none',
                            borderColor: 'divider',
                            alignItems: 'center',
                            bgcolor: i % 2 === 0 ? 'transparent' : 'action.hover',
                        }}
                    >
                        <Skeleton variant="rounded" width={18} height={18} sx={{ borderRadius: 0.5 }} />
                        <Skeleton variant="text" width="55%" height={20} />
                        <Skeleton variant="text" width="70%" height={20} />
                        <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: 4 }} />
                        <Skeleton variant="circular" width={28} height={28} />
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
