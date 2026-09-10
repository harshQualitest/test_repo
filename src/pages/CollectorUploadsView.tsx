import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    CircularProgress,
    Dialog,
    IconButton,
    Typography,
    alpha,
    Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import AudiotrackOutlinedIcon from '@mui/icons-material/AudiotrackOutlined';
import NotesIcon from '@mui/icons-material/Notes';
import RefreshIcon from '@mui/icons-material/RefreshOutlined';
import dataCollectionApi from '../services/api/dataCollectionApi';
import { withPageErrorBoundary } from '../utils/withPageErrorBoundary';
import type { IDataCollectionProject, IDatasetDocument } from '../interfaces/api/dataCollection.interface';

interface ViewRouteState {
    project: IDataCollectionProject;
}

const C = {
    indigo: '#4338CA',
    indigoMid: '#6366F1',
    indigoLight: '#EEF2FF',
    indigoDark: '#3730A3',
    green: '#059669',
    greenLight: '#ECFDF5',
    red: '#DC2626',
    redLight: '#FEF2F2',
    amber: '#D97706',
    amberLight: '#FFFBEB',
    bg: '#F1F5F9',
    surface: '#FFFFFF',
    text: '#0F172A',
    textSec: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
} as const;

const QUALITY_COLOR: Record<string, { fg: string; bg: string; dot: string }> = {
    Accepted:              { fg: C.green,  bg: C.greenLight, dot: C.green },
    'Auto Accepted':       { fg: C.green,  bg: C.greenLight, dot: C.green },
    Rejected:              { fg: C.red,    bg: C.redLight,   dot: C.red },
    'Auto Rejected':       { fg: C.red,    bg: C.redLight,   dot: C.red },
    'QA Rejected':         { fg: C.red,    bg: C.redLight,   dot: C.red },
    Pending:               { fg: '#92400E', bg: C.amberLight, dot: C.amber },
    'Needs Manual Review': { fg: '#92400E', bg: C.amberLight, dot: C.amber },
};

