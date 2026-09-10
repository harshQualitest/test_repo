import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Avatar,
    Box,
    Button,
    Card,
    CircularProgress,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Typography,
    alpha,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DatasetIcon from '@mui/icons-material/Dataset';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FlagIcon from '@mui/icons-material/Flag';
import LayersIcon from '@mui/icons-material/Layers';
import RefreshIcon from '@mui/icons-material/Refresh';
import BusinessIcon from '@mui/icons-material/Business';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { selectUser } from '../redux/slices/loginSlice';
import { fetchOrganizations, selectOrganizations, selectOrganizationLoading } from '../redux/slices/organizationSlice';
import { fetchNavWorkspaces, selectNavWorkspaces, selectNavWorkspaceLoading } from '../redux/slices/workspaceSlice';
import {
    fetchUserDataCollectionProjects,
    selectDCUserProjects,
    selectDCUserProjectsLoading,
    selectDCUserProjectsError,
} from '../redux/slices/dataCollectionSlice';
import type { IDataCollectionProject, IPhaseItem } from '../interfaces/api/dataCollection.interface';
import { withPageErrorBoundary } from '../utils/withPageErrorBoundary';

const C = {
    indigo: '#4338CA',
    indigoMid: '#6366F1',
    indigoLight: '#EEF2FF',
    indigoDark: '#3730A3',
    green: '#059669',
    greenLight: '#ECFDF5',
    greenDark: '#065F46',
    red: '#DC2626',
    redLight: '#FEF2F2',
    amber: '#D97706',
    amberLight: '#FFFBEB',
    amberDark: '#92400E',
    bg: '#F1F5F9',
    surface: '#FFFFFF',
    text: '#0F172A',
    textSec: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
} as const;

/** Formats an ISO date string for display (e.g. "24 Jul 2026"); returns '—' when absent or unparsable. */
const fmt = (d?: string) => {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return d;
    }
};

// Project payloads may use either snake_case or camelCase date fields depending on API version — normalize here.
const getEndDate = (p: IDataCollectionProject) => p.end_date ?? p.endDate ?? '';
const getStartDate = (p: IDataCollectionProject) => p.start_date ?? p.startDate ?? '';
/** A project is expired once its end date has passed (no end date means it never expires). */
const isExpired = (p: IDataCollectionProject) => {
    const end = getEndDate(p);
    return !!end && new Date(end) < new Date();
};
const isActive = (p: IDataCollectionProject) => p.status === 'active' || p.isactive === 1;

// ── Project card ──────────────────────────────────────────────────────────

interface ProjectCardProps {
    project: IDataCollectionProject;
    onUpload: (project: IDataCollectionProject, item: IPhaseItem) => void;
    onView: (project: IDataCollectionProject) => void;
}

/**
 * Component: ProjectCard
 * Purpose: Renders a single data-collection project as a card showing status,
 * active phase, description/instructions, and one row per upload slot in the
 * active phase (each slot showing progress and an Upload/View action).
 * Props:
 * - project: the data collection project to display.
 * - onUpload: called when the collector taps "Upload" on a non-full slot.
 * - onView: called when the collector taps "View" on a slot that's already full.
 */
