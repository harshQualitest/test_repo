import {
    Box,
    Button,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import type { ProjectStats } from './summary-box';

/**
 * Props for {@link ReviewerStats}.
 * @property projectBreakdowns - Per-project reviewer statistics to aggregate and list.
 */
interface ReviewerStatsProps {
    projectBreakdowns: ProjectStats[];
}

/**
 * Component: ReviewerStats
 *
 * Purpose: Renders a reviewer's performance statistics — a workspace-wide totals
 * strip (reviewed, accepted, rejected) plus a per-project breakdown list.
 *
 * Responsibilities:
 * - Sum per-project counts into workspace-wide `totals` for the three stat buttons.
 * - Render each project's own counts in the "Breakdown by Project" list.
 * - Show an empty-state message when no projects are assigned.
 *
 * Props:
 * - projectBreakdowns: ProjectStats[] - per-project stat entries (see `summary-box.tsx`'s `ProjectStats`).
 *
 * Major child components rendered: MUI `Box`, `Button`, `Typography`, and icons from `@mui/icons-material`.
 *
 * Important business logic:
 * - `totals` is a client-side aggregation (sum) of each project's `reviewed`/`accepted`/`rejected` counts;
 *   this data currently comes from placeholder zeros (see `__need_dynamic_value_here__` markers in
 *   `summary-box.tsx`) pending a real per-user statistics API.
 * - Any stat that evaluates to 0/falsy renders the literal `'__API__'` placeholder text instead of `0`,
 *   flagging to developers that the real value still needs to be wired up from the backend.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ReviewerStats = ({ projectBreakdowns }: ReviewerStatsProps) => {
    const theme = useTheme();

    // Calculate totals from all projects
    // __need_dynamic_value_here__: All these statistics need to come from API
    const totals = projectBreakdowns.reduce(
        (acc, project) => ({
            reviewed: acc.reviewed + (project.reviewed || 0),
            accepted: acc.accepted + (project.accepted || 0),
            rejected: acc.rejected + (project.rejected || 0),
        }),
        { reviewed: 0, accepted: 0, rejected: 0 }
    );

    return (
        <>
            {/* Statistics Grid */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 1.5,
                    textAlign: 'center',
                    py: 1.5,
                    borderTop: `1px solid ${theme.palette.divider}`,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }}
            >
                <Button
                    sx={{
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.grey[500], 0.08),
                        },
                        borderRadius: 2,
                        p: 1,
                        transition: 'background-color 0.2s',
                        textTransform: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                        <SendIcon
                            sx={{
                                fontSize: 12,
                                color: 'text.secondary',
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            Reviewed
                        </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                        {/* __need_dynamic_value_here__: Reviewed count from API */}
                        {totals.reviewed || '__API__'}
                    </Typography>
                </Button>

                <Button
                    sx={{
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.success.main, 0.08),
                        },
                        borderRadius: 2,
                        p: 1,
                        transition: 'background-color 0.2s',
                        textTransform: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                        <CheckCircleIcon
                            sx={{
                                fontSize: 12,
                                color: 'text.secondary',
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            Accepted
                        </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={600} sx={{ color: theme.palette.success.main }}>
                        {/* __need_dynamic_value_here__: Accepted count from API */}
                        {totals.accepted || '__API__'}
                    </Typography>
                </Button>

                <Button
                    sx={{
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.error.main, 0.08),
                        },
                        borderRadius: 2,
                        p: 1,
                        transition: 'background-color 0.2s',
                        textTransform: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.5,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.5 }}>
                        <CancelIcon
                            sx={{
                                fontSize: 12,
                                color: 'text.secondary',
                            }}
                        />
                        <Typography variant="caption" color="text.secondary">
                            Rejected
                        </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={600} sx={{ color: theme.palette.error.main }}>
                        {/* __need_dynamic_value_here__: Rejected count from API */}
                        {totals.rejected || '__API__'}
                    </Typography>
                </Button>
            </Box>

            {/* Breakdown by Project */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Typography
                    variant="caption"
                    fontWeight={500}
                    color="text.secondary"
                    sx={{ fontSize: '0.75rem' }}
                >
                    Breakdown by Project
                </Typography>

                {projectBreakdowns.length > 0 ? (
                    projectBreakdowns.map((project) => (
                        <Button
                            key={`${project.workspaceName}::${project.projectName}`}
                            sx={{
                                width: '100%',
                                textAlign: 'left',
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                },
                                borderRadius: 2,
                                p: 1.5,
                                transition: 'background-color 0.2s',
                                textTransform: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'stretch',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', mb: 1 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" fontWeight={500}>
                                        {project.projectName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {project.workspaceName}
                                    </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                    {/* __need_dynamic_value_here__: Last activity date */}
                                    {project.date || '__API__'}
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 1,
                                    fontSize: '0.75rem',
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <SendIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                                    <Typography variant="caption" color="text.secondary">
                                        Reviewed:
                                    </Typography>
                                    <Typography variant="caption" fontWeight={500}>
                                        {/* __need_dynamic_value_here__: Project-specific reviewed count */}
                                        {project.reviewed || '__API__'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CheckCircleIcon sx={{ fontSize: 12, color: theme.palette.success.main }} />
                                    <Typography variant="caption" color="text.secondary">
                                        Accepted:
                                    </Typography>
                                    <Typography variant="caption" fontWeight={500} sx={{ color: theme.palette.success.main }}>
                                        {/* __need_dynamic_value_here__: Project-specific accepted count */}
                                        {project.accepted || '__API__'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <CancelIcon sx={{ fontSize: 12, color: theme.palette.error.main }} />
                                    <Typography variant="caption" color="text.secondary">
                                        Rejected:
                                    </Typography>
                                    <Typography variant="caption" fontWeight={500} sx={{ color: theme.palette.error.main }}>
                                        {/* __need_dynamic_value_here__: Project-specific rejected count */}
                                        {project.rejected || '__API__'}
                                    </Typography>
                                </Box>
                            </Box>
                        </Button>
                    ))
                ) : (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                        No projects assigned
                    </Typography>
                )}
            </Box>
        </>
    );
};

export default ReviewerStats;