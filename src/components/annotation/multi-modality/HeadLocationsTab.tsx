import {
    Box,
    Typography,
    Card,
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import type { HeadLocation } from './types';

// The bounding-box fields rendered as adjacent numeric inputs, in display order (x, y, w, h).
const BBOX_FIELDS: Array<keyof HeadLocation> = ['x', 'y', 'w', 'h'];

interface Props {
    /** Head-location annotation rows to render as an editable table (see types.ts). */
    headLocations: HeadLocation[];
    /** Called when any single field of a row is edited (e.g. a bbox coordinate, visibility, ids, type). */
    onUpdate: (index: number, field: keyof HeadLocation, value: string | number) => void;
    /** Called when a row's delete action is clicked. */
    onRemove: (index: number) => void;
}

/**
 * Component: HeadLocationsTab
 *
 * Purpose: Renders the "Head Locations" annotation sub-tab as an editable table — one row
 * per detected head bounding box, letting annotators correct coordinates, visibility, person
 * ID, tracklet ID, and detection type.
 *
 * Responsibilities:
 * - Displays each head-location row's frame/timestamp (read-only) alongside editable bounding
 *   box (x, y, w, h), visibility bucket, person ID, tracklet ID, and type fields.
 * - Delegates all mutations to the parent via `onUpdate`/`onRemove` — this component holds no
 *   local state itself; ConsolidatedView owns the `headLocations` array.
 *
 * Props: see {@link Props} above (headLocations, onUpdate, onRemove).
 *
 * Major child components: MUI Table/TableContainer with inline TextField/Select cells (no
 * custom child components).
 *
 * Important business logic: the four BBOX_FIELDS inputs are rendered generically via a map
 * over `keyof HeadLocation`, so adding/reordering bbox fields only requires editing that array.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const HeadLocationsTab = ({ headLocations, onUpdate, onRemove }: Props) => (
    <Card sx={{ borderRadius: 1.5, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="body2" fontWeight={500}>
                Head Location Annotations (Frame 0)
            </Typography>
            <Typography variant="caption" color="text.secondary">
                Labeling at 2 frames per second
            </Typography>
        </Box>
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        {['Frame', 'Timestamp', 'Bounding Box (x,y,w,h)', 'Visibility', 'Person ID', 'Tracklet ID', 'Type', 'Actions'].map((col) => (
                            <TableCell key={col} sx={{ fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                                {col}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {headLocations.map((row, i) => (
                        <TableRow key={i} hover>
                            <TableCell sx={{ fontSize: '0.72rem' }}>{row.frame}</TableCell>
                            <TableCell sx={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>{row.timestamp}</TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    {BBOX_FIELDS.map((field) => (
                                        <TextField
                                            key={String(field)}
                                            type="number"
                                            value={row[field] as number}
                                            onChange={(e) => onUpdate(i, field, Number(e.target.value))}
                                            size="small"
                                            sx={{ width: 52, '& input': { fontSize: '0.7rem', p: '4px 6px' } }}
                                        />
                                    ))}
                                </Box>
                            </TableCell>
                            <TableCell>
                                <Select
                                    value={row.visibility}
                                    onChange={(e) => onUpdate(i, 'visibility', e.target.value)}
                                    size="small"
                                    sx={{ fontSize: '0.72rem', height: 28, minWidth: 110 }}
                                >
                                    {['100%', '75%-100%', '50%-75%', '25%-50%', '0%-25%', '0%'].map((v) => (
                                        <MenuItem key={v} value={v} sx={{ fontSize: '0.72rem' }}>{v}</MenuItem>
                                    ))}
                                </Select>
                            </TableCell>
                            <TableCell>
                                <TextField
                                    value={row.personId}
                                    onChange={(e) => onUpdate(i, 'personId', e.target.value)}
                                    size="small"
                                    placeholder="spk12345"
                                    sx={{ width: 100, '& input': { fontSize: '0.7rem', p: '4px 6px' } }}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    value={row.trackletId}
                                    onChange={(e) => onUpdate(i, 'trackletId', e.target.value)}
                                    size="small"
                                    placeholder="track-001"
                                    sx={{ width: 100, '& input': { fontSize: '0.7rem', p: '4px 6px' } }}
                                />
                            </TableCell>
                            <TableCell>
                                <Select
                                    value={row.type}
                                    onChange={(e) => onUpdate(i, 'type', e.target.value)}
                                    size="small"
                                    sx={{ fontSize: '0.72rem', height: 28, minWidth: 200 }}
                                >
                                    {['Real Person', 'Not Real (Image / Poster / reflection)'].map((t) => (
                                        <MenuItem key={t} value={t} sx={{ fontSize: '0.72rem' }}>{t}</MenuItem>
                                    ))}
                                </Select>
                            </TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <IconButton size="small" sx={{ width: 28, height: 28 }}>
                                        <DriveFileRenameOutlineIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => onRemove(i)}
                                        sx={{ width: 28, height: 28, color: '#dc2626', '&:hover': { bgcolor: '#fef2f2', color: '#b91c1c' } }}
                                    >
                                        <DeleteIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
        </Box>
    </Card>
);

export default HeadLocationsTab;
