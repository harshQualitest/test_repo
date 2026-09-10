import { useState } from 'react';
import { Box, Typography, Card, Chip, Tabs, Tab, Collapse, Button, IconButton, useTheme } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import VideocamIcon from '@mui/icons-material/Videocam';
import MonitorIcon from '@mui/icons-material/Monitor';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReviewVideoTab from './ReviewVideoTab';
import ReviewTranscriptTab from './ReviewTranscriptTab';
import ReviewFramesTab from './ReviewFramesTab';
import ReviewDecisionCard from './ReviewDecisionCard';

/**
 * Component: MultiModalityReview
 *
 * Purpose: Reviewer-facing screen for the "multi_modal" template type (see
 * `reviewTemplateMap.tsx`) — lets a reviewer inspect an annotated video task across
 * three sub-views (video/objects, transcript, frames) and record an accept/reject decision.
 *
 * Responsibilities:
 * - Show a collapsible header with task metadata (dataset version, modality, language,
 *   alignment score) and an annotation-changes summary (labels/boxes added/adjusted).
 * - Host a 3-tab sub-navigation between `ReviewVideoTab`, `ReviewTranscriptTab`, and
 *   `ReviewFramesTab`.
 * - Render `ReviewDecisionCard` at the bottom so the reviewer can submit their decision.
 *
 * Props:
 * - instructionsUrl (string, optional): when provided, used as the video source URL;
 *   otherwise falls back to a hardcoded demo video URL (see `videoUrl` below — this
 *   component currently renders static/demo data rather than fetching a real task).
 *
 * State:
 * - collapsed (boolean): whether the header card body is collapsed/expanded.
 * - changesVisible (boolean): whether the "Annotation Changes Summary" panel is shown.
 * - mainTab (number): index of the active sub-tab (0 = Video & Objects, 1 = Transcript, 2 = Frames).
 *
 * Major child components: ReviewVideoTab, ReviewTranscriptTab, ReviewFramesTab, ReviewDecisionCard.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const MultiModalityReview = ({ instructionsUrl }: { instructionsUrl?: string }) => {
    const theme = useTheme();

    const [collapsed, setCollapsed] = useState(false);
    const [changesVisible, setChangesVisible] = useState(true);
    const [mainTab, setMainTab] = useState(0);

    // Falls back to a demo video when no instructions URL is supplied — this screen
    // currently displays static/placeholder task data rather than a fetched task.
    const videoUrl = instructionsUrl || 'http://10.250.2.55/videos/hero-video.mp4';

    return (
        <Box sx={{ p: 2 }}>
            <Card sx={{ borderLeft: '4px solid #a855f7', borderRadius: 2 }}>
                {/* Header */}
                <Box
                    sx={{
                        px: 3,
                        py: 1.5,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                    }}
                >
                    <IconButton size="small" onClick={() => setCollapsed((v) => !v)}>
                        {collapsed ? (
                            <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                        ) : (
                            <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
                        )}
                    </IconButton>
                    <VideocamIcon sx={{ fontSize: 20, color: '#a855f7', flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                            Multi-Modal Review • WF3-TASK-001
                        </Typography>
                        {!collapsed && (
                            <Typography variant="caption" color="text.secondary">
                                Review annotated video, transcript, and frames • Annotated by John Smith on 2026-02-05
                                14:23
                            </Typography>
                        )}
                    </Box>
                    <Chip
                        label="Step 6: Human Review"
                        size="small"
                        variant="outlined"
                        sx={{
                            fontSize: '0.7rem',
                            bgcolor: 'rgba(168,85,247,0.06)',
                            borderColor: 'rgba(168,85,247,0.3)',
                            color: '#a855f7',
                        }}
                    />
                    <Chip label="Reviewer" size="small" sx={{ fontSize: '0.7rem' }} />
                </Box>

                {/* Body */}
                <Collapse in={!collapsed}>
                    <Box sx={{ p: 2 }}>
                        {/* Metadata row — 5-col grid (4 data fields + hide/show button) */}
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                                gap: 1.5,
                                mb: 2,
                                fontSize: '0.75rem',
                                lineHeight: 1 / 0.75,
                            }}
                        >
                            {[
                                { label: 'Dataset Version', value: 'DS-V1.2.3' },
                                { label: 'Modality', value: 'Video' },
                                { label: 'Language', value: 'en-US' },
                                { label: 'Alignment Score', chip: '89%' },
                            ].map((item) => (
                                <Box key={item.label}>
                                    <Typography
                                        component="span"
                                        sx={{ display: 'block', fontSize: 'inherit', color: 'text.secondary' }}
                                    >
                                        {item.label}:
                                    </Typography>
                                    {item.chip ? (
                                        <Box sx={{ mt: 0.5 }}>
                                            <Chip
                                                label={item.chip}
                                                size="small"
                                                sx={{
                                                    fontSize: '0.7rem',
                                                    height: 20,
                                                    bgcolor: '#030213',
                                                    color: '#fff',
                                                    '& .MuiChip-label': { px: 1 },
                                                }}
                                            />
                                        </Box>
                                    ) : (
                                        <Typography
                                            component="div"
                                            sx={{ fontSize: 'inherit', fontWeight: 500, mt: 0.25 }}
                                        >
                                            {item.value}
                                        </Typography>
                                    )}
                                </Box>
                            ))}

                            {/* 5th column: hide/show changes */}
                            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={
                                        changesVisible ? (
                                            <VisibilityOffIcon sx={{ fontSize: '12px !important' }} />
                                        ) : (
                                            <VisibilityIcon sx={{ fontSize: '12px !important' }} />
                                        )
                                    }
                                    onClick={() => setChangesVisible((v) => !v)}
                                    sx={{
                                        fontSize: '0.75rem',
                                        textTransform: 'none',
                                        borderColor: theme.palette.divider,
                                        color: 'text.primary',
                                        height: 28,
                                        px: 1.5,
                                        '& .MuiButton-startIcon': { mr: 0.5 },
                                    }}
                                >
                                    {changesVisible ? 'Hide Changes' : 'Show Changes'}
                                </Button>
                            </Box>
                        </Box>

                        {/* Annotation Changes Summary */}
                        <Collapse in={changesVisible}>
                            <Card
                                variant="outlined"
                                sx={{
                                    mb: 2,
                                    bgcolor: 'color-mix(in oklab, #dbeafe 50%, transparent)',
                                    borderColor: '#bfdbfe',
                                    borderRadius: 'calc(0.625rem + 4px)',
                                }}
                            >
                                <Box sx={{ p: 1.5 }}>
                                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, mb: 1 }}>
                                        Annotation Changes Summary
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(4, 1fr)',
                                            gap: 1.5,
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        {[
                                            { label: 'Labels Added', value: '2', color: '#16a34a' },
                                            { label: 'Boxes Adjusted', value: '1', color: '#2563eb' },
                                            { label: 'Boxes Added', value: '2', color: '#16a34a' },
                                            { label: 'Transcript Modified', value: 'Yes', color: '#2563eb' },
                                        ].map((item) => (
                                            <Box key={item.label}>
                                                <Typography
                                                    component="span"
                                                    sx={{
                                                        display: 'block',
                                                        fontSize: 'inherit',
                                                        color: 'text.secondary',
                                                    }}
                                                >
                                                    {item.label}:
                                                </Typography>
                                                <Typography
                                                    component="div"
                                                    sx={{ fontSize: 'inherit', fontWeight: 500, color: item.color }}
                                                >
                                                    {item.value}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            </Card>
                        </Collapse>

                        {/* Main tabs */}
                        <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
                            <Tab
                                icon={<MonitorIcon sx={{ fontSize: 16 }} />}
                                iconPosition="start"
                                label="Video & Objects"
                            />
                            <Tab
                                icon={<DescriptionIcon sx={{ fontSize: 16 }} />}
                                iconPosition="start"
                                label="Transcript"
                            />
                            <Tab icon={<ImageIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Frames (3)" />
                        </Tabs>

                        {mainTab === 0 && <ReviewVideoTab videoUrl={videoUrl} />}
                        {mainTab === 1 && <ReviewTranscriptTab />}
                        {mainTab === 2 && <ReviewFramesTab />}

                        <ReviewDecisionCard />
                    </Box>
                </Collapse>
            </Card>
        </Box>
    );
};

export default MultiModalityReview;
