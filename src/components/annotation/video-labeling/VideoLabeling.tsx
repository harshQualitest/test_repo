import { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    Chip,
    Tabs,
    Tab,
    Collapse,
    Button,
    IconButton,
    CircularProgress,
    alpha,
    useTheme,
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import VideocamIcon from '@mui/icons-material/Videocam';
import ImageIcon from '@mui/icons-material/Image';
import VideoPlayerPanel from './VideoPlayerPanel';
import FrameAnnotationTab from './FrameAnnotationTab';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import {
    submitAnnotation,
    selectUserAnnotationSubmitting,
    fetchProjectTaskUsers,
    setNoTasksAvailable,
} from '../../../redux/slices/userAnnotationSlice';
import { useToast } from '../../../hooks/useToast';

/** A single labeled bounding box on one frame. bbox coordinates are normalized 0-1 fractions
 *  of the frame image's width/height (not pixels), so they render correctly at any display size. */
export interface Annotation {
    id: string;
    label: string;
    bbox: { xMin: number; yMin: number; xMax: number; yMax: number };
}

/** One extracted video frame plus whatever bounding-box annotations it currently has. */
export interface FrameData {
    frameIndex: number;
    timestamp: number;
    frameUrl: string;
    annotations: Annotation[];
}

/** Shape of a single frame record as returned by the backend video-labeling task API. */
export interface VideoLabelingApiFrame {
    _id: string;
    frame_index: number;
    timestamp_ms: number;
    url: string;
    width_px: number;
    height_px: number;
    annotated: boolean;
}

/** Shape of a video-labeling task as returned by the backend (task/project metadata,
 *  the source video's payload/metadata, and its pre-extracted frames). */
export interface VideoLabelingTask {
    _id: string;
    task_id: string;
    project_id: string;
    stage: string;
    status: string;
    priority: string;
    payload: {
        video_id: string;
        video_url: string;
        duration_seconds: number;
        frame_count: number;
    };
    annotations: any[];
    video: {
        original_filename: string;
        stored_filename: string;
        duration_seconds: number;
        frame_count: number;
        fps_extracted: number;
        file_size_bytes: number;
    };
    frames: VideoLabelingApiFrame[];
    instructions?: { url?: string };
}

// Base URL for media (video/frame) assets, derived by stripping the API version suffix
// (e.g. `/v0`) off VITE_API_URL so relative asset paths resolve against the media root
// rather than the versioned API root.
const MEDIA_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080/v0').replace(
    /\/v\d+$/,
    '',
);

/**
 * Converts a possibly-relative asset path from the API into an absolute URL the browser can
 * load directly, leaving already-absolute (http/https) URLs untouched.
 * @param path - Relative or absolute asset path/URL from the API.
 * @returns Absolute URL suitable for use in `src`/`href`.
 */
const toAbsUrl = (path: string) =>
    path.startsWith('http') ? path : `${MEDIA_BASE}/${path.replace(/^\//, '')}`;

/**
 * Formats a duration in seconds as `mm:ss`.
 * @param secs - Elapsed time in seconds.
 * @returns Zero-padded `mm:ss` string.
 */
const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Builds the submission payload for the video-labeling task from the current in-memory
 * frames/annotations state, converting field names to the backend's snake_case bbox
 * convention and attaching a summary of annotation coverage.
 * @param frames - Current frame list (each with its annotations).
 * @param status - Submission status to record: 'annotated' (final submit) or 'draft' (save draft).
 * @returns The request body for `submitAnnotation`, including a `summary` block with
 *  total/annotated/unannotated frame counts and total annotation count.
 */
const buildVideoAnnotationPayload = (frames: FrameData[], status: 'annotated' | 'draft') => {
    const annotatedFrames = frames.filter((f) => f.annotations.length > 0);
    const totalAnnotations = frames.reduce((sum, f) => sum + f.annotations.length, 0);

    return {
        status,
        frames: frames.map((f) => ({
            frame_index: f.frameIndex,
            timestamp: f.timestamp,
            frame_url: f.frameUrl,
            annotations: f.annotations.map((ann) => ({
                id: ann.id,
                label: ann.label,
                bbox: {
                    x_min: ann.bbox.xMin,
                    y_min: ann.bbox.yMin,
                    x_max: ann.bbox.xMax,
                    y_max: ann.bbox.yMax,
                },
            })),
        })),
        summary: {
            total_frames: frames.length,
            annotated_frames: annotatedFrames.length,
            unannotated_frames: frames.length - annotatedFrames.length,
            total_annotations: totalAnnotations,
        },
    };
};

const STATUS_COLORS: Record<string, string> = {
    under_annotation: '#f59e0b',
    annotated: '#22c55e',
    draft: '#94a3b8',
};

