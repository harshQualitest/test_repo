import { useState, useRef, useCallback } from 'react';
import ReactPlayer from 'react-player';
import {
    Box,
    Typography,
    Card,
    Chip,
    Button,
    IconButton,
    Slider,
    Select,
    MenuItem,
    alpha,
    useTheme,
    LinearProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import type { FrameData, Annotation } from './VideoLabeling';

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

/**
 * Looks up the display color assigned to a display-structure label, falling back to a
 * neutral gray for any label not in the LABEL_COLORS map (defensive default).
 * @param label - The label text to look up.
 * @returns Hex color string.
 */
const getLabelColor = (label: string) => LABEL_COLORS[label] ?? '#94a3b8';

/**
 * Formats a duration in seconds as `mm:ss`.
 * @param secs - Elapsed time in seconds.
 * @returns Zero-padded `mm:ss` string.
 */
const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

interface Props {
    /** Current shared playback volume (0-100), lifted to the parent VideoLabeling screen. */
    volume: number;
    /** Callback to update the shared volume when the user adjusts controls in this panel. */
    onVolumeChange: (v: number) => void;
    /** Current frames (with any existing annotations) — used to sync overlays to the playhead
     *  and render the frame-marker dots / filmstrip. */
    frames: FrameData[];
    /** Called with the newly extracted frame list once client-side extraction completes. */
    onFramesExtracted: (frames: FrameData[]) => void;
    /** Video source URL to play and (if extraction is needed) sample frames from. */
    url?: string;
    /** When true the frames were pre-extracted by the server — hides the client-side extraction UI. */
    framesFromServer?: boolean;
}

/**
 * Component: VideoPlayerPanel
 *
 * Purpose: Renders the "Video" main tab of the video-labeling screen — a video player with
 * bounding-box overlays synced to the nearest extracted frame, plus (when the server hasn't
 * already pre-extracted frames) client-side frame-extraction controls and an extracted-frames
 * filmstrip.
 *
 * Responsibilities:
 * - Plays the task video with transport controls (play/pause, skip, speed, mute, overlay toggle).
 * - Renders bounding-box overlays for whichever frame's timestamp is currently closest to the
 *   playhead, only while the playhead is close enough to that frame's timestamp to be
 *   meaningfully "on" it.
 * - Draws small marker dots along the timeline for every other extracted frame (color-coded
 *   by whether that frame has annotations), to give a low-cost visual overview of labeling progress.
 * - When `framesFromServer` is false, offers a button to extract frames from the video client-side
 *   at a fixed 2 FPS rate via an off-screen `<video>`/`<canvas>` pair, reporting progress and
 *   surfacing extraction errors (including partial success when canvas capture is CORS-blocked).
 * - Renders a horizontal filmstrip of all extracted frames with per-frame annotation-count badges.
 *
 * Props: see {@link Props} above (volume, onVolumeChange, frames, onFramesExtracted, url, framesFromServer).
 *
 * State:
 * - playing: whether the video is currently playing.
 * - playedSeconds: current playhead position in seconds — drives both the overlay sync and
 *   the timeline marker positions.
 * - duration: total video duration in seconds, set from the player's `durationchange` event.
 * - speed: selected playback rate label (e.g. '1x').
 * - showOverlay: whether annotation overlays/HUD are shown at all (a manual visibility toggle).
 * - extracting: whether client-side frame extraction is currently in progress.
 * - extractionProgress / extractionTotal: current/total frame count for the extraction
 *   progress bar.
 * - extractionError: human-readable message describing an extraction failure or partial
 *   success (e.g. CORS-blocked thumbnails), empty string when there's nothing to report.
 *
 * Major child components: ReactPlayer (video element); hidden `<video>`/`<canvas>` elements
 * used purely as an off-screen frame-sampling mechanism (never rendered visibly).
 *
 * Important business logic:
 * - Frame/timestamp sync: {@link activeFrame} below finds the single frame whose `timestamp`
 *   is numerically closest to `playedSeconds`; {@link visibleAnnotations} then gates whether
 *   that frame's boxes are actually drawn based on a 0.26s proximity threshold, so overlays
 *   don't appear to "snap" onto a frame from far away in time.
 * - Frame extraction runs at a fixed 2 FPS (INTERVAL = 0.5s) sampling rate — see `extractFrames`
 *   below for the full seek-and-capture loop and its CORS/timeout fallbacks.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const VideoPlayerPanel = ({
    volume,
    onVolumeChange,
    frames,
    onFramesExtracted,
    url,
    framesFromServer = false,
}: Props) => {
    const theme = useTheme();
    const playerRef = useRef<HTMLVideoElement>(null);
    const hiddenVideoRef = useRef<HTMLVideoElement>(null);
    const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

    const [playing, setPlaying] = useState(false);
    const [playedSeconds, setPlayedSeconds] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState('1x');
    const [showOverlay, setShowOverlay] = useState(true);
    const [extracting, setExtracting] = useState(false);
    const [extractionProgress, setExtractionProgress] = useState(0);
    const [extractionTotal, setExtractionTotal] = useState(0);
    const [extractionError, setExtractionError] = useState('');

    // Find the frame whose timestamp is closest to the current playhead
    const activeFrame: FrameData | null =
        frames.length > 0
            ? frames.reduce((best, f) =>
                  Math.abs(f.timestamp - playedSeconds) < Math.abs(best.timestamp - playedSeconds) ? f : best,
              )
            : null;

    // Only show overlay annotations when the playhead is within 0.26s of the frame's timestamp
    const visibleAnnotations: Annotation[] =
        showOverlay && activeFrame && Math.abs(activeFrame.timestamp - playedSeconds) < 0.26
            ? activeFrame.annotations
            : [];

    /**
     * MUI Slider onChange adapter for the progress bar — seeks both the local playhead state
     * and the underlying `<video>` element to the new position.
     * @param _ - Unused MUI change event.
     * @param value - New slider value (single number, since this slider is not a range).
     */
    const handleSeek = (_: Event, value: number | number[]) => {
        const secs = value as number;
        setPlayedSeconds(secs);
        if (playerRef.current) playerRef.current.currentTime = secs;
    };

    /**
     * Extracts frames from the video client-side at a fixed 2 FPS rate by driving a hidden
     * `<video>` element through every sample timestamp and capturing each frame onto a hidden
     * `<canvas>` as a JPEG data URL. Reports progress via `extractionProgress`/`extractionTotal`
     * and surfaces failures (or partial success) via `extractionError`.
     *
     * Steps:
     * 1. Loads the video into the hidden `<video>` element, waiting for `loadedmetadata`
     *    (with a 30s timeout) to learn its true duration before sampling.
     * 2. Builds the list of sample timestamps at 0.5s (2 FPS) intervals from 0 to duration.
     * 3. For each timestamp: seeks the hidden video there (waiting for `seeked`, with a 2s
     *    fallback in case the browser doesn't fire it when already at that position), draws
     *    the current video frame onto the canvas, and reads it back as a JPEG data URL.
     * 4. If the canvas is tainted (cross-origin video served without CORS headers),
     *    `toDataURL` throws — extraction continues with blank thumbnails for the rest of the
     *    frames (timestamps/annotations still work) rather than aborting entirely.
     * 5. Calls `onFramesExtracted` with the full extracted list once all timestamps are processed.
     *
     * Recreated only when `url` or `onFramesExtracted` changes, since those are its only
     * external dependencies — keeps the callback referentially stable for the "Extract
     * Frames" button between unrelated re-renders.
     * @throws Never throws outward — all internal errors are caught and stored in `extractionError`.
     */
    const extractFrames = useCallback(async () => {
        const video = hiddenVideoRef.current;
        const canvas = hiddenCanvasRef.current;
        if (!video || !canvas || !url) return;

        setExtracting(true);
        setExtractionProgress(0);
        setExtractionError('');

        try {
            // Set up listeners BEFORE assigning src to avoid race condition.
            // No crossOrigin attribute — avoids CORS rejection on servers without CORS headers.
            // Canvas may be tainted for cross-origin videos; we handle that below.
            await new Promise<void>((resolve, reject) => {
                const tid = setTimeout(() => {
                    cleanup();
                    reject(new Error('Timed out loading video metadata. Check the video URL is reachable.'));
                }, 30_000);

                const cleanup = () => {
                    clearTimeout(tid);
                    video.removeEventListener('loadedmetadata', onMeta);
                    video.removeEventListener('error', onError);
                };
                const onMeta = () => { cleanup(); resolve(); };
                const onError = () => {
                    cleanup();
                    reject(new Error('Failed to load video. Ensure the URL is accessible from this browser.'));
                };

                video.addEventListener('loadedmetadata', onMeta);
                video.addEventListener('error', onError);
                video.preload = 'auto';
                video.src = url;
                video.load();
            });

            const videoDuration = video.duration;
            const INTERVAL = 0.5; // 2 FPS
            const timestamps: number[] = [];
            for (let t = 0; t <= videoDuration + 0.001; t = Math.round((t + INTERVAL) * 10) / 10) {
                timestamps.push(parseFloat(t.toFixed(1)));
            }

            setExtractionTotal(timestamps.length);
            const extractedFrames: FrameData[] = [];
            let canvasBlocked = false;

            for (let i = 0; i < timestamps.length; i++) {
                video.currentTime = timestamps[i];

                // Wait for seek to complete; 2 s fallback in case seeked never fires
                // (happens when the video is already at that position).
                await new Promise<void>((resolve) => {
                    const tid = setTimeout(resolve, 2000);
                    const onSeeked = () => {
                        clearTimeout(tid);
                        video.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    video.addEventListener('seeked', onSeeked);
                });

                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 360;
                const ctx = canvas.getContext('2d');
                let frameUrl = '';

                if (ctx && !canvasBlocked) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    try {
                        frameUrl = canvas.toDataURL('image/jpeg', 0.7);
                    } catch {
                        // Canvas is tainted (cross-origin video without CORS headers).
                        // Frames are still created so annotations work; thumbnails stay blank.
                        canvasBlocked = true;
                    }
                }

                extractedFrames.push({
                    frameIndex: i,
                    timestamp: timestamps[i],
                    frameUrl,
                    annotations: [],
                });

                setExtractionProgress(i + 1);
            }

            onFramesExtracted(extractedFrames);

            if (canvasBlocked) {
                setExtractionError(
                    'Frame thumbnails unavailable: the video server does not allow cross-origin canvas access. ' +
                    'Annotations still work — timestamps and bounding boxes are saved normally.',
                );
            }
        } catch (err) {
            setExtractionError(err instanceof Error ? err.message : 'Extraction failed');
        } finally {
            setExtracting(false);
        }
    }, [url, onFramesExtracted]);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Hidden elements for frame extraction — no crossOrigin so the video always loads */}
            <video ref={hiddenVideoRef} style={{ display: 'none' }} />
            <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

            {/* ── Video player ──────────────────────────────────────── */}
            <Box sx={{ bgcolor: '#0f172a', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                    {/* Player */}
                    <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                        <ReactPlayer
                            ref={playerRef}
                            src={url}
                            playing={playing}
                            volume={volume / 100}
                            playbackRate={parseFloat(speed)}
                            width="100%"
                            height="100%"
                            onTimeUpdate={(e) => setPlayedSeconds((e.target as HTMLVideoElement).currentTime)}
                            onDurationChange={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                        />
                    </Box>

                    {/* ── Annotation overlays synchronized to playhead ── */}
                    {visibleAnnotations.map((ann) => {
                        const color = getLabelColor(ann.label);
                        const { xMin, yMin, xMax, yMax } = ann.bbox;
                        return (
                            <Box
                                key={ann.id}
                                sx={{
                                    position: 'absolute',
                                    left: `${xMin * 100}%`,
                                    top: `${yMin * 100}%`,
                                    width: `${(xMax - xMin) * 100}%`,
                                    height: `${(yMax - yMin) * 100}%`,
                                    border: `2px solid ${color}`,
                                    boxShadow: `0 0 0 1px rgba(0,0,0,0.4)`,
                                    bgcolor: alpha(color, 0.1),
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
                                        color: 'white',
                                        fontSize: '0.55rem',
                                        fontWeight: 700,
                                        px: 0.75,
                                        py: 0.2,
                                        borderRadius: '3px 3px 3px 0',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {ann.label}
                                </Box>
                            </Box>
                        );
                    })}

                    {/* Active frame HUD */}
                    {showOverlay && activeFrame && Math.abs(activeFrame.timestamp - playedSeconds) < 0.26 && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 10,
                                left: 10,
                                bgcolor: 'rgba(0,0,0,0.65)',
                                color: 'white',
                                fontSize: '0.62rem',
                                fontWeight: 600,
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                zIndex: 4,
                                pointerEvents: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    bgcolor: activeFrame.annotations.length > 0 ? '#22c55e' : '#f59e0b',
                                    flexShrink: 0,
                                }}
                            />
                            Frame @ {formatTime(activeFrame.timestamp)}
                            {visibleAnnotations.length > 0 &&
                                ` • ${visibleAnnotations.length} label${visibleAnnotations.length !== 1 ? 's' : ''}`}
                        </Box>
                    )}

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
                        {/* Frame marker dots — show every 4th to avoid clutter */}
                        <Box sx={{ position: 'relative', height: 10, mb: 0.5 }}>
                            {frames
                                .filter((_, i) => i % 2 === 0)
                                .map((frame) => (
                                    <Box
                                        key={frame.frameIndex}
                                        title={formatTime(frame.timestamp)}
                                        sx={{
                                            position: 'absolute',
                                            left: `${(frame.timestamp / (duration || 1)) * 100}%`,
                                            transform: 'translateX(-50%)',
                                            width: 5,
                                            height: 5,
                                            borderRadius: '50%',
                                            bgcolor: frame.annotations.length > 0 ? '#22c55e' : '#f59e0b',
                                            border: '1px solid rgba(255,255,255,0.5)',
                                            top: 2.5,
                                        }}
                                    />
                                ))}
                        </Box>

                        {/* Progress slider */}
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
                            {/* Left controls */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setPlayedSeconds(0);
                                        if (playerRef.current) playerRef.current.currentTime = 0;
                                    }}
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
                                    onClick={() => {
                                        setPlayedSeconds(duration);
                                        if (playerRef.current) playerRef.current.currentTime = duration;
                                    }}
                                    sx={{ color: '#fff', width: 30, height: 30, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                                >
                                    <SkipNextIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <Typography sx={{ color: '#fff', fontSize: '0.72rem', ml: 0.5 }}>
                                    {formatTime(playedSeconds)} / {formatTime(duration)}
                                </Typography>
                            </Box>

                            {/* Right controls */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    title={showOverlay ? 'Hide annotations' : 'Show annotations'}
                                    onClick={() => setShowOverlay((v) => !v)}
                                    sx={{
                                        color: showOverlay ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                                        width: 30,
                                        height: 30,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                                    }}
                                >
                                    {showOverlay ? (
                                        <VisibilityIcon sx={{ fontSize: 16 }} />
                                    ) : (
                                        <VisibilityOffIcon sx={{ fontSize: 16 }} />
                                    )}
                                </IconButton>
                                <Select
                                    value={speed}
                                    onChange={(e) => setSpeed(e.target.value)}
                                    size="small"
                                    sx={{
                                        height: 26,
                                        fontSize: '0.7rem',
                                        minWidth: 52,
                                        color: '#fff',
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                                        '& .MuiSelect-icon': { color: '#fff' },
                                    }}
                                >
                                    {['0.5x', '1x', '1.5x', '2x'].map((s) => (
                                        <MenuItem key={s} value={s} sx={{ fontSize: '0.72rem' }}>
                                            {s}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <IconButton
                                    size="small"
                                    onClick={() => onVolumeChange(volume > 0 ? 0 : 80)}
                                    sx={{ color: '#fff', width: 30, height: 30, '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                                >
                                    {volume > 0 ? (
                                        <VolumeUpIcon sx={{ fontSize: 16 }} />
                                    ) : (
                                        <VolumeOffIcon sx={{ fontSize: 16 }} />
                                    )}
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

            {/* ── Frame extraction controls (hidden when server already extracted frames) ── */}
            {!framesFromServer && <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <Box sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                            Frame Extraction (2 FPS)
                        </Typography>
                        <Chip
                            label={`${frames.length} frame${frames.length !== 1 ? 's' : ''} extracted`}
                            size="small"
                            color={frames.length > 0 ? 'primary' : 'default'}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                        />
                    </Box>

                    {extracting ? (
                        <Box>
                            <Box
                                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}
                            >
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                                    Extracting frames… {extractionProgress} / {extractionTotal}
                                </Typography>
                                <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.72rem' }}>
                                    {extractionTotal > 0
                                        ? Math.round((extractionProgress / extractionTotal) * 100)
                                        : 0}
                                    %
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={extractionTotal > 0 ? (extractionProgress / extractionTotal) * 100 : 0}
                                sx={{ borderRadius: 1 }}
                            />
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                                    onClick={extractFrames}
                                    disabled={!url}
                                    sx={{
                                        fontSize: '0.78rem',
                                        height: 32,
                                        textTransform: 'none',
                                        bgcolor: '#3b82f6',
                                        '&:hover': { bgcolor: '#2563eb' },
                                    }}
                                >
                                    {frames.length > 0 ? 'Re-Extract Frames' : 'Extract Frames (2 FPS)'}
                                </Button>
                                {frames.length > 0 && !extractionError && (
                                    <Typography variant="caption" color="success.main" sx={{ fontSize: '0.72rem' }}>
                                        ✓ {frames.length} frames ready — switch to Frame Annotations tab to label them
                                    </Typography>
                                )}
                            </Box>
                            {extractionError && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: '0.72rem',
                                        color: frames.length > 0 ? 'warning.main' : 'error.main',
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {frames.length > 0 ? '⚠ ' : '✗ '}{extractionError}
                                </Typography>
                            )}
                        </Box>
                    )}

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: 'block', fontSize: '0.7rem' }}
                    >
                        Extracts exactly 2 frames per second (t = 0.0, 0.5, 1.0 …). Yellow dots on the timeline mark
                        extracted frames; green dots have annotations.
                    </Typography>
                </Box>
            </Card>}

            {/* ── Extracted frames filmstrip ────────────────────────── */}
            {frames.length > 0 && (
                <Box>
                    <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
                        Extracted Frames ({frames.length})
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 1,
                            overflowX: 'auto',
                            pb: 1,
                            '&::-webkit-scrollbar': { height: 4 },
                            '&::-webkit-scrollbar-track': { bgcolor: 'action.hover', borderRadius: 2 },
                            '&::-webkit-scrollbar-thumb': { bgcolor: 'action.selected', borderRadius: 2 },
                        }}
                    >
                        {frames.map((frame) => (
                            <Box key={frame.frameIndex} sx={{ flexShrink: 0, width: 90 }}>
                                <Box
                                    sx={{
                                        width: '100%',
                                        paddingTop: '56.25%',
                                        position: 'relative',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        border: `2px solid ${frame.annotations.length > 0 ? '#22c55e' : theme.palette.divider}`,
                                        mb: 0.5,
                                    }}
                                >
                                    <Box sx={{ position: 'absolute', inset: 0 }}>
                                        <img
                                            src={frame.frameUrl}
                                            alt={`Frame ${frame.frameIndex}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </Box>
                                    {frame.annotations.length > 0 && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                bottom: 3,
                                                right: 3,
                                                bgcolor: 'rgba(0,0,0,0.7)',
                                                color: 'white',
                                                fontSize: '0.6rem',
                                                fontWeight: 600,
                                                px: 0.5,
                                                py: 0.125,
                                                borderRadius: 0.5,
                                            }}
                                        >
                                            {frame.annotations.length}
                                        </Box>
                                    )}
                                </Box>
                                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                                    {formatTime(frame.timestamp)}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default VideoPlayerPanel;
