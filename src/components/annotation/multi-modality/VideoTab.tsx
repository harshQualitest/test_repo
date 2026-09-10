import { useState, useRef } from 'react';
import ReactPlayer from 'react-player';
import {
    Box,
    Typography,
    Card,
    Chip,
    Button,
    IconButton,
    Slider,
    TextField,
    useTheme,
} from '@mui/material';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import SettingsIcon from '@mui/icons-material/Settings';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import AddIcon from '@mui/icons-material/Add';
import VideocamIcon from '@mui/icons-material/Videocam';

/** Review status an annotator assigns to an auto-detected object. */
type ObjectStatus = 'pending' | 'accepted' | 'rejected';

/**
 * An auto-detected object from the (mock) detection model.
 * px/py/sw/sh are raw pixel position/size (informational display only — see
 * VIDEO_BOUNDING_BOXES below for the actual percentage-based overlay coordinates).
 */
interface DetectedObject {
    id: string;
    label: string;
    confidence: number;
    px: number;
    py: number;
    sw: number;
    sh: number;
}

const DETECTED_OBJECTS: DetectedObject[] = [
    { id: 'obj-1', label: 'UI Element', confidence: 92, px: 120, py: 80,  sw: 200, sh: 150 },
    { id: 'obj-2', label: 'Button',     confidence: 87, px: 450, py: 200, sw: 180, sh: 120 },
    { id: 'obj-3', label: 'Chart',      confidence: 94, px: 200, py: 300, sw: 250, sh: 180 },
];

const VIDEO_BOUNDING_BOXES = [
    { label: 'UI Element', conf: 92, x: 6.25,  y: 7.41,  w: 10.42, h: 13.89 },
    { label: 'Button',     conf: 87, x: 23.44, y: 18.52, w: 9.38,  h: 11.11 },
    { label: 'Chart',      conf: 94, x: 10.42, y: 27.78, w: 13.02, h: 16.67 },
];

/**
 * Formats a duration in seconds as `m:ss` (minutes not zero-padded, seconds are).
 * @param secs - Elapsed time in seconds.
 * @returns `m:ss` formatted string, e.g. `1:05`.
 */
