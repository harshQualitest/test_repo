import { Box, Typography, Card, Chip, useTheme } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import LinkIcon from '@mui/icons-material/Link';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckIcon from '@mui/icons-material/Check';

/**
 * Static demo data: sample frame captions (auto-generated vs. human-edited) shown by
 * `ReviewFramesTab`. This component currently renders fixed placeholder content rather
 * than data fetched for the task being reviewed.
 */
const FRAME_ANNOTATIONS = [
    {
        id: 'LINK-002',
        timestamp: '00:00:05',
        auto: 'Product overview screen',
        human: 'Dashboard overview showing key metrics and analytics widgets with real-time data visualization',
    },
    {
        id: 'LINK-003',
        timestamp: '00:00:15',
        auto: 'Feature highlight',
        human: 'Real-time collaboration feature with multi-user presence indicators and interactive workspace elements',
    },
    {
        id: 'LINK-004',
        timestamp: '00:00:30',
        auto: 'Integration panel',
        human: 'Integration management panel displaying connected services, API endpoints, and data flow configuration',
    },
];

/**
 * Component: ReviewFramesTab
 *
 * Purpose: Sub-tab of `MultiModalityReview` that lets a reviewer compare the
 * auto-generated caption against the human-edited caption for each sampled video frame.
 *
 * Responsibilities:
 * - Render one card per frame in `FRAME_ANNOTATIONS`, each showing an image placeholder,
 *   a frame ID/timestamp, and the auto vs. human caption side by side.
 *
 * Props: none.
 * State: none.
 *
 * Note: renders the static `FRAME_ANNOTATIONS` demo data rather than task-specific frames
 * fetched from the API — see `ReviewFrameLabelingTab.tsx` for the data-driven equivalent
 * used in the video-labeling review flow.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ReviewFramesTab = () => {
    const theme = useTheme();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {FRAME_ANNOTATIONS.map((frame) => (
                <Card key={frame.id} variant="outlined" sx={{ borderRadius: 'calc(0.625rem + 4px)' }}>
                    <Box sx={{ p: 2 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>

                            {/* Left: image placeholder + badge/timestamp */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Box
                                    sx={{
                                        background: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
                                        borderRadius: 1,
                                        aspectRatio: '16/9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <ImageIcon sx={{ fontSize: 48, color: '#64748b' }} />
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                    <Chip
                                        icon={<LinkIcon sx={{ fontSize: '12px !important', mr: '-4px' }} />}
                                        label={frame.id}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            fontSize: '0.75rem',
                                            height: 22,
                                            borderColor: theme.palette.divider,
                                            color: 'text.primary',
                                            '& .MuiChip-label': { px: 1 },
                                        }}
                                    />
                                    <Typography sx={{ fontSize: 'inherit', color: 'text.secondary' }}>
                                        Timestamp: {frame.timestamp}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Right: auto + human captions */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

                                {/* Auto caption */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <WarningAmberIcon sx={{ fontSize: 12, color: '#ca8a04' }} />
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>Auto-Generated Caption</Typography>
                                    </Box>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            borderColor: '#fde68a',
                                            bgcolor: 'color-mix(in oklab, #fefce8 30%, transparent)',
                                            borderRadius: 'calc(0.625rem + 4px)',
                                        }}
                                    >
                                        <Box sx={{ p: 1 }}>
                                            <Typography sx={{ fontSize: '0.75rem' }}>{frame.auto}</Typography>
                                        </Box>
                                    </Card>
                                </Box>

                                {/* Human caption */}
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <CheckIcon sx={{ fontSize: 12, color: '#16a34a' }} />
                                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>Human-Edited Caption</Typography>
                                    </Box>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            borderColor: '#bbf7d0',
                                            bgcolor: 'color-mix(in oklab, #f0fdf4 30%, transparent)',
                                            borderRadius: 'calc(0.625rem + 4px)',
                                        }}
                                    >
                                        <Box sx={{ p: 1 }}>
                                            <Typography sx={{ fontSize: '0.75rem' }}>{frame.human}</Typography>
                                        </Box>
                                    </Card>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Card>
            ))}
        </Box>
    );
};

export default ReviewFramesTab;
