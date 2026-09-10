import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    Chip,
    Tabs,
    Tab,
    Collapse,
    IconButton,
    Button,
    CircularProgress,
    Alert,
    alpha,
    useTheme,
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import VideocamIcon from '@mui/icons-material/Videocam';
import ImageIcon from '@mui/icons-material/Image';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ReviewVideoLabelingTab from './ReviewVideoLabelingTab';
import ReviewFrameLabelingTab from './ReviewFrameLabelingTab';
import ReviewDecisionCard from '../multi-modality/ReviewDecisionCard';
import projectApi from '../../../services/api/projectApi';

/** Minimal shape of the task list item passed in from ReviewPage */
interface ReviewTaskListItem {
    _id: string;
    task_id: string;
    stage?: string;
    status?: string;
    priority?: string;
    payload?: {
        video_url?: string;
        duration_seconds?: number;
        frame_count?: number;
    };
    annotation_summary?: {
        total_frames: number;
        annotated_frames: number;
        unannotated_frames: number;
        total_annotations: number;
    };
}

interface VideoLabelingReviewProps {
    instructionsUrl?: string;
    task?: ReviewTaskListItem;
}

const STATUS_COLORS: Record<string, string> = {
    annotated: '#22c55e',
    under_annotation: '#f59e0b',
    completed: '#3b82f6',
    rejected: '#ef4444',
    draft: '#94a3b8',
};

