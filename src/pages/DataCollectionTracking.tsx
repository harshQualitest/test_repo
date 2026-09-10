import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    CircularProgress,
    Grid,
    InputAdornment,
    TextField,
    Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import InboxIcon from '@mui/icons-material/Inbox';
import { withPageErrorBoundary } from '../utils/withPageErrorBoundary';
import { useToast } from '../hooks/useToast';
import dataCollectionApi from '../services/api/dataCollectionApi';
import type { IDataCollectionProject, IDatasetDocument } from '../interfaces/api/dataCollection.interface';
import { ProjectHeader, UploadCard } from '../components/data-collection/DataCollectionDisplay';

// ── Page ──────────────────────────────────────────────────────────────────

interface TrackingRouteState {
    project?: { name?: string; [key: string]: unknown };
}

/**
 * Component: DataCollectionTracking
 *
 * Purpose: Manager-facing page showing all uploads for a single data-collection
 * project, with a searchable grid and a project summary header.
 *
 * Responsibilities:
 * - Load the full project (including its `datasets`) by `projectId`.
 * - Filter the uploads list by filename or uploader as the user types.
 * - Render a project header, upload count, and a responsive grid of `UploadCard`s.
 *
 * Props: none (reads `projectId` from the route; optional `project.name` from router state).
 *
 * State:
 * - `fullProject` — the loaded project (used for the header and upload count).
 * - `uploads` — the project's dataset documents.
 * - `loading` — true while the initial project fetch is in flight.
 * - `search` — current filter text for filename/uploader search.
 *
 * Custom hooks: `useToast` (`showError`).
 *
 * API calls: `dataCollectionApi.getProjectData(projectId)`.
 *
 * Major child components: `ProjectHeader`, `UploadCard` (src/components/data-collection/DataCollectionDisplay.tsx).
 *
 * Side effects: see the `useEffect` below (loads project + uploads on `projectId` change).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const DataCollectionTracking = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { showError } = useToast();

    const routeProjectName = (location.state as TrackingRouteState)?.project?.name ?? null;

    const [fullProject, setFullProject] = useState<IDataCollectionProject | null>(null);
    const [uploads, setUploads] = useState<IDatasetDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Loads the project (and its uploads) whenever the route's `projectId` changes.
    useEffect(() => {
        if (!projectId) return;
        const load = async () => {
            setLoading(true);
            try {
                const project = await dataCollectionApi.getProjectData(projectId);
                setFullProject(project);
                setUploads(project.datasets ?? []);
            } catch (err: unknown) {
                const e = err as { response?: { data?: { detail?: { error?: string }; error?: string } }; message?: string };
                const msg =
                    e.response?.data?.detail?.error ||
                    e.response?.data?.error ||
                    e.message ||
                    'Failed to load project data.';
                showError(msg);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [projectId]);

    // Memoized so the filtered list (and the grid it feeds) isn't recomputed on
    // every render — only when the underlying uploads or search text change.
    // Case-insensitive match against either filename or uploader name.
    const filtered = useMemo(
        () =>
            uploads.filter(
                (u) =>
                    u.filename?.toLowerCase().includes(search.toLowerCase()) ||
                    u.uploaded_by?.toLowerCase().includes(search.toLowerCase()),
            ),
        [uploads, search],
    );

    const displayName = fullProject?.name ?? routeProjectName ?? uploads[0]?.project_name ?? projectId ?? '';

    return (
        <Box maxWidth={1200} mx="auto" py={3} px={{ xs: 2, sm: 3 }}>
            {/* Back */}
            <Button
                startIcon={<ArrowBackIcon sx={{ fontSize: '14px !important' }} />}
                onClick={() => navigate(-1)}
                size="small"
                sx={{
                    mb: 2.5,
                    color: '#9E9E9E',
                    textTransform: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    px: 0,
                    '&:hover': { color: '#000', bgcolor: 'transparent' },
                }}
            >
                Back
            </Button>

            {/* Full-page loader */}
            {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={16}>
                    <CircularProgress size={20} thickness={3} sx={{ color: '#000' }} />
                </Box>
            ) : (
                <>
                    {/* Project header */}
                    {fullProject ? (
                        <ProjectHeader project={fullProject} uploadCount={uploads.length} />
                    ) : (
                        <Typography
                            sx={{ fontSize: '1.4rem', fontWeight: 800, color: '#000', letterSpacing: '-0.02em', mb: 3 }}
                        >
                            {displayName}
                        </Typography>
                    )}

                    {/* Uploads toolbar */}
                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        mb={2.5}
                        flexWrap="wrap"
                        gap={1.5}
                    >
                        <Box display="flex" alignItems="baseline" gap={1}>
                            <Typography
                                sx={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    color: '#000',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                }}
                            >
                                Uploads
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: '0.7rem',
                                    color: '#BDBDBD',
                                    fontWeight: 500,
                                    letterSpacing: '0.05em',
                                }}
                            >
                                {filtered.length}
                            </Typography>
                        </Box>
                        <TextField
                            size="small"
                            placeholder="Search by filename or uploader…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{
                                minWidth: 260,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    '& fieldset': { borderColor: '#E0E0E0' },
                                    '&:hover fieldset': { borderColor: '#000' },
                                    '&.Mui-focused fieldset': { borderColor: '#000', borderWidth: '1px' },
                                },
                                '& .MuiInputBase-input': {
                                    py: '7px',
                                    '&::placeholder': { color: '#C0C0C0', opacity: 1 },
                                },
                            }}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ fontSize: 16, color: '#BDBDBD' }} />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                    </Box>

                    {/* Thin rule */}
                    <Box sx={{ height: 1, bgcolor: '#F0F0F0', mb: 2.5 }} />

                    {/* Upload grid or empty state */}
                    {filtered.length === 0 ? (
                        <Box
                            sx={{
                                py: 10,
                                textAlign: 'center',
                                border: '1.5px dashed #E0E0E0',
                                borderRadius: '12px',
                            }}
                        >
                            <InboxIcon sx={{ fontSize: 36, color: '#E0E0E0', mb: 1.5, display: 'block', mx: 'auto' }} />
                            <Typography sx={{ fontSize: '0.82rem', color: '#BDBDBD', fontWeight: 500 }}>
                                {search ? 'No uploads match your search.' : 'No uploads found for this project.'}
                            </Typography>
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            {filtered.map((doc) => (
                                <Grid key={doc._id ?? doc.filename} size={{ xs: 12, sm: 6, md: 4 }}>
                                    <UploadCard doc={doc} />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </>
            )}
        </Box>
    );
};

export default withPageErrorBoundary(DataCollectionTracking, 'Data Collection Tracking');
