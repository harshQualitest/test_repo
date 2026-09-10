import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Fade,
    IconButton,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import ArticleIcon from '@mui/icons-material/Article';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import { withPageErrorBoundary } from '../utils/withPageErrorBoundary';
import { useToast } from '../hooks/useToast';
import dataCollectionApi from '../services/api/dataCollectionApi';
import type { IDataCollectionProject, IDatasetDocument } from '../interfaces/api/dataCollection.interface';
import { fmt, fmtSize } from '../utils/dataCollectionDisplayHelpers';

const PAGE_SIZE = 10;
const AMBER = '#F59E0B';
const GREEN = '#10B981';
const RED = '#EF4444';
const STAGE_BG = '#0B0B0C';

interface ReviewSlot {
    phaseKey: string;
    phaseId: string;
    slotName: string;
}

interface ReviewRouteState {
    project?: { name?: string; [key: string]: unknown };
}

interface Decision {
    id: string;
    outcome: 'accept' | 'reject';
}

/** Flattens a project's phases into a single ordered queue of (phase, slot) pairs to review one at a time. */
const buildSlotQueue = (project: IDataCollectionProject): ReviewSlot[] =>
    Object.entries(project.phases ?? {}).flatMap(([phaseKey, items]) =>
        items.map((item) => ({ phaseKey, phaseId: item.id, slotName: item.name || item.id })),
    );

/** Pulls the most specific error message available from an API error shape, falling back to a default. */
const extractErrorMessage = (err: unknown, fallback: string): string => {
    const e = err as { response?: { data?: { detail?: { error?: string }; error?: string } }; message?: string };
    return e.response?.data?.detail?.error || e.response?.data?.error || e.message || fallback;
};

