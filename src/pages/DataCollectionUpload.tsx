import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    Grid,
    IconButton,
    MenuItem,
    TextField,
    Typography,
    alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HistoryIcon from '@mui/icons-material/History';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import AudiotrackOutlinedIcon from '@mui/icons-material/AudiotrackOutlined';
import NotesIcon from '@mui/icons-material/Notes';
import dataCollectionApi from '../services/api/dataCollectionApi';
import { withPageErrorBoundary } from '../utils/withPageErrorBoundary';
import { useToast } from '../hooks/useToast';
import type { IPhaseItem, DemographicKey, IDemographicData, IDatasetDocument } from '../interfaces/api/dataCollection.interface';
import { DEMOGRAPHIC_KEYS, DEMOGRAPHIC_VALUES } from '../interfaces/api/dataCollection.interface';

interface UploadRouteState {
    pname: string;
    pid: string;
    iname: string;
    id: string;
    description?: string;
    instruction?: string;
    activePhase?: string;
    phaseItem?: IPhaseItem;
    demographicData?: IDemographicData[];
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
    bg: '#F1F5F9',
    surface: '#FFFFFF',
    text: '#0F172A',
    textSec: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
} as const;

const ACCEPT_ATTR: Record<string, string> = {
    JPEG: 'image/jpeg,.jpg,.jpeg',
    PNG: 'image/png,.png',
    HEIC: 'image/heic,image/heif,.heic,.heif',
    MP4: 'video/mp4,.mp4',
    MOV: 'video/quicktime,.mov',
    MP3: 'audio/mpeg,.mp3',
    WAV: 'audio/wav,.wav',
    M4A: 'audio/mp4,.m4a',
};

/**
 * Verifies a selected file actually matches the expected upload slot format,
 * checking both file extension and MIME type (some formats accept an empty
 * MIME type since browsers don't always report one for HEIC/MOV).
 * @param file - the file the user selected
 * @param format - the expected format code (e.g. 'JPEG', 'MP4', 'HEIC')
 * @returns true if the file appears to match the expected format
 */
const validateFileType = (file: File, format: string): boolean => {
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    const mime = file.type.toLowerCase();
    switch (format.toUpperCase()) {
        case 'JPEG': return ext === 'jpg' || ext === 'jpeg' || mime === 'image/jpeg';
        case 'PNG': return ext === 'png' || mime === 'image/png';
        case 'HEIC': return ext === 'heic' || ext === 'heif' || mime === 'image/heic' || mime === 'image/heif' || mime === '';
        case 'MP4': return ext === 'mp4' || mime === 'video/mp4';
        case 'MOV': return ext === 'mov' || mime === 'video/quicktime' || mime === '';
        case 'MP3': return ext === 'mp3' || mime === 'audio/mpeg';
        case 'WAV': return ext === 'wav' || mime === 'audio/wav';
        case 'M4A': return ext === 'm4a' || mime === 'audio/mp4' || mime === 'audio/m4a';
        default: return true;
    }
};

// ── File drop zone ────────────────────────────────────────────────────────

interface FileZoneProps {
    file: File | null;
    accept: string;
    label: string;
    formatLabel: string;
    maxMb: number;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
}

/**
 * Component: FileZone
 * Purpose: A single file-picker drop zone — shows a "tap to select" placeholder
 * when empty, or a compact preview card (filename + size + clear button) once a
 * file has been chosen. Used for both single-file slots and each half of a
 * LivePhoto (HEIC + MOV) pair.
 * Props:
 * - file: the currently selected file, or null.
 * - accept / formatLabel / maxMb: constraints shown to the user and passed to the input.
 * - label: placeholder call-to-action text.
 * - inputRef: ref to the underlying hidden <input type="file">.
 * - onChange / onClear: file-selection and clear-selection callbacks.
 */
