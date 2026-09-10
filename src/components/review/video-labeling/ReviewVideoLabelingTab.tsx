import { useState, useRef, useMemo } from 'react';
import ReactPlayer from 'react-player';
import {
    Box,
    Typography,
    Card,
    Chip,
    Slider,
    IconButton,
    alpha,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

const LABEL_COLORS: Record<string, string> = {
    'Display Structure - Shelving': '#3b82f6',
    'Display Structure - Bin / Produce': '#22c55e',
    'Display Structure - Fridge': '#06b6d4',
    'Display Structure - Peg': '#f59e0b',
    'Display Structure - End Cap': '#8b5cf6',
    'Display Structure - Bunker': '#ef4444',
    'Display Structure - Table': '#ec4899',
    'Display Structure - Pallet': '#64748b',
    'Display Structure - Bin': '#84cc16',
    'Display Structure - Sidekick': '#f97316',
    'Display Structure - Clip Strip': '#14b8a6',
    'Display Structure - Gravity Dispenser': '#a855f7',
    'Display Structure - Service Counter': '#0ea5e9',
};
/** Looks up the display color for a bounding-box label, falling back to a neutral gray. */
const getLabelColor = (label: string) => LABEL_COLORS[label] ?? '#94a3b8';

/**
 * Formats a duration in seconds as `MM:SS` for the player's time readout.
 * @param secs - elapsed/total time in seconds.
 * @returns a zero-padded `MM:SS` string.
 */
const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Derives the media host (stripping the trailing /v{n} API version segment) so relative
// video/frame paths returned by the API can be resolved to absolute URLs.
const MEDIA_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080/v0').replace(
    /\/v\d+$/,
    '',
);
/**
 * Resolves a possibly-relative media path (e.g. the task's video URL) to an absolute URL
 * rooted at `MEDIA_BASE`. Paths already starting with `http` pass through unchanged.
 * @param path - relative or absolute path/URL returned by the API.
 * @returns an absolute URL.
 */
const toAbsUrl = (path: string) =>
    path.startsWith('http') ? path : `${MEDIA_BASE}/${path.replace(/^\//, '')}`;

interface ApiBoundingBox {
    id: string;
    label: string;
    bbox: { x_min: number; y_min: number; x_max: number; y_max: number };
    annotator: { id: string; name: string; email: string } | null;
    annotated_at: string | null;
}

interface ApiFrame {
    frame_index: number;
    timestamp_ms: number;
    url: string;
    annotated: boolean;
    bounding_boxes: ApiBoundingBox[];
}

interface ReviewTaskDetail {
    payload: { video_url: string; duration_seconds: number };
    frames: ApiFrame[];
    annotation_summary?: {
        total_frames: number;
        annotated_frames: number;
        total_annotations: number;
    };
}

interface FlatBox {
    id: string;
    label: string;
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    frameTs: number;
    frameIndex: number;
}

interface Props {
    videoUrl?: string;
    taskDetail?: ReviewTaskDetail | null;
}

// Half-width (seconds) of the window around the playhead within which a frame's bounding
// boxes are considered "current" and shown as overlays — sized to roughly match the
// ~0.5s sampling interval between annotated frames, so exactly one frame's boxes are
// visible at a time as the video plays.
const FRAME_WINDOW = 0.28; // half a ~0.5s frame interval