/** Formats a duration in seconds as "m:ss" for video/audio playback labels; returns null when not provided. */
const fmtDuration = (seconds?: number) => {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// ── Decision ledger — grows tick by tick as the reviewer works ────────────

/**
 * Component: DecisionLedger
 * Purpose: Small running tally of this review session's accept/reject decisions,
 * shown as a row of colored dots (most recent 40) plus an accepted/rejected count.
 * Props: decisions — the list of decisions made so far in this session.
 */
const DecisionLedger = ({ decisions }: { decisions: Decision[] }) => {
    if (decisions.length === 0) return null;
    const accepted = decisions.filter((d) => d.outcome === 'accept').length;
    const rejected = decisions.length - accepted;
    return (
        <Box display="flex" alignItems="center" gap={1.25} flexWrap="wrap" mt={1}>
            <Typography sx={{ fontSize: '0.62rem', color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                This session
            </Typography>
            <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap" maxWidth={320}>
                {decisions.slice(-40).map((d, i) => (
                    <Box
                        key={`${d.id}-${i}`}
                        sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: d.outcome === 'accept' ? GREEN : RED,
                            opacity: 0.85,
                            flexShrink: 0,
                        }}
                    />
                ))}
            </Box>
            <Typography sx={{ fontSize: '0.68rem', color: '#9E9E9E', fontWeight: 500 }}>
                {accepted} accepted · {rejected} rejected
            </Typography>
        </Box>
    );
};

// ── Media stage — the large viewer for the item currently under review ────

/**
 * Component: MediaStage
 * Purpose: Large preview "stage" for the dataset item currently under review —
 * renders an image (with zoom lightbox), video, audio player, or fetched text
 * preview depending on `doc.data_type`, plus a pending badge and duration label.
 * Props: doc — the dataset document to preview.
 */
const MediaStage = ({ doc }: { doc: IDatasetDocument }) => {
    const [textPreview, setTextPreview] = useState<string | null>(null);
    const [textError, setTextError] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Fetches the raw text content for Text-type documents whenever the document
    // changes, since text previews can't just be displayed via a src/href like
    // image/video/audio can. Resets preview/error state first so a stale preview
    // from the previous document never briefly shows. The cleanup flag guards
    // against setting state after the component unmounts or `doc` changes again
    // mid-fetch (e.g. reviewer advances to the next item before the fetch resolves).
    useEffect(() => {
        setTextPreview(null);
        setTextError(false);
        if (doc.data_type !== 'Text' || !doc.file_url) return;
        let cancelled = false;
        fetch(doc.file_url)
            .then((r) => {
                if (!r.ok) throw new Error('bad response');
                return r.text();
            })
            .then((text) => {
                if (!cancelled) setTextPreview(text);
            })
            .catch(() => {
                if (!cancelled) setTextError(true);
            });
        return () => {
            cancelled = true;
        };
    }, [doc._id, doc.file_url, doc.data_type]);

    const attrs = doc.attributes as { width?: number; height?: number; duration?: number } | undefined;

    let body: ReactNode;
    if (doc.data_type === 'Image' && doc.file_url) {
        body = (
            <Box
                component="img"
                src={doc.file_url}
                alt={doc.filename}
                onClick={() => setLightboxOpen(true)}
                sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'zoom-in' }}
            />
        );
    } else if (doc.data_type === 'Video' && doc.file_url) {
        body = <Box component="video" src={doc.file_url} controls sx={{ maxWidth: '100%', maxHeight: '100%' }} />;
    } else if (doc.data_type === 'Audio' && doc.file_url) {
        body = (
            <Box display="flex" flexDirection="column" alignItems="center" gap={2.5}>
                <AudiotrackIcon sx={{ fontSize: 64, color: 'rgba(255,255,255,0.25)' }} />
                <Box component="audio" src={doc.file_url} controls sx={{ width: 320, maxWidth: '80vw' }} />
            </Box>
        );
    } else if (doc.data_type === 'Text') {
        body = (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    p: 3,
                    overflow: 'auto',
                    color: 'rgba(255,255,255,0.85)',
                }}
            >
                {textPreview ? (
                    <Typography
                        component="pre"
                        sx={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, m: 0 }}
                    >
                        {textPreview}
                    </Typography>
                ) : textError ? (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1.5} py={6}>
                        <ArticleIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.25)' }} />
                        <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                            Couldn't load a preview.
                        </Typography>
                        {doc.file_url && (
                            <Button
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="small"
                                sx={{ color: '#fff', textTransform: 'none', textDecoration: 'underline' }}
                            >
                                Open file instead
                            </Button>
                        )}
                    </Box>
                ) : (
                    <Box display="flex" justifyContent="center" py={6}>
                        <CircularProgress size={18} thickness={4} sx={{ color: 'rgba(255,255,255,0.5)' }} />
                    </Box>
                )}
            </Box>
        );
    } else {
        body = <InsertDriveFileOutlinedIcon sx={{ fontSize: 56, color: 'rgba(255,255,255,0.25)' }} />;
    }

    const durationLabel = fmtDuration(attrs?.duration);

    return (
        <Box
            sx={{
                position: 'relative',
                bgcolor: STAGE_BG,
                borderRadius: '16px',
                height: { xs: 320, sm: 420, md: 520 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
            }}
        >
            {body}

            {/* Pending pill */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 14,
                    left: 14,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.6,
                    px: 1.1,
                    py: 0.4,
                    borderRadius: '20px',
                    bgcolor: 'rgba(245,158,11,0.15)',
                    border: `1px solid ${AMBER}55`,
                }}
            >
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: AMBER }} />
                <Typography
                    sx={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: AMBER,
                        textTransform: 'uppercase',
                        letterSpacing: '0.09em',
                    }}
                >
                    Awaiting Review
                </Typography>
            </Box>

            {durationLabel && (
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 14,
                        left: 14,
                        px: 1,
                        py: 0.25,
                        borderRadius: '6px',
                        bgcolor: 'rgba(0,0,0,0.55)',
                    }}
                >
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: '#fff' }}>{durationLabel}</Typography>
                </Box>
            )}

            {doc.file_url && (
                <Tooltip title={doc.data_type === 'Image' ? 'View full size' : 'Open original file'}>
                    <IconButton
                        {...(doc.data_type === 'Image'
                            ? { onClick: () => setLightboxOpen(true) }
                            : { href: doc.file_url, target: '_blank', rel: 'noopener noreferrer' })}
                        size="small"
                        sx={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            color: 'rgba(255,255,255,0.7)',
                            bgcolor: 'rgba(255,255,255,0.08)',
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.16)', color: '#fff' },
                        }}
                    >
                        {doc.data_type === 'Image' ? <ZoomInIcon sx={{ fontSize: 16 }} /> : <OpenInNewIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                </Tooltip>
            )}

            {doc.data_type === 'Image' && doc.file_url && (
                <Dialog
                    open={lightboxOpen}
                    onClose={() => setLightboxOpen(false)}
                    maxWidth="lg"
                    slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } } }}
                >
                    <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                        <IconButton
                            onClick={() => setLightboxOpen(false)}
                            size="small"
                            sx={{
                                position: 'absolute',
                                top: -16,
                                right: -16,
                                color: '#fff',
                                bgcolor: 'rgba(0,0,0,0.6)',
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                        <Box
                            component="img"
                            src={doc.file_url}
                            alt={doc.filename}
                            sx={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '4px' }}
                        />
                    </Box>
                </Dialog>
            )}
        </Box>
    );
};

