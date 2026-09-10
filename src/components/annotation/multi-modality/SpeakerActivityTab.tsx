import {
    Box,
    Typography,
    Card,
    Chip,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Select,
    MenuItem,
    TextField,
    alpha,
    useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ActivityRow } from './types';

const TOTAL_DURATION = 120;

const ACTIVITY_COLORS: Record<string, string> = {
    Speech: '#3b82f6',
    'Side Talk': '#eab308',
    'Non-Speech': '#a855f7',
};

const ACTIVITY_LEGEND = [
    { label: 'Speech', color: '#3b82f6' },
    { label: 'Side Talk', color: '#eab308' },
    { label: 'Non-Speech', color: '#a855f7' },
];

/** One colored segment on a speaker's timeline row: `left`/`width` are percentages of TOTAL_DURATION. */
interface TimelineSegment { type: string; left: number; width: number; }
/** A speaker's full row of timeline segments, keyed by speaker/person id. */
interface SpeakerTimeline { speakerId: string; segments: TimelineSegment[]; }

const SPEAKER_TIMELINES: SpeakerTimeline[] = [
    {
        speakerId: 'spk12345',
        segments: [
            { type: 'Speech', left: (0 / TOTAL_DURATION) * 100, width: (5.2 / TOTAL_DURATION) * 100 },
            { type: 'Side Talk', left: (8 / TOTAL_DURATION) * 100, width: (4 / TOTAL_DURATION) * 100 },
        ],
    },
    {
        speakerId: 'spk12346',
        segments: [{ type: 'Speech', left: (5.5 / TOTAL_DURATION) * 100, width: (4.8 / TOTAL_DURATION) * 100 }],
    },
    {
        speakerId: 'spk12347',
        segments: [{ type: 'Speech', left: (11 / TOTAL_DURATION) * 100, width: (7.5 / TOTAL_DURATION) * 100 }],
    },
];

/**
 * Formats the duration between two timestamps (in seconds) as `mm:ss.cc`.
 * Clamps to zero if `end` is before `start` so a malformed row never renders a negative duration.
 * @param start - Segment start time in seconds.
 * @param end - Segment end time in seconds.
 * @returns Zero-padded `mm:ss.cc` duration string.
 */
