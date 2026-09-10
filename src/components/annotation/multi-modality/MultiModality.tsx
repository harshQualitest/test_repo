import { useState } from 'react';
import { Box, Typography, Card, Chip, Tabs, Tab, Collapse, Button, IconButton, alpha, useTheme } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import VideocamIcon from '@mui/icons-material/Videocam';
import MonitorIcon from '@mui/icons-material/Monitor';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import ConsolidatedView from './ConsolidatedView';
import VideoTab from './VideoTab';
import TranscriptTab from './TranscriptTab';
import FramesTab from './FramesTab';

/**
 * Component: MultiModality
 *
 * Purpose: Top-level screen for the `multi_modal` annotation template (see
 * annotationTemplateMap.tsx). Wraps the task header/metadata chrome around four main
 * sub-tabs — Consolidated View, Video, Transcript, and Frames — that together let an
 * annotator label a video's people, speech, and extracted frames.
 *
 * Responsibilities:
 * - Renders the collapsible task header (title, description, step/role chips) and a
 *   metadata row (dataset version, modality, language, alignment score).
 * - Owns the shared `volume` value so the video player state stays consistent whether the
 *   annotator is on the Consolidated View or the standalone Video tab.
 * - Switches between the four main tabs and renders the footer action bar (Save Draft /
 *   Skip / Submit Annotation) — note these buttons are currently presentational only (no
 *   handlers wired up in this mock-data version).
 *
 * Props:
 * - instructionsUrl?: string — URL to the project's annotation guidelines file, forwarded to
 *   ConsolidatedView for its guidelines banner.
 *
 * State:
 * - taskCollapsed: whether the task header/body card is collapsed.
 * - mainTab: index of the active main tab (0=Consolidated View, 1=Video, 2=Transcript, 3=Frames).
 * - volume: shared playback volume (0-100) passed to both ConsolidatedView and VideoTab so
 *   switching tabs doesn't reset the user's volume preference.
 *
 * Major child components: ConsolidatedView, VideoTab, TranscriptTab, FramesTab.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const MultiModality = ({ instructionsUrl }: { instructionsUrl?: string }) => {
    const theme = useTheme();
    const [taskCollapsed, setTaskCollapsed] = useState(false);
    const [mainTab, setMainTab] = useState(0);
    const [volume, setVolume] = useState(80);

    return (
        <Box sx={{ p: 2 }}>
            <Card sx={{ borderLeft: '4px solid #22c55e', borderRadius: 2 }}>
                {/* Task header */}
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
                    <IconButton size="small" onClick={() => setTaskCollapsed((v) => !v)}>
                        {taskCollapsed ? (
                            <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
                        ) : (
                            <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
                        )}
                    </IconButton>
                    <VideocamIcon sx={{ fontSize: 20, color: '#16a34a', flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                            Multi-Modal Annotation • WF3-TASK-001
                        </Typography>
                        {!taskCollapsed && (
                            <Typography variant="caption" color="text.secondary">
                                Annotate video, transcription, and extracted frames with labels and captions
                            </Typography>
                        )}
                    </Box>
                    <Chip
                        label="Step 4: Annotation"
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', bgcolor: alpha('#3b82f6', 0.06) }}
                    />
                    <Chip label="Annotator" size="small" sx={{ fontSize: '0.7rem' }} />
                </Box>

                {/* Card body */}
                <Collapse in={!taskCollapsed}>
                    <Box sx={{ p: 2 }}>
                        {/* Metadata row */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 2 }}>
                            {[
                                { label: 'Dataset Version', value: 'DS-V1.2.3' },
                                { label: 'Modality', value: 'Video' },
                                { label: 'Language', value: 'en-US' },
                                { label: 'Alignment Score', chip: '89%' },
                            ].map((item) => (
                                <Box key={item.label}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        {item.label}:
                                    </Typography>
                                    {item.chip ? (
                                        <Box>
                                            <Chip
                                                label={item.chip}
                                                size="small"
                                                color="primary"
                                                sx={{ fontSize: '0.7rem', mt: 0.5 }}
                                            />
                                        </Box>
                                    ) : (
                                        <Typography variant="body2">{item.value}</Typography>
                                    )}
                                </Box>
                            ))}
                        </Box>

                        {/* Main tabs */}
                        <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
                            <Tab
                                icon={<MonitorIcon sx={{ fontSize: 16 }} />}
                                iconPosition="start"
                                label="Consolidated View"
                            />
                            <Tab icon={<VideocamIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Video" />
                            <Tab
                                icon={<DescriptionIcon sx={{ fontSize: 16 }} />}
                                iconPosition="start"
                                label="Transcript"
                            />
                            <Tab icon={<ImageIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Frames (3)" />
                        </Tabs>

                        {mainTab === 0 && (
                            <ConsolidatedView
                                volume={volume}
                                onVolumeChange={setVolume}
                                instructionsUrl={instructionsUrl}
                            />
                        )}
                        {mainTab === 1 && <VideoTab volume={volume} onVolumeChange={setVolume} />}
                        {mainTab === 2 && <TranscriptTab />}
                        {mainTab === 3 && <FramesTab />}

                        {/* Global footer */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                pt: 2,
                                mt: 2,
                                borderTop: `1px solid ${theme.palette.divider}`,
                            }}
                        >
                            <Button variant="outlined" size="medium">
                                Save Draft
                            </Button>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button variant="outlined" size="medium">
                                    Skip
                                </Button>
                                <Button
                                    variant="contained"
                                    size="medium"
                                    sx={{ bgcolor: '#030213', '&:hover': { bgcolor: '#161616' } }}
                                >
                                    Submit Annotation
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Collapse>
            </Card>
        </Box>
    );
};

export default MultiModality;