// ── Decision panel — metadata + accept/reject ──────────────────────────────

/**
 * Component: MetaRow
 * Purpose: Renders one label/value line in the DecisionPanel's metadata list
 * (e.g. "Uploader: jane@x.com"), truncating long values with an ellipsis.
 */
const MetaRow = ({ label, value }: { label: string; value: string }) => (
    <Box display="flex" justifyContent="space-between" alignItems="baseline" gap={1.5} py={0.6}>
        <Typography sx={{ fontSize: '0.65rem', color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {label}
        </Typography>
        <Typography
            sx={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#111',
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 200,
            }}
        >
            {value}
        </Typography>
    </Box>
);

/**
 * Component: DecisionPanel
 * Purpose: Side panel next to MediaStage showing the current item's metadata
 * (uploader, phase, format, dimensions, size, submitted date, demographics)
 * plus the Accept/Reject action buttons for the reviewer.
 * Props:
 * - doc: the dataset document under review.
 * - isBusy: disables both buttons while a decision is being submitted or the next batch is loading.
 * - onApprove / onReject: callbacks invoked when the reviewer picks a decision.
 */
const DecisionPanel = ({
    doc,
    isBusy,
    onApprove,
    onReject,
}: {
    doc: IDatasetDocument;
    isBusy: boolean;
    onApprove: () => void;
    onReject: () => void;
}) => {
    const sizeLabel = fmtSize(doc.file_size);
    const attrs = doc.attributes as { width?: number; height?: number } | undefined;
    // Only show demographic tags that actually have a value set.
    const demographicEntries = Object.entries(doc.demographic_data ?? {}).filter(([, v]) => Boolean(v));

    const rows: [string, string][] = [
        ['Uploader', doc.uploaded_by ?? '—'],
        ['Phase', doc.phase_key ?? '—'],
        ['Format', [doc.data_type, doc.file_format].filter(Boolean).join(' / ') || '—'],
        ...(attrs?.width && attrs?.height ? ([['Dimensions', `${attrs.width} × ${attrs.height}`]] as [string, string][]) : []),
        ...(sizeLabel ? ([['Size', sizeLabel]] as [string, string][]) : []),
        ['Submitted', fmt(doc.created_at)],
    ];

    return (
        <Box
            sx={{
                border: '1px solid #EBEBEB',
                borderRadius: '16px',
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            }}
        >
            <Typography
                sx={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#000',
                    lineHeight: 1.4,
                    mb: 1.5,
                    wordBreak: 'break-word',
                }}
            >
                {doc.filename}
            </Typography>

            <Box>
                {rows.map(([label, value]) => (
                    <MetaRow key={label} label={label} value={value} />
                ))}
            </Box>

            {demographicEntries.length > 0 && (
                <Box mt={1.5}>
                    <Typography sx={{ fontSize: '0.65rem', color: '#BDBDBD', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.75 }}>
                        Demographic
                    </Typography>
                    <Box display="flex" gap={0.6} flexWrap="wrap">
                        {demographicEntries.map(([key, value]) => (
                            <Chip
                                key={key}
                                label={`${key}: ${value}`}
                                size="small"
                                variant="outlined"
                                sx={{ height: 22, fontSize: '0.68rem', textTransform: 'capitalize' }}
                            />
                        ))}
                    </Box>
                </Box>
            )}

            <Box flex={1} />

            <Box display="flex" gap={1} mt={2.5}>
                <Button
                    fullWidth
                    startIcon={<CheckIcon sx={{ fontSize: 18 }} />}
                    onClick={onApprove}
                    disabled={isBusy}
                    variant="contained"
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        py: 1.15,
                        borderRadius: '10px',
                        bgcolor: GREEN,
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#0ea371', boxShadow: 'none' },
                        '&.Mui-disabled': { bgcolor: '#A7E8D1', color: '#fff' },
                    }}
                >
                    Accept
                </Button>
                <Button
                    fullWidth
                    startIcon={<CloseIcon sx={{ fontSize: 18 }} />}
                    onClick={onReject}
                    disabled={isBusy}
                    variant="contained"
                    sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        py: 1.15,
                        borderRadius: '10px',
                        bgcolor: RED,
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#dc2626', boxShadow: 'none' },
                        '&.Mui-disabled': { bgcolor: '#F5B8B8', color: '#fff' },
                    }}
                >
                    Reject
                </Button>
            </Box>
            <Typography sx={{ fontSize: '0.68rem', color: '#BDBDBD', mt: 1, textAlign: 'center' }}>
                Rejecting requires a short reason for the uploader.
            </Typography>
        </Box>
    );
};

