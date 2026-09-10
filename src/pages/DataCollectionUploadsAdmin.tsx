import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Chip,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Button,
    TextField,
    InputAdornment,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import { withPageErrorBoundary } from '../utils/withPageErrorBoundary';
import { useToast } from '../hooks/useToast';
import dataCollectionApi from '../services/api/dataCollectionApi';
import type { IDatasetDocument, DatasetQualityState } from '../interfaces/api/dataCollection.interface';

const QUALITY_COLORS: Record<DatasetQualityState, 'default' | 'success' | 'error' | 'warning' | 'info'> = {
    'Pending': 'default',
    'Accepted': 'success',
    'Rejected': 'error',
    'Auto Accepted': 'success',
    'Auto Rejected': 'error',
    'QA Rejected': 'error',
    'Needs Manual Review': 'warning',
};

/** Formats an ISO date string for display; returns '—' when absent. */
const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Component: DataCollectionUploadsAdmin
 *
 * Purpose: Admin-facing table view of all uploads for a project, with search
 * and per-row quality/status display.
 *
 * Responsibilities:
 * - Load uploads for the project (`projectId` route param).
 * - Filter uploads by filename or uploader as the user types.
 * - Render a status chip per upload using `QUALITY_COLORS`.
 *
 * Props: none (reads `projectId` from the route).
 *
 * State:
 * - `uploads` — the project's dataset documents.
 * - `loading` — true while the initial fetch is in flight.
 * - `search` — current filter text.
 *
 * Custom hooks: `useToast` (`showError`).
 *
 * API calls: `dataCollectionApi.getUserUploads(projectId)`.
 *
 * Side effects: see the `useEffect` below (loads uploads on `projectId` change).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const DataCollectionUploadsAdmin = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { showError } = useToast();

    const [uploads, setUploads] = useState<IDatasetDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Loads uploads for the project whenever the route's `projectId` changes.
    useEffect(() => {
        if (!projectId) return;
        const load = async () => {
            setLoading(true);
            try {
                const list = await dataCollectionApi.getUserUploads(projectId);
                setUploads(list);
            } catch (err: any) {
                const msg =
                    err.response?.data?.detail?.error ||
                    err.response?.data?.error ||
                    err.message ||
                    'Failed to load uploads.';
                showError(msg);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [projectId]);

    // Case-insensitive match against either filename or uploader name.
    const filtered = uploads.filter((u) =>
        u.filename?.toLowerCase().includes(search.toLowerCase()) ||
        u.uploadedby?.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <Box maxWidth={1100} mx="auto" py={3} px={2}>
            {/* Header */}
            <Box display="flex" alignItems="center" gap={1} mb={3}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/data-collection/projects')}
                    size="small"
                >
                    Back
                </Button>
                <Typography variant="h5" fontWeight={700}>
                    Uploaded Data
                </Typography>
                {projectId && (
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                        — {decodeURIComponent(projectId)}
                    </Typography>
                )}
            </Box>

            {/* Search bar */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                    <TextField
                        size="small"
                        placeholder="Search by filename or uploader…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ minWidth: 260 }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                    {!loading && (
                        <Typography variant="body2" color="text.secondary">
                            {filtered.length} upload{filtered.length !== 1 ? 's' : ''}
                        </Typography>
                    )}
                </Box>
            </Paper>

            {/* Loading */}
            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={8} gap={2}>
                    <CircularProgress size={28} />
                    <Typography color="text.secondary" variant="body2">Loading uploads…</Typography>
                </Box>
            ) : filtered.length === 0 ? (
                <Paper variant="outlined" sx={{ py: 8, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                        {search ? 'No uploads match your search.' : 'No uploads found for this project.'}
                    </Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Filename</TableCell>
                                <TableCell>Uploaded By</TableCell>
                                <TableCell>Phase</TableCell>
                                <TableCell>Format</TableCell>
                                <TableCell>Quality</TableCell>
                                <TableCell>Submitted</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map((doc, idx) => (
                                <TableRow key={doc._id ?? idx} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>
                                            {doc.filename}
                                        </Typography>
                                        {doc.reason && (
                                            <Typography variant="caption" color="error.main">
                                                {doc.reason}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{doc.uploadedby ?? '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{doc.phase ?? '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{doc.fileformat ?? doc.filetype ?? '—'}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        {doc.quality ? (
                                            <Chip
                                                label={doc.quality}
                                                size="small"
                                                color={QUALITY_COLORS[doc.quality] ?? 'default'}
                                            />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">—</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{formatDate(doc.createdon)}</Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default withPageErrorBoundary(DataCollectionUploadsAdmin, 'Data Collection Uploads');