/**
 * Component: VideoLabeling
 *
 * Purpose: Top-level screen for the `video_labeling` annotation template (see
 * annotationTemplateMap.tsx). Orchestrates fetching/deriving a task's video frames, extracting
 * frames client-side when the server hasn't pre-extracted them, letting the annotator draw
 * labeled bounding boxes per frame, and submitting the final annotation payload.
 *
 * Responsibilities:
 * - Renders the collapsible task header/metadata (filename, duration, frame/progress counts,
 *   stage/status chips) and the Video / Frame Annotations tab switcher.
 * - Derives an initial `frames` array from server-provided frame data when available, or
 *   defers to VideoPlayerPanel's client-side extraction otherwise.
 * - Owns the authoritative `frames` state (each frame's annotation list) and passes update
 *   callbacks down to VideoPlayerPanel (extraction) and FrameAnnotationTab (labeling).
 * - Builds and submits the annotation payload (draft or final) via the userAnnotation Redux
 *   slice, showing toast feedback and refreshing task-availability state on success.
 *
 * Props:
 * - instructionsUrl?: string — accepted for interface parity with other template components
 *   but intentionally unused here (destructured as `_instructionsUrl`); this template does
 *   not show a guidelines banner.
 * - task?: VideoLabelingTask — the task record with video metadata and (optionally)
 *   pre-extracted frames from the backend.
 *
 * State:
 * - taskCollapsed: whether the task header/body card is collapsed.
 * - mainTab: index of the active main tab (0=Video, 1=Frame Annotations).
 * - volume: shared playback volume (0-100) passed to VideoPlayerPanel.
 * - frames: the authoritative, editable list of frames + their annotations for this task.
 *
 * Redux: `useAppDispatch`/`useAppSelector` from `redux/hooks`; reads
 * `selectUserAnnotationSubmitting` and dispatches `submitAnnotation`, `setNoTasksAvailable`,
 * and `fetchProjectTaskUsers` thunks/actions from `redux/slices/userAnnotationSlice`.
 *
 * Custom hooks: `useToast` (`showSuccess`/`showError`) for submission feedback.
 *
 * API calls: `submitAnnotation` thunk posts the built payload for `{ projectId, taskId }`;
 * `fetchProjectTaskUsers` thunk re-fetches task-user assignment state after a successful submit.
 *
 * Major child components: VideoPlayerPanel, FrameAnnotationTab.
 *
 * Important business logic:
 * - `annotatedCount === 0` disables the "Submit Annotation" button — at least one frame must
 *   have an annotation before final submission is allowed (draft save has no such gate).
 * - `hasServerFrames` (derived from `serverFrames.length > 0`) is passed to VideoPlayerPanel to
 *   hide the client-side frame-extraction controls when the server already extracted frames.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const VideoLabeling = ({
    instructionsUrl: _instructionsUrl,
    task,
}: {
    instructionsUrl?: string;
    task?: VideoLabelingTask;
}) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const submitting = useAppSelector(selectUserAnnotationSubmitting);
    const { showSuccess, showError } = useToast();

    const [taskCollapsed, setTaskCollapsed] = useState(false);
    const [mainTab, setMainTab] = useState(0);
    const [volume, setVolume] = useState(80);

    /**
     * Derives the initial frame list from the task's server-provided frames (if any),
     * converting API shape (frame_index/timestamp_ms/url) to the internal FrameData shape
     * and resolving relative URLs to absolute ones. Recomputed only when the task identity
     * (`task?._id`) changes, not on every render, since this is pure derived data from `task`.
     */
    const serverFrames = useMemo<FrameData[]>(() => {
        if (!task?.frames?.length) return [];
        return task.frames.map((f) => ({
            frameIndex: f.frame_index,
            timestamp: f.timestamp_ms / 1000,
            frameUrl: toAbsUrl(f.url),
            annotations: [],
        }));
    }, [task?._id]);

    const [frames, setFrames] = useState<FrameData[]>(serverFrames);

    /**
     * Resets the local, mutable `frames` state whenever the underlying task changes (new
     * `task._id`), so switching to a different task doesn't carry over the previous task's
     * frames/annotations. `serverFrames` is intentionally omitted from the deps array since
     * it is itself derived from `task?._id` — depending on `task?._id` alone avoids
     * re-running this effect on unrelated re-renders.
     */
    useEffect(() => {
        setFrames(serverFrames);
    }, [task?._id]);

    /**
     * Replaces the frames array with the set of frames extracted client-side by
     * VideoPlayerPanel (used only when the server hasn't already pre-extracted frames).
     * @param extracted - Newly extracted frames (each starting with no annotations).
     */
    const handleFramesExtracted = (extracted: FrameData[]) => setFrames(extracted);

    /**
     * Replaces the annotation list for a single frame, identified by its frameIndex,
     * leaving all other frames untouched. Passed to FrameAnnotationTab as `onUpdateAnnotations`.
     * @param frameIndex - Index of the frame being updated.
     * @param annotations - The frame's full new annotation list.
     */
    const updateFrameAnnotations = (frameIndex: number, annotations: Annotation[]) => {
        setFrames((prev) =>
            prev.map((f) => (f.frameIndex === frameIndex ? { ...f, annotations } : f)),
        );
    };

    /**
     * Submits the current frames/annotations as either a draft or a final annotation.
     * Builds the payload via {@link buildVideoAnnotationPayload}, dispatches the
     * `submitAnnotation` thunk, and surfaces success/failure via toast notifications. On
     * success also clears the "no tasks available" flag and re-fetches project task-user
     * assignments so the task list reflects the new state.
     * @param status - 'annotated' for final submission, 'draft' for a draft save.
     * @throws Does not throw — submission errors are caught and shown via `showError`.
     */
    const handleSubmit = async (status: 'annotated' | 'draft') => {
        if (!task?._id || !task?.project_id) return;
        const payload = buildVideoAnnotationPayload(frames, status);
        try {
            await dispatch(
                submitAnnotation({ projectId: task.project_id, taskId: task._id, data: payload }),
            ).unwrap();
            showSuccess(status === 'annotated' ? 'Annotation submitted!' : 'Draft saved!');
            dispatch(setNoTasksAvailable(false));
            dispatch(fetchProjectTaskUsers(task.project_id));
        } catch (err: any) {
            showError(err?.message || 'Submission failed');
        }
    };

    const annotatedCount = frames.filter((f) => f.annotations.length > 0).length;
    const videoUrl = task?.payload?.video_url ? toAbsUrl(task.payload.video_url) : undefined;
    const hasServerFrames = serverFrames.length > 0;

    const metadataItems = [
        { label: 'File', value: task?.video?.original_filename ?? '—' },
        {
            label: 'Duration',
            value:
                task?.video?.duration_seconds != null
                    ? formatDuration(task.video.duration_seconds)
                    : '—',
        },
        {
            label: 'Frames',
            chip: `${frames.length} / ${task?.payload?.frame_count ?? task?.video?.frame_count ?? frames.length}`,
        },
        { label: 'Progress', chip: `${annotatedCount} / ${frames.length} annotated` },
    ];

    return (
        <Box sx={{ p: 2 }}>
            <Card sx={{ borderLeft: '4px solid #3b82f6', borderRadius: 2 }}>
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
                    <VideocamIcon sx={{ fontSize: 20, color: '#3b82f6', flexShrink: 0 }} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                            Video Labeling &amp; Frame Annotation
                            {task?.task_id ? ` • ${task.task_id}` : ''}
                        </Typography>
                        {!taskCollapsed && (
                            <Typography variant="caption" color="text.secondary">
                                Annotate objects with bounding boxes and labels on extracted video frames
                            </Typography>
                        )}
                    </Box>
                    {task?.stage && (
                        <Chip
                            label={`Stage: ${task.stage}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', bgcolor: alpha('#3b82f6', 0.06) }}
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

                {/* Card body */}
                <Collapse in={!taskCollapsed}>
                    <Box sx={{ p: 2 }}>
                        {/* Metadata row */}
                        <Box
                            sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 2 }}
                        >
                            {metadataItems.map((item) => (
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
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                            title={item.value}
                                        >
                                            {item.value}
                                        </Typography>
                                    )}
                                </Box>
                            ))}
                        </Box>

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
                                label="Video"
                            />
                            <Tab
                                icon={<ImageIcon sx={{ fontSize: 16 }} />}
                                iconPosition="start"
                                label={`Frame Annotations (${frames.length})`}
                            />
                        </Tabs>

                        {mainTab === 0 && (
                            <VideoPlayerPanel
                                volume={volume}
                                onVolumeChange={setVolume}
                                frames={frames}
                                onFramesExtracted={handleFramesExtracted}
                                url={videoUrl}
                                framesFromServer={hasServerFrames}
                            />
                        )}
                        {mainTab === 1 && (
                            <FrameAnnotationTab
                                frames={frames}
                                onUpdateAnnotations={updateFrameAnnotations}
                            />
                        )}

                        {/* Footer actions */}
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
                            <Button
                                variant="outlined"
                                size="medium"
                                disabled={submitting}
                                onClick={() => handleSubmit('draft')}
                                startIcon={
                                    submitting ? <CircularProgress size={14} color="inherit" /> : undefined
                                }
                            >
                                Save Draft
                            </Button>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button variant="outlined" size="medium" disabled={submitting}>
                                    Skip
                                </Button>
                                <Button
                                    variant="contained"
                                    size="medium"
                                    // Why: require at least one annotated frame before allowing final submission.
                                    disabled={submitting || annotatedCount === 0}
                                    onClick={() => handleSubmit('annotated')}
                                    startIcon={
                                        submitting ? (
                                            <CircularProgress size={14} color="inherit" />
                                        ) : undefined
                                    }
                                    sx={{ bgcolor: '#030213', '&:hover': { bgcolor: '#161616' } }}
                                >
                                    {submitting ? 'Submitting…' : 'Submit Annotation'}
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Collapse>
            </Card>
        </Box>
    );
};

export default VideoLabeling;
