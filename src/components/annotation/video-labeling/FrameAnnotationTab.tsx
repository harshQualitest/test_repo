import { useState, useRef, type MouseEvent } from 'react';
import {
    Box,
    Typography,
    Card,
    Chip,
    Button,
    IconButton,
    Select,
    MenuItem,
    alpha,
    useTheme,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import CropFreeIcon from '@mui/icons-material/CropFree';
import CloseIcon from '@mui/icons-material/Close';
import VideocamIcon from '@mui/icons-material/Videocam';
import type { FrameData, Annotation } from './VideoLabeling';

const DISPLAY_LABELS = [
    'Display Structure - Shelving',
    'Display Structure - Bin / Produce',
    'Display Structure - Fridge',
    'Display Structure - Peg',
    'Display Structure - End Cap',
    'Display Structure - Bunker',
    'Display Structure - Table',
    'Display Structure - Pallet',
    'Display Structure - Bin',
    'Display Structure - Sidekick',
    'Display Structure - Clip Strip',
    'Display Structure - Gravity Dispenser',
    'Display Structure - Service Counter',
] as const;

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

/**
 * A bounding box the annotator has just drawn but not yet confirmed/labeled. Coordinates are
 * normalized fractions (0-1) of the frame image's width/height, matching Annotation.bbox's
 * format so it can be committed directly once a label is chosen.
 */
interface PendingBox {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
}

interface Props {
    /** Extracted video frames (with any existing annotations) to list and annotate. */
    frames: FrameData[];
    /** Called with the full replacement annotation list for one frame whenever it changes
     *  (add, remove, or relabel) — the parent (VideoLabeling) owns the frames array. */
    onUpdateAnnotations: (frameIndex: number, annotations: Annotation[]) => void;
}

/**
 * Component: FrameAnnotationTab
 *
 * Purpose: Renders the frame-by-frame bounding-box labeling UI for the video-labeling task —
 * a frame list on the left and a draw/label canvas on the right, where annotators draw boxes
 * around display structures and assign each one a label from a fixed taxonomy.
 *
 * Responsibilities:
 * - Lists all extracted frames sorted by timestamp, showing per-frame annotation counts and
 *   a labeled/unlabeled indicator.
 * - Lets the annotator select a frame, then draw a bounding box on its image via
 *   click-and-drag, choose a label for it, and confirm or cancel the pending box.
 * - Lets the annotator relabel or delete any already-committed annotation on the selected frame.
 * - Shows an empty state prompting the annotator to extract frames first when none exist.
 *
 * Props: see {@link Props} above (frames, onUpdateAnnotations).
 *
 * State:
 * - selectedFrameIndex: frameIndex of the currently selected frame (defaults to the first
 *   frame by timestamp order), or null if there are no frames.
 * - isDrawMode: whether "Draw Box" mode is active, enabling the click-and-drag gesture.
 * - isDrawing: whether a drag-to-draw gesture is currently in progress.
 * - drawStart / drawCurrent: start and live cursor position (as % of canvas) of the
 *   in-progress box being drawn.
 * - pendingBox: a just-drawn box (normalized 0-1 fractions) awaiting label confirmation.
 * - pendingLabel: the label currently selected in the pending-box label picker.
 *
 * Major child components: none (renders MUI Card/Box/Select primitives directly); consumes
 * shared types `FrameData`/`Annotation` from VideoLabeling.tsx.
 *
 * Important business logic:
 * - Coordinate transform: drawing is tracked in on-screen percentages via
 *   {@link getRelativePos} (like ConsolidatedView), but committed boxes are stored as
 *   normalized 0-1 fractions (`PendingBox`/`Annotation.bbox`) so they render correctly
 *   regardless of the displayed image's actual pixel size.
 * - A newly drawn box only becomes an annotation after the user picks a label and confirms
 *   it (`confirmPendingBox`) — drawing alone never mutates the frame's annotation list.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const FrameAnnotationTab = ({ frames, onUpdateAnnotations }: Props) => {
    const theme = useTheme();
    const canvasRef = useRef<HTMLDivElement>(null);

    // Frames are displayed in chronological order regardless of the order they arrived in.
    const sortedFrames = [...frames].sort((a, b) => a.timestamp - b.timestamp);

    const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(
        sortedFrames.length > 0 ? sortedFrames[0].frameIndex : null,
    );
    const [isDrawMode, setIsDrawMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
    const [pendingBox, setPendingBox] = useState<PendingBox | null>(null);
    const [pendingLabel, setPendingLabel] = useState<string>(DISPLAY_LABELS[0]);

    const selectedFrame = frames.find((f) => f.frameIndex === selectedFrameIndex) ?? null;

    /**
     * Converts a mouse event's viewport coordinates into a position relative to the
     * annotation canvas, expressed as a percentage (0-100) of the canvas's width/height and
     * clamped to stay within bounds. This is the coordinate basis for the in-progress draw preview.
     * @param e - Mouse event captured over the canvas.
     * @returns `{ x, y }` position as percentages of the canvas's width/height.
     */
    const getRelativePos = (e: MouseEvent<HTMLDivElement>): { x: number; y: number } => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
            y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
        };
    };

    /**
     * Begins a new bounding-box drag gesture. No-ops unless draw mode is active, a frame is
     * selected, and there isn't already an unconfirmed pending box (only one box can be
     * drawn at a time).
     * @param e - Mouse down event on the canvas.
     */
    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (!isDrawMode || !selectedFrame || pendingBox) return;
        e.preventDefault();
        const pos = getRelativePos(e);
        setDrawStart(pos);
        setDrawCurrent(pos);
        setIsDrawing(true);
    };

    /**
     * Updates the live end-corner of the in-progress bounding box while dragging.
     * No-ops if a drag isn't currently active.
     * @param e - Mouse move event on the canvas.
     */
    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isDrawing) return;
        setDrawCurrent(getRelativePos(e));
    };

    /**
     * Finalizes the drag gesture: normalizes the two drag corners into min/max percentage
     * bounds, discards boxes smaller than 1% in either dimension as accidental clicks, then
     * converts the surviving box to 0-1 fractions and stores it as `pendingBox` awaiting a
     * label (drawing does not commit an annotation by itself).
     */
    const handleMouseUp = () => {
        if (!isDrawing || !drawStart || !drawCurrent || !selectedFrame) return;

        const xMinPct = Math.min(drawStart.x, drawCurrent.x);
        const yMinPct = Math.min(drawStart.y, drawCurrent.y);
        const xMaxPct = Math.max(drawStart.x, drawCurrent.x);
        const yMaxPct = Math.max(drawStart.y, drawCurrent.y);

        if (xMaxPct - xMinPct > 1 && yMaxPct - yMinPct > 1) {
            setPendingBox({
                xMin: xMinPct / 100,
                yMin: yMinPct / 100,
                xMax: xMaxPct / 100,
                yMax: yMaxPct / 100,
            });
        }

        setIsDrawing(false);
        setDrawStart(null);
        setDrawCurrent(null);
    };

    /**
     * Safety-net cleanup: if the cursor leaves the canvas mid-drag (without a mouseup),
     * cancels the in-progress draw so no stray preview box is left rendered.
     */
    const handleMouseLeave = () => {
        if (isDrawing) {
            setIsDrawing(false);
            setDrawStart(null);
            setDrawCurrent(null);
        }
    };

    /**
     * Commits the current `pendingBox` as a new Annotation on the selected frame (with the
     * currently chosen `pendingLabel`), appending it to that frame's existing annotations via
     * `onUpdateAnnotations`, then clears the pending box and exits draw mode.
     */
    const confirmPendingBox = () => {
        if (!pendingBox || !selectedFrame) return;
        const annotation: Annotation = {
            id: `ann-${Date.now()}`,
            label: pendingLabel,
            bbox: pendingBox,
        };
        onUpdateAnnotations(selectedFrame.frameIndex, [...selectedFrame.annotations, annotation]);
        setPendingBox(null);
        setIsDrawMode(false);
    };

    /**
     * Discards the current pending box without creating an annotation, and exits draw mode.
     */
    const cancelPendingBox = () => {
        setPendingBox(null);
        setIsDrawMode(false);
    };

    /**
     * Deletes one committed annotation from the selected frame.
     * @param annId - Id of the annotation to remove.
     */
    const removeAnnotation = (annId: string) => {
        if (!selectedFrame) return;
        onUpdateAnnotations(
            selectedFrame.frameIndex,
            selectedFrame.annotations.filter((a) => a.id !== annId),
        );
    };

    /**
     * Changes the label of one already-committed annotation on the selected frame, leaving
     * its bounding box unchanged.
     * @param annId - Id of the annotation to relabel.
     * @param label - New label value.
     */
    const updateAnnotationLabel = (annId: string, label: string) => {
        if (!selectedFrame) return;
        onUpdateAnnotations(
            selectedFrame.frameIndex,
            selectedFrame.annotations.map((a) => (a.id === annId ? { ...a, label } : a)),
        );
    };

    if (frames.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <VideocamIcon sx={{ fontSize: 52, mb: 1.5, color: 'action.disabled' }} />
                <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                    No frames extracted yet
                </Typography>
                <Typography variant="caption">
                    Go to the Video tab and click "Extract Frames (2 FPS)" to pull frames for annotation.
                </Typography>
            </Box>
        );
    }

    const labeledCount = frames.filter((f) => f.annotations.length > 0).length;

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 2, minHeight: 520 }}>
            {/* ── Left: frame list ──────────────────────────────────── */}
            <Box sx={{ display: 'flex', flexDirection: 'column', height: 600, overflow: 'hidden' }}>
                {/* Sticky header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        pb: 1,
                        flexShrink: 0,
                    }}
                >
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 0.5 }}>
                        FRAMES ({frames.length})
                    </Typography>
                    <Chip
                        label={`${labeledCount} / ${frames.length} labeled`}
                        size="small"
                        color={labeledCount > 0 ? 'success' : 'default'}
                        variant={labeledCount > 0 ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.6rem', height: 18 }}
                    />
                </Box>

                {/* Scrollable frame list */}
                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        pr: 0.5,
                        '&::-webkit-scrollbar': { width: 4 },
                        '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                        '&::-webkit-scrollbar-thumb': { bgcolor: 'action.selected', borderRadius: 2 },
                    }}
                >
                    {sortedFrames.map((frame) => {
                        const isSelected = frame.frameIndex === selectedFrameIndex;
                        const hasAnnotations = frame.annotations.length > 0;
                        return (
                            <Card
                                key={frame.frameIndex}
                                variant="outlined"
                                onClick={() => {
                                    setSelectedFrameIndex(frame.frameIndex);
                                    setPendingBox(null);
                                    setIsDrawMode(false);
                                }}
                                sx={{
                                    borderRadius: 1.5,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    borderWidth: 2,
                                    borderColor: isSelected
                                        ? '#3b82f6'
                                        : hasAnnotations
                                          ? '#22c55e'
                                          : theme.palette.divider,
                                    bgcolor: isSelected
                                        ? alpha('#3b82f6', 0.06)
                                        : hasAnnotations
                                          ? alpha('#22c55e', 0.03)
                                          : 'transparent',
                                    transition: 'border-color 0.15s, background-color 0.15s',
                                    '&:hover': {
                                        borderColor: isSelected ? '#3b82f6' : '#94a3b8',
                                        bgcolor: isSelected ? alpha('#3b82f6', 0.06) : alpha('#3b82f6', 0.04),
                                    },
                                }}
                            >
                                <Box sx={{ p: 0.75 }}>
                                    {/* Thumbnail — aspect-ratio keeps true proportions; contain shows full frame */}
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            width: '100%',
                                            aspectRatio: '16 / 9',
                                            borderRadius: 0.75,
                                            overflow: 'hidden',
                                            bgcolor: '#0f172a',
                                            mb: 0.75,
                                        }}
                                    >
                                        {frame.frameUrl ? (
                                            <img
                                                src={frame.frameUrl}
                                                alt={`Frame ${frame.frameIndex}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                    display: 'block',
                                                }}
                                            />
                                        ) : (
                                            <Box
                                                sx={{
                                                    width: '100%',
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <VideocamIcon sx={{ fontSize: 20, color: '#334155' }} />
                                            </Box>
                                        )}

                                        {/* Frame index badge */}
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 3,
                                                left: 3,
                                                bgcolor: 'rgba(0,0,0,0.65)',
                                                color: 'white',
                                                fontSize: '0.55rem',
                                                fontWeight: 700,
                                                px: 0.6,
                                                py: 0.15,
                                                borderRadius: 0.5,
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            #{frame.frameIndex + 1}
                                        </Box>

                                        {/* Annotation count badge (top-right) */}
                                        {hasAnnotations && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: 3,
                                                    right: 3,
                                                    bgcolor: '#22c55e',
                                                    color: 'white',
                                                    fontSize: '0.55rem',
                                                    fontWeight: 700,
                                                    px: 0.6,
                                                    py: 0.15,
                                                    borderRadius: 0.5,
                                                    lineHeight: 1.4,
                                                }}
                                            >
                                                {frame.annotations.length}
                                            </Box>
                                        )}
                                    </Box>

                                    {/* Info row: timestamp + labeled status */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 0.5,
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            fontWeight={500}
                                            sx={{ fontSize: '0.68rem', color: 'text.secondary' }}
                                        >
                                            {formatTime(frame.timestamp)}
                                        </Typography>
                                        {hasAnnotations ? (
                                            <Chip
                                                label={`${frame.annotations.length} label${frame.annotations.length !== 1 ? 's' : ''}`}
                                                size="small"
                                                sx={{
                                                    fontSize: '0.58rem',
                                                    height: 16,
                                                    bgcolor: '#dcfce7',
                                                    color: '#15803d',
                                                    fontWeight: 700,
                                                    '& .MuiChip-label': { px: 0.75 },
                                                }}
                                            />
                                        ) : (
                                            <Typography
                                                variant="caption"
                                                sx={{ fontSize: '0.6rem', color: 'text.disabled', fontStyle: 'italic' }}
                                            >
                                                unlabeled
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Card>
                        );
                    })}
                </Box>
            </Box>

            {/* ── Right: annotation canvas ──────────────────────────── */}
            {selectedFrame ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Toolbar */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            variant={isDrawMode ? 'contained' : 'outlined'}
                            size="small"
                            startIcon={<CropFreeIcon sx={{ fontSize: 16 }} />}
                            onClick={() => {
                                setIsDrawMode((v) => !v);
                                setPendingBox(null);
                            }}
                            disabled={!!pendingBox}
                            sx={{
                                fontSize: '0.78rem',
                                height: 32,
                                textTransform: 'none',
                                ...(isDrawMode && {
                                    bgcolor: '#3b82f6',
                                    borderColor: '#3b82f6',
                                    '&:hover': { bgcolor: '#2563eb' },
                                }),
                            }}
                        >
                            {isDrawMode ? 'Click & drag to draw…' : 'Draw Box'}
                        </Button>

                        <Box sx={{ flex: 1 }} />

                        <Chip
                            label={`${selectedFrame.annotations.length} annotation${selectedFrame.annotations.length !== 1 ? 's' : ''}`}
                            size="small"
                            color={selectedFrame.annotations.length > 0 ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            Frame @ {formatTime(selectedFrame.timestamp)}
                        </Typography>
                    </Box>

                    {/* ── Canvas with frame image ───────────────────────── */}
                    <Box
                        ref={canvasRef}
                        sx={{
                            position: 'relative',
                            width: '100%',
                            paddingTop: '56.25%',
                            borderRadius: 2,
                            overflow: 'hidden',
                            cursor: pendingBox ? 'default' : isDrawMode ? 'crosshair' : 'default',
                            border: `2px solid ${isDrawMode || pendingBox ? '#3b82f6' : 'transparent'}`,
                            transition: 'border-color 0.15s',
                            bgcolor: '#0f172a',
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                    >
                        {/* Frame image */}
                        <Box sx={{ position: 'absolute', inset: 0 }}>
                            <img
                                src={selectedFrame.frameUrl}
                                alt={`Frame ${selectedFrame.frameIndex}`}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    display: 'block',
                                    userSelect: 'none',
                                    pointerEvents: 'none',
                                }}
                                draggable={false}
                            />
                        </Box>

                        {/* Draw mode hint */}
                        {isDrawMode && !pendingBox && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 8,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    bgcolor: alpha('#3b82f6', 0.9),
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: 1,
                                    pointerEvents: 'none',
                                    whiteSpace: 'nowrap',
                                    zIndex: 5,
                                }}
                            >
                                Click and drag to draw a bounding box
                            </Box>
                        )}

                        {/* Committed annotations */}
                        {selectedFrame.annotations.map((ann) => {
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

                        {/* In-progress draw preview */}
                        {isDrawing && drawStart && drawCurrent && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: `${Math.min(drawStart.x, drawCurrent.x)}%`,
                                    top: `${Math.min(drawStart.y, drawCurrent.y)}%`,
                                    width: `${Math.abs(drawCurrent.x - drawStart.x)}%`,
                                    height: `${Math.abs(drawCurrent.y - drawStart.y)}%`,
                                    border: '2px dashed #3b82f6',
                                    bgcolor: alpha('#3b82f6', 0.12),
                                    zIndex: 3,
                                    pointerEvents: 'none',
                                }}
                            />
                        )}

                        {/* Pending box + label picker popup */}
                        {pendingBox && (
                            <>
                                {/* Pending box outline */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: `${pendingBox.xMin * 100}%`,
                                        top: `${pendingBox.yMin * 100}%`,
                                        width: `${(pendingBox.xMax - pendingBox.xMin) * 100}%`,
                                        height: `${(pendingBox.yMax - pendingBox.yMin) * 100}%`,
                                        border: '2px solid #f59e0b',
                                        bgcolor: alpha('#f59e0b', 0.1),
                                        zIndex: 3,
                                        pointerEvents: 'none',
                                    }}
                                />

                                {/* Label picker — centered at top of canvas */}
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 8,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        bgcolor: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: 2,
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                                        p: 1.25,
                                        zIndex: 10,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        minWidth: 340,
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <Typography
                                        variant="caption"
                                        fontWeight={700}
                                        sx={{ color: '#1e293b', whiteSpace: 'nowrap', fontSize: '0.72rem' }}
                                    >
                                        Assign Label:
                                    </Typography>
                                    <Select
                                        value={pendingLabel}
                                        onChange={(e) => setPendingLabel(e.target.value)}
                                        size="small"
                                        sx={{ fontSize: '0.75rem', flex: 1, minWidth: 180 }}
                                    >
                                        {DISPLAY_LABELS.map((l) => (
                                            <MenuItem key={l} value={l} sx={{ fontSize: '0.75rem' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box
                                                        sx={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: '50%',
                                                            bgcolor: getLabelColor(l),
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    {l}
                                                </Box>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
                                        onClick={confirmPendingBox}
                                        sx={{
                                            fontSize: '0.72rem',
                                            height: 30,
                                            textTransform: 'none',
                                            bgcolor: '#22c55e',
                                            '&:hover': { bgcolor: '#16a34a' },
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        Add
                                    </Button>
                                    <IconButton
                                        size="small"
                                        onClick={cancelPendingBox}
                                        sx={{ width: 28, height: 28, color: '#64748b' }}
                                    >
                                        <CloseIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Box>
                            </>
                        )}
                    </Box>

                    {/* ── Annotations list ──────────────────────────────── */}
                    {selectedFrame.annotations.length > 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            <Typography
                                variant="caption"
                                fontWeight={600}
                                color="text.secondary"
                                sx={{ letterSpacing: 0.5 }}
                            >
                                ANNOTATIONS ({selectedFrame.annotations.length})
                            </Typography>

                            {selectedFrame.annotations.map((ann) => {
                                const color = getLabelColor(ann.label);
                                const wPct = Math.round((ann.bbox.xMax - ann.bbox.xMin) * 100);
                                const hPct = Math.round((ann.bbox.yMax - ann.bbox.yMin) * 100);
                                return (
                                    <Card key={ann.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
                                        <Box
                                            sx={{
                                                px: 1.5,
                                                py: 0.75,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    bgcolor: color,
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <Select
                                                value={ann.label}
                                                onChange={(e) => updateAnnotationLabel(ann.id, e.target.value)}
                                                size="small"
                                                variant="standard"
                                                sx={{ fontSize: '0.75rem', flex: 1 }}
                                            >
                                                {DISPLAY_LABELS.map((l) => (
                                                    <MenuItem key={l} value={l} sx={{ fontSize: '0.75rem' }}>
                                                        {l}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                                            >
                                                {wPct}×{hPct}%
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={() => removeAnnotation(ann.id)}
                                                sx={{
                                                    width: 26,
                                                    height: 26,
                                                    color: 'text.secondary',
                                                    '&:hover': { color: '#dc2626' },
                                                }}
                                            >
                                                <DeleteIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Box>
                                    </Card>
                                );
                            })}
                        </Box>
                    )}
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                        border: `1px dashed ${theme.palette.divider}`,
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="body2">Select a frame from the list to annotate</Typography>
                </Box>
            )}
        </Box>
    );
};

export default FrameAnnotationTab;
