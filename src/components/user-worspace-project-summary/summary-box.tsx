import {
    Box,
    Card,
    Typography,
    IconButton,
    Chip,
    TextField,
    FormControl,
    Select,
    MenuItem,
    alpha,
    useTheme,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AnnotatorStats from './annotator-stats';
import ReviewerStats from './reviewer-stats';
import type { IProject } from '../../redux/slices/projectSlice';

/**
 * Props for {@link UserSummaryBox}.
 * @property isReviewer - Whether the current user is acting as a reviewer (true) or annotator (false); toggles which stats child renders and which task-count field is summed.
 * @property userAssignedProjects - Projects the current user is assigned to.
 * @property currentWorkspace - The active workspace (used for its display name); typed `any` pending a proper workspace interface.
 */
interface UserSummaryBoxProps {
    isReviewer: boolean;
    userAssignedProjects: IProject[];
    currentWorkspace: any; // __need_dynamic_value_here__: Type definition for workspace
}

/**
 * Purpose: Per-project statistics row consumed by {@link AnnotatorStats} and {@link ReviewerStats}.
 * All numeric fields are currently populated with placeholder zeros (see `__need_dynamic_value_here__`
 * markers below) pending a real per-user statistics API.
 *
 * @property projectName - Project display name.
 * @property workspaceName - Name of the workspace the project belongs to.
 * @property date - Last activity date; not currently available from project data.
 * @property reAnnotations - Annotator-specific: re-annotation count.
 * @property submitted - Annotator-specific: submitted-tasks count.
 * @property accepted - Shared: accepted-tasks count (used by both annotator and reviewer views).
 * @property rejected - Shared: rejected-tasks count (used by both annotator and reviewer views).
 * @property reviewed - Reviewer-specific: reviewed-tasks count.
 */
// Interface for project statistics
export interface ProjectStats {
    projectName: string;
    workspaceName: string;
    date: string; // __need_dynamic_value_here__: Last activity date not available in project data
    // Annotator-specific stats
    reAnnotations?: number; // __need_dynamic_value_here__: Re-annotation count not available
    submitted?: number; // __need_dynamic_value_here__: Submitted tasks count not available
    accepted?: number; // __need_dynamic_value_here__: Accepted tasks count not available
    rejected?: number; // __need_dynamic_value_here__: Rejected tasks count not available
    // Reviewer-specific stats
    reviewed?: number; // __need_dynamic_value_here__: Reviewed tasks count not available
}

/**
 * Component: UserSummaryBox
 *
 * Purpose: Collapsible "My Performance Summary" card shown to a logged-in
 * annotator/reviewer, summarizing assigned-project counts and delegating the
 * detailed stat breakdown to {@link AnnotatorStats} or {@link ReviewerStats}.
 *
 * Responsibilities:
 * - Compute `totalProjects` and `totalAvailableTasks` from `userAssignedProjects`.
 * - Build a `projectBreakdowns` list (currently placeholder zeros) to hand off to the stats child.
 * - Render date/time-range and workspace/project filter controls (currently static, not wired to state).
 * - Conditionally render `ReviewerStats` when `isReviewer` is true, otherwise `AnnotatorStats`.
 *
 * Props:
 * - isReviewer: boolean - selects reviewer vs annotator stats view and task-count field.
 * - userAssignedProjects: IProject[] - projects assigned to the current user.
 * - currentWorkspace: any - active workspace, used for its display name.
 *
 * Major child components rendered: MUI `Card`, `Box`, `Typography`, `IconButton`, `Chip`, `TextField`,
 * `FormControl`/`Select`/`MenuItem`; local `AnnotatorStats` / `ReviewerStats`.
 *
 * Important business logic:
 * - `totalAvailableTasks` sums, per project, `available_review_tasks` when `isReviewer` is true or
 *   `available_annotation_tasks` otherwise — i.e. the same reduce branches on role to pick which
 *   count field represents "available work" for this user.
 * - The "Acceptance Rate" chip is currently a hardcoded placeholder string, not a computed
 *   `accepted / submitted * 100` rate, pending real per-user statistics from the API.
 * - Date/time filters (Start/End Date/Time, Timezone, Quick Select, Workspace/Project) render with
 *   static `defaultValue`s only; they are not yet wired to component state or a fetch call.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const UserSummaryBox = ({ isReviewer, userAssignedProjects, currentWorkspace }: UserSummaryBoxProps) => {
    const theme = useTheme();

    // Calculate aggregated statistics from projects
    // __need_dynamic_value_here__: User-specific task statistics are not available in current project data
    // Need API endpoint for user annotation/review statistics (e.g., /user/statistics or /user/projects/stats)
    const totalProjects = userAssignedProjects.length;
    
    // Calculate total available tasks for the user
    // Why: "available work" means different things per role, so the reduce branches on `isReviewer`
    // to sum the review-specific count for reviewers and the annotation-specific count for annotators.
    const totalAvailableTasks = userAssignedProjects.reduce((sum, project: any) => {
        if (isReviewer) {
            return sum + (project.available_review_tasks || 0);
        } else {
            return sum + (project.available_annotation_tasks || 0);
        }
    }, 0);

    // Prepare project breakdown data
    const projectBreakdowns: ProjectStats[] = userAssignedProjects.map((project: any) => ({
        projectName: project.name,
        workspaceName: currentWorkspace?.name || '__need_dynamic_value_here__',
        date: '__need_dynamic_value_here__', // Last activity date not in project interface
        // All task statistics need API data
        reAnnotations: 0, // __need_dynamic_value_here__
        submitted: 0, // __need_dynamic_value_here__
        accepted: 0, // __need_dynamic_value_here__
        rejected: 0, // __need_dynamic_value_here__
        reviewed: 0, // __need_dynamic_value_here__
    }));

    return (
        <Box>
            <Card
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    borderRadius: 3,
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                }}
            >
                {/* Card Header */}
                <Box
                    sx={{
                        display: 'grid',
                        gridAutoRows: 'min-content',
                        gridTemplateRows: 'auto auto',
                        alignItems: 'start',
                        gap: 1.5,
                        px: 3,
                        pt: 3,
                        pb: 1.5,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography
                            variant="subtitle1"
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                fontWeight: 600,
                            }}
                        >
                            <TrendingUpIcon
                                sx={{
                                    fontSize: 20,
                                    color: theme.palette.primary.main,
                                }}
                            />
                            My Performance Summary
                        </Typography>
                        <IconButton
                            size="small"
                            sx={{
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                },
                            }}
                        >
                            <ExpandLessIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Box>
                </Box>

                {/* Card Content */}
                <Box sx={{ px: 3, '&:last-child': { pb: 3 } }}>
                    {/* Acceptance Rate Section */}
                    <Box sx={{ mb: 1.5 }}>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1, fontSize: '0.875rem' }}
                        >
                            Acceptance Rate
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Chip
                                label="__need_dynamic_value_here__%" // __need_dynamic_value_here__: Acceptance rate (accepted / submitted * 100)
                                sx={{
                                    fontSize: '1.5rem',
                                    fontWeight: 600,
                                    height: 'auto',
                                    px: 2,
                                    py: 1,
                                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                                    color: theme.palette.info.main,
                                    '& .MuiChip-label': {
                                        px: 1,
                                    },
                                }}
                            />
                            <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {/* __need_dynamic_value_here__: Tasks completed this week */}
                                    {totalProjects} {totalProjects === 1 ? 'project' : 'projects'} assigned
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {/* __need_dynamic_value_here__: Average time per task */}
                                    {totalAvailableTasks} {isReviewer ? 'reviews' : 'annotations'} available
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Collapsible Content */}
                    <Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                            {/* Date/Time Filters */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(5, 1fr)',
                                        gap: 1,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                                        >
                                            Start Date
                                        </Typography>
                                        <TextField
                                            type="date"
                                            size="small"
                                            defaultValue="2025-01-15"
                                            sx={{
                                                '& .MuiInputBase-input': {
                                                    fontSize: '0.75rem',
                                                    py: 0.5,
                                                    px: 1.5,
                                                },
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                                        >
                                            Start Time
                                        </Typography>
                                        <TextField
                                            type="time"
                                            size="small"
                                            defaultValue="09:00"
                                            sx={{
                                                '& .MuiInputBase-input': {
                                                    fontSize: '0.75rem',
                                                    py: 0.5,
                                                    px: 1.5,
                                                },
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                                        >
                                            End Date
                                        </Typography>
                                        <TextField
                                            type="date"
                                            size="small"
                                            defaultValue="2025-01-22"
                                            sx={{
                                                '& .MuiInputBase-input': {
                                                    fontSize: '0.75rem',
                                                    py: 0.5,
                                                    px: 1.5,
                                                },
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                                        >
                                            End Time
                                        </Typography>
                                        <TextField
                                            type="time"
                                            size="small"
                                            defaultValue="17:00"
                                            sx={{
                                                '& .MuiInputBase-input': {
                                                    fontSize: '0.75rem',
                                                    py: 0.5,
                                                    px: 1.5,
                                                },
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                                        >
                                            Timezone
                                        </Typography>
                                        <FormControl size="small">
                                            <Select
                                                defaultValue="EST"
                                                sx={{
                                                    fontSize: '0.75rem',
                                                    '& .MuiSelect-select': {
                                                        py: 0.5,
                                                        px: 1.5,
                                                    },
                                                }}
                                            >
                                                <MenuItem value="EST">EST - Eastern (US)</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                </Box>

                                {/* Quick Select Filters */}
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: 1.5,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                                        >
                                            Quick Select
                                        </Typography>
                                        <FormControl size="small">
                                            <Select
                                                defaultValue="this-week"
                                                sx={{
                                                    fontSize: '0.75rem',
                                                    '& .MuiSelect-select': {
                                                        py: 0.5,
                                                        px: 1.5,
                                                    },
                                                }}
                                            >
                                                <MenuItem value="this-week">This Week</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                                        >
                                            Workspace
                                        </Typography>
                                        <FormControl size="small">
                                            <Select
                                                defaultValue="all"
                                                sx={{
                                                    fontSize: '0.75rem',
                                                    '& .MuiSelect-select': {
                                                        py: 0.5,
                                                        px: 1.5,
                                                    },
                                                }}
                                            >
                                                <MenuItem value="all">All Workspaces</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                                        >
                                            Project
                                        </Typography>
                                        <FormControl size="small">
                                            <Select
                                                defaultValue="all"
                                                sx={{
                                                    fontSize: '0.75rem',
                                                    '& .MuiSelect-select': {
                                                        py: 0.5,
                                                        px: 1.5,
                                                    },
                                                }}
                                            >
                                                <MenuItem value="all">All Projects</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                </Box>
                            </Box>

                            {isReviewer ? (
                                <>
                                    <ReviewerStats projectBreakdowns={projectBreakdowns} />
                                </>
                            ) : (
                                <>
                                    <AnnotatorStats projectBreakdowns={projectBreakdowns} />
                                </>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Card>
        </Box>
    );
};

export default UserSummaryBox;