/**
 * Component: VideoLabelingReview
 *
 * Purpose: Reviewer-facing screen for the "video_labeling" template type (see
 * `reviewTemplateMap.tsx`) — fetches the full task detail (video + per-frame bounding-box
 * annotations) for a given task and lets the reviewer inspect it across two sub-views
 * (video playback with synced overlays, and a per-frame annotation browser) before
 * recording an accept/reject decision.
 *
 * Responsibilities:
 * - Fetch task detail from the API for the selected task whenever the task/project changes.
 * - Show a collapsible header with task metadata (stage, status) and an annotation summary
 *   (total/annotated/unannotated frame counts, total annotation count).
 * - Host a 2-tab sub-navigation between `ReviewVideoLabelingTab` and `ReviewFrameLabelingTab`.
 * - Render `ReviewDecisionCard` (shared with `MultiModalityReview`) so the reviewer can
 *   submit their decision.
 * - Render loading and error states while/if the task detail fetch is in flight or fails.
 *
 * Props:
 * - instructionsUrl (string, optional): accepted for interface compatibility with
 *   `REVIEW_TEMPLATE_MAP`'s component shape but not used here (destructured as
 *   `_instructionsUrl`).
 * - task (ReviewTaskListItem, optional): the task list item selected for review, as passed
 *   down from the reviewer's task list/`ReviewPage`; provides `_id` (used to fetch detail),
 *   `stage`/`status` (shown as header chips), and `annotation_summary` (shown in the metadata row).
 *
 * State:
 * - collapsed (boolean): whether the header card body is collapsed/expanded.
 * - changesVisible (boolean): whether the "Annotation Summary" panel is shown.
 * - mainTab (number): index of the active sub-tab (0 = Video & Annotations, 1 = Frame Annotations).
 * - taskDetail (any): full task detail fetched from the API (video URL, frames, bounding boxes);
 *   passed down to both sub-tabs.
 * - loadingDetail (boolean): true while the task-detail fetch is in flight.
 * - detailError (string | null): error message if the task-detail fetch failed, else null.
 *
 * Redux/API: calls `projectApi.getReviewerTaskById(projectId, task._id)` directly (not via
 * a Redux thunk) to load the task detail — see `src/services/api/projectApi.ts`.
 *
 * Major child components: ReviewVideoLabelingTab, ReviewFrameLabelingTab, ReviewDecisionCard.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const VideoLabelingReview = ({ instructionsUrl: _instructionsUrl, task }: VideoLabelingReviewProps) => {
    const theme = useTheme();
    const { projectId } = useParams<{ projectId: string }>();

    const [collapsed, setCollapsed] = useState(false);
    const [changesVisible, setChangesVisible] = useState(true);
    const [mainTab, setMainTab] = useState(0);

    const [taskDetail, setTaskDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    // Fetches the full task detail (video URL + per-frame bounding boxes) whenever the
    // route's projectId or the selected task's id changes. Guards on both being present
    // so it doesn't fire with a partial/undefined identifier. Resets prior detail/error
    // state before each fetch so stale data from a previously-selected task isn't shown
    // while the new one loads.
    useEffect(() => {
        if (!projectId || !task?._id) return;

        setTaskDetail(null);
        setDetailError(null);
        setLoadingDetail(true);

        projectApi
            .getReviewerTaskById(projectId, task._id)
            .then((data) => {
                setTaskDetail(data);
            })
            .catch((err: any) => {
                setDetailError(err?.response?.data?.message || err?.message || 'Failed to load task detail');
            })
            .finally(() => {
                setLoadingDetail(false);
            });
    }, [projectId, task?._id]);

    const summary = task?.annotation_summary;

    if (loadingDetail) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, gap: 2 }}>
                <CircularProgress size={36} />
                <Typography variant="body2" color="text.secondary">
                    Loading task detail…
                </Typography>
            </Box>
        );
    }

    if (detailError) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error">{detailError}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Card sx={{ borderLeft: '4px solid #3b82f6', borderRadius: 2 }}>
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
                    <VideocamIcon sx={{ fontSize: 20, color: '#3b82f6', flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                            Video Labeling Review{task?.task_id ? ` • ${task.task_id}` : ''}
                        </Typography>
                        {!collapsed && (
                            <Typography variant="caption" color="text.secondary">
                                Review video frame annotations with bounding boxes
                            </Typography>
                        )}
                    </Box>
                    {task?.stage && (
                        <Chip
                            label={`Stage: ${task.stage}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', bgcolor: alpha('#3b82f6', 0.06), borderColor: alpha('#3b82f6', 0.3), color: '#3b82f6' }}
                        />
                    )}
                    {task?.status && (
                        <Chip
                            label={task.status.replace(/_/g, ' ')}
                            size="small"
                            sx={{
                                fontSize: '0.7rem',
                                bgcolor: alpha(STATUS_COLORS[task.status] ?? '#94a3b8', 0.12),
                                color: STATUS_COLORS[task.status] ?? '#94a3b8',
                                fontWeight: 600,
                            }}
                        />
                    )}
                </Box>

                {/* Body */}
                <Collapse in={!collapsed}>
                    <Box sx={{ p: 2 }}>
                        {/* Metadata row */}
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
                                { label: 'Total Frames', value: summary?.total_frames ?? '—' },
                                { label: 'Annotated', chip: `${summary?.annotated_frames ?? '—'}` },
                                { label: 'Unannotated', value: summary?.unannotated_frames ?? '—' },
                                { label: 'Annotations', chip: `${summary?.total_annotations ?? '—'}` },
                            ].map((item) => (
                                <Box key={item.label}>
                                    <Typography
                                        component="span"
                                        sx={{ display: 'block', fontSize: 'inherit', color: 'text.secondary' }}
                                    >
                                        {item.label}:
                                    </Typography>
                                    {item.chip !== undefined ? (
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
                                            {String(item.value)}
                                        </Typography>
                                    )}
                                </Box>
                            ))}

                            {/* Hide/show changes */}
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
                                    {changesVisible ? 'Hide Summary' : 'Show Summary'}
                                </Button>
                            </Box>
                        </Box>

                        {/* Annotation summary */}
                        <Collapse in={changesVisible}>
                            {summary && (
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
                                            Annotation Summary
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
                                                { label: 'Total Frames', value: summary.total_frames, color: '#64748b' },
                                                { label: 'Annotated Frames', value: summary.annotated_frames, color: '#16a34a' },
                                                { label: 'Unannotated Frames', value: summary.unannotated_frames, color: '#f59e0b' },
                                                { label: 'Total Annotations', value: summary.total_annotations, color: '#2563eb' },
                                            ].map((item) => (
                                                <Box key={item.label}>
                                                    <Typography
                                                        component="span"
                                                        sx={{ display: 'block', fontSize: 'inherit', color: 'text.secondary' }}
                                                    >
                                                        {item.label}:
                                                    </Typography>
                                                    <Typography
                                                        component="div"
                                                        sx={{ fontSize: 'inherit', fontWeight: 700, color: item.color }}
                                                    >
                                                        {item.value}
                                                    </Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    </Box>
                                </Card>
                            )}
                        </Collapse>

                        {/* Main tabs */}
                        <Tabs
                            value={mainTab}
                            onChange={(_, v) => setMainTab(v)}
                            variant="fullWidth"
                            sx={{ mb: 2 }}
                        >
                            <Tab
                                icon={<VideocamIcon sx={{ fontSize: 16 }} />}
                                iconPosition="start"
                                label="Video & Annotations"
                            />
                            <Tab
                                icon={<ImageIcon sx={{ fontSize: 16 }} />}
                                iconPosition="start"
                                label={`Frame Annotations (${summary?.annotated_frames ?? 0})`}
                            />
                        </Tabs>

                        {mainTab === 0 && <ReviewVideoLabelingTab taskDetail={taskDetail} />}
                        {mainTab === 1 && <ReviewFrameLabelingTab taskDetail={taskDetail} />}

                        <ReviewDecisionCard />
                    </Box>
                </Collapse>
            </Card>
        </Box>
    );
};

export default VideoLabelingReview;