const ProjectCard = ({ project, onUpload, onView }: ProjectCardProps) => {
    const expired = isExpired(project);
    const active = isActive(project);
    // Fall back to the first defined phase (or 'phase_1') when the project has no explicit active_phase set.
    const activePhase = project.active_phase ?? Object.keys(project.phases ?? {})[0] ?? 'phase_1';
    const phaseItems: IPhaseItem[] = project.phases?.[activePhase] ?? [];
    // Turn a raw key like "phase_1" into a human label like "Phase 1".
    const phaseLabel = activePhase.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const statusLabel = expired ? 'Expired' : active ? 'Active' : 'Inactive';
    const accentColor = expired ? '#94A3B8' : active ? C.indigo : C.amber;
    const statusDotColor = expired ? '#94A3B8' : active ? C.green : C.amber;

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: '16px',
                border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${accentColor}`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: C.surface,
                transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                '&:active': { transform: 'scale(0.99)' },
                '@media (hover: hover)': {
                    '&:hover': {
                        boxShadow: '0 8px 28px rgba(0,0,0,0.09)',
                        transform: 'translateY(-2px)',
                    },
                },
            }}
        >
            {/* ── Header ── */}
            <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: 2, pb: 1.5 }}>
                {/* Status row */}
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
                    <Box display="flex" alignItems="center" gap={0.65}>
                        <Box
                            sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusDotColor, flexShrink: 0 }}
                        />
                        <Typography
                            sx={{ fontSize: '0.71rem', fontWeight: 600, color: C.textSec, letterSpacing: '0.01em' }}
                        >
                            {statusLabel}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.3,
                            borderRadius: '6px',
                            bgcolor: expired ? C.bg : C.indigoLight,
                        }}
                    >
                        <LayersIcon sx={{ fontSize: 11, color: expired ? C.textMuted : C.indigo }} />
                        <Typography
                            sx={{ fontSize: '0.68rem', fontWeight: 700, color: expired ? C.textSec : C.indigo }}
                        >
                            {phaseLabel}
                        </Typography>
                    </Box>
                </Box>

                {/* Project name */}
                <Typography
                    fontWeight={800}
                    sx={{
                        fontSize: { xs: '1.05rem', sm: '1.1rem' },
                        lineHeight: 1.25,
                        color: C.text,
                        wordBreak: 'break-word',
                        mb: project.description ? 0.5 : 0,
                    }}
                >
                    {project.name}
                </Typography>

                {/* Description */}
                {project.description && (
                    <Typography
                        sx={{
                            fontSize: '0.8rem',
                            lineHeight: 1.55,
                            color: C.textSec,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {project.description}
                    </Typography>
                )}
            </Box>

            {/* Instructions */}
            {project.instruction && (
                <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 1.25 }}>
                    <Box
                        sx={{
                            px: 1.25,
                            py: 0.875,
                            borderRadius: '8px',
                            bgcolor: C.indigoLight,
                            borderLeft: `2px solid ${C.indigo}`,
                        }}
                    >
                        <Typography
                            sx={{
                                color: C.indigoDark,
                                lineHeight: 1.6,
                                fontSize: '0.76rem',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {project.instruction}
                        </Typography>
                    </Box>
                </Box>
            )}

            {/* ── Upload slots ── */}
            {phaseItems.length > 0 ? (
                <Box sx={{ borderTop: `1px solid ${C.border}` }}>
                    {phaseItems.map((item, idx) => {
                        // Build the compact "Image · JPEG · max 10 MB" caption from whichever fields are present.
                        const slotMeta = [
                            item.data_type,
                            item.file_format,
                            item.file_size ? `max ${item.file_size} MB` : null,
                        ]
                            .filter(Boolean)
                            .join(' · ');
                        // A slot is "full" once its remaining quota hits exactly 0 — switches the action button to View.
                        const slotFull = typeof item.remaining === 'number' && item.remaining === 0;
                        const hasProgress = typeof item.uploaded_by_user === 'number' && typeof item.remaining === 'number';
                        return (
                            <Box
                                key={item.id || idx}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    px: { xs: 2, sm: 2.5 },
                                    py: 1.5,
                                    borderBottom: idx < phaseItems.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                                    bgcolor: expired ? 'transparent' : slotFull ? C.amberLight : alpha(C.indigo, 0.018),
                                    transition: 'background 0.15s',
                                    '@media (hover: hover)': {
                                        '&:hover': {
                                            bgcolor: expired ? C.bg : slotFull ? alpha(C.amber, 0.12) : alpha(C.indigo, 0.05),
                                        },
                                    },
                                }}
                            >
                                {/* Icon box */}
                                <Box
                                    sx={{
                                        width: 38,
                                        height: 38,
                                        borderRadius: '10px',
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: expired ? C.bg : slotFull ? '#FEF3C7' : C.indigoLight,
                                    }}
                                >
                                    <CloudUploadIcon sx={{ fontSize: 18, color: expired ? C.textMuted : slotFull ? C.amber : C.indigo }} />
                                </Box>

                                {/* Slot info */}
                                <Box minWidth={0} flex={1}>
                                    <Typography
                                        noWrap
                                        fontWeight={600}
                                        sx={{ fontSize: '0.85rem', color: expired ? C.textMuted : slotFull ? C.amberDark : C.text }}
                                    >
                                        {item.name || 'Upload slot'}
                                    </Typography>
                                    {slotMeta && (
                                        <Typography sx={{ fontSize: '0.7rem', color: C.textMuted, mt: 0.1 }}>
                                            {slotMeta}
                                        </Typography>
                                    )}
                                    {hasProgress && (
                                        <Box display="flex" alignItems="center" gap={0.75} mt={0.5}>
                                            <Box
                                                sx={{
                                                    flex: 1,
                                                    height: 3,
                                                    borderRadius: '2px',
                                                    bgcolor: slotFull ? '#FDE68A' : C.border,
                                                    overflow: 'hidden',
                                                    maxWidth: 80,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        height: '100%',
                                                        width: item.phaseCount > 0
                                                            ? `${Math.min(100, ((item.uploaded_by_user ?? 0) / item.phaseCount) * 100)}%`
                                                            : '0%',
                                                        bgcolor: slotFull ? C.amber : C.indigo,
                                                        borderRadius: '2px',
                                                        transition: 'width 0.3s ease',
                                                    }}
                                                />
                                            </Box>
                                            <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: slotFull ? C.amber : C.textMuted, whiteSpace: 'nowrap' }}>
                                                {item.uploaded_by_user ?? 0}/{item.phaseCount}
                                                {slotFull ? ' · Full' : ` · ${item.remaining} left`}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>

                                {/* Action button */}
                                {slotFull ? (
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<VisibilityIcon sx={{ fontSize: '14px !important' }} />}
                                        onClick={() => onView(project)}
                                        sx={{
                                            flexShrink: 0,
                                            borderRadius: '9px',
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            px: 1.5,
                                            py: 0.7,
                                            minHeight: 34,
                                            color: C.green,
                                            borderColor: C.green,
                                            boxShadow: 'none',
                                            whiteSpace: 'nowrap',
                                            '&:hover': {
                                                bgcolor: C.greenLight,
                                                borderColor: C.greenDark,
                                                boxShadow: 'none',
                                            },
                                        }}
                                    >
                                        View
                                    </Button>
                                ) : (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        disabled={expired}
                                        onClick={() => onUpload(project, item)}
                                        sx={{
                                            flexShrink: 0,
                                            borderRadius: '9px',
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                            px: 1.75,
                                            py: 0.7,
                                            minHeight: 34,
                                            bgcolor: C.indigo,
                                            color: '#fff',
                                            boxShadow: 'none',
                                            whiteSpace: 'nowrap',
                                            '&:hover': {
                                                bgcolor: C.indigoDark,
                                                boxShadow: `0 3px 10px ${alpha(C.indigo, 0.3)}`,
                                            },
                                            '&.Mui-disabled': { bgcolor: C.bg, color: C.textMuted },
                                        }}
                                    >
                                        Upload
                                    </Button>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            ) : (
                <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2 }}>
                    <Typography sx={{ fontSize: '0.76rem', color: C.textMuted, fontStyle: 'italic' }}>
                        No upload slots configured for this phase.
                    </Typography>
                </Box>
            )}

            {/* ── Footer meta ── */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    px: { xs: 2, sm: 2.5 },
                    py: 1.25,
                    bgcolor: C.bg,
                    borderTop: `1px solid ${C.border}`,
                }}
            >
                <Box display="flex" alignItems="center" gap={0.6}>
                    <CalendarTodayIcon sx={{ fontSize: 11, color: expired ? C.red : C.textMuted }} />
                    <Typography sx={{ fontSize: '0.71rem', fontWeight: 600, color: expired ? C.red : C.textSec }}>
                        {fmt(getStartDate(project))} – {fmt(getEndDate(project))}
                    </Typography>
                </Box>
                {project.target && (
                    <>
                        <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: C.border, flexShrink: 0 }} />
                        <Box display="flex" alignItems="center" gap={0.6}>
                            <FlagIcon sx={{ fontSize: 11, color: C.textMuted }} />
                            <Typography sx={{ fontSize: '0.71rem', fontWeight: 600, color: C.textSec }}>
                                {project.target} target
                            </Typography>
                        </Box>
                    </>
                )}
            </Box>
        </Card>
    );
};

// ── Main page ─────────────────────────────────────────────────────────────

interface CollectorHomeProps {
    workspaceId?: string;
}

/**
 * Component: CollectorHome
 *
 * Purpose: Main landing page for the "Collector" role — lets a data collector
 * pick an organization/workspace (or receives a fixed `workspaceId` prop from
 * `CollectorWorkspaceView`) and shows the data-collection projects assigned to
 * them within that workspace, with per-slot upload/view actions.
 *
 * Responsibilities:
 * - Cascade-load organizations → workspaces (for that org) → projects (for that workspace).
 * - Auto-select the first organization/workspace once each list loads (or match
 *   a workspace passed in via `workspaceId`/route param).
 * - Render loading/error/empty/all-expired states and the project grid.
 * - Navigate to the upload page or the read-only uploads view per slot.
 *
 * Props:
 * - workspaceId (optional) — pins the workspace selector to a specific workspace
 *   (used when rendered from `CollectorWorkspaceView` for a workspace-scoped URL).
 *
 * State:
 * - selectedOrgId — currently chosen organization id.
 * - selectedWorkspaceId — currently chosen workspace id (seeded from `workspaceIdProp`).
 *
 * Redux:
 * - loginSlice: `selectUser`.
 * - organizationSlice: `fetchOrganizations`, `selectOrganizations`, `selectOrganizationLoading`.
 * - workspaceSlice: `fetchNavWorkspaces`, `selectNavWorkspaces`, `selectNavWorkspaceLoading`.
 * - dataCollectionSlice: `fetchUserDataCollectionProjects`, `selectDCUserProjects`,
 *   `selectDCUserProjectsLoading`, `selectDCUserProjectsError`.
 *
 * API calls: all via the above thunks (no direct axios/service calls in this file).
 *
 * Major child components: `ProjectCard` (one per project).
 *
 * Side effects: see the five `useEffect` hooks below (org fetch → org auto-select →
 * workspace fetch → workspace auto-select → project fetch cascade).
 *
 * Business logic:
 * - A project counts as "active" for the summary line when it is not expired
 *   (see `isExpired`); the "all expired" banner shows only when every project
 *   assigned to the workspace has passed its end date.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const CollectorHome = ({ workspaceId: workspaceIdProp }: CollectorHomeProps) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

    const user = useAppSelector(selectUser);
    const projects = useAppSelector(selectDCUserProjects);
    const loading = useAppSelector(selectDCUserProjectsLoading);
    const error = useAppSelector(selectDCUserProjectsError);

    const organizations = useAppSelector(selectOrganizations);
    const orgLoading = useAppSelector(selectOrganizationLoading);
    const navWorkspaces = useAppSelector(selectNavWorkspaces);
    const wsLoading = useAppSelector(selectNavWorkspaceLoading);

    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaceIdProp ?? '');

    // Fetch orgs on mount
    // Only fires if organizations haven't already been loaded elsewhere (e.g. by a
    // parent page), avoiding a redundant network call.
    useEffect(() => {
        if (!organizations.length) {
            dispatch(fetchOrganizations());
        }
    }, [dispatch, organizations.length]);

    // Auto-select first org once loaded
    // Collectors are typically scoped to a single org, so defaulting to the first
    // result avoids requiring an extra manual selection step.
    useEffect(() => {
        if (organizations.length > 0 && !selectedOrgId) {
            setSelectedOrgId(organizations[0]._id);
        }
    }, [organizations, selectedOrgId]);

    // Fetch workspaces whenever org changes
    // Clears the previously selected workspace first so stale project data isn't
    // shown while the new organization's workspace list is loading.
    useEffect(() => {
        if (!selectedOrgId) return;
        setSelectedWorkspaceId('');
        dispatch(fetchNavWorkspaces({ org_id: selectedOrgId, limit: 50, offset: 0 }));
    }, [dispatch, selectedOrgId]);

    // Auto-select first workspace once loaded (or if prop provided, match it)
    // When a `workspaceId` prop was supplied (deep link from CollectorWorkspaceView),
    // prefer matching that workspace; otherwise default to the first one returned.
    useEffect(() => {
        if (!navWorkspaces.length) return;
        if (!selectedWorkspaceId) {
            const match = workspaceIdProp ? navWorkspaces.find((w) => w._id === workspaceIdProp) : undefined;
            setSelectedWorkspaceId(match?._id ?? navWorkspaces[0]._id);
        }
    }, [navWorkspaces, selectedWorkspaceId, workspaceIdProp]);

    // Fetch projects whenever workspace selection changes
    useEffect(() => {
        if (selectedWorkspaceId) {
            dispatch(fetchUserDataCollectionProjects(selectedWorkspaceId));
        }
    }, [dispatch, selectedWorkspaceId]);

    /** Re-fetches the current workspace's projects (bound to the refresh icon button). */
    const handleRefresh = () => {
        if (selectedWorkspaceId) {
            dispatch(fetchUserDataCollectionProjects(selectedWorkspaceId));
        }
    };

    /**
     * Navigates to the upload page for a given project/slot, passing all the
     * data the upload page needs via router state (no extra fetch needed there).
     * Triggered by tapping "Upload" on a non-full slot in a ProjectCard.
     * @param project - the project the slot belongs to
     * @param item - the specific phase/upload slot being uploaded to
     */
    const handleUpload = (project: IDataCollectionProject, item: IPhaseItem) => {
        const activePhase = project.active_phase ?? Object.keys(project.phases ?? {})[0] ?? 'phase_1';
        navigate('/data-collection/upload', {
            state: {
                pname: project.name,
                pid: project._id,
                iname: item.name,
                id: item.id,
                description: project.description,
                instruction: project.instruction,
                activePhase,
                phaseItem: item,
                demographicData: project.demographic_data,
            },
        });
    };

    /**
     * Navigates to the read-only uploads view for a project (used once a slot is full).
     * Triggered by tapping "View" on a full slot in a ProjectCard.
     * @param project - the project whose uploads should be displayed
     */
    const handleView = (project: IDataCollectionProject) => {
        navigate(`/data-collection/collector/view/${project._id ?? project.name}`, {
            state: { project },
        });
    };

    // Greeting name, project active/expired split, and avatar initial derived from current state.
    const firstName = user?.name?.split(' ')[0] ?? 'there';
    const activeCount = projects.filter((p) => !isExpired(p)).length;
    const expiredCount = projects.length - activeCount;
    const userInitial = (user?.name?.[0] ?? 'U').toUpperCase();

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: C.bg, display: 'flex', flexDirection: 'column' }}>
            {/* ── Header ── */}
            <Box
                component="header"
                sx={{
                    bgcolor: C.surface,
                    borderBottom: `1px solid ${C.border}`,
                    position: 'sticky',
                    top: 0,
                    zIndex: 200,
                    pt: { xs: 'env(safe-area-inset-top, 0px)', md: 0 },
                }}
            >
                <Box
                    sx={{
                        maxWidth: 1200,
                        mx: 'auto',
                        px: { xs: 2, sm: 3, md: 4 },
                        py: { xs: 1.25, md: 1.5 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        minHeight: { xs: 58, md: 66 },
                    }}
                >
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar
                            sx={{
                                width: { xs: 38, md: 42 },
                                height: { xs: 38, md: 42 },
                                bgcolor: C.indigo,
                                fontSize: { xs: '0.95rem', md: '1rem' },
                                fontWeight: 800,
                                flexShrink: 0,
                            }}
                        >
                            {userInitial}
                        </Avatar>
                        <Box>
                            <Typography
                                sx={{
                                    color: C.textMuted,
                                    fontSize: '0.63rem',
                                    fontWeight: 600,
                                    letterSpacing: '0.07em',
                                    textTransform: 'uppercase',
                                    lineHeight: 1,
                                    mb: 0.3,
                                    display: 'block',
                                }}
                            >
                                Data Collector
                            </Typography>
                            <Typography
                                sx={{
                                    color: C.text,
                                    fontWeight: 700,
                                    fontSize: { xs: '0.95rem', md: '1.05rem' },
                                    lineHeight: 1.2,
                                }}
                            >
                                {isDesktop ? (user?.name ?? firstName) : `Hi, ${firstName}`}
                            </Typography>
                        </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={0.5}>
                        <IconButton
                            onClick={handleRefresh}
                            disabled={loading}
                            size="small"
                            title="Refresh"
                            sx={{
                                width: 38,
                                height: 38,
                                color: C.textSec,
                                '&:hover': { color: C.indigo, bgcolor: C.indigoLight },
                                '&.Mui-disabled': { color: C.textMuted },
                            }}
                        >
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            onClick={() => navigate('/collector/profile')}
                            size="small"
                            title="Profile"
                            sx={{
                                width: 38,
                                height: 38,
                                color: C.textSec,
                                '&:hover': { color: C.indigo, bgcolor: C.indigoLight },
                            }}
                        >
                            <AccountCircleOutlinedIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
            </Box>

            {/* ── Workspace selector bar ── */}
            <Box sx={{ bgcolor: C.surface, borderBottom: `1px solid ${C.border}` }}>
                <Box
                    sx={{
                        maxWidth: 1200,
                        mx: 'auto',
                        px: { xs: 2, sm: 3, md: 4 },
                        py: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    }}
                >
                    {/* Org dropdown — only when multiple orgs */}
                    {organizations.length > 1 && (
                        <FormControl size="small" disabled={orgLoading} sx={{ minWidth: 160, flexShrink: 0 }}>
                            <InputLabel
                                sx={{
                                    fontSize: '0.8rem',
                                    color: C.textSec,
                                    '&.Mui-focused': { color: C.indigo },
                                }}
                            >
                                Organization
                            </InputLabel>
                            <Select
                                value={selectedOrgId}
                                label="Organization"
                                onChange={(e) => setSelectedOrgId(e.target.value)}
                                startAdornment={
                                    <BusinessIcon sx={{ fontSize: 15, color: C.textMuted, mr: 0.75, flexShrink: 0 }} />
                                }
                                sx={{
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    borderRadius: '10px',
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: C.border },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: C.indigo },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: C.indigo },
                                    color: C.text,
                                }}
                            >
                                {organizations.map((org) => (
                                    <MenuItem key={org._id} value={org._id} sx={{ fontSize: '0.85rem' }}>
                                        {org.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {/* Workspace dropdown */}
                    <FormControl
                        size="small"
                        disabled={wsLoading || !selectedOrgId}
                        sx={{ minWidth: 200, flex: { xs: '1 1 100%', sm: 1 }, maxWidth: { sm: 340 } }}
                    >
                        <InputLabel
                            sx={{
                                fontSize: '0.8rem',
                                color: C.textSec,
                                '&.Mui-focused': { color: C.indigo },
                            }}
                        >
                            Workspace
                        </InputLabel>
                        <Select
                            value={selectedWorkspaceId}
                            label="Workspace"
                            onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                            startAdornment={
                                wsLoading ? (
                                    <CircularProgress size={14} sx={{ color: C.indigo, mr: 0.75, flexShrink: 0 }} />
                                ) : (
                                    <WorkspacesIcon
                                        sx={{ fontSize: 15, color: C.textMuted, mr: 0.75, flexShrink: 0 }}
                                    />
                                )
                            }
                            sx={{
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                borderRadius: '10px',
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: C.border },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: C.indigo },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: C.indigo },
                                color: C.text,
                            }}
                            displayEmpty
                            renderValue={(val) =>
                                val ? (
                                    (navWorkspaces.find((w) => w._id === val)?.name ?? val)
                                ) : (
                                    <Typography
                                        component="span"
                                        sx={{ fontSize: '0.85rem', color: C.textMuted, fontStyle: 'italic' }}
                                    >
                                        Select workspace…
                                    </Typography>
                                )
                            }
                        >
                            {navWorkspaces.length === 0 ? (
                                <MenuItem
                                    disabled
                                    sx={{ fontSize: '0.82rem', color: C.textMuted, fontStyle: 'italic' }}
                                >
                                    No workspaces available
                                </MenuItem>
                            ) : (
                                navWorkspaces.map((ws) => (
                                    <MenuItem key={ws._id} value={ws._id} sx={{ fontSize: '0.85rem' }}>
                                        {ws.name}
                                    </MenuItem>
                                ))
                            )}
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            {/* ── Content ── */}
            <Box
                sx={{
                    flex: 1,
                    maxWidth: 1200,
                    width: '100%',
                    mx: 'auto',
                    px: { xs: 2, sm: 3, md: 4 },
                    py: { xs: 2.5, sm: 3, md: 4 },
                }}
            >
                {/* Section header */}
                <Box mb={{ xs: 2, md: 2.5 }}>
                    <Typography
                        fontWeight={800}
                        sx={{ fontSize: { xs: '1.15rem', md: '1.3rem' }, color: C.text, mb: 0.4 }}
                    >
                        Your Projects
                    </Typography>
                    {selectedWorkspaceId && !loading && projects.length > 0 && (
                        <Typography sx={{ fontSize: '0.78rem', color: C.textSec }}>
                            <Box component="span" sx={{ fontWeight: 700, color: C.green }}>
                                {activeCount}
                            </Box>
                            {' active'}
                            {expiredCount > 0 && (
                                <>
                                    {' · '}
                                    <Box component="span" sx={{ color: C.textMuted }}>
                                        {expiredCount} expired
                                    </Box>
                                </>
                            )}
                            {' · '}
                            {projects.length} total
                        </Typography>
                    )}
                </Box>

                {/* No workspace selected yet */}
                {!selectedWorkspaceId && !wsLoading && !orgLoading && (
                    <Box
                        sx={{
                            textAlign: 'center',
                            py: { xs: 8, md: 12 },
                            px: 3,
                            maxWidth: 360,
                            mx: 'auto',
                        }}
                    >
                        <Box
                            sx={{
                                width: { xs: 72, md: 80 },
                                height: { xs: 72, md: 80 },
                                borderRadius: '20px',
                                bgcolor: C.indigoLight,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2.5,
                            }}
                        >
                            <WorkspacesIcon sx={{ fontSize: { xs: 32, md: 38 }, color: C.indigo }} />
                        </Box>
                        <Typography
                            fontWeight={800}
                            mb={1}
                            sx={{ fontSize: { xs: '1.05rem', md: '1.15rem' }, color: C.text }}
                        >
                            Select a workspace
                        </Typography>
                        <Typography
                            sx={{ color: C.textSec, maxWidth: 260, mx: 'auto', lineHeight: 1.7, fontSize: '0.85rem' }}
                        >
                            Choose a workspace above to see your assigned data collection projects.
                        </Typography>
                    </Box>
                )}

                {/* Loading */}
                {selectedWorkspaceId && loading && (
                    <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        py={{ xs: 10, md: 14 }}
                        gap={2}
                    >
                        <CircularProgress size={30} sx={{ color: C.indigo }} />
                        <Typography sx={{ fontSize: '0.82rem', color: C.textSec }}>Loading your projects…</Typography>
                    </Box>
                )}

                {/* Error */}
                {selectedWorkspaceId && !loading && error && (
                    <Box
                        sx={{
                            textAlign: 'center',
                            py: { xs: 6, md: 10 },
                            px: 3,
                            maxWidth: 360,
                            mx: 'auto',
                        }}
                    >
                        <Box
                            sx={{
                                width: 56,
                                height: 56,
                                borderRadius: '14px',
                                bgcolor: C.redLight,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2,
                            }}
                        >
                            <DatasetIcon sx={{ fontSize: 26, color: C.red }} />
                        </Box>
                        <Typography fontWeight={700} mb={1} sx={{ fontSize: '1rem', color: C.text }}>
                            Something went wrong
                        </Typography>
                        <Typography sx={{ color: C.textSec, mb: 3, lineHeight: 1.65, fontSize: '0.85rem' }}>
                            {error}
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={handleRefresh}
                            startIcon={<RefreshIcon />}
                            sx={{
                                borderRadius: '10px',
                                textTransform: 'none',
                                fontWeight: 700,
                                bgcolor: C.indigo,
                                color: '#fff',
                                boxShadow: 'none',
                                '&:hover': { bgcolor: C.indigoDark, boxShadow: 'none' },
                            }}
                        >
                            Try Again
                        </Button>
                    </Box>
                )}

                {/* Empty state */}
                {selectedWorkspaceId && !loading && !error && projects.length === 0 && (
                    <Box
                        sx={{
                            textAlign: 'center',
                            py: { xs: 8, md: 12 },
                            px: 3,
                            maxWidth: 360,
                            mx: 'auto',
                        }}
                    >
                        <Box
                            sx={{
                                width: { xs: 72, md: 80 },
                                height: { xs: 72, md: 80 },
                                borderRadius: '20px',
                                bgcolor: C.indigoLight,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2.5,
                            }}
                        >
                            <DatasetIcon sx={{ fontSize: { xs: 32, md: 38 }, color: C.indigo }} />
                        </Box>
                        <Typography
                            fontWeight={800}
                            mb={1}
                            sx={{ fontSize: { xs: '1.05rem', md: '1.15rem' }, color: C.text }}
                        >
                            No projects yet
                        </Typography>
                        <Typography
                            sx={{
                                color: C.textSec,
                                maxWidth: 280,
                                mx: 'auto',
                                lineHeight: 1.7,
                                mb: 3,
                                fontSize: '0.85rem',
                            }}
                        >
                            You haven't been added to any data collection projects. Contact your administrator to get
                            started.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={handleRefresh}
                            startIcon={<RefreshIcon />}
                            sx={{
                                borderRadius: '10px',
                                textTransform: 'none',
                                fontWeight: 700,
                                bgcolor: C.indigo,
                                color: '#fff',
                                boxShadow: 'none',
                                px: 3,
                                '&:hover': { bgcolor: C.indigoDark, boxShadow: 'none' },
                            }}
                        >
                            Check Again
                        </Button>
                    </Box>
                )}

                {/* All expired banner */}
                {selectedWorkspaceId && !loading && !error && projects.length > 0 && activeCount === 0 && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 2,
                            mb: 2,
                            borderRadius: '12px',
                            bgcolor: C.amberLight,
                            border: `1px solid #FDE68A`,
                        }}
                    >
                        <WarningAmberRoundedIcon sx={{ color: C.amber, fontSize: 20, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.82rem', color: C.amberDark, lineHeight: 1.5 }}>
                            All projects have expired. Contact your administrator for new assignments.
                        </Typography>
                    </Box>
                )}

                {/* Project grid */}
                {selectedWorkspaceId && !loading && !error && projects.length > 0 && (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                md: 'repeat(2, 1fr)',
                                xl: 'repeat(3, 1fr)',
                            },
                            gap: { xs: 1.75, md: 2.5 },
                            alignItems: 'start',
                        }}
                    >
                        {projects.map((project) => (
                            <ProjectCard key={project._id ?? project.name} project={project} onUpload={handleUpload} onView={handleView} />
                        ))}
                    </Box>
                )}
            </Box>

            <Box sx={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
        </Box>
    );
};

export default withPageErrorBoundary(CollectorHome, 'Collector Home');