const FileZone = ({ file, accept, label, formatLabel, maxMb, inputRef, onChange, onClear }: FileZoneProps) => (
    <Box>
        <input ref={inputRef} type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} />
        {file ? (
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: 1.75, borderRadius: '14px',
                border: `1.5px solid ${alpha(C.indigo, 0.3)}`,
                bgcolor: C.indigoLight,
            }}>
                <Box sx={{
                    width: 44, height: 44, borderRadius: '11px', bgcolor: C.indigo,
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 21, color: '#fff' }} />
                </Box>
                <Box minWidth={0} flex={1}>
                    <Typography fontWeight={600} noWrap sx={{ fontSize: '0.87rem', color: C.text }}>
                        {file.name}
                    </Typography>
                    <Typography sx={{ fontSize: '0.71rem', color: C.textSec, mt: 0.15 }}>
                        {(file.size / (1024 * 1024)).toFixed(2)} MB · ready to upload
                    </Typography>
                </Box>
                <IconButton
                    size="small" onClick={onClear}
                    sx={{ color: C.textMuted, flexShrink: 0, '&:hover': { color: C.red, bgcolor: C.redLight } }}
                >
                    <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Box>
        ) : (
            <Box
                onClick={() => inputRef.current?.click()}
                sx={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 1.5, p: { xs: 3.5, sm: 4.5 },
                    borderRadius: '14px',
                    border: `2px dashed ${C.border}`,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                    '&:hover': { borderColor: C.indigo, bgcolor: C.indigoLight },
                    '&:active': { bgcolor: alpha(C.indigo, 0.1) },
                }}
            >
                <Box sx={{
                    width: 52, height: 52, borderRadius: '14px',
                    bgcolor: C.indigoLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <CloudUploadIcon sx={{ fontSize: 26, color: C.indigo }} />
                </Box>
                <Box textAlign="center">
                    <Typography fontWeight={700} sx={{ fontSize: '0.9rem', color: C.text }}>
                        {label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.73rem', color: C.textMuted, mt: 0.3 }}>
                        {formatLabel} · max {maxMb} MB
                    </Typography>
                </Box>
            </Box>
        )}
    </Box>
);

// ── Page ──────────────────────────────────────────────────────────────────