/**
 * Component: ReviewVideoLabelingTab
 *
 * Purpose: Sub-tab of `VideoLabelingReview` presenting the full video with bounding-box
 * overlays synced to the current playback position, plus a list of all annotated frames
 * and their boxes below the player.
 *
 * Responsibilities:
 * - Play the task's video and overlay bounding boxes for whichever annotated frame is
 *   closest to the current playhead position.
 * - Mark annotated-frame timestamps as dots on the seek bar.
 * - Let the reviewer toggle overlay visibility on/off.
 * - List every annotated frame with its bounding boxes below the player.
 *
 * Props:
 * - videoUrl (string, optional): unused directly — accepted for interface compatibility
 *   but the actual video source comes from `taskDetail.payload.video_url` (see
 *   `resolvedVideoUrl` below); destructured as `_videoUrl` to signal it's intentionally unused.
 * - taskDetail (ReviewTaskDetail | null, optional): reviewer-task detail payload (video URL,
 *   frames with bounding boxes) fetched by the parent via `projectApi.getReviewerTaskById`.
 *
 * State:
 * - playing (boolean): video play/pause state.
 * - playedSeconds (number): current playback position, synced from the `<video>` element.
 * - duration (number): total video duration.
 * - volume (number): current volume (0-100).
 * - showOverlay (boolean): whether bounding-box overlays are currently rendered on the video.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ReviewVideoLabelingTab = ({ videoUrl: _videoUrl, taskDetail }: Props) => {
    const playerRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [playedSeconds, setPlayedSeconds] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(80);
    const [showOverlay, setShowOverlay] = useState(true);

    // Memoized: only needs to recompute when the task's video URL actually changes,
    // not on every render (e.g. while playback position updates state frequently).
    const resolvedVideoUrl = useMemo(
        () => (taskDetail?.payload?.video_url ? toAbsUrl(taskDetail.payload.video_url) : undefined),
        [taskDetail?.payload?.video_url],
    );

    // Memoized: flattens all frames' bounding boxes into one array with each box's
    // frame timestamp attached, so overlay lookups don't re-flatten on every render
    // (this list is filtered per-frame on every playback tick via `visibleBoxes` below).
    const allBoxes = useMemo<FlatBox[]>(() => {
        if (!taskDetail?.frames) return [];
        return taskDetail.frames.flatMap((f) =>
            f.bounding_boxes.map((bb) => ({
                id: bb.id,
                label: bb.label,
                xMin: bb.bbox.x_min,
                yMin: bb.bbox.y_min,
                xMax: bb.bbox.x_max,
                yMax: bb.bbox.y_max,
                frameTs: f.timestamp_ms / 1000,
                frameIndex: f.frame_index,
            })),
        );
    }, [taskDetail?.frames]);

    // Memoized: precomputes the "annotations by frame" list used in the summary section
    // below the player, avoiding a re-filter of all frames on every unrelated re-render.
    const annotatedFrames = useMemo(
        () => taskDetail?.frames.filter((f) => f.annotated && f.bounding_boxes.length > 0) ?? [],
        [taskDetail?.frames],
    );

    // Why: only show boxes belonging to the frame nearest the current playhead (within
    // FRAME_WINDOW seconds) so overlays visually track playback instead of showing every
    // annotated frame's boxes at once. Not memoized since it depends on playedSeconds,
    // which changes on every video timeupdate tick.
    const visibleBoxes = showOverlay
        ? allBoxes.filter((b) => Math.abs(b.frameTs - playedSeconds) < FRAME_WINDOW)
        : [];

    /**
     * Handles scrubbing the seek slider: updates local playback-position state and
     * imperatively sets the underlying `<video>` element's `currentTime` to match.
     * @param _ - the slider's change event (unused).
     * @param value - the new slider value in seconds (single-thumb slider, always a number).
     */
    const handleSeek = (_: Event, value: number | number[]) => {
        const secs = value as number;
        setPlayedSeconds(secs);
        if (playerRef.current) playerRef.current.currentTime = secs;
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* ── Video player ──────────────────────────────────────── */}
            <Box sx={{ bgcolor: '#0f172a', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                    <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                        <ReactPlayer
                            ref={playerRef}
                            src={resolvedVideoUrl}
                            playing={playing}
                            volume={volume / 100}
                            width="100%"
                            height="100%"
                            onTimeUpdate={(e) => setPlayedSeconds((e.target as HTMLVideoElement).currentTime)}
                            onDurationChange={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                        />
                    </Box>

                    {/* Bounding box overlays synced to playhead */}
                    {visibleBoxes.map((box) => {
                        const color = getLabelColor(box.label);
                        return (
                            <Box
                                key={box.id}
                                sx={{
                                    position: 'absolute',
                                    left: `${box.xMin * 100}%`,
                                    top: `${box.yMin * 100}%`,
                                    width: `${(box.xMax - box.xMin) * 100}%`,
                                    height: `${(box.yMax - box.yMin) * 100}%`,
                                    border: `2px solid ${color}`,
                                    bgcolor: alpha(color, 0.12),
                                    zIndex: 2,
                                    pointerEvents: 'none',
                                }}
                            >
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: -20,
                                        left: 0,
                                        bgcolor: color,
                                        color: '#fff',
                                        fontSize: '0.55rem',
                                        fontWeight: 700,
                                        px: 0.75,
                                        py: 0.2,
                                        borderRadius: '3px 3px 3px 0',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {box.label}
                                </Box>
                            </Box>
                        );
                    })}

                    {/* Controls overlay */}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                            px: 2,
                            pt: 5,
                            pb: 1.5,
                            zIndex: 3,
                        }}
                    >
                        {/* Frame marker dots */}
                        <Box sx={{ position: 'relative', height: 10, mb: 0.5 }}>
                            {allBoxes
                                .filter((b, i, arr) => arr.findIndex((x) => x.frameTs === b.frameTs) === i)
                                .map((b) => (
                                    <Box
                                        key={b.frameTs}
                                        title={formatTime(b.frameTs)}
                                        sx={{
                                            position: 'absolute',
                                            left: `${(b.frameTs / (duration || 1)) * 100}%`,
                                            transform: 'translateX(-50%)',
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            bgcolor: '#22c55e',
                                            border: '1px solid rgba(255,255,255,0.5)',
                                            top: 2,
                                        }}
                                    />
                                ))}
                        </Box>

                        <Slider
                            value={playedSeconds}
                            min={0}
                            max={duration || 1}
                            onChange={handleSeek}
                            sx={{
                                mb: 1,
                                color: '#fff',
                                height: 4,
                                p: 0,
                                '& .MuiSlider-thumb': { width: 12, height: 12 },
                                '& .MuiSlider-rail': { bgcolor: '#475569', opacity: 1 },
                                '& .MuiSlider-track': { bgcolor: '#fff' },
                            }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    onClick={() => { setPlayedSeconds(0); if (playerRef.current) playerRef.current.currentTime = 0; }}
                                    sx={{ color: '#fff', width: 30, height: 30, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                                >
                                    <SkipPreviousIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => setPlaying((p) => !p)}
                                    sx={{ color: '#fff', width: 30, height: 30, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                                >
                                    {playing ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />}
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => { setPlayedSeconds(duration); if (playerRef.current) playerRef.current.currentTime = duration; }}
                                    sx={{ color: '#fff', width: 30, height: 30, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                                >
                                    <SkipNextIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <Typography sx={{ color: '#fff', fontSize: '0.72rem', ml: 0.5 }}>
                                    {formatTime(playedSeconds)} / {formatTime(duration)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    title={showOverlay ? 'Hide annotations' : 'Show annotations'}
                                    onClick={() => setShowOverlay((v) => !v)}
                                    sx={{
                                        color: showOverlay ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                                        width: 30, height: 30,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                                    }}
                                >
                                    {showOverlay ? <VisibilityIcon sx={{ fontSize: 16 }} /> : <VisibilityOffIcon sx={{ fontSize: 16 }} />}
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => setVolume((v) => (v > 0 ? 0 : 80))}
                                    sx={{ color: '#fff', width: 30, height: 30, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                                >
                                    {volume > 0 ? <VolumeUpIcon sx={{ fontSize: 16 }} /> : <VolumeOffIcon sx={{ fontSize: 16 }} />}
                                </IconButton>
                                <IconButton
                                    size="small"
                                    sx={{ color: '#fff', width: 30, height: 30, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                                >
                                    <FullscreenIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* ── Stats row ─────────────────────────────────────────── */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip
                    label={`${annotatedFrames.length} annotated frame${annotatedFrames.length !== 1 ? 's' : ''}`}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                />
                <Chip
                    label={`${allBoxes.length} total annotation${allBoxes.length !== 1 ? 's' : ''}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                />
                <Chip
                    label={showOverlay ? 'Overlays ON' : 'Overlays OFF'}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', cursor: 'pointer' }}
                    onClick={() => setShowOverlay((v) => !v)}
                />
            </Box>

            {/* ── Annotations list per annotated frame ──────────────── */}
            {annotatedFrames.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                    No annotated frames in this task
                </Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                        Annotations by Frame
                    </Typography>
                    {annotatedFrames.map((frame) => (
                        <Card key={frame.frame_index} variant="outlined" sx={{ borderRadius: 2 }}>
                            <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    Frame #{frame.frame_index + 1}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    @ {formatTime(frame.timestamp_ms / 1000)}
                                </Typography>
                                <Chip
                                    label={`${frame.bounding_boxes.length} box${frame.bounding_boxes.length !== 1 ? 'es' : ''}`}
                                    size="small"
                                    color="success"
                                    sx={{ fontSize: '0.6rem', height: 18, ml: 'auto' }}
                                />
                            </Box>
                            <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {frame.bounding_boxes.map((bb) => {
                                    const color = getLabelColor(bb.label);
                                    const wPct = Math.round((bb.bbox.x_max - bb.bbox.x_min) * 100);
                                    const hPct = Math.round((bb.bbox.y_max - bb.bbox.y_min) * 100);
                                    return (
                                        <Box
                                            key={bb.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                px: 1,
                                                py: 0.5,
                                                borderRadius: 1,
                                                bgcolor: alpha(color, 0.06),
                                                border: `1px solid ${alpha(color, 0.2)}`,
                                            }}
                                        >
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.75rem', flex: 1 }}>
                                                {bb.label}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                                                {wPct}×{hPct}%
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Card>
                    ))}
                </Box>
            )}
        </Box>
    );
};

export default ReviewVideoLabelingTab;
