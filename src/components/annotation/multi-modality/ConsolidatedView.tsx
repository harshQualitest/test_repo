import { useState, useRef, useEffect, type MouseEvent } from 'react';
import ReactPlayer from 'react-player';
import {
    Box,
    Typography,
    Card,
    Chip,
    Tabs,
    Tab,
    Slider,
    Select,
    MenuItem,
    Collapse,
    Button,
    IconButton,
    alpha,
    useTheme,
} from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DescriptionIcon from '@mui/icons-material/Description';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import GridViewIcon from '@mui/icons-material/GridView';
import GroupIcon from '@mui/icons-material/Group';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import AddIcon from '@mui/icons-material/Add';
import HeadLocationsTab from './HeadLocationsTab';
import TrackletVerificationTab from './TrackletVerificationTab';
import SpeakerActivityTab from './SpeakerActivityTab';
import type { HeadLocation, ActivityRow } from './types';

// ── Mock data ─────────────────────────────────────────────────────────────────

interface BoundingBox {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

const INITIAL_BOXES: BoundingBox[] = [
    { id: 'spk12345', x: 7.81, y: 8.33, w: 12.5, h: 27.78 },
    { id: 'spk12346', x: 31.25, y: 11.11, w: 10.94, h: 25.0 },
    { id: 'spk12347', x: 54.69, y: 13.89, w: 11.72, h: 26.39 },
];

/**
 * Formats a duration in seconds as a `mm:ss.cc` string (centiseconds precision).
 * @param secs - Elapsed time in seconds (may include a fractional part).
 * @returns Zero-padded `mm:ss.cc` string, e.g. `01:05.50`.
 */
const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const cs = Math.floor((secs % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};

/**
 * Parses a `mm:ss.cc` timestamp string (as used by TRANSCRIPT entries) back into seconds.
 * Inverse of {@link formatTime}; used to sync transcript click/seek actions with the player.
 * @param t - Timestamp string in `mm:ss.cc` format (centiseconds part optional).
 * @returns Total elapsed time in seconds.
 */
const parseTime = (t: string): number => {
    const [minSec, cs] = t.split('.');
    const [min, sec] = minSec.split(':').map(Number);
    return min * 60 + sec + (cs ? Number(cs) / 100 : 0);
};

const WAVEFORM_HEIGHTS = [
    79.59, 2.65, 37.28, 28.43, 43.32, 60.11, 5.02, 37.48, 50.37, 56.18, 2.98, 71.1, 57.99, 62.68, 12.49, 39.74, 45.59,
    58.96, 48.73, 91.1, 19.61, 86.62, 92.79, 58.59, 27.99, 50.74, 49.37, 46.79, 32.85, 25.49, 12.06, 52.89, 42.29,
    17.55, 41.52, 66.5, 93.53, 76.37, 84.58, 30.92, 80.99, 47.07, 90.85, 47.99, 14.63, 50.58, 72.46, 10.85, 30.61,
    72.41,
];

const SPEAKER_SEGMENTS = [
    { label: 'Person 1', left: 0, width: 4.33 },
    { label: 'Person 2', left: 4.58, width: 4.0 },
    { label: 'Person 3', left: 9.17, width: 6.25 },
    { label: 'Person 1', left: 15.83, width: 5.0 },
    { label: 'Person 2', left: 21.67, width: 5.0 },
    { label: 'Person 3', left: 27.5, width: 5.83 },
];

const TRANSCRIPT = [
    { speaker: 'Person 1', time: '00:00.00', text: "Hello everyone, welcome to today's meeting.", active: true },
    { speaker: 'Person 2', time: '00:05.50', text: 'Thanks for joining us today.', active: false },
    { speaker: 'Person 3', time: '00:11.00', text: "Let's start by reviewing the project updates.", active: false },
    { speaker: 'Person 1', time: '00:19.00', text: "I'll share my screen to show the progress.", active: false },
    { speaker: 'Person 2', time: '00:26.00', text: 'Great! I can see the dashboard on the screen now.', active: false },
    { speaker: 'Person 3', time: '00:33.00', text: "Let's focus on the key metrics for this quarter.", active: false },
];

const INITIAL_HEAD_LOCATIONS: HeadLocation[] = [
    {
        frame: 0,
        timestamp: '00:00.00',
        x: 50,
        y: 30,
        w: 80,
        h: 100,
        visibility: '100%',
        personId: 'spk12345',
        trackletId: 'TK-001',
        type: 'Real Person',
    },
    {
        frame: 0,
        timestamp: '00:00.00',
        x: 200,
        y: 40,
        w: 70,
        h: 90,
        visibility: '100%',
        personId: 'spk12346',
        trackletId: 'TK-002',
        type: 'Real Person',
    },
    {
        frame: 0,
        timestamp: '00:00.00',
        x: 350,
        y: 50,
        w: 75,
        h: 95,
        visibility: '50%-75%',
        personId: 'spk12347',
        trackletId: 'TK-003',
        type: 'Real Person',
    },
];

const INITIAL_ACTIVITY_ROWS: ActivityRow[] = [
    { id: '1', start: 0, end: 5.2, personId: 'spk12345', type: 'Speech', notes: '' },
    { id: '2', start: 5.5, end: 10.3, personId: 'spk12346', type: 'Speech', notes: '' },
    { id: '3', start: 8, end: 12, personId: 'spk12345', type: 'Side Talk', notes: '' },
    { id: '4', start: 11, end: 18.5, personId: 'spk12347', type: 'Speech', notes: '' },
];

const TOTAL_DURATION = 120;

/**
 * Determines the fill color of a single waveform bar based on its position along the
 * timeline relative to (a) whether it falls inside an active speaker segment and
 * (b) whether playback has already passed that point.
 * @param index - Index of this bar within the waveform bars array.
 * @param total - Total number of waveform bars (used to convert index to a 0-1 fraction).
 * @param playedFraction - Current playback position as a fraction of total duration (0-1).
 * @returns A hex color string for the bar.
 */
const getBarColor = (index: number, total: number, playedFraction: number): string => {
    const barFraction = index / total;
    const pct = barFraction * 100;
    const isInSegment = SPEAKER_SEGMENTS.some((seg) => pct >= seg.left && pct < seg.left + seg.width);
    if (barFraction < playedFraction) return isInSegment ? '#16a34a' : '#475569';
    return isInSegment ? '#22c55e' : '#94a3b8';
};

/**
 * Checks whether a given speaker-activity row's [start, end) time range overlaps with any
 * other row's range. Used to flag simultaneous-speech segments that annotators must review
 * (see Speaker Activity Guidelines: "Properly annotate overlapping speech segments").
 * @param row - The activity row being checked.
 * @param all - The full set of activity rows to compare against.
 * @returns True if `row` overlaps in time with at least one other row.
 */
const rowHasOverlap = (row: ActivityRow, all: ActivityRow[]): boolean =>
    all.some((other) => other.id !== row.id && row.start < other.end && other.start < row.end);

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
    /** Current shared playback volume (0-100), lifted to the parent MultiModality tab group. */
    volume: number;
    /** Callback to update the shared volume when the user adjusts the slider in this view. */
    onVolumeChange: (v: number) => void;
    /** Video source URL; falls back to a hardcoded demo stream when not provided. */
    url?: string;
    /** URL to the project's annotation guidelines file, shown in the collapsible banner. */
    instructionsUrl?: string;
}

/**
 * Component: ConsolidatedView
 *
 * Purpose: Renders the "all-in-one" annotation screen for the multi-modality video task —
 * combining video playback with head bounding-box overlays, an audio waveform with speaker
 * diarization, a synchronized transcript panel, and three annotation sub-tabs (Head
 * Locations, Tracklet Verification, Speaker Activity) all driven off a single playhead.
 *
 * Responsibilities:
 * - Plays the task video and keeps a single `playedSeconds` playhead in sync across the
 *   waveform, transcript auto-scroll/highlight, and annotation sub-tabs.
 * - Lets annotators draw new head bounding boxes directly on the video via click-and-drag.
 * - Hosts local (component-level) mock CRUD state for head locations, tracklet verification,
 *   and speaker activity rows, delegating rendering to the respective *Tab child components.
 * - Renders a collapsible project guidelines banner with a downloadable instructions link.
 *
 * Props: see {@link Props} above (volume, onVolumeChange, url, instructionsUrl).
 *
 * State:
 * - guidelinesOpen: whether the guidelines banner is expanded.
 * - annotationTab: index of the active annotation sub-tab (0=Head Locations, 1=Tracklet
 *   Verification, 2=Speaker Activity).
 * - playing: whether the video is currently playing.
 * - playedSeconds: current playhead position in seconds — the master sync value used to
 *   derive waveform highlighting, active transcript line, and active speaker.
 * - duration: total video duration in seconds, set from the player's `durationchange` event.
 * - speed: selected playback rate label (e.g. '1x').
 * - boxes: current set of head bounding boxes overlaid on the video.
 * - isAddBoxMode: whether the user is in "draw a new box" mode.
 * - isDrawing: whether a drag-to-draw gesture is currently in progress.
 * - drawStart / drawCurrent: the start and live cursor position (as % of video viewport) of
 *   the in-progress box being drawn.
 * - headLocations: editable rows behind the Head Locations tab.
 * - verifiedTracklets: set of tracklet IDs marked verified, behind the Tracklet Verification tab.
 * - activityRows: editable rows behind the Speaker Activity tab.
 * - nextActivityId (ref): monotonically incrementing counter used to generate new activity row IDs.
 *
 * Major child components: HeadLocationsTab, TrackletVerificationTab, SpeakerActivityTab,
 * ReactPlayer (video element).
 *
 * Side effects: see the `useEffect` below — auto-scrolls the transcript panel to the active line.
 *
 * Important business logic:
 * - Frame/timestamp sync: `playedSeconds` (from the video's `timeupdate` event) is the single
 *   source of truth used to compute the active transcript line, active speaker segment, and
 *   waveform playhead position — all derived, not independently tracked.
 * - Coordinate transforms: bounding boxes (both existing and in-progress) are stored and
 *   rendered as percentages of the video container's bounding rect, making them resolution-independent.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ConsolidatedView = ({
    volume,
    onVolumeChange,
    // url = 'https://www.pexels.com/download/video/35367909/',
    url = 'http://10.250.2.55/videos/hero-video.mp4',
    instructionsUrl,
}: Props) => {
    const theme = useTheme();
    const playerRef = useRef<HTMLVideoElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    const [guidelinesOpen, setGuidelinesOpen] = useState(false);
    const [annotationTab, setAnnotationTab] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [playedSeconds, setPlayedSeconds] = useState(0);
    const [duration, setDuration] = useState(120);
    const [speed, setSpeed] = useState('1x');
    const [boxes, setBoxes] = useState<BoundingBox[]>(INITIAL_BOXES);
    const [isAddBoxMode, setIsAddBoxMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

    const [headLocations, setHeadLocations] = useState<HeadLocation[]>(INITIAL_HEAD_LOCATIONS);
    const [verifiedTracklets, setVerifiedTracklets] = useState<Set<string>>(new Set(['track-002']));
    const [activityRows, setActivityRows] = useState<ActivityRow[]>(INITIAL_ACTIVITY_ROWS);
    // Ref (not state) because the counter itself is never rendered; avoids extra re-renders per new row.
    const nextActivityId = useRef(5);

    const currentTime = playedSeconds;
    const playedFraction = duration > 0 ? playedSeconds / duration : 0;
    const playedPct = playedFraction * 100;

    // Why: finds the last transcript line whose timestamp has already passed, so the
    // transcript panel highlights/auto-scrolls to whichever line is "currently being said".
    const activeTranscriptIdx = TRANSCRIPT.reduce(
        (best, item, i) => (playedSeconds >= parseTime(item.time) ? i : best),
        0,
    );

    // Why: determines which speaker segment the playhead currently falls inside, to label
    // the waveform card's chip with the active speaker.
    const activeSpeaker =
        SPEAKER_SEGMENTS.reduce<string | null>(
            (found, seg) => (playedPct >= seg.left && playedPct < seg.left + seg.width ? seg.label : found),
            null,
        ) ?? '—';

    const activeTranscriptItemRef = useRef<HTMLDivElement | null>(null);

    /**
     * Keeps the transcript panel scrolled to the active line as the playhead advances.
     * Runs whenever `activeTranscriptIdx` changes (i.e. playback crosses into a new
     * transcript segment). No cleanup needed — `scrollIntoView` is a one-shot DOM call.
     */
    useEffect(() => {
        activeTranscriptItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [activeTranscriptIdx]);

    /**
     * Moves the shared playhead to an absolute time and mirrors it onto the underlying
     * `<video>` element so playback and UI state stay in sync.
     * @param secs - Target position in seconds.
     */
    const seekTo = (secs: number) => {
        setPlayedSeconds(secs);
        if (playerRef.current) playerRef.current.currentTime = secs;
    };

    /**
     * Converts a click position on the waveform into a seek position proportional to
     * the click's horizontal offset within the waveform's width.
     * @param e - Mouse click event on the waveform container.
     */
    const handleWaveformClick = (e: MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        seekTo(((e.clientX - rect.left) / rect.width) * duration);
    };

    /**
     * MUI Slider onChange adapter for the progress bar — forwards the new value to {@link seekTo}.
     * @param _ - Unused MUI change event.
     * @param value - New slider value (single number, since this slider is not a range).
     */
    const handleSeek = (_: Event, value: number | number[]) => seekTo(value as number);

    /**
     * Converts a mouse event's viewport coordinates into a position relative to the video
     * container, expressed as a percentage (0-100) of the container's width/height and
     * clamped to stay within bounds. This is the coordinate basis for all bounding boxes.
     * @param e - Mouse event captured over the video container.
     * @returns `{ x, y }` position as percentages of the container's width/height.
     */
    const getRelativePos = (e: MouseEvent<HTMLDivElement>) => {
        const rect = videoContainerRef.current!.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
            y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
        };
    };