/**
 * Component: CollectorUploadsView
 *
 * Purpose: Read-only gallery of a data collector's own uploads for a single
 * project (reached after a slot becomes full, via "View" on CollectorHome).
 *
 * Responsibilities:
 * - Load the collector's uploads for the project (from route state or `projectId` param).
 * - Show summary stat pills (pending/accepted/rejected) and a thumbnail grid.
 * - Open an image lightbox preview when an image thumbnail is clicked.
 *
 * Props: none (reads `project` from router state and `projectId` from the URL param).
 *
 * State:
 * - `uploads` — the list of the collector's dataset documents for this project.
 * - `loading` — true while the initial uploads fetch is in flight.
 * - `error` — error message shown if the fetch fails.
 * - `preview` — the upload currently shown in the full-size image lightbox (or null).
 *
 * API calls: `dataCollectionApi.getUserUploads(pid)` (src/services/api/dataCollectionApi.ts).
 *
 * Side effects: see the `useEffect` below (redirects away if no project id is resolvable,
 * otherwise triggers the initial upload load).
 *
 * Business logic: `pending`/`accepted`/`rejected` counts are derived from each
 * upload's `quality` field to drive the header stat pills.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const CollectorUploadsView = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();

    const state = location.state as ViewRouteState | null;
    const project = state?.project ?? null;

    const [uploads, setUploads] = useState<IDatasetDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<IDatasetDocument | null>(null);

    // Prefer the project id carried via navigation state; fall back to the URL param.
    const pid = project?._id ?? projectId ?? '';

    // Loads uploads for the resolved project id on mount / whenever it changes;
    // if no id can be resolved at all, bounces the user back to the projects list.
    useEffect(() => {
        if (!pid) {
            navigate('/data-collection/projects');
            return;
        }
        loadUploads();
    }, [pid]);

    /** Fetches the collector's uploads for this project and updates loading/error state. */
    const loadUploads = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await dataCollectionApi.getUserUploads(pid);
            setUploads(data);
        } catch {
            setError('Failed to load uploads. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Tally uploads by review outcome to power the header's stat pills.
    const pending  = uploads.filter(u => u.quality === 'Pending' || u.quality === 'Needs Manual Review').length;
    const accepted = uploads.filter(u => u.quality === 'Accepted' || u.quality === 'Auto Accepted').length;
    const rejected = uploads.filter(u => (u.quality ?? '').toLowerCase().includes('reject')).length;

    // ── Loading ──
    if (loading) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={30} sx={{ color: C.indigo }} />
                <Typography sx={{ fontSize: '0.84rem', color: C.textSec }}>Loading your uploads…</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: C.bg, display: 'flex', flexDirection: 'column' }}>

            {/* ── Hero header ── */}
            <Box
                sx={{
                    background: `linear-gradient(145deg, ${C.indigoDark} 0%, ${C.indigoMid} 100%)`,
                    position: 'relative',
                    overflow: 'hidden',
                    pt: 'env(safe-area-inset-top, 0px)',
                }}
            >
                {/* Decorative circles */}
                <Box sx={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                <Box sx={{ position: 'absolute', bottom: -60, right: 60, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

                <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 3 }, pt: 1.25, pb: 3, position: 'relative', zIndex: 1 }}>
                    {/* Back */}
                    <IconButton
                        onClick={() => navigate(-1)}
                        size="small"
                        sx={{ color: 'rgba(255,255,255,0.65)', mb: 1.5, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>

                    {/* Label */}
                    <Typography sx={{
                        color: 'rgba(255,255,255,0.55)', fontSize: '0.65rem',
                        fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        mb: 0.5, display: 'block',
                    }}>
                        Project
                    </Typography>

                    {/* Project name */}
                    <Typography fontWeight={800} sx={{
                        color: '#fff', fontSize: { xs: '1.25rem', sm: '1.4rem' },
                        lineHeight: 1.2, mb: 1.5,
                    }}>
                        {project?.name ?? 'My Uploads'}
                    </Typography>

                    {/* Badge row */}
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Box sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.75,
                            px: 1.5, py: 0.75, borderRadius: '10px',
                            bgcolor: 'rgba(255,255,255,0.12)',
                            border: '1px solid rgba(255,255,255,0.18)',
                        }}>
                            <HistoryIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>
                                My Submissions
                            </Typography>
                            {uploads.length > 0 && (
                                <Box sx={{ px: 0.75, py: 0.1, borderRadius: '5px', bgcolor: 'rgba(255,255,255,0.2)' }}>
                                    <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                                        {uploads.length}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        {/* Stat pills */}
                        {uploads.length > 0 && [
                            { label: 'Pending',  count: pending,  color: C.amber },
                            { label: 'Accepted', count: accepted, color: C.green },
                            { label: 'Rejected', count: rejected, color: C.red },
                        ].map(({ label, count, color }) => count > 0 && (
                            <Box key={label} sx={{
                                display: 'flex', alignItems: 'center', gap: 0.5,
                                px: 1.1, py: 0.5, borderRadius: '8px',
                                bgcolor: 'rgba(255,255,255,0.12)',
                                border: '1px solid rgba(255,255,255,0.18)',
                            }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>
                                    {count} {label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* ── Content ── */}
            <Box sx={{
                flex: 1,
                maxWidth: 900,
                width: '100%',
                mx: 'auto',
                px: { xs: 2, sm: 3 },
                pt: 3,
                pb: { xs: 6, sm: 8 },
            }}>

                {/* Error */}
                {error && (
                    <Box sx={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 2, py: 8, textAlign: 'center',
                    }}>
                        <Typography sx={{ fontSize: '0.88rem', color: C.red }}>{error}</Typography>
                        <Button
                            variant="outlined" size="small"
                            startIcon={<RefreshIcon />}
                            onClick={loadUploads}
                            sx={{
                                borderRadius: '10px', textTransform: 'none', fontWeight: 700,
                                color: C.indigo, borderColor: C.indigo,
                                '&:hover': { bgcolor: C.indigoLight },
                            }}
                        >
                            Retry
                        </Button>
                    </Box>
                )}

                {/* Empty state */}
                {!error && uploads.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: { xs: 10, sm: 14 }, px: 3 }}>
                        <Box sx={{
                            width: 72, height: 72, borderRadius: '20px',
                            bgcolor: C.indigoLight,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mx: 'auto', mb: 2.5,
                        }}>
                            <HistoryIcon sx={{ fontSize: 34, color: C.indigo }} />
                        </Box>
                        <Typography fontWeight={800} mb={1} sx={{ fontSize: '1.1rem', color: C.text }}>
                            No uploads yet
                        </Typography>
                        <Typography sx={{ color: C.textSec, fontSize: '0.85rem', lineHeight: 1.7, maxWidth: 260, mx: 'auto' }}>
                            You haven't submitted any files for this project.
                        </Typography>
                    </Box>
                )}

                {/* Upload grid */}
                {!error && uploads.length > 0 && (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 160px)',
                            gap: 2,
                        }}
                    >
                        {uploads.map((upload, idx) => {
                            // API responses may use either snake_case or legacy field names; fall back accordingly,
                            // then classify the upload's media kind from data_type or, failing that, its file format.
                            const dataType   = upload.data_type   ?? upload.filetype  ?? '';
                            const fileFormat = upload.file_format ?? upload.fileformat ?? '';
                            const isImage    = dataType === 'Image' || ['JPEG', 'PNG', 'HEIC'].includes(fileFormat.toUpperCase());
                            const isVideo    = dataType === 'Video' || ['MP4', 'MOV'].includes(fileFormat.toUpperCase());
                            const isAudio    = dataType === 'Audio' || ['MP3', 'WAV', 'M4A'].includes(fileFormat.toUpperCase());
                            const isText     = dataType === 'Text';
                            const thumbUrl   = upload.file_url ?? upload.s3_url ?? null;

                            const rawDate = upload.created_at ?? upload.createdon;
                            const date = rawDate
                                ? new Date(rawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : null;

                            const qStyle = upload.quality ? (QUALITY_COLOR[upload.quality] ?? { fg: C.textMuted, bg: C.bg, dot: C.textMuted }) : null;

                            const typeStyle = isVideo
                                ? { bg: '#0F172A', iconColor: '#94A3B8' }
                                : isAudio
                                    ? { bg: '#1E1B4B', iconColor: '#A5B4FC' }
                                    : isText
                                        ? { bg: '#064E3B', iconColor: '#6EE7B7' }
                                        : { bg: '#1E293B', iconColor: '#94A3B8' };

                            return (
                                <Box
                                    key={upload._id ?? idx}
                                    sx={{ display: 'flex', flexDirection: 'column', gap: 0.875, width: 160 }}
                                >
                                    {/* Thumbnail card */}
                                    <Box
                                        onClick={() => isImage && thumbUrl && setPreview(upload)}
                                        sx={{
                                            width: 160,
                                            height: 160,
                                            borderRadius: '16px',
                                            overflow: 'hidden',
                                            position: 'relative',
                                            border: `1.5px solid ${C.border}`,
                                            bgcolor: isImage ? C.bg : typeStyle.bg,
                                            cursor: isImage && thumbUrl ? 'zoom-in' : 'default',
                                            transition: 'transform 0.15s, box-shadow 0.15s',
                                            ...(isImage && thumbUrl && {
                                                '&:hover': {
                                                    transform: 'scale(1.02)',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                                                },
                                                '&:active': { transform: 'scale(0.98)' },
                                            }),
                                        }}
                                    >
                                        {/* Image thumbnail */}
                                        {isImage && thumbUrl && (
                                            <Box
                                                component="img"
                                                src={thumbUrl}
                                                alt={upload.filename}
                                                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        )}

                                        {/* Non-image icon */}
                                        {!isImage && (
                                            <Box sx={{
                                                position: 'absolute', inset: 0,
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center', gap: 0.75,
                                            }}>
                                                {isVideo
                                                    ? <VideocamOutlinedIcon sx={{ fontSize: 40, color: typeStyle.iconColor }} />
                                                    : isAudio
                                                        ? <AudiotrackOutlinedIcon sx={{ fontSize: 40, color: typeStyle.iconColor }} />
                                                        : isText
                                                            ? <NotesIcon sx={{ fontSize: 40, color: typeStyle.iconColor }} />
                                                            : <InsertDriveFileOutlinedIcon sx={{ fontSize: 36, color: typeStyle.iconColor }} />
                                                }
                                                {fileFormat && (
                                                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: alpha(typeStyle.iconColor, 0.7), textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                        {fileFormat}
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}

                                        {/* Quality badge — bottom-left */}
                                        {qStyle && (
                                            <Box sx={{
                                                position: 'absolute', bottom: 8, left: 8,
                                                display: 'flex', alignItems: 'center', gap: 0.45,
                                                px: 0.875, py: 0.35, borderRadius: '6px',
                                                bgcolor: alpha(qStyle.bg, 0.92),
                                                backdropFilter: 'blur(6px)',
                                                border: `1px solid ${alpha(qStyle.fg, 0.2)}`,
                                            }}>
                                                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: qStyle.dot, flexShrink: 0 }} />
                                                <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: qStyle.fg, lineHeight: 1 }}>
                                                    {upload.quality}
                                                </Typography>
                                            </Box>
                                        )}

                                        {/* Format badge — top-right (images only) */}
                                        {isImage && fileFormat && (
                                            <Box sx={{
                                                position: 'absolute', top: 8, right: 8,
                                                px: 0.7, py: 0.25, borderRadius: '5px',
                                                bgcolor: 'rgba(0,0,0,0.45)',
                                                backdropFilter: 'blur(4px)',
                                            }}>
                                                <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                                                    {fileFormat}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>

                                    {/* Caption */}
                                    <Box>
                                        <Typography noWrap sx={{ fontSize: '0.78rem', fontWeight: 600, color: C.text, lineHeight: 1.3 }}>
                                            {upload.filename}
                                        </Typography>
                                        {date && (
                                            <Typography sx={{ fontSize: '0.67rem', color: C.textMuted, mt: 0.2 }}>
                                                {date}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>

            {/* ── Image lightbox ── */}
            {preview && (() => {
                const p = preview;
                const thumbUrl = p.file_url ?? p.s3_url ?? '';
                const fileFormat = p.file_format ?? p.fileformat ?? '';
                const rawDate = p.created_at ?? p.createdon;
                const date = rawDate
                    ? new Date(rawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : null;
                const qStyle = p.quality ? (QUALITY_COLOR[p.quality] ?? null) : null;

                return (
                    <Dialog
                        open
                        onClose={() => setPreview(null)}
                        maxWidth="sm"
                        fullWidth
                        slotProps={{
                            paper: {
                                sx: {
                                    borderRadius: '20px',
                                    overflow: 'hidden',
                                    bgcolor: '#0F172A',
                                    mx: { xs: 2, sm: 3 },
                                },
                            },
                            backdrop: { sx: { backdropFilter: 'blur(8px)', bgcolor: 'rgba(0,0,0,0.75)' } },
                        }}
                    >
                        {/* Close */}
                        <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                            <IconButton
                                onClick={() => setPreview(null)}
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(0,0,0,0.5)', color: '#fff',
                                    backdropFilter: 'blur(6px)',
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                                }}
                            >
                                <CloseIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Box>

                        {/* Full image */}
                        <Box sx={{
                            width: '100%', aspectRatio: '4/3',
                            bgcolor: '#0F172A',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden',
                        }}>
                            <Box
                                component="img"
                                src={thumbUrl}
                                alt={p.filename}
                                sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                            />
                        </Box>

                        {/* Metadata footer */}
                        <Box sx={{ px: 2.5, py: 2, bgcolor: '#1E293B' }}>
                            <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
                                <Box minWidth={0} flex={1}>
                                    <Typography noWrap sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#F1F5F9', mb: 0.35 }}>
                                        {p.filename}
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                        {fileFormat && (
                                            <Box sx={{ px: 0.875, py: 0.2, borderRadius: '5px', bgcolor: alpha(C.indigoMid, 0.25) }}>
                                                <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#A5B4FC' }}>
                                                    {fileFormat}
                                                </Typography>
                                            </Box>
                                        )}
                                        {date && (
                                            <Typography sx={{ fontSize: '0.72rem', color: '#64748B' }}>
                                                {date}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>

                                {qStyle && p.quality && (
                                    <Box sx={{
                                        flexShrink: 0,
                                        display: 'flex', alignItems: 'center', gap: 0.5,
                                        px: 1.1, py: 0.5, borderRadius: '8px',
                                        bgcolor: alpha(qStyle.bg, 0.15),
                                        border: `1px solid ${alpha(qStyle.fg, 0.3)}`,
                                    }}>
                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: qStyle.fg, flexShrink: 0 }} />
                                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: qStyle.fg }}>
                                            {p.quality}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    </Dialog>
                );
            })()}
        </Box>
    );
};

export default withPageErrorBoundary(CollectorUploadsView, 'Collector Uploads View');