// ── Page ─────────────────────────────────────────────────────────────────

/**
 * Component: DataCollectionReview
 *
 * Purpose: One-item-at-a-time review workflow for a manager/reviewer to
 * accept or reject uploaded dataset items across all of a project's upload
 * slots, working through them like a queue until none remain.
 *
 * Responsibilities:
 * - Build a flat queue of (phase, slot) pairs from the project and paginate
 *   through each slot's pending items in batches (`PAGE_SIZE` at a time).
 * - Show the current item in `MediaStage` with metadata/actions in `DecisionPanel`.
 * - Record accept/reject decisions (reject requires a typed reason) and advance
 *   to the next item, next batch, or next slot as needed.
 * - Track a lightweight in-session decision ledger for the reviewer's own reference.
 *
 * Props: none (reads `projectId` from the route; optional `project.name` from router state).
 *
 * State:
 * - `fullProject` / `projectLoading` — the loaded project and its loading flag.
 * - `slotQueue` / `slotIndex` — the flattened list of upload slots and the current position.
 * - `itemBuffer` / `itemOffset` / `itemTotal` / `itemLoading` — the current slot's
 *   paginated item batch, how far into it we are, its total count, and its loading flag.
 * - `decisions` — this session's accept/reject history (for the ledger).
 * - `allDone` — true once every slot's items have been reviewed.
 * - `submitting` — true while an approve/reject request is in flight.
 * - `rejectOpen` / `rejectReason` — the reject-reason dialog's open state and typed reason.
 *
 * Custom hooks: `useToast` (`showSuccess`/`showError`).
 *
 * API calls (via `dataCollectionApi`): `getProjectData`, `getPhaseDatasets`, `reviewDataset`.
 *
 * Major child components: `MediaStage`, `DecisionPanel`, `DecisionLedger`.
 *
 * Side effects: see the `useEffect` below — loads the project and its first
 * batch of review items exactly once per mount (guarded by `startedRef`).
 *
 * Business logic:
 * - Items are reviewed strictly slot-by-slot in the order phases/slots were
 *   defined on the project; once a slot's items run out the queue advances
 *   to the next slot automatically.
 * - Rejection requires a non-empty reason so the uploader knows what to fix.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const DataCollectionReview = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { showSuccess, showError } = useToast();

    const routeProjectName = (location.state as ReviewRouteState)?.project?.name ?? null;

    const [fullProject, setFullProject] = useState<IDataCollectionProject | null>(null);
    const [projectLoading, setProjectLoading] = useState(true);

    const [slotQueue, setSlotQueue] = useState<ReviewSlot[]>([]);
    const [slotIndex, setSlotIndex] = useState(0);

    const [itemBuffer, setItemBuffer] = useState<IDatasetDocument[]>([]);
    const [itemOffset, setItemOffset] = useState(0);
    const [itemTotal, setItemTotal] = useState(0);
    const [itemLoading, setItemLoading] = useState(false);

    const [decisions, setDecisions] = useState<Decision[]>([]);
    const [allDone, setAllDone] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Guards against the initial load effect double-firing (StrictMode) or firing after unmount.
    const startedRef = useRef(false);

    const currentSlot = slotQueue[slotIndex] ?? null;
    const currentItem = itemBuffer[0] ?? null;

    /**
     * Fetches one page of dataset items for the slot at `queue[index]`, starting
     * at `offset`. If the slot has no items at all, skips straight to the next
     * slot instead of showing an empty stage.
     * `queue`/`index` are threaded explicitly (rather than read from slotQueue/slotIndex state)
     * so the initial-load call chain works correctly before setSlotQueue/setSlotIndex have committed.
     * @param queue - the full slot queue (explicit, not read from state)
     * @param index - which slot in the queue to load
     * @param offset - pagination offset within that slot's items
     */
    const fetchBatchForSlot = async (queue: ReviewSlot[], index: number, offset: number) => {
        if (!projectId) return;
        const slot = queue[index];
        if (!slot) {
            setAllDone(true);
            setItemBuffer([]);
            return;
        }
        setItemLoading(true);
        try {
            const res = await dataCollectionApi.getPhaseDatasets(projectId, slot.phaseKey, slot.phaseId, {
                limit: PAGE_SIZE,
                offset,
            });
            if (res.data.length === 0) {
                await goToNextSlot(queue, index);
                return;
            }
            setItemBuffer(res.data);
            setItemOffset(offset + res.data.length);
            setItemTotal(res.total);
        } catch (err) {
            showError(extractErrorMessage(err, 'Failed to load items for review.'));
        } finally {
            setItemLoading(false);
        }
    };

    /**
     * Advances the review queue past `fromIndex` to the next slot and loads its
     * first batch of items; marks the whole review as done if there's no next slot.
     * @param queue - the full slot queue
     * @param fromIndex - the slot index just finished
     */
    const goToNextSlot = async (queue: ReviewSlot[], fromIndex: number) => {
        const nextIndex = fromIndex + 1;
        if (nextIndex >= queue.length) {
            setAllDone(true);
            setItemBuffer([]);
            return;
        }
        setSlotIndex(nextIndex);
        setItemBuffer([]);
        setItemOffset(0);
        setItemTotal(0);
        await fetchBatchForSlot(queue, nextIndex, 0);
    };

    // Loads the project and its first batch of review items exactly once per
    // mount. `startedRef` guards this because React StrictMode double-invokes
    // effects in development, and this effect has side effects (network calls,
    // state seeding) that must not run twice for one visit to the page.
    useEffect(() => {
        if (!projectId || startedRef.current) return;
        startedRef.current = true;

        const load = async () => {
            setProjectLoading(true);
            try {
                const project = await dataCollectionApi.getProjectData(projectId);
                setFullProject(project);
                const queue = buildSlotQueue(project);
                setSlotQueue(queue);
                if (queue.length === 0) {
                    setAllDone(true);
                } else {
                    await fetchBatchForSlot(queue, 0, 0);
                }
            } catch (err) {
                showError(extractErrorMessage(err, 'Failed to load project data.'));
            } finally {
                setProjectLoading(false);
            }
        };
        load();
    }, [projectId]);

    const displayName = fullProject?.name ?? routeProjectName ?? projectId ?? '';

    // Approximate count of items still awaiting review in the current slot (fetched-but-undecided + not-yet-fetched).
    // Memoized purely to avoid recomputing this small arithmetic expression on
    // every render of the page; recalculates only when the underlying counts change.
    const remainingInSlot = useMemo(
        () => Math.max(itemTotal - itemOffset, 0) + itemBuffer.length,
        [itemTotal, itemOffset, itemBuffer.length],
    );

    /**
     * After a decision (accept/reject) is recorded, advances to the next item:
     * pops the just-decided item from the local buffer if more remain there,
     * otherwise fetches the next page for the current slot, or moves to the
     * next slot entirely if this slot's items are exhausted.
     */
    const advanceAfterDecision = async () => {
        const remainingBuffer = itemBuffer.slice(1);
        if (remainingBuffer.length > 0) {
            setItemBuffer(remainingBuffer);
            return;
        }
        setItemBuffer([]);
        if (currentSlot && itemOffset < itemTotal) {
            await fetchBatchForSlot(slotQueue, slotIndex, itemOffset);
        } else {
            await goToNextSlot(slotQueue, slotIndex);
        }
    };

    /**
     * Marks the current item "Accepted" via the review API, records the
     * decision in the session ledger, and advances to the next item.
     * Triggered by clicking "Accept" in the DecisionPanel.
     */
    const handleApprove = async () => {
        if (!projectId || !currentItem?._id) return;
        setSubmitting(true);
        try {
            await dataCollectionApi.reviewDataset(projectId, currentItem._id, { quality: 'Accepted' });
            showSuccess(`"${currentItem.filename}" accepted.`);
            setDecisions((prev) => [...prev, { id: currentItem._id!, outcome: 'accept' }]);
            await advanceAfterDecision();
        } catch (err) {
            showError(extractErrorMessage(err, 'Failed to approve item.'));
        } finally {
            setSubmitting(false);
        }
    };

    /** Opens the reject-reason dialog with a cleared reason field; triggered by clicking "Reject". */
    const openRejectDialog = () => {
        setRejectReason('');
        setRejectOpen(true);
    };

    /** Closes the reject-reason dialog without submitting, clearing the typed reason. */
    const closeRejectDialog = () => {
        setRejectOpen(false);
        setRejectReason('');
    };

    /**
     * Marks the current item "Rejected" (with the typed reason) via the review
     * API, records the decision, closes the dialog, and advances to the next item.
     * Triggered by confirming the reject dialog; requires a non-empty reason.
     */
    const handleRejectConfirm = async () => {
        if (!projectId || !currentItem?._id || !rejectReason.trim()) return;
        setSubmitting(true);
        try {
            await dataCollectionApi.reviewDataset(projectId, currentItem._id, {
                quality: 'Rejected',
                reason: rejectReason.trim(),
            });
            showSuccess(`"${currentItem.filename}" rejected.`);
            setDecisions((prev) => [...prev, { id: currentItem._id!, outcome: 'reject' }]);
            closeRejectDialog();
            await advanceAfterDecision();
        } catch (err) {
            showError(extractErrorMessage(err, 'Failed to reject item.'));
        } finally {
            setSubmitting(false);
        }
    };

    const isBusy = submitting || itemLoading;
    const accepted = decisions.filter((d) => d.outcome === 'accept').length;
    const rejected = decisions.length - accepted;

    return (
        <Box sx={{ width: '100%', bgcolor: '#FAFAFA', minHeight: '100%' }}>
            <Box maxWidth={1040} mx="auto" py={3} px={{ xs: 2, sm: 3 }}>
                {/* Back */}
                <Button
                    startIcon={<ArrowBackIcon sx={{ fontSize: '14px !important' }} />}
                    onClick={() => navigate(-1)}
                    size="small"
                    sx={{
                        mb: 2,
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

                {/* Header */}
                <Box mb={3}>
                    <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: '#000', letterSpacing: '-0.02em' }}>
                        {displayName}
                    </Typography>
                    {currentSlot && !allDone && (
                        <Box display="flex" alignItems="center" gap={1} mt={0.75} flexWrap="wrap">
                            <Chip
                                label={`Slot ${slotIndex + 1} / ${slotQueue.length} · ${currentSlot.slotName}`}
                                size="small"
                                sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600 }}
                            />
                            <Typography sx={{ fontSize: '0.75rem', color: '#9E9E9E' }}>
                                {remainingInSlot} pending in this slot
                            </Typography>
                        </Box>
                    )}
                    <DecisionLedger decisions={decisions} />
                </Box>

                {/* Loading */}
                {projectLoading ? (
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2} py={16}>
                        <CircularProgress size={20} thickness={3} sx={{ color: '#000' }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#BDBDBD' }}>Loading project…</Typography>
                    </Box>
                ) : allDone ? (
                    <Box
                        sx={{
                            py: 10,
                            textAlign: 'center',
                            border: '1.5px dashed #E0E0E0',
                            borderRadius: '16px',
                        }}
                    >
                        <TaskAltIcon sx={{ fontSize: 40, color: GREEN, mb: 1.5, display: 'block', mx: 'auto' }} />
                        <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#000', mb: 0.5 }}>
                            You're all caught up
                        </Typography>
                        <Typography sx={{ fontSize: '0.8rem', color: '#BDBDBD' }}>
                            No uploads need review right now
                            {decisions.length > 0 && ` — ${accepted} accepted, ${rejected} rejected this session.`}
                        </Typography>
                    </Box>
                ) : (
                    <Fade in={Boolean(currentItem)} timeout={200} key={currentItem?._id ?? 'loading'}>
                        <Box
                            sx={{
                                display: 'grid',
                                gap: 3,
                                gridTemplateColumns: { xs: '1fr', md: '1fr 320px' },
                                alignItems: 'stretch',
                            }}
                        >
                            {currentItem && (
                                <>
                                    <MediaStage doc={currentItem} />
                                    <DecisionPanel
                                        doc={currentItem}
                                        isBusy={isBusy}
                                        onApprove={handleApprove}
                                        onReject={openRejectDialog}
                                    />
                                </>
                            )}
                        </Box>
                    </Fade>
                )}

                {itemLoading && !currentItem && !allDone && !projectLoading && (
                    <Box display="flex" justifyContent="center" py={8}>
                        <CircularProgress size={18} thickness={4} sx={{ color: '#9E9E9E' }} />
                    </Box>
                )}
            </Box>

            {/* Reject reason dialog */}
            <Dialog open={rejectOpen} onClose={closeRejectDialog} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700 }}>Reject Upload</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 2 }}>
                        Provide a reason for rejecting "{currentItem?.filename}". This will be visible to the uploader.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="e.g. Image is blurry / does not match required demographic"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={closeRejectDialog} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleRejectConfirm}
                        disabled={!rejectReason.trim() || submitting}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Reject
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default withPageErrorBoundary(DataCollectionReview, 'Data Collection Review');