    /**
     * Begins a new bounding-box drag gesture (only reachable while add-box mode is active,
     * via the transparent draw-capture overlay). Records the starting corner.
     * @param e - Mouse down event on the video draw overlay.
     */
    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const pos = getRelativePos(e);
        setDrawStart(pos);
        setDrawCurrent(pos);
        setIsDrawing(true);
    };

    /**
     * Updates the live end-corner of the in-progress bounding box while dragging.
     * No-ops if a drag isn't currently active.
     * @param e - Mouse move event on the video draw overlay.
     */
    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isDrawing) return;
        setDrawCurrent(getRelativePos(e));
    };

    /**
     * Finalizes the drag gesture: normalizes the two drag corners into a top-left
     * `{x, y, w, h}` box (min/abs so the user can drag in any direction), discards boxes
     * smaller than 1% in either dimension as accidental clicks, and commits the box with a
     * timestamp-derived id. Always resets drawing state and exits add-box mode afterward.
     */
    const handleMouseUp = () => {
        if (!isDrawing || !drawStart || !drawCurrent) return;
        const x = Math.min(drawStart.x, drawCurrent.x);
        const y = Math.min(drawStart.y, drawCurrent.y);
        const w = Math.abs(drawCurrent.x - drawStart.x);
        const h = Math.abs(drawCurrent.y - drawStart.y);
        if (w > 1 && h > 1) {
            const newId = `spk${Date.now().toString().slice(-5)}`;
            setBoxes((prev) => [...prev, { id: newId, x, y, w, h }]);
        }
        setIsDrawing(false);
        setDrawStart(null);
        setDrawCurrent(null);
        setIsAddBoxMode(false);
    };

    /**
     * Safety-net cleanup: if the cursor leaves the video container mid-drag (without a
     * mouseup), cancels the in-progress draw so no stray box or stuck draw-mode is left behind.
     */
    const handleMouseLeave = () => {
        if (isDrawing) {
            setIsDrawing(false);
            setDrawStart(null);
            setDrawCurrent(null);
            setIsAddBoxMode(false);
        }
    };

    /**
     * Toggles a tracklet's membership in the verified set (Set-based to make membership
     * checks and toggling O(1) without scanning an array).
     * @param id - Tracklet ID to toggle.
     */
    const toggleVerified = (id: string) => {
        setVerifiedTracklets((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    /**
     * Updates a single field on one head-location row by index, passed down to
     * HeadLocationsTab as the `onUpdate` handler for its inline-editable table cells.
     * @param index - Row index within `headLocations`.
     * @param field - Which HeadLocation field is being edited.
     * @param value - New value for that field.
     */
    const updateHeadLocation = (index: number, field: keyof HeadLocation, value: string | number) => {
        setHeadLocations((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    };

    /**
     * Removes a head-location row by index (used by the table's delete action).
     * @param index - Row index within `headLocations` to remove.
     */
    const removeHeadLocation = (index: number) => {
        setHeadLocations((prev) => prev.filter((_, i) => i !== index));
    };

    /**
     * Appends a new blank speaker-activity segment (default 0-5s, 'Speech') for the
     * annotator to fill in, using the ref-backed counter to generate a unique id.
     */
    const addActivityRow = () => {
        const newId = String(nextActivityId.current++);
        setActivityRows((prev) => [
            ...prev,
            { id: newId, start: 0, end: 5, personId: 'spk12345', type: 'Speech', notes: '' },
        ]);
    };

    /**
     * Updates a single field on one activity row by id, passed down to SpeakerActivityTab
     * as the `onUpdateActivityRow` handler.
     * @param id - Activity row id being edited.
     * @param field - Which ActivityRow field is being edited.
     * @param value - New value for that field.
     */
    const updateActivityRow = (id: string, field: keyof ActivityRow, value: string | number) => {
        setActivityRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    };

    /**
     * Removes an activity row by id (used by the table's delete action).
     * @param id - Activity row id to remove.
     */
    const removeActivityRow = (id: string) => {
        setActivityRows((prev) => prev.filter((r) => r.id !== id));
    };

    // Why: precomputes the red "overlap" highlight bars shown beneath the speaker timeline —
    // any row whose time range collides with another row's is converted to a left/width pair
    // (as % of TOTAL_DURATION) so SpeakerActivityTab can render it without redoing the overlap check.
    const overlapBars = activityRows
        .filter((row) => rowHasOverlap(row, activityRows))
        .map((row) => ({
            left: (row.start / TOTAL_DURATION) * 100,
            width: ((row.end - row.start) / TOTAL_DURATION) * 100,
        }));

    return (
        <Box>
            {/* Guidelines banner */}
            <Card sx={{ mb: 2, borderLeft: '4px solid #3b82f6', borderRadius: 1.5 }}>
                <Box sx={{ p: 1.5 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                        }}
                        onClick={() => setGuidelinesOpen((v) => !v)}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DescriptionIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                            <Typography variant="body2" fontWeight={500}>
                                Project Annotation Guidelines
                            </Typography>
                            <Chip
                                label="Meetings2 Dataset"
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.65rem', height: 20 }}
                            />
                        </Box>
                        {guidelinesOpen ? (
                            <KeyboardArrowUpIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        ) : (
                            <KeyboardArrowDownIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        )}
                    </Box>
                    <Collapse in={guidelinesOpen}>
                        <Box sx={{ mt: 1.5 }}>
                            {instructionsUrl ? (
                                <Button
                                    component="a"
                                    href={instructionsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    size="small"
                                    variant="outlined"
                                    fullWidth
                                    sx={{
                                        justifyContent: 'flex-start',
                                        textTransform: 'none',
                                        fontSize: '0.72rem',
                                        height: 32,
                                        px: 1.5,
                                        borderColor: theme.palette.divider,
                                        color: 'text.primary',
                                        bgcolor: 'background.paper',
                                        '&:hover': { bgcolor: 'action.hover' },
                                    }}
                                >
                                    <AttachFileIcon sx={{ fontSize: 14, mr: 1 }} />
                                    <Typography
                                        component="span"
                                        variant="caption"
                                        sx={{
                                            flex: 1,
                                            textAlign: 'left',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {instructionsUrl.split('/').pop()?.split('?')[0] || 'Instructions'}
                                    </Typography>
                                    <DownloadIcon sx={{ fontSize: 12, ml: 1 }} />
                                </Button>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    No annotation guidelines file available.
                                </Typography>
                            )}
                        </Box>
                    </Collapse>
                </Box>
            </Card>

            {/* 2/3 + 1/3 grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5, mb: 2 }}>
                {/* Left: video + waveform */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Video card */}
                    <Card sx={{ borderRadius: 1.5, p: 2 }}>
                        <Typography variant="caption" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                            Video with Head Annotations
                        </Typography>

                        {/* 16:9 video viewport */}
                        <Box
                            ref={videoContainerRef}
                            sx={{
                                position: 'relative',
                                width: '100%',
                                paddingTop: '56.25%',
                                borderRadius: 1,
                                overflow: 'hidden',
                                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                            }}
                        >
                            {/* ReactPlayer */}
                            <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                                <ReactPlayer
                                    ref={playerRef}
                                    src={url || undefined}
                                    playing={playing}
                                    volume={volume / 100}
                                    playbackRate={Number.parseFloat(speed)}
                                    width="100%"
                                    height="100%"
                                    onTimeUpdate={(e) => setPlayedSeconds((e.target as HTMLVideoElement).currentTime)}
                                    onDurationChange={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                                />
                            </Box>

                            {/* Placeholder when no URL */}
                            {!url && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#64748b',
                                        zIndex: 1,
                                    }}
                                >
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography sx={{ fontSize: '0.875rem' }}>
                                            Video Frame at {formatTime(playedSeconds)}
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                                            Frame {Math.floor(playedSeconds * 25)}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            {/* Bounding box overlays */}
                            {boxes.map((box) => (
                                <Box
                                    key={box.id}
                                    sx={{
                                        position: 'absolute',
                                        left: `${box.x}%`,
                                        top: `${box.y}%`,
                                        width: `${box.w}%`,
                                        height: `${box.h}%`,
                                        border: '2px solid #22c55e',
                                        cursor: 'move',
                                        zIndex: 2,
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: -22,
                                            left: 0,
                                            bgcolor: '#22c55e',
                                            color: 'white',
                                            fontSize: '0.6rem',
                                            fontWeight: 600,
                                            px: 0.75,
                                            py: 0.25,
                                            borderRadius: 0.5,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {box.id}
                                    </Box>
                                </Box>
                            ))}

                            {/* In-progress drawing preview */}
                            {isDrawing && drawStart && drawCurrent && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: `${Math.min(drawStart.x, drawCurrent.x)}%`,
                                        top: `${Math.min(drawStart.y, drawCurrent.y)}%`,
                                        width: `${Math.abs(drawCurrent.x - drawStart.x)}%`,
                                        height: `${Math.abs(drawCurrent.y - drawStart.y)}%`,
                                        border: '2px dashed #22c55e',
                                        zIndex: 3,
                                        pointerEvents: 'none',
                                    }}
                                />
                            )}

                            {/* Transparent overlay that captures draw events in add-box mode */}
                            {isAddBoxMode && (
                                <Box
                                    sx={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'crosshair' }}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseLeave}
                                />
                            )}
                        </Box>

                        {/* Time labels */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5, mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                {formatTime(playedSeconds)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                {formatTime(duration)}
                            </Typography>
                        </Box>

                        {/* Progress slider */}
                        <Slider
                            value={playedSeconds}
                            onChange={handleSeek}
                            min={0}
                            max={duration || 1}
                            size="small"
                            sx={{ py: 0.5, mb: 0.5 }}
                        />

                        {/* Controls row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                            <IconButton
                                size="small"
                                sx={{ border: `1px solid ${theme.palette.divider}` }}
                                onClick={() => seekTo(0)}
                            >
                                <SkipPreviousIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => setPlaying((p) => !p)}
                                sx={{
                                    bgcolor: theme.palette.primary.main,
                                    color: 'white',
                                    '&:hover': { bgcolor: theme.palette.primary.dark },
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
                                sx={{ border: `1px solid ${theme.palette.divider}` }}
                                onClick={() => seekTo(duration)}
                            >
                                <SkipNextIcon sx={{ fontSize: 16 }} />
                            </IconButton>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
                                <VolumeUpIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Slider
                                    value={volume}
                                    onChange={(_, v) => onVolumeChange(v as number)}
                                    min={0}
                                    max={100}
                                    size="small"
                                    sx={{ width: 72, py: 0 }}
                                />
                            </Box>

                            <Select
                                value={speed}
                                onChange={(e) => setSpeed(e.target.value)}
                                size="small"
                                sx={{ height: 30, fontSize: '0.72rem', minWidth: 58 }}
                            >
                                {['0.5x', '1x', '1.5x', '2x'].map((s) => (
                                    <MenuItem key={s} value={s} sx={{ fontSize: '0.72rem' }}>
                                        {s}
                                    </MenuItem>
                                ))}
                            </Select>

                            <Box sx={{ flex: 1 }} />

                            <Button
                                size="small"
                                variant={isAddBoxMode ? 'contained' : 'outlined'}
                                startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                                onClick={() => setIsAddBoxMode((v) => !v)}
                                sx={{
                                    fontSize: '0.72rem',
                                    height: 30,
                                    textTransform: 'none',
                                    ...(isAddBoxMode && {
                                        bgcolor: '#22c55e',
                                        borderColor: '#22c55e',
                                        '&:hover': { bgcolor: '#16a34a' },
                                    }),
                                }}
                            >
                                {isAddBoxMode ? 'Click & drag on video' : 'Add Box'}
                            </Button>
                        </Box>
                    </Card>

                    {/* Waveform card */}
                    <Card sx={{ borderRadius: 1.5, p: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" fontWeight={600}>
                                Audio Waveform &amp; Speaker Diarization
                            </Typography>
                            <Chip label={activeSpeaker} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                        </Box>

                        <Box
                            onClick={handleWaveformClick}
                            sx={{
                                position: 'relative',
                                height: 80,
                                bgcolor: alpha(theme.palette.primary.main, 0.06),
                                borderRadius: 1,
                                overflow: 'hidden',
                                cursor: 'pointer',
                            }}
                        >
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex' }}>
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <Box key={i} sx={{ flex: 1, borderRight: `1px solid ${theme.palette.divider}` }} />
                                ))}
                            </Box>

                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    px: 0.25,
                                    gap: '1px',
                                }}
                            >
                                {WAVEFORM_HEIGHTS.map((h, i) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            flex: 1,
                                            height: `${h}%`,
                                            bgcolor: getBarColor(i, WAVEFORM_HEIGHTS.length, playedFraction),
                                            borderRadius: '2px 2px 0 0',
                                            transition: 'background-color 0.2s',
                                        }}
                                    />
                                ))}
                            </Box>

                            {SPEAKER_SEGMENTS.map((seg, i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        bottom: 0,
                                        left: `${seg.left}%`,
                                        width: `${seg.width}%`,
                                        borderLeft: '1px solid #3b82f6',
                                        borderRight: '1px solid #3b82f6',
                                        bgcolor: alpha('#3b82f6', 0.1),
                                        overflow: 'hidden',
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            fontSize: '0.5rem',
                                            fontWeight: 600,
                                            color: '#1d4ed8',
                                            px: 0.25,
                                            lineHeight: 1.4,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {seg.label}
                                    </Typography>
                                </Box>
                            ))}

                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    width: 2,
                                    bgcolor: '#ef4444',
                                    left: `${(currentTime / duration) * 100}%`,
                                    zIndex: 10,
                                }}
                            />
                        </Box>
                    </Card>
                </Box>

                {/* Right: transcript */}
                <Card sx={{ borderRadius: 1.5, p: 1.5 }}>
                    <Typography variant="caption" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
                        Transcript
                    </Typography>
                    <Box
                        sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, overflowY: 'auto', maxHeight: 420 }}
                    >
                        {TRANSCRIPT.map((item, i) => {
                            const isActive = i === activeTranscriptIdx;
                            return (
                                <Box
                                    key={i}
                                    ref={isActive ? activeTranscriptItemRef : null}
                                    onClick={() => seekTo(parseTime(item.time))}
                                    sx={{
                                        p: 1,
                                        borderRadius: 1,
                                        cursor: 'pointer',
                                        bgcolor: isActive
                                            ? alpha('#3b82f6', 0.1)
                                            : alpha(theme.palette.primary.main, 0.06),
                                        border: `1px solid ${isActive ? alpha('#3b82f6', 0.3) : theme.palette.divider}`,
                                        transition: 'background-color 0.2s, border-color 0.2s',
                                        '&:hover': { bgcolor: alpha('#3b82f6', 0.07) },
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                                        <Chip
                                            label={item.speaker}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontSize: '0.6rem', height: 16 }}
                                        />
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontSize: '0.6rem' }}
                                        >
                                            {item.time}
                                        </Typography>
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            lineHeight: 1.5,
                                            fontSize: '0.72rem',
                                            fontWeight: isActive ? 600 : 400,
                                            color: isActive ? 'text.primary' : 'text.secondary',
                                        }}
                                    >
                                        {item.text}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Card>
            </Box>

            {/* Annotation sub-tabs */}
            <Tabs
                value={annotationTab}
                onChange={(_, v) => setAnnotationTab(v)}
                variant="fullWidth"
                sx={{ mb: 1.5 }}
            >
                <Tab icon={<GridViewIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Head Locations" />
                <Tab icon={<GroupIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Tracklet Verification" />
                <Tab icon={<DescriptionIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Speaker Activity" />
            </Tabs>

            {annotationTab === 0 && (
                <HeadLocationsTab
                    headLocations={headLocations}
                    onUpdate={updateHeadLocation}
                    onRemove={removeHeadLocation}
                />
            )}
            {annotationTab === 1 && (
                <TrackletVerificationTab verifiedTracklets={verifiedTracklets} onToggleVerified={toggleVerified} />
            )}
            {annotationTab === 2 && (
                <SpeakerActivityTab
                    currentTime={currentTime}
                    activityRows={activityRows}
                    overlapBars={overlapBars}
                    onAddActivityRow={addActivityRow}
                    onUpdateActivityRow={updateActivityRow}
                    onRemoveActivityRow={removeActivityRow}
                />
            )}
        </Box>
    );
};

export default ConsolidatedView;