const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m)}:${String(s).padStart(2, '0')}`;
};

interface Props {
    /** Current shared playback volume (0-100), lifted to the parent MultiModality tab group. */
    volume: number;
    /** Callback to update the shared volume when the user adjusts controls in this tab. */
    onVolumeChange: (v: number) => void;
    /** Video source URL; falls back to a hardcoded demo stream when not provided. */
    url?: string;
}

/**
 * Component: VideoTab
 *
 * Purpose: Renders the standalone "Video" main tab — a full-width video player with
 * auto-detected object bounding-box overlays, an accept/reject review workflow for those
 * detections, and free-form video-level labels (tags).
 *
 * Responsibilities:
 * - Plays the task video with standard transport controls (play/pause, skip to start/end,
 *   mute toggle) and a progress slider.
 * - Overlays static bounding boxes (VIDEO_BOUNDING_BOXES mock data) on the video frame.
 * - Lists each auto-detected object with its confidence score and lets the annotator accept
 *   or reject it (toggling back to 'pending' if the same status is clicked again).
 * - Lets the annotator add/remove free-text labels describing the whole video.
 *
 * Props: see {@link Props} above (volume, onVolumeChange, url).
 *
 * State:
 * - playing: whether the video is currently playing.
 * - playedSeconds: current playhead position in seconds.
 * - duration: total video duration in seconds, set from the player's `durationchange` event.
 * - objectStatuses: map of detected-object id -> review status ('pending'/'accepted'/'rejected').
 * - videoLabels: current list of free-text labels attached to the video.
 * - newLabel: text currently typed into the "Add new label" input, before it's committed.
 *
 * Major child components: ReactPlayer (video element); no custom child components.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const VideoTab = ({ volume, onVolumeChange, url = 'http://10.250.2.55/videos/hero-video.mp4' }: Props) => {
    const theme = useTheme();
    const playerRef = useRef<HTMLVideoElement>(null);

    const [playing, setPlaying] = useState(false);
    const [playedSeconds, setPlayedSeconds] = useState(0);
    const [duration, setDuration] = useState(0);
    const [objectStatuses, setObjectStatuses] = useState<Record<string, ObjectStatus>>(
        () => Object.fromEntries(DETECTED_OBJECTS.map((o) => [o.id, 'pending' as const])),
    );
    const [videoLabels, setVideoLabels] = useState<string[]>(['product-demo', 'tutorial', 'software']);
    const [newLabel, setNewLabel] = useState('');

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
     * Sets an auto-detected object's review status, toggling back to 'pending' if the
     * requested status is already active (so clicking "Accept" twice un-accepts it).
     * @param id - Detected object id.
     * @param status - Status to apply ('accepted' or 'rejected').
     */
    const setObjectStatus = (id: string, status: 'accepted' | 'rejected') => {
        setObjectStatuses((prev) => ({ ...prev, [id]: prev[id] === status ? 'pending' : status }));
    };

    /**
     * Commits the pending `newLabel` input as a new video label, trimming whitespace and
     * skipping duplicates, then clears the input regardless of whether it was added.
     */
    const addLabel = () => {
        const trimmed = newLabel.trim();
        if (trimmed && !videoLabels.includes(trimmed)) setVideoLabels((prev) => [...prev, trimmed]);
        setNewLabel('');
    };

    /**
     * Removes a label from the video's label list.
     * @param label - Label text to remove.
     */
    const removeLabel = (label: string) => setVideoLabels((prev) => prev.filter((l) => l !== label));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* ── Video player ─────────────────────────────────────── */}
            <Box sx={{ bgcolor: '#000', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>

                    {/* ReactPlayer */}
                    {url ? (
                        <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                            <ReactPlayer
                                ref={playerRef}
                                src={url}
                                playing={playing}
                                volume={volume / 100}
                                width="100%"
                                height="100%"
                                onTimeUpdate={(e) => setPlayedSeconds((e.target as HTMLVideoElement).currentTime)}
                                onDurationChange={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                            />
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                zIndex: 0,
                            }}
                        >
                            <Box sx={{ textAlign: 'center' }}>
                                <VideocamIcon sx={{ fontSize: 64, color: '#64748b', mb: 1.5 }} />
                                <Typography sx={{ fontSize: '0.875rem', color: '#94a3b8' }}>sample-video.mp4</Typography>
                                <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mt: 0.5 }}>
                                    GenAI Product Demo Tutorial
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {/* Bounding box overlays */}
                    {VIDEO_BOUNDING_BOXES.map((box) => (
                        <Box
                            key={box.label}
                            sx={{
                                position: 'absolute',
                                left: `${box.x}%`,
                                top: `${box.y}%`,
                                width: `${box.w}%`,
                                height: `${box.h}%`,
                                border: '2px solid #eab308',
                                zIndex: 2,
                                pointerEvents: 'none',
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: -24,
                                    left: 0,
                                    bgcolor: '#eab308',
                                    color: '#000',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    px: 1,
                                    py: 0.25,
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {box.label} ({box.conf}%)
                            </Box>
                        </Box>
                    ))}

                    {/* Controls overlay */}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                            px: 2,
                            pt: 4,
                            pb: 2,
                            zIndex: 3,
                        }}
                    >
                        {/* Progress slider */}
                        <Slider
                            value={playedSeconds}
                            min={0}
                            max={duration || 1}
                            onChange={handleSeek}
                            sx={{
                                mb: 1.5,
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
                                    onClick={() => setPlaying((p) => !p)}
                                    sx={{ color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                                >
                                    {playing ? <PauseIcon sx={{ fontSize: 16 }} /> : <PlayArrowIcon sx={{ fontSize: 16 }} />}
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => { setPlayedSeconds(0); if (playerRef.current) playerRef.current.currentTime = 0; }}
                                    sx={{ color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                                >
                                    <SkipPreviousIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => { setPlayedSeconds(duration); if (playerRef.current) playerRef.current.currentTime = duration; }}
                                    sx={{ color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                                >
                                    <SkipNextIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <Typography variant="body2" sx={{ color: '#fff', ml: 1 }}>
                                    {formatTime(playedSeconds)} / {formatTime(duration)}
                                </Typography>
                            </Box>

                            {/* Right controls */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    onClick={() => onVolumeChange(volume > 0 ? 0 : 80)}
                                    sx={{ color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                                >
                                    <VolumeUpIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    sx={{ color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                                >
                                    <SettingsIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    sx={{ color: '#fff', width: 32, height: 32, '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                                >
                                    <FullscreenIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* ── Auto-Detected Objects ─────────────────────────────── */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" fontWeight={500}>Auto-Detected Objects</Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                        sx={{
                            fontSize: '0.8rem',
                            height: 32,
                            textTransform: 'none',
                            borderColor: theme.palette.divider,
                            color: 'text.primary',
                        }}
                    >
                        Add Box
                    </Button>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {DETECTED_OBJECTS.map((obj) => {
                        const status = objectStatuses[obj.id];
                        return (
                            <Card key={obj.id} variant="outlined" sx={{ borderRadius: 2 }}>
                                <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2" fontWeight={500}>{obj.label}</Typography>
                                            <Chip
                                                label={`Confidence: ${obj.confidence}%`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem', height: 20 }}
                                            />
                                            {status !== 'pending' && (
                                                <Chip
                                                    label={status === 'accepted' ? 'Accepted' : 'Rejected'}
                                                    size="small"
                                                    sx={{
                                                        fontSize: '0.65rem',
                                                        height: 20,
                                                        bgcolor: status === 'accepted' ? '#dcfce7' : '#fee2e2',
                                                        color: status === 'accepted' ? '#16a34a' : '#dc2626',
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                                            Position: ({obj.px}, {obj.py}) • Size: {obj.sw}×{obj.sh}px
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0, ml: 1 }}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
                                            onClick={() => setObjectStatus(obj.id, 'accepted')}
                                            sx={{
                                                fontSize: '0.78rem',
                                                height: 32,
                                                textTransform: 'none',
                                                borderColor: theme.palette.divider,
                                                color: status === 'accepted' ? '#16a34a' : 'text.primary',
                                                bgcolor: status === 'accepted' ? '#dcfce7' : 'transparent',
                                                '&:hover': { bgcolor: '#f0fdf4', borderColor: theme.palette.divider },
                                            }}
                                        >
                                            Accept
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
                                            onClick={() => setObjectStatus(obj.id, 'rejected')}
                                            sx={{
                                                fontSize: '0.78rem',
                                                height: 32,
                                                textTransform: 'none',
                                                color: '#dc2626',
                                                borderColor: theme.palette.divider,
                                                '&:hover': { bgcolor: '#fef2f2', borderColor: theme.palette.divider },
                                            }}
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 32,
                                                width: 32,
                                                height: 32,
                                                p: 0,
                                                borderColor: theme.palette.divider,
                                                color: 'text.primary',
                                            }}
                                        >
                                            <DriveFileRenameOutlineIcon sx={{ fontSize: 16 }} />
                                        </Button>
                                    </Box>
                                </Box>
                            </Card>
                        );
                    })}
                </Box>
            </Box>

            {/* ── Video Labels ──────────────────────────────────────── */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" fontWeight={500}>Video Labels</Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {videoLabels.map((label) => (
                        <Chip
                            key={label}
                            icon={<LocalOfferIcon sx={{ fontSize: '12px !important' }} />}
                            label={label}
                            size="small"
                            onDelete={() => removeLabel(label)}
                            deleteIcon={<CloseIcon sx={{ fontSize: '12px !important' }} />}
                            sx={{
                                fontSize: '0.75rem',
                                bgcolor: 'action.selected',
                                color: 'text.primary',
                                '& .MuiChip-deleteIcon': {
                                    color: 'text.secondary',
                                    '&:hover': { color: '#dc2626' },
                                },
                            }}
                        />
                    ))}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        size="small"
                        placeholder="Add new label..."
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addLabel()}
                        sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.875rem' } }}
                    />
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                        onClick={addLabel}
                        sx={{
                            fontSize: '0.875rem',
                            height: 36,
                            textTransform: 'none',
                            bgcolor: '#030213',
                            '&:hover': { bgcolor: '#161616' },
                        }}
                    >
                        Add
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default VideoTab;