const formatDuration = (start: number, end: number): string => {
    const d = Math.max(0, end - start);
    const mins = Math.floor(d / 60);
    const secs = Math.floor(d % 60);
    const cents = Math.round((d % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cents).padStart(2, '0')}`;
};

/**
 * Checks whether a given activity row's [start, end) time range overlaps with any other
 * row's range — used to highlight rows/table entries that need annotator review for
 * simultaneous speech (duplicated from ConsolidatedView so this component has no local
 * dependency on the parent's copy).
 * @param row - The activity row being checked.
 * @param all - The full set of activity rows to compare against.
 * @returns True if `row` overlaps in time with at least one other row.
 */
const rowHasOverlap = (row: ActivityRow, all: ActivityRow[]): boolean =>
    all.some((other) => other.id !== row.id && row.start < other.end && other.start < row.end);

interface Props {
    /** Current video playhead position in seconds, used to draw the red marker on the timeline. */
    currentTime: number;
    /** Speaker activity segment rows to render in the editable table. */
    activityRows: ActivityRow[];
    /** Precomputed left/width (% of TOTAL_DURATION) bars marking overlapping segments. */
    overlapBars: { left: number; width: number }[];
    /** Called when the "Add Segment" button is clicked. */
    onAddActivityRow: () => void;
    /** Called when any single field of a row is edited. */
    onUpdateActivityRow: (id: string, field: keyof ActivityRow, value: string | number) => void;
    /** Called when a row's delete action is clicked. */
    onRemoveActivityRow: (id: string) => void;
}

/**
 * Component: SpeakerActivityTab
 *
 * Purpose: Renders the "Speaker Activity" annotation sub-tab — a per-speaker visual timeline
 * plus an editable table of speech/side-talk/non-speech segments, with overlap detection to
 * flag simultaneous speakers that need careful review.
 *
 * Responsibilities:
 * - Draws a colored timeline row per speaker (from static SPEAKER_TIMELINES mock data) with a
 *   live playhead marker synced to `currentTime`.
 * - Renders an "Overlaps" strip beneath the timelines highlighting any time ranges where two
 *   or more activity rows collide.
 * - Renders an editable table of activity segments (start/end/person/type/notes) with
 *   per-row overlap highlighting and a legend for activity-type colors.
 *
 * Props: see {@link Props} above.
 *
 * Major child components: none (MUI Table/Box primitives only).
 *
 * Important business logic: overlap highlighting (both the timeline "Overlaps" strip and the
 * per-row table highlight) is driven by comparing every row's [start, end) range against
 * every other row's — see {@link rowHasOverlap} and the parent-supplied `overlapBars`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const SpeakerActivityTab = ({
    currentTime,
    activityRows,
    overlapBars,
    onAddActivityRow,
    onUpdateActivityRow,
    onRemoveActivityRow,
}: Props) => {
    const theme = useTheme();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* Timeline card */}
            <Card sx={{ borderRadius: 1.5, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={500}>Speaker Activity Timeline</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {ACTIVITY_LEGEND.map((item) => (
                            <Chip
                                key={item.label}
                                size="small"
                                variant="outlined"
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                                        {item.label}
                                    </Box>
                                }
                                sx={{ fontSize: '0.7rem', height: 22 }}
                            />
                        ))}
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {SPEAKER_TIMELINES.map((speaker) => (
                        <Box key={speaker.speakerId} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                                variant="caption"
                                sx={{ width: 72, minWidth: 72, fontSize: '0.7rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                                {speaker.speakerId}
                            </Typography>
                            <Box
                                sx={{
                                    flex: 1,
                                    position: 'relative',
                                    height: 32,
                                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                                    borderRadius: 0.75,
                                    overflow: 'hidden',
                                }}
                            >
                                <Box sx={{ position: 'absolute', inset: 0, display: 'flex' }}>
                                    {Array.from({ length: 10 }).map((_, i) => (
                                        <Box key={i} sx={{ flex: 1, borderRight: `1px solid ${theme.palette.divider}` }} />
                                    ))}
                                </Box>
                                {speaker.segments.map((seg, si) => (
                                    <Box
                                        key={si}
                                        title={`${seg.type}: ${seg.left.toFixed(2)}% - ${(seg.left + seg.width).toFixed(2)}%`}
                                        sx={{
                                            position: 'absolute',
                                            top: 2,
                                            bottom: 2,
                                            left: `${seg.left}%`,
                                            width: `${seg.width}%`,
                                            bgcolor: ACTIVITY_COLORS[seg.type] ?? '#94a3b1',
                                            borderRadius: 0.5,
                                            cursor: 'pointer',
                                            overflow: 'hidden',
                                            '&:hover': { opacity: 0.8 },
                                        }}
                                    >
                                        <Typography sx={{ fontSize: '0.45rem', color: 'white', px: 0.5, lineHeight: '28px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                            {seg.type}
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
                                        left: `${(currentTime / TOTAL_DURATION) * 100}%`,
                                        zIndex: 10,
                                    }}
                                />
                            </Box>
                        </Box>
                    ))}

                    <Box>
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 500, display: 'block', mb: 0.5 }}>
                            Overlaps
                        </Typography>
                        <Box
                            sx={{
                                ml: '80px',
                                position: 'relative',
                                height: 24,
                                bgcolor: alpha(theme.palette.primary.main, 0.06),
                                borderRadius: 0.75,
                                overflow: 'hidden',
                            }}
                        >
                            {overlapBars.map((bar, i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        position: 'absolute',
                                        top: 2,
                                        bottom: 2,
                                        left: `${bar.left}%`,
                                        width: `${bar.width}%`,
                                        bgcolor: alpha('#ef4444', 0.5),
                                        borderRadius: 0.5,
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                </Box>
            </Card>

            {/* Segments table card */}
            <Card sx={{ borderRadius: 1.5, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={500}>Speaker Activity Segments</Typography>
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                        onClick={onAddActivityRow}
                        sx={{ fontSize: '0.72rem', height: 30, textTransform: 'none' }}
                    >
                        Add Segment
                    </Button>
                </Box>

                <TableContainer sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {['Start Time', 'End Time', 'Duration', 'Person ID', 'Type', 'Notes', 'Actions'].map((col) => (
                                    <TableCell key={col} sx={{ fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                                        {col}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {activityRows.map((row) => {
                                const isOverlap = rowHasOverlap(row, activityRows);
                                return (
                                    <TableRow
                                        key={row.id}
                                        sx={{ bgcolor: isOverlap ? alpha('#ef4444', 0.06) : 'inherit' }}
                                    >
                                        <TableCell>
                                            <TextField
                                                type="number"
                                                value={row.start}
                                                onChange={(e) => onUpdateActivityRow(row.id, 'start', Number(e.target.value))}
                                                size="small"
                                                inputProps={{ step: 0.01 }}
                                                sx={{ width: 80, '& input': { fontSize: '0.7rem', p: '4px 6px', fontFamily: 'monospace' } }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                type="number"
                                                value={row.end}
                                                onChange={(e) => onUpdateActivityRow(row.id, 'end', Number(e.target.value))}
                                                size="small"
                                                inputProps={{ step: 0.01 }}
                                                sx={{ width: 80, '& input': { fontSize: '0.7rem', p: '4px 6px', fontFamily: 'monospace' } }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                                            {formatDuration(row.start, row.end)}
                                            {isOverlap && (
                                                <Chip
                                                    label="Overlap"
                                                    size="small"
                                                    sx={{ ml: 1, height: 18, fontSize: '0.6rem', bgcolor: 'error.main', color: 'white' }}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                value={row.personId}
                                                onChange={(e) => onUpdateActivityRow(row.id, 'personId', e.target.value)}
                                                size="small"
                                                placeholder="spk12345"
                                                sx={{ width: 90, '& input': { fontSize: '0.7rem', p: '4px 6px' } }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={row.type}
                                                onChange={(e) => onUpdateActivityRow(row.id, 'type', e.target.value)}
                                                size="small"
                                                sx={{ height: 28, fontSize: '0.72rem', minWidth: 110 }}
                                            >
                                                {['Speech', 'Side Talk', 'Non-Speech'].map((t) => (
                                                    <MenuItem key={t} value={t} sx={{ fontSize: '0.72rem' }}>{t}</MenuItem>
                                                ))}
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                value={row.notes}
                                                onChange={(e) => onUpdateActivityRow(row.id, 'notes', e.target.value)}
                                                size="small"
                                                placeholder="Optional notes"
                                                sx={{ width: 120, '& input': { fontSize: '0.7rem', p: '4px 6px' } }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={() => onRemoveActivityRow(row.id)}
                                                sx={{ color: 'error.main', width: 28, height: 28, '&:hover': { bgcolor: alpha('#ef4444', 0.08) } }}
                                            >
                                                <DeleteIcon sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Box
                    sx={{
                        mt: 2,
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: alpha('#eab308', 0.08),
                        border: `1px solid ${alpha('#eab308', 0.3)}`,
                    }}
                >
                    <Typography variant="caption" fontWeight={600} sx={{ color: '#713f12', display: 'block', mb: 0.75 }}>
                        Speaker Activity Guidelines:
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                        {[
                            'Person IDs must be consistent with Head Location annotations',
                            'Use "Speech" type for normal speaking activity',
                            'Use "Side Talk" for conversations happening in parallel',
                            'Use "Non-Speech" for laughing, coughing, humming, etc.',
                            'Properly annotate overlapping speech segments (highlighted in red)',
                            'Multiple speakers can be active simultaneously',
                        ].map((line) => (
                            <Typography key={line} component="li" variant="caption" sx={{ fontSize: '0.7rem', color: '#78350f' }}>
                                • {line}
                            </Typography>
                        ))}
                    </Box>
                </Box>
            </Card>
        </Box>
    );
};

export default SpeakerActivityTab;
