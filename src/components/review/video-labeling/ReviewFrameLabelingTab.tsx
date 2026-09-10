import { useState, useMemo } from 'react';
import { Box, Typography, Card, Chip, useTheme, alpha } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';

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
 * Formats a millisecond timestamp as `MM:SS` for frame timestamp display.
 * @param ms - timestamp in milliseconds.
 * @returns a zero-padded `MM:SS` string.
 */
const formatTime = (ms: number): string => {
    const totalSecs = ms / 1000;
    const m = Math.floor(totalSecs / 60);
    const s = Math.floor(totalSecs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Derives the media host (stripping the trailing /v{n} API version segment) so relative
// frame image paths returned by the API can be resolved to absolute URLs.
const MEDIA_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080/v0').replace(
    /\/v\d+$/,
    '',
);
/**
 * Resolves a possibly-relative media path (e.g. a frame image URL from the API) to an
 * absolute URL rooted at `MEDIA_BASE`. Paths already starting with `http` pass through unchanged.
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
    _id: string;
    frame_index: number;
    timestamp_ms: number;
    url: string;
    width_px: number;
    height_px: number;
    annotated: boolean;
    bounding_boxes: ApiBoundingBox[];
}

interface ReviewTaskDetail {
    frames: ApiFrame[];
    annotation_summary?: {
        total_frames: number;
        annotated_frames: number;
        total_annotations: number;
    };
}

/**
 * Component: ReviewFrameLabelingTab
 *
 * Purpose: Sub-tab of `VideoLabelingReview` (the "video_labeling" template review flow)
 * showing a scrollable list of sampled video frames on the left and the selected frame's
 * full-size image with bounding-box overlays and an annotation list on the right.
 *
 * Responsibilities:
 * - List every frame in `taskDetail.frames`, with a thumbnail, timestamp, and
 *   annotated/unannotated indicator for each.
 * - Let the reviewer click a frame to inspect it in detail, including bounding-box
 *   overlays rendered at their normalized (0-1) coordinates.
 * - List the individual bounding-box annotations (label, size %, annotator name) for
 *   the selected frame.
 *
 * Props:
 * - taskDetail (ReviewTaskDetail | null, optional): the reviewer-task detail payload
 *   fetched by the parent (`VideoLabelingReview`) via `projectApi.getReviewerTaskById`;
 *   contains the `frames` array this tab renders. When absent, shows an empty state.
 *
 * State:
 * - selectedIndex (number): `frame_index` of the currently-selected frame in the left list;
 *   defaults to 0 (first frame).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ReviewFrameLabelingTab = ({ taskDetail }: { taskDetail?: ReviewTaskDetail | null }) => {
    const theme = useTheme();
    const frames = taskDetail?.frames ?? [];

    const [selectedIndex, setSelectedIndex] = useState(0);

    // Memoized because `frames` is derived fresh each render from `taskDetail`; avoids
    // re-running the `find` scan unless the frame list or selection actually changes.
    // Falls back to the first frame if the selected index isn't found (e.g. stale selection).
    const selectedFrame = useMemo(
        () => frames.find((f) => f.frame_index === selectedIndex) ?? frames[0] ?? null,
        [frames, selectedIndex],
    );

    const annotatedCount = frames.filter((f) => f.annotated).length;
    const aspectRatio = selectedFrame
        ? `${selectedFrame.width_px} / ${selectedFrame.height_px}`
        : '9 / 16';

    if (frames.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8, color: 'text.secondary' }}>
                <Typography variant="body2">No frame data available</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 2, minHeight: 520 }}>
            {/* ── Left: frame list ──────────────────────────────────── */}
            <Box sx={{ display: 'flex', flexDirection: 'column', height: 600, overflow: 'hidden' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, flexShrink: 0 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 0.5 }}>
                        FRAMES ({frames.length})
                    </Typography>
                    <Chip
                        label={`${annotatedCount} annotated`}
                        size="small"
                        color={annotatedCount > 0 ? 'success' : 'default'}
                        variant={annotatedCount > 0 ? 'filled' : 'outlined'}
                        sx={{ fontSize: '0.6rem', height: 18 }}
                    />
                </Box>

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
                    {frames.map((frame) => {
                        const isSelected = frame.frame_index === selectedIndex;
                        const hasBoxes = frame.bounding_boxes.length > 0;
                        return (
                            <Card
                                key={frame._id}
                                variant="outlined"
                                onClick={() => setSelectedIndex(frame.frame_index)}
                                sx={{
                                    borderRadius: 1.5,
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    borderWidth: 2,
                                    borderColor: isSelected
                                        ? '#3b82f6'
                                        : hasBoxes
                                        ? '#22c55e'
                                        : theme.palette.divider,
                                    bgcolor: isSelected
                                        ? alpha('#3b82f6', 0.06)
                                        : hasBoxes
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
                                    {/* Thumbnail */}
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            width: '100%',
                                            aspectRatio: '9 / 16',
                                            borderRadius: 0.75,
                                            overflow: 'hidden',
                                            bgcolor: '#0f172a',
                                            mb: 0.75,
                                        }}
                                    >
                                        {frame.url ? (
                                            <img
                                                src={toAbsUrl(frame.url)}
                                                alt={`Frame ${frame.frame_index}`}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            />
                                        ) : (
                                            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <VideocamIcon sx={{ fontSize: 20, color: '#334155' }} />
                                            </Box>
                                        )}
                                        {/* Frame index badge */}
                                        <Box sx={{ position: 'absolute', top: 3, left: 3, bgcolor: 'rgba(0,0,0,0.65)', color: 'white', fontSize: '0.55rem', fontWeight: 700, px: 0.6, py: 0.15, borderRadius: 0.5 }}>
                                            #{frame.frame_index + 1}
                                        </Box>
                                        {/* Annotation count badge */}
                                        {hasBoxes && (
                                            <Box sx={{ position: 'absolute', top: 3, right: 3, bgcolor: '#22c55e', color: 'white', fontSize: '0.55rem', fontWeight: 700, px: 0.6, py: 0.15, borderRadius: 0.5 }}>
                                                {frame.bounding_boxes.length}
                                            </Box>
                                        )}
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                                        <Typography variant="caption" fontWeight={500} sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                                            {formatTime(frame.timestamp_ms)}
                                        </Typography>
                                        {hasBoxes ? (
                                            <Chip
                                                label={`${frame.bounding_boxes.length} label${frame.bounding_boxes.length !== 1 ? 's' : ''}`}
                                                size="small"
                                                sx={{ fontSize: '0.58rem', height: 16, bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }}
                                            />
                                        ) : (
                                            <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.disabled', fontStyle: 'italic' }}>
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

            {/* ── Right: frame detail ───────────────────────────────── */}
            {selectedFrame ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={600}>
                            Frame #{selectedFrame.frame_index + 1}
                        </Typography>
                        <Chip label={formatTime(selectedFrame.timestamp_ms)} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                        <Box sx={{ flex: 1 }} />
                        <Chip
                            label={`${selectedFrame.bounding_boxes.length} annotation${selectedFrame.bounding_boxes.length !== 1 ? 's' : ''}`}
                            size="small"
                            color={selectedFrame.bounding_boxes.length > 0 ? 'success' : 'default'}
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                        />
                    </Box>

                    {/* Frame image with bounding box overlays */}
                    <Box
                        sx={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio,
                            maxHeight: 520,
                            borderRadius: 2,
                            overflow: 'hidden',
                            bgcolor: '#0f172a',
                            border: `2px solid ${theme.palette.divider}`,
                            alignSelf: 'flex-start',
                        }}
                    >
                        {selectedFrame.url ? (
                            <img
                                src={toAbsUrl(selectedFrame.url)}
                                alt={`Frame ${selectedFrame.frame_index}`}
                                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                                draggable={false}
                            />
                        ) : (
                            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <VideocamIcon sx={{ fontSize: 52, color: '#334155' }} />
                            </Box>
                        )}

                        {/* Bounding box overlays */}
                        {selectedFrame.bounding_boxes.map((bb) => {
                            const color = getLabelColor(bb.label);
                            const { x_min, y_min, x_max, y_max } = bb.bbox;
                            return (
                                <Box
                                    key={bb.id}
                                    sx={{
                                        position: 'absolute',
                                        left: `${x_min * 100}%`,
                                        top: `${y_min * 100}%`,
                                        width: `${(x_max - x_min) * 100}%`,
                                        height: `${(y_max - y_min) * 100}%`,
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
                                        {bb.label}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Annotations list */}
                    {selectedFrame.bounding_boxes.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ letterSpacing: 0.5 }}>
                                ANNOTATIONS ({selectedFrame.bounding_boxes.length})
                            </Typography>
                            {selectedFrame.bounding_boxes.map((bb) => {
                                const color = getLabelColor(bb.label);
                                const wPct = Math.round((bb.bbox.x_max - bb.bbox.x_min) * 100);
                                const hPct = Math.round((bb.bbox.y_max - bb.bbox.y_min) * 100);
                                return (
                                    <Card key={bb.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
                                        <Box sx={{ px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.78rem', flex: 1 }}>
                                                {bb.label}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                                                {wPct}×{hPct}%
                                            </Typography>
                                            {bb.annotator && (
                                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem', whiteSpace: 'nowrap' }}>
                                                    {bb.annotator.name}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Card>
                                );
                            })}
                        </Box>
                    ) : (
                        <Box sx={{ py: 3, textAlign: 'center', border: `1px dashed ${theme.palette.divider}`, borderRadius: 2 }}>
                            <Typography variant="body2" color="text.disabled">
                                No annotations on this frame
                            </Typography>
                        </Box>
                    )}
                </Box>
            ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${theme.palette.divider}`, borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary">Select a frame from the list</Typography>
                </Box>
            )}
        </Box>
    );
};

export default ReviewFrameLabelingTab;
