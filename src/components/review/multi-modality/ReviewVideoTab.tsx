import { useState, useRef } from 'react';
import ReactPlayer from 'react-player';
import { Box, Typography, Card, Chip, Slider, IconButton } from '@mui/material';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import SettingsIcon from '@mui/icons-material/Settings';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckIcon from '@mui/icons-material/Check';

/**
 * Formats a duration in seconds as `M:SS` for display in the player's time readout.
 * @param secs - elapsed/total time in seconds.
 * @returns a string like "1:05".
 */
const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m)}:${String(s).padStart(2, '0')}`;
};

// Static demo data below (bounding boxes, detected objects, labels): this tab currently
// renders fixed placeholder annotations rather than data fetched for the reviewed task.
const REVIEW_BOUNDING_BOXES = [
    { label: 'Dashboard Widget', type: 'adjusted', x: 6.25, y: 7.41, w: 10.42, h: 13.89 },
    { label: 'CTA Button', type: 'new', x: 23.44, y: 18.52, w: 9.38, h: 11.11 },
    { label: ' Analytics Chart', type: 'new', x: 10.42, y: 27.78, w: 13.02, h: 16.67 },
    { label: 'Navigation Menu', type: 'new', x: 35.44, y: 9.52, w: 9.38, h: 11.11 },
];

const AUTO_OBJECTS = [
    { label: 'UI Element', position: '(120, 80)', size: '200×150px' },
    { label: 'Button', position: '(450, 200)', size: '180×120px' },
];

const HUMAN_OBJECTS = [
    { label: 'Dashboard Widget', position: '(125, 82)', size: '195×148px', status: 'adjusted' },
    { label: 'CTA Button', position: '(450, 200)', size: '180×120px', status: 'new' },
    { label: 'Navigation Menu', position: '(680, 120)', size: '140×100px', status: 'new' },
    { label: 'AnalyticsChart', position: '(200, 300)', size: '250×180px', status: 'new' },
];

const AUTO_LABELS = ['product-demo', 'tutorial', 'software'];
const HUMAN_LABELS = ['product-demo', 'tutorial', 'software', 'enterprise-software','saas'];

interface Props {
    videoUrl: string;
}

/**
 * Component: ReviewVideoTab
 *
 * Purpose: Sub-tab of `MultiModalityReview` presenting the annotated video with bounding-box
 * overlays and custom playback controls, plus a comparison of auto-detected vs. human-annotated
 * objects and labels.
 *
 * Responsibilities:
 * - Render a `ReactPlayer`-backed video with overlaid bounding boxes (color-coded
 *   adjusted-vs-new) and a custom control bar (play/pause, skip, seek, volume).
 * - Render side-by-side "Auto-Generated" vs. "Human Annotated" object lists and label chips.
 *
 * Props:
 * - videoUrl (string): source URL for the video being reviewed.
 *
 * State:
 * - playing (boolean): whether the video is currently playing.
 * - playedSeconds (number): current playback position, kept in sync with the underlying
 *   `<video>` element via `onTimeUpdate`.
 * - duration (number): total video duration, set once via `onDurationChange`.
 * - volume (number): current volume (0-100), applied to the player as `volume / 100`.
 *
 * Note: the bounding boxes, detected objects, and labels rendered here are static demo
 * data (`REVIEW_BOUNDING_BOXES`, `AUTO_OBJECTS`, `HUMAN_OBJECTS`, `AUTO_LABELS`,
 * `HUMAN_LABELS`) rather than data fetched for the specific task under review.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ReviewVideoTab = ({ videoUrl }: Props) => {
    const playerRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [playedSeconds, setPlayedSeconds] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(80);

    /**
     * Handles scrubbing the seek slider: updates local playback-position state and
     * imperatively sets the underlying `<video>` element's `currentTime` to match.
     * @param _ - the slider's change event (unused).
     * @param value - the new slider value (seconds); MUI Slider allows number|number[],
     *   but this slider is single-thumb so it's always a number.
     */
    const handleSeek = (_: Event, value: number | number[]) => {
        const secs = value as number;
        setPlayedSeconds(secs);
        if (playerRef.current) playerRef.current.currentTime = secs;
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Video player */}
            <Box sx={{ bgcolor: '#000', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
                    <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                        <ReactPlayer
                            ref={playerRef}
                            src={videoUrl}
                            playing={playing}
                            volume={volume / 100}
                            width="100%"
                            height="100%"
                            onTimeUpdate={(e) => setPlayedSeconds((e.target as HTMLVideoElement).currentTime)}
                            onDurationChange={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                        />
                    </Box>

                    {/* Bounding box overlays */}
                    {REVIEW_BOUNDING_BOXES.map((box) => (
                        <Box
                            key={box.label}
                            sx={{
                                position: 'absolute',
                                left: `${box.x}%`,
                                top: `${box.y}%`,
                                width: `${box.w}%`,
                                height: `${box.h}%`,
                                border: `2px solid ${box.type === 'adjusted' ? '#60a5fa' : '#4ade80'}`,
                                zIndex: 2,
                                pointerEvents: 'none',
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: -22,
                                    left: 0,
                                    bgcolor: box.type === 'adjusted' ? '#60a5fa' : '#4ade80',
                                    color: '#000',
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: '3px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {box.label} {box.type === 'adjusted' ? '(adj)' : ''}
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    onClick={() => setPlaying((p) => !p)}
                                    sx={{
                                        color: '#fff',
                                        width: 32,
                                        height: 32,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                                    }}
                                >
                                    {playing ? (
                                        <PauseIcon sx={{ fontSize: 16 }} />
                                    ) : (
                                        <PlayArrowIcon sx={{ fontSize: 16 }} />
                                    )}
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setPlayedSeconds(0);
                                        if (playerRef.current) playerRef.current.currentTime = 0;
                                    }}
                                    sx={{
                                        color: '#fff',
                                        width: 32,
                                        height: 32,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                                    }}
                                >
                                    <SkipPreviousIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setPlayedSeconds(duration);
                                        if (playerRef.current) playerRef.current.currentTime = duration;
                                    }}
                                    sx={{
                                        color: '#fff',
                                        width: 32,
                                        height: 32,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                                    }}
                                >
                                    <SkipNextIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <Typography variant="body2" sx={{ color: '#fff', ml: 1 }}>
                                    {formatTime(playedSeconds)} / {formatTime(duration)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    onClick={() => setVolume((v) => (v > 0 ? 0 : 80))}
                                    sx={{
                                        color: '#fff',
                                        width: 32,
                                        height: 32,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                                    }}
                                >
                                    <VolumeUpIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    sx={{
                                        color: '#fff',
                                        width: 32,
                                        height: 32,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                                    }}
                                >
                                    <SettingsIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    sx={{
                                        color: '#fff',
                                        width: 32,
                                        height: 32,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                                    }}
                                >
                                    <FullscreenIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Bounding box legend */}
            {/* <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 14, height: 14, border: '2px solid #60a5fa', borderRadius: 0.25 }} />
                    <Typography variant="caption" color="text.secondary">
                        Adjusted boxes
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 14, height: 14, border: '2px solid #4ade80', borderRadius: 0.25 }} />
                    <Typography variant="caption" color="text.secondary">
                        New boxes
                    </Typography>
                </Box>
            </Box> */}

            {/* Objects comparison */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                        <WarningAmberIcon sx={{ fontSize: 16, color: '#d08700', verticalAlign: 'middle', mr: 0.5 }} />
                        <Typography variant="body2" fontWeight={600}>
                            Auto-Generated ({AUTO_OBJECTS.length})
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {AUTO_OBJECTS.map((obj) => (
                            <Card
                                key={obj.label}
                                variant="outlined"
                                sx={{
                                    borderRadius: 1.5,
                                    borderColor: '#f5df80',
                                    backgroundColor: '#FFFFF9',
                                }}
                            >
                                <Box sx={{ p: 1.25 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                                        <Typography variant="body2" fontWeight={600}>
                                            {obj.label}
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {obj.position} • {obj.size}
                                    </Typography>
                                </Box>
                            </Card>
                        ))}
                    </Box>
                </Box>

                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                        <CheckIcon sx={{ fontSize: 16, color: '#4ade80', verticalAlign: 'middle', mr: 0.5 }} />
                        <Typography variant="body2" fontWeight={600}>
                            Human Annotated ({HUMAN_OBJECTS.length})
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        {HUMAN_OBJECTS.map((obj) => (
                            <Card
                                key={obj.label}
                                variant="outlined"
                                sx={{
                                    borderRadius: 1.5,
                                    backgroundColor: "#FBFDFF",
                                    borderColor:
                                        obj.status === 'adjusted'
                                            ? 'rgba(96,165,250,0.4)'
                                            : obj.status === 'new'
                                              ? 'rgba(74,222,128,0.4)'
                                              : undefined,
                                }}
                            >
                                <Box sx={{ p: 1.25 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                                        <Typography variant="body2" fontWeight={600}>
                                            {obj.label}
                                        </Typography>
                                        {obj.status === 'adjusted' && (
                                            <Chip
                                                label="Adjusted"
                                                size="small"
                                                sx={{
                                                    fontSize: '0.6rem',
                                                    height: 16,
                                                    bgcolor: '#f0f1f7',
                                                    color: '#000',
                                                    border: '1px solid #cbd5e1',
                                                    fontWeight: 700,
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {obj.position} • {obj.size}
                                    </Typography>
                                </Box>
                            </Card>
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* Labels comparison */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        Auto-Generated Labels
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {AUTO_LABELS.map((label) => (
                            <Box key={label} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                <Box
                                    component="span"
                                    sx={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        px: '0.5rem',
                                        py: '0.125rem',
                                        fontSize: '0.75rem',
                                        borderRadius: '0.375rem', // rounded-md
                                        border: '1px solid #f5e85d',
                                        bgcolor: '#fff',
                                        color: '#000',
                                        fontWeight: 500,
                                        lineHeight: 1,
                                        height: 'auto',
                                    }}
                                >
                                    <LocalOfferOutlinedIcon sx={{ fontSize: 12 }} />
                                    <Box
                                        component="span"
                                        sx={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
                                    >
                                        {label}
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Box>
                <Box>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                        Human Labels
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {HUMAN_LABELS.map((label) => {
                            const isNew = !AUTO_LABELS.includes(label);
                            return (
                                <Box key={label} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box
                                        component="span"
                                        sx={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            px: '0.5rem',
                                            py: '0.125rem',
                                            fontSize: '0.75rem',
                                            borderRadius: '0.375rem', // rounded-md
                                            border: isNew ? '0px solid transparent' : '1px solid #bbf7d0',
                                            bgcolor: isNew ? '#16a34a' : '#ecfdf5',
                                            color: isNew ? '#fff' : '#14532d',
                                            fontWeight: 500,
                                            lineHeight: 1,
                                            height: 'auto',
                                        }}
                                    >
                                        <LocalOfferOutlinedIcon sx={{ fontSize: 12 }} />
                                        <Box
                                            component="span"
                                            sx={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
                                        >
                                            {label}
                                            {isNew && (
                                                <Box
                                                    component="span"
                                                    sx={{
                                                        ml: '0.25rem',
                                                        fontSize: '9px',
                                                        lineHeight: 1,
                                                        opacity: 0.95,
                                                    }}
                                                >
                                                    NEW
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default ReviewVideoTab;