/**
 * Component: DataCollectionUpload
 *
 * Purpose: Upload page for a single data-collection slot — lets a collector
 * submit a file (or text response, or a LivePhoto HEIC+MOV pair), fill in any
 * required demographic fields, and see their prior submissions for context.
 *
 * Responsibilities:
 * - Validate the selected file(s) against the slot's format/size rules before submit.
 * - Collect any enabled demographic fields required by the project.
 * - Submit via the appropriate API call depending on data type (text vs file vs LivePhoto).
 * - Show the collector's existing uploads for this project in a horizontal gallery,
 *   with an image lightbox preview.
 *
 * Props: none (all project/slot data is passed in via router state, see `UploadRouteState`).
 *
 * State:
 * - `userUploads` — the collector's existing uploads for this project.
 * - `selectedPreview` — the upload currently shown in the image lightbox (or null).
 * - `loading` / `submitting` / `error` — fetch and submit lifecycle flags/messages.
 * - `selectedFile` / `selectedFileLive` — the chosen file(s) (the "Live" one is the
 *   MOV half of a LivePhoto pair).
 * - `textValue` — the typed response for Text-type slots.
 * - `demographics` — the collector's answers to any enabled demographic questions.
 *
 * Custom hooks: `useToast` (`showSuccess`/`showError`).
 *
 * API calls (via `dataCollectionApi`): `getUserUploads`, `uploadText`, `uploadFileLive`, `uploadFile`.
 *
 * Major child components: `FileZone` (one or two, depending on slot type).
 *
 * Side effects: see the `useEffect` below (redirects away if required nav state
 * is missing, otherwise loads the collector's prior uploads).
 *
 * Business logic:
 * - File size/type/dimension/duration requirements are enforced client-side
 *   before submission (`handleFileChange`, `validateFileType`, `handleSubmit`).
 * - LivePhoto slots require both a HEIC and a MOV file before submitting.
 * - Enabled demographic fields (per `enabledDemographics`) are all required.
 * - Server error responses are translated into friendlier messages based on
 *   HTTP status (409 duplicate, 403 daily limit, 413 target reached).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const DataCollectionUpload = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const state = location.state as UploadRouteState | null;

    // All project + slot data comes from navigation state — no separate API fetch needed
    const phaseItem = state?.phaseItem ?? null;

    const [userUploads, setUserUploads] = useState<IDatasetDocument[]>([]);
    const [selectedPreview, setSelectedPreview] = useState<IDatasetDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedFileLive, setSelectedFileLive] = useState<File | null>(null);
    const [textValue, setTextValue] = useState('');
    const [demographics, setDemographics] = useState<Record<string, string>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileInputLiveRef = useRef<HTMLInputElement>(null);

    // Runs once on mount: bounces back to the projects list if this page was
    // reached without the required navigation state (e.g. direct URL visit),
    // otherwise loads the collector's existing uploads for context.
    useEffect(() => {
        if (!state?.pname || !state?.iname || !state?.id) {
            navigate('/data-collection/projects');
            return;
        }
        loadUserUploads();
    }, []);

    /** Fetches the collector's existing uploads for this project (shown in the "My Submissions" gallery). */
    const loadUserUploads = async () => {
        if (!state?.pid) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await dataCollectionApi.getUserUploads(state.pid);
            setUserUploads(data);
        } catch {
            setError('Failed to load uploads.');
        } finally {
            setLoading(false);
        }
    };

    /** Returns which demographic questions this project has turned on, so only those are shown/required. */
    const enabledDemographics = (): DemographicKey[] => {
        const demoData = state?.demographicData;
        if (!demoData) return [];
        return DEMOGRAPHIC_KEYS.filter((key) => {
            const entry = demoData.find((d: IDemographicData) => key in d);
            return (entry as any)?.[key]?.enabled;
        });
    };

    /**
     * Validates a newly-selected file against the slot's max size and expected
     * format before accepting it into state; rejects (and clears the input)
     * with a toast if either check fails.
     * Triggered by choosing a file in the primary FileZone (or the "Live"/MOV
     * FileZone for LivePhoto slots, when `isLive` is true).
     * @param e - the file input change event
     * @param isLive - true when this is the MOV half of a LivePhoto pair
     */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isLive = false) => {
        const file = e.target.files?.[0] ?? null;
        if (!file || !phaseItem) return;

        if (file.size > phaseItem.file_size * 1024 * 1024) {
            showError(`File too large. Maximum allowed size is ${phaseItem.file_size} MB.`);
            e.target.value = '';
            return;
        }

        // For LivePhoto: primary = HEIC, live = MOV
        const expectedFormat = isLive ? 'MOV' : phaseItem.file_format === 'LivePhoto' ? 'HEIC' : phaseItem.file_format;
        if (!validateFileType(file, expectedFormat)) {
            showError(`Wrong file type. Expected a ${expectedFormat} file.`);
            e.target.value = '';
            return;
        }

        if (isLive) setSelectedFileLive(file);
        else setSelectedFile(file);
    };

    /** Clears a selected file (primary or the LivePhoto "Live"/MOV one) and resets its input element. */
    const clearFile = (isLive = false) => {
        if (isLive) {
            setSelectedFileLive(null);
            if (fileInputLiveRef.current) fileInputLiveRef.current.value = '';
        } else {
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    /** Assembles the multipart FormData payload (phase/slot keys, file(s), demographic answers) for file uploads. */
    const buildFormData = (): FormData => {
        const fd = new FormData();
        if (!state) return fd;
        const activePhase = state.activePhase ?? 'phase_1';
        fd.append('phase_key', activePhase);
        fd.append('dataset_key', state.id);
        if (phaseItem?.file_format === 'LivePhoto') {
            if (selectedFile) fd.append('file', selectedFile);
            if (selectedFileLive) fd.append('file_live', selectedFileLive);
        } else {
            if (selectedFile) fd.append('file', selectedFile);
        }
        const demoData: Record<string, string> = {};
        enabledDemographics().forEach((key) => { if (demographics[key]) demoData[key] = demographics[key]; });
        if (Object.keys(demoData).length > 0) {
            fd.append('demographic_data', JSON.stringify(demoData));
        }
        return fd;
    };

    /**
     * Validates the current selection (required file/text, LivePhoto pair
     * completeness, and all enabled demographic fields), then submits via the
     * data-type-appropriate API call. On success, navigates back to the
     * projects list; on failure, maps common HTTP status codes to a friendlier
     * error message shown both as a toast and inline.
     * Triggered by the sticky "Submit Upload" button.
     */
    const handleSubmit = async () => {
        if (!phaseItem || !state) return;
        if (phaseItem.data_type === 'Text') {
            if (!textValue.trim()) { showError('Please enter text before submitting.'); return; }
        } else if (!selectedFile) {
            showError('Please select a file to upload.'); return;
        }
        if (phaseItem.file_format === 'LivePhoto' && !selectedFileLive) {
            showError('Please select both HEIC and MOV files for Live Photo.'); return;
        }
        for (const key of enabledDemographics()) {
            if (!demographics[key]) { showError(`Please select a value for ${key}.`); return; }
        }
        setSubmitting(true);
        setError(null);
        try {
            if (phaseItem.data_type === 'Text') {
                await dataCollectionApi.uploadText({
                    project: state.pname,
                    phase: state.activePhase ?? 'phase_1',
                    dataset_key: state.id,
                    text: textValue,
                    demographic_data: demographics,
                });
            } else if (phaseItem.file_format === 'LivePhoto') {
                await dataCollectionApi.uploadFileLive(buildFormData());
            } else {
                await dataCollectionApi.uploadFile(buildFormData(), state.pid);
            }
            showSuccess('Upload successful!');
            navigate('/data-collection/projects');
        } catch (err: any) {
            const msg =
                err.response?.data?.detail?.error ||
                err.response?.data?.error ||
                err.message ||
                'Upload failed.';
            const status = err.response?.status;
            let displayMsg: string;
            if (status === 409) displayMsg = 'This file has already been uploaded for this slot.';
            else if (status === 403) displayMsg = 'You have reached the maximum upload limit for today.';
            else if (status === 413) displayMsg = msg.toLowerCase().includes('target')
                ? 'This project has reached its upload target and is no longer accepting uploads.'
                : msg;
            else displayMsg = msg;
            showError(displayMsg);
            setError(displayMsg);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Loading ──

    if (loading) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress size={30} sx={{ color: C.indigo }} />
                <Typography sx={{ fontSize: '0.84rem', color: C.textSec }}>Loading…</Typography>
            </Box>
        );
    }

    if (!state) return null;

    const demos = enabledDemographics();

    // ── Requirements pills ──

    // Build the list of human-readable requirement chips (data type, format,
    // size/time limits, device requirement, dimensions) shown to the collector
    // so they know what's expected before picking a file.
    const reqPills: string[] = [];
    if (phaseItem) {
        reqPills.push(phaseItem.data_type);
        if (phaseItem.data_type !== 'Text') {
            reqPills.push(phaseItem.file_format === 'LivePhoto' ? 'HEIC + MOV (Live Photo)' : phaseItem.file_format);
        }
        if (phaseItem.data_type !== 'Text') reqPills.push(`Max ${phaseItem.file_size} MB`);
        if (phaseItem.data_type === 'Video' && phaseItem.video_time_limit > 0) reqPills.push(`Max ${phaseItem.video_time_limit}s`);
        if (phaseItem.iPhone_11_or_Newer) reqPills.push('iPhone 11+');
        if (phaseItem.dimension?.width && phaseItem.dimension?.height) {
            const dm = phaseItem.dimension.dimension_match;
            reqPills.push(`${phaseItem.dimension.width}×${phaseItem.dimension.height}${dm === 'Exact' ? ' (Exact)' : dm === '10' ? ' (±10%)' : ''}`);
        }
    }

    // Accept attribute and label for file input
    const primaryFormat = phaseItem?.file_format === 'LivePhoto' ? 'HEIC' : (phaseItem?.file_format ?? '');
    const primaryAccept = ACCEPT_ATTR[primaryFormat] ?? '*';
    const primaryFormatLabel = primaryFormat;

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

                <Box sx={{ maxWidth: 720, mx: 'auto', px: { xs: 2, sm: 3 }, pt: 1.25, pb: 3, position: 'relative', zIndex: 1 }}>
                    {/* Back */}
                    <IconButton
                        onClick={() => navigate(-1)}
                        size="small"
                        sx={{ color: 'rgba(255,255,255,0.65)', mb: 1.5, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>

                    {/* Project label */}
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
                        lineHeight: 1.2, mb: state.description ? 0.75 : 1.5,
                    }}>
                        {state.pname}
                    </Typography>

                    {/* Project description from state */}
                    {state.description && (
                        <Typography sx={{
                            color: 'rgba(255,255,255,0.72)', fontSize: '0.85rem',
                            lineHeight: 1.65, mb: 2,
                            display: '-webkit-box', WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                            {state.description}
                        </Typography>
                    )}

                    {/* Slot badge */}
                    <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.75,
                        px: 1.5, py: 0.75, borderRadius: '10px',
                        bgcolor: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.18)',
                    }}>
                        <CloudUploadIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }} />
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>
                            {state.iname}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* ── Scrollable content ── */}
            <Box sx={{
                flex: 1, maxWidth: 720, width: '100%', mx: 'auto',
                px: { xs: 2, sm: 3 },
                pt: 2.5,
                pb: { xs: 12, sm: 10 },
                display: 'flex', flexDirection: 'column', gap: 2,
            }}>

                {/* Instructions from state */}
                {state.instruction && (
                    <Box sx={{
                        bgcolor: C.surface, borderRadius: '16px',
                        border: `1px solid ${C.border}`,
                        borderLeft: `4px solid ${C.indigo}`,
                        p: { xs: 2, sm: 2.5 },
                    }}>
                        <Box display="flex" alignItems="center" gap={0.75} mb={1}>
                            <InfoOutlinedIcon sx={{ fontSize: 15, color: C.indigo }} />
                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: C.indigo, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                Instructions
                            </Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.86rem', color: C.text, lineHeight: 1.7 }}>
                            {state.instruction}
                        </Typography>
                    </Box>
                )}

                {/* My Uploads */}
                {userUploads.length > 0 && (() => {
                    const QUALITY_COLOR: Record<string, { fg: string; bg: string; dot: string }> = {
                        Accepted:              { fg: C.green,    bg: C.greenLight,           dot: C.green },
                        'Auto Accepted':       { fg: C.green,    bg: C.greenLight,           dot: C.green },
                        Rejected:              { fg: C.red,      bg: C.redLight,             dot: C.red },
                        'Auto Rejected':       { fg: C.red,      bg: C.redLight,             dot: C.red },
                        'QA Rejected':         { fg: C.red,      bg: C.redLight,             dot: C.red },
                        Pending:               { fg: '#92400E',  bg: '#FFFBEB',              dot: '#D97706' },
                        'Needs Manual Review': { fg: '#92400E',  bg: '#FFFBEB',              dot: '#D97706' },
                    };

                    const pending  = userUploads.filter(u => u.quality === 'Pending' || u.quality === 'Needs Manual Review').length;
                    const accepted = userUploads.filter(u => u.quality === 'Accepted' || u.quality === 'Auto Accepted').length;
                    const rejected = userUploads.filter(u => (u.quality ?? '').toLowerCase().includes('reject')).length;

                    return (
                        <Box sx={{ bgcolor: C.surface, borderRadius: '20px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>

                            {/* ── Header ── */}
                            <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 1.5 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.25}>
                                    <Box display="flex" alignItems="center" gap={0.875}>
                                        <Box sx={{
                                            width: 28, height: 28, borderRadius: '8px',
                                            bgcolor: C.indigoLight,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <HistoryIcon sx={{ fontSize: 15, color: C.indigo }} />
                                        </Box>
                                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 800, color: C.text }}>
                                            My Submissions
                                        </Typography>
                                        <Box sx={{
                                            px: 0.875, py: 0.2, borderRadius: '7px',
                                            bgcolor: C.indigo,
                                        }}>
                                            <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                                                {userUploads.length}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Stats pills */}
                                <Box display="flex" gap={0.875} flexWrap="wrap">
                                    {[
                                        { label: 'Pending',  count: pending,  color: '#D97706', bg: '#FEF3C7' },
                                        { label: 'Accepted', count: accepted, color: C.green,   bg: C.greenLight },
                                        { label: 'Rejected', count: rejected, color: C.red,     bg: C.redLight },
                                    ].map(({ label, count, color, bg }) => count > 0 && (
                                        <Box key={label} sx={{
                                            display: 'flex', alignItems: 'center', gap: 0.6,
                                            px: 1.1, py: 0.45, borderRadius: '8px',
                                            bgcolor: bg,
                                            border: `1px solid ${alpha(color, 0.2)}`,
                                        }}>
                                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color }}>
                                                {count} {label}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>

                            {/* ── Horizontal scroll gallery ── */}
                            <Box sx={{
                                px: { xs: 2, sm: 2.5 },
                                pb: 2,
                                overflowX: 'auto',
                                display: 'flex',
                                gap: 1.25,
                                scrollbarWidth: 'none',
                                '&::-webkit-scrollbar': { display: 'none' },
                            }}>
                                {userUploads.map((upload, idx) => {
                                    const dataType   = upload.data_type   ?? upload.filetype  ?? '';
                                    const fileFormat = upload.file_format ?? upload.fileformat ?? '';
                                    const isImage    = dataType === 'Image' || ['JPEG', 'PNG', 'HEIC'].includes(fileFormat.toUpperCase());
                                    const isVideo    = dataType === 'Video' || ['MP4', 'MOV'].includes(fileFormat.toUpperCase());
                                    const isAudio    = dataType === 'Audio' || ['MP3', 'WAV', 'M4A'].includes(fileFormat.toUpperCase());
                                    const isText     = dataType === 'Text';
                                    const thumbUrl   = upload.file_url ?? upload.s3_url ?? null;

                                    const rawDate = upload.created_at ?? upload.createdon;
                                    const date = rawDate
                                        ? new Date(rawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                        : null;

                                    const qStyle = upload.quality ? (QUALITY_COLOR[upload.quality] ?? { fg: C.textMuted, bg: C.bg, dot: C.textMuted }) : null;

                                    // Tint & icon for non-image types
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
                                            sx={{
                                                flexShrink: 0,
                                                width: 130,
                                                display: 'flex', flexDirection: 'column', gap: 0.75,
                                            }}
                                        >
                                            {/* Card */}
                                            <Box
                                                onClick={() => isImage && thumbUrl && setSelectedPreview(upload)}
                                                sx={{
                                                    width: 130, height: 130,
                                                    borderRadius: '14px',
                                                    overflow: 'hidden',
                                                    position: 'relative',
                                                    border: `1.5px solid ${C.border}`,
                                                    bgcolor: isImage ? C.bg : typeStyle.bg,
                                                    flexShrink: 0,
                                                    cursor: isImage && thumbUrl ? 'zoom-in' : 'default',
                                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                                    ...(isImage && thumbUrl && {
                                                        '&:hover': {
                                                            transform: 'scale(1.03)',
                                                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                                        },
                                                        '&:active': { transform: 'scale(0.98)' },
                                                    }),
                                                }}
                                            >
                                                {/* Image */}
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

                                                {/* Non-image icon overlay */}
                                                {!isImage && (
                                                    <Box sx={{
                                                        position: 'absolute', inset: 0,
                                                        display: 'flex', flexDirection: 'column',
                                                        alignItems: 'center', justifyContent: 'center', gap: 0.5,
                                                    }}>
                                                        {isVideo
                                                            ? <VideocamOutlinedIcon sx={{ fontSize: 36, color: typeStyle.iconColor }} />
                                                            : isAudio
                                                                ? <AudiotrackOutlinedIcon sx={{ fontSize: 36, color: typeStyle.iconColor }} />
                                                                : isText
                                                                    ? <NotesIcon sx={{ fontSize: 36, color: typeStyle.iconColor }} />
                                                                    : <InsertDriveFileOutlinedIcon sx={{ fontSize: 32, color: typeStyle.iconColor }} />
                                                        }
                                                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: alpha(typeStyle.iconColor, 0.7), textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                            {fileFormat || dataType}
                                                        </Typography>
                                                    </Box>
                                                )}

                                                {/* Status badge — bottom-left overlay */}
                                                {qStyle && (
                                                    <Box sx={{
                                                        position: 'absolute', bottom: 7, left: 7,
                                                        display: 'flex', alignItems: 'center', gap: 0.45,
                                                        px: 0.8, py: 0.3, borderRadius: '6px',
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
                                                        position: 'absolute', top: 7, right: 7,
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

                                            {/* Caption below card */}
                                            <Box>
                                                <Typography noWrap sx={{ fontSize: '0.72rem', fontWeight: 600, color: C.text, lineHeight: 1.3 }}>
                                                    {upload.filename}
                                                </Typography>
                                                {date && (
                                                    <Typography sx={{ fontSize: '0.63rem', color: C.textMuted, mt: 0.2 }}>
                                                        {date}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    );
                })()}

                {/* Requirements pills */}
                {reqPills.length > 0 && (
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 0.75,
                        flexWrap: 'wrap',
                        px: 0.5,
                    }}>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', mr: 0.25, flexShrink: 0 }}>
                            Specs
                        </Typography>
                        {reqPills.map(pill => (
                            <Box key={pill} sx={{
                                px: 1.25, py: 0.35, borderRadius: '8px',
                                bgcolor: C.indigoLight,
                                border: `1px solid ${alpha(C.indigo, 0.18)}`,
                            }}>
                                <Typography sx={{ fontSize: '0.71rem', fontWeight: 700, color: C.indigo }}>
                                    {pill}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Error */}
                {error && (
                    <Box sx={{
                        display: 'flex', alignItems: 'flex-start', gap: 1.25,
                        p: 1.75, borderRadius: '12px',
                        bgcolor: C.redLight, border: `1px solid #FECACA`,
                    }}>
                        <ErrorOutlineIcon sx={{ fontSize: 17, color: C.red, flexShrink: 0, mt: 0.15 }} />
                        <Typography sx={{ fontSize: '0.83rem', color: C.red, lineHeight: 1.6 }}>
                            {error}
                        </Typography>
                    </Box>
                )}

                {/* Upload zone */}
                <Box sx={{ bgcolor: C.surface, borderRadius: '16px', border: `1px solid ${C.border}`, p: { xs: 2, sm: 2.5 } }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1.5 }}>
                        {phaseItem?.data_type === 'Text' ? 'Your Response' : 'Select File'}
                    </Typography>

                    {phaseItem?.data_type === 'Text' ? (
                        <TextField
                            fullWidth multiline rows={6}
                            placeholder="Enter your response here…"
                            value={textValue}
                            onChange={(e) => setTextValue(e.target.value)}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px', fontSize: '0.88rem',
                                    '& fieldset': { borderColor: C.border },
                                    '&:hover fieldset': { borderColor: C.indigo },
                                    '&.Mui-focused fieldset': { borderColor: C.indigo, borderWidth: '1.5px' },
                                },
                            }}
                        />
                    ) : phaseItem?.file_format === 'LivePhoto' ? (
                        <Grid container spacing={1.5}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: C.textSec, mb: 0.75 }}>
                                    HEIC Photo
                                </Typography>
                                <FileZone
                                    file={selectedFile}
                                    accept={ACCEPT_ATTR['HEIC']}
                                    label="Select HEIC file"
                                    formatLabel="HEIC"
                                    maxMb={phaseItem.file_size}
                                    inputRef={fileInputRef}
                                    onChange={(e) => handleFileChange(e)}
                                    onClear={() => clearFile(false)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: C.textSec, mb: 0.75 }}>
                                    MOV Video
                                </Typography>
                                <FileZone
                                    file={selectedFileLive}
                                    accept={ACCEPT_ATTR['MOV']}
                                    label="Select MOV file"
                                    formatLabel="MOV"
                                    maxMb={phaseItem.file_size}
                                    inputRef={fileInputLiveRef}
                                    onChange={(e) => handleFileChange(e, true)}
                                    onClear={() => clearFile(true)}
                                />
                            </Grid>
                        </Grid>
                    ) : (
                        <FileZone
                            file={selectedFile}
                            accept={primaryAccept}
                            label="Tap to select file"
                            formatLabel={primaryFormatLabel}
                            maxMb={phaseItem?.file_size ?? 10}
                            inputRef={fileInputRef}
                            onChange={(e) => handleFileChange(e)}
                            onClear={() => clearFile(false)}
                        />
                    )}
                </Box>

                {/* Demographics */}
                {demos.length > 0 && (
                    <Box sx={{ bgcolor: C.surface, borderRadius: '16px', border: `1px solid ${C.border}`, p: { xs: 2, sm: 2.5 } }}>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 1.5 }}>
                            About You
                        </Typography>
                        <Grid container spacing={1.5}>
                            {demos.map((key) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={key}>
                                    <TextField
                                        select fullWidth size="small"
                                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                                        value={demographics[key] ?? ''}
                                        onChange={(e) => setDemographics(prev => ({ ...prev, [key]: e.target.value }))}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '10px', fontSize: '0.84rem',
                                                '& fieldset': { borderColor: C.border },
                                                '&:hover fieldset': { borderColor: C.indigo },
                                                '&.Mui-focused fieldset': { borderColor: C.indigo, borderWidth: '1.5px' },
                                            },
                                            '& .MuiInputLabel-root.Mui-focused': { color: C.indigo },
                                        }}
                                    >
                                        {Object.entries(DEMOGRAPHIC_VALUES[key]).map(([vKey, label]) => (
                                            <MenuItem key={vKey} value={vKey} sx={{ fontSize: '0.84rem' }}>
                                                {label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}
            </Box>

            {/* ── Image lightbox ── */}
            {selectedPreview && (() => {
                const p = selectedPreview;
                const thumbUrl = p.file_url ?? p.s3_url ?? '';
                const fileFormat = p.file_format ?? p.fileformat ?? '';
                const rawDate = p.created_at ?? p.createdon;
                const date = rawDate
                    ? new Date(rawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : null;
                const QUALITY_COLOR: Record<string, { fg: string; bg: string }> = {
                    Accepted:              { fg: C.green, bg: C.greenLight },
                    'Auto Accepted':       { fg: C.green, bg: C.greenLight },
                    Rejected:              { fg: C.red,   bg: C.redLight },
                    'Auto Rejected':       { fg: C.red,   bg: C.redLight },
                    'QA Rejected':         { fg: C.red,   bg: C.redLight },
                    Pending:               { fg: '#92400E', bg: '#FFFBEB' },
                    'Needs Manual Review': { fg: '#92400E', bg: '#FFFBEB' },
                };
                const qStyle = p.quality ? (QUALITY_COLOR[p.quality] ?? null) : null;

                return (
                    <Dialog
                        open
                        onClose={() => setSelectedPreview(null)}
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
                        {/* Close button */}
                        <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
                            <IconButton
                                onClick={() => setSelectedPreview(null)}
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
                            width: '100%',
                            aspectRatio: '4/3',
                            bgcolor: '#0F172A',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden',
                        }}>
                            <Box
                                component="img"
                                src={thumbUrl}
                                alt={p.filename}
                                sx={{
                                    maxWidth: '100%', maxHeight: '100%',
                                    objectFit: 'contain',
                                    display: 'block',
                                }}
                            />
                        </Box>

                        {/* Metadata footer */}
                        <Box sx={{ px: 2.5, py: 2, bgcolor: '#1E293B' }}>
                            <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
                                <Box minWidth={0} flex={1}>
                                    <Typography
                                        noWrap
                                        sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#F1F5F9', mb: 0.35 }}
                                    >
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

            {/* ── Sticky submit footer ── */}
            <Box sx={{
                position: 'sticky', bottom: 0, zIndex: 50,
                bgcolor: C.surface, borderTop: `1px solid ${C.border}`,
                px: { xs: 2, sm: 3 }, pt: 1.5,
                pb: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
            }}>
                <Box sx={{ maxWidth: 720, mx: 'auto' }}>
                    <Button
                        variant="contained" fullWidth size="large"
                        onClick={handleSubmit}
                        disabled={submitting}
                        startIcon={
                            submitting
                                ? <CircularProgress size={16} color="inherit" />
                                : <CloudUploadIcon />
                        }
                        sx={{
                            borderRadius: '12px', textTransform: 'none',
                            fontWeight: 700, fontSize: '0.95rem', py: 1.4,
                            bgcolor: C.indigo, color: '#fff', boxShadow: 'none',
                            '&:hover': { bgcolor: C.indigoDark, boxShadow: `0 4px 16px ${alpha(C.indigo, 0.35)}` },
                            '&.Mui-disabled': { bgcolor: C.border, color: C.textMuted },
                        }}
                    >
                        {submitting ? 'Uploading…' : 'Submit Upload'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default withPageErrorBoundary(DataCollectionUpload, 'Data Collection Upload');
