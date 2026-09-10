import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Card, CardContent, Typography, Button, Chip, alpha, useTheme, Alert } from '@mui/material';
import ProjectDetailsSkeleton from '../components/skeletons/ProjectDetailsSkeleton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import {
    fetchAllProjectTasks,
    fetchProjectMembers,
    selectProjectTasks,
    selectProjectMembers,
    selectTasksLoading,
    selectMembersLoading,
    selectTasksPagination,
} from '../redux/slices/projectSlice';
import { TEMPLATE_TYPES } from '../constants/staticThings';
import ProjectTasksTable from '../components/project/ProjectTasksTable';
import ProjectMembersSection from '../components/project/ProjectMembersSection';

interface ProjectData {
    _id?: string;
    id?: string;
    name: string;
    description: string;
    template_type: string;
    start_date: string;
    end_date: string;
    status: string;
    [key: string]: any;
}

/**
 * Component: ProjectDetails
 *
 * Purpose: Shows details for a single project (name, description, template,
 * status, dates) along with its paginated task list and member list. Project
 * data is expected to arrive via `location.state` (passed from the projects
 * list); if it's missing, only the project ID is known and a "not found"
 * notice is shown.
 *
 * Responsibilities:
 * - Reads the project payload from navigation state (or falls back to the
 *   `projectId` route param when state is unavailable).
 * - Fetches project members once the project ID is known.
 * - Fetches the project's tasks, re-fetching whenever pagination changes.
 * - Renders project summary cards, a tasks table, and a members section.
 *
 * Props: none (route component).
 *
 * State:
 * - `project` - the project record shown on the page (from navigation state).
 * - `loading` - whether the initial project data is still being resolved.
 * - `page` / `rowsPerPage` - current tasks-table pagination.
 * - `currentProjectId` - resolved project ID used for all data fetching.
 *
 * Redux (projectSlice): `selectProjectTasks`, `selectProjectMembers`,
 * `selectTasksLoading`, `selectMembersLoading`, `selectTasksPagination`
 * selectors; `fetchAllProjectTasks`, `fetchProjectMembers` thunks.
 *
 * Major child components: `ProjectDetailsSkeleton`, `ProjectTasksTable`,
 * `ProjectMembersSection`.
 *
 * Side effects: see the `useEffect`s below — one resolves the project/ID
 * from navigation state, one re-fetches tasks on pagination change, and one
 * intentionally-empty effect exists as a change-tracking placeholder.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ProjectDetails = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    const dispatch = useDispatch();

    const [project, setProject] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(10);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

    // Redux selectors
    const tasks = useSelector(selectProjectTasks);
    const members = useSelector(selectProjectMembers);
    const tasksLoading = useSelector(selectTasksLoading);
    const membersLoading = useSelector(selectMembersLoading);
    const tasksPagination = useSelector(selectTasksPagination);

    // Initialize project data and ID once.
    // Prefers the project object passed via navigation state (avoids an extra
    // fetch); falls back to just the route param if the user landed here
    // directly (e.g. page refresh) without that state.
    useEffect(() => {
        if (location.state?.project) {
            setProject(location.state.project);
            const projectIdFromState = location.state.project._id || location.state.project.id;
            setCurrentProjectId(projectIdFromState);
            setLoading(false);

            // Fetch members once when project is loaded
            if (projectIdFromState) {
                dispatch(fetchProjectMembers({ projectId: projectIdFromState }) as any);
            }
        } else if (projectId) {
            console.warn('Project data not found in state. Project ID:', projectId);
            setCurrentProjectId(projectId);
            setLoading(false);
        }
    }, [location.state, projectId, dispatch]);

    // Fetch tasks when pagination changes (also runs once currentProjectId
    // is first resolved, since it's included in the dependency array).
    useEffect(() => {
        if (currentProjectId) {
            dispatch(
                fetchAllProjectTasks({
                    projectId: currentProjectId,
                    limit: rowsPerPage,
                    offset: page * rowsPerPage,
                }) as any,
            );
        }
    }, [currentProjectId, page, rowsPerPage, dispatch]);

    // Intentionally-empty effect kept as a lightweight dependency tracker for
    // tasks/members (e.g. for future logging/analytics); no cleanup needed.
    useEffect(() => {}, [tasks, members]);

    /** Maps a project's template type to its theme accent color, for icons/chips. */
    const getTemplateColor = (template: string) => {
        const colors: Record<string, string> = {
            llm_grading: theme.palette.primary.main,
            text_annotation: theme.palette.info.main,
        };
        return colors[template] || theme.palette.grey[500];
    };

    /** Maps a project status to its background/foreground chip colors. */
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return {
                    bg: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
                };
            case 'completed':
                return {
                    bg: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main,
                };
            case 'archived':
                return {
                    bg: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.main,
                };
            default:
                return {
                    bg: alpha(theme.palette.grey[500], 0.1),
                    color: theme.palette.grey[500],
                };
        }
    };

    /** Formats an ISO date string as a short human-readable date (e.g. "Jan 5, 2026"). */
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    // Pagination handlers
    /** Updates the current tasks-table page. Triggered by the table's page-change control. */
    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    /** Updates the tasks-table page size and resets to the first page. */
    const handleRowsPerPageChange = (newRowsPerPage: number) => {
        setRowsPerPage(newRowsPerPage);
        setPage(0);
    };

    if (loading) {
        return <ProjectDetailsSkeleton />;
    }

    if (!project) {
        return (
            <Box sx={{ py: 4, px: { xs: 2, md: 4 } }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3 }}>
                    Go Back
                </Button>
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Project data not found. Please select a project from the workspace to view details.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ py: 4, px: { xs: 2, md: 4 } }}>
            {/* Back Button */}
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(-1)}
                sx={{ mb: 3, textTransform: 'none', fontWeight: 600 }}
            >
                Go Back
            </Button>

            {/* Project Header */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, mb: 2.5 }}>
                    <Box
                        sx={{
                            width: 60,
                            height: 60,
                            borderRadius: 2,
                            backgroundColor: alpha(getTemplateColor(project.template_type), 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <FolderOpenIcon
                            sx={{
                                fontSize: 32,
                                color: getTemplateColor(project.template_type),
                            }}
                        />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h4" fontWeight={800} gutterBottom>
                            {project.name}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                            {project.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Chip
                                label={
                                    TEMPLATE_TYPES[project.template_type as keyof typeof TEMPLATE_TYPES] ||
                                    project.template_type
                                }
                                size="medium"
                                sx={{
                                    backgroundColor: alpha(getTemplateColor(project.template_type), 0.1),
                                    color: getTemplateColor(project.template_type),
                                    fontWeight: 700,
                                    textTransform: 'capitalize',
                                    fontSize: '0.9rem',
                                }}
                            />
                            <Chip
                                label={project.status}
                                size="medium"
                                sx={{
                                    backgroundColor: getStatusColor(project.status).bg,
                                    color: getStatusColor(project.status).color,
                                    fontWeight: 700,
                                    textTransform: 'capitalize',
                                    fontSize: '0.9rem',
                                }}
                            />
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* Project Details Cards */}
            <Box
                sx={{
                    display: 'grid',
                    gap: 2.5,
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                    },
                    mb: 4,
                }}
            >
                {/* Start Date Card */}
                <Card
                    sx={{
                        borderRadius: 2.5,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.08)}`,
                    }}
                >
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CalendarTodayIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                Start Date
                            </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={700}>
                            {formatDate(project.start_date)}
                        </Typography>
                    </CardContent>
                </Card>

                {/* End Date Card */}
                <Card
                    sx={{
                        borderRadius: 2.5,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.08)}`,
                    }}
                >
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CalendarTodayIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                End Date
                            </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={700}>
                            {formatDate(project.end_date)}
                        </Typography>
                    </CardContent>
                </Card>

                {/* Status Card */}
                <Card
                    sx={{
                        borderRadius: 2.5,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.08)}`,
                    }}
                >
                    <CardContent>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
                            Status
                        </Typography>
                        <Chip
                            label={project.status}
                            sx={{
                                backgroundColor: getStatusColor(project.status).bg,
                                color: getStatusColor(project.status).color,
                                fontWeight: 700,
                                textTransform: 'capitalize',
                            }}
                        />
                    </CardContent>
                </Card>
            </Box>

            {/* Additional Details Section */}
            <Card
                sx={{
                    borderRadius: 2.5,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    mb: 4,
                }}
            >
                <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                        Project Information
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                        <Box>
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                Template Type
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 0.5, textTransform: 'capitalize' }}>
                                {TEMPLATE_TYPES[project.template_type as keyof typeof TEMPLATE_TYPES] ||
                                    project.template_type}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                Project ID
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                {project._id || project.id}
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Tasks Section */}
            <ProjectTasksTable
                tasks={tasks}
                tasksLoading={tasksLoading}
                tasksPagination={tasksPagination}
                currentProjectId={currentProjectId}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
            />

            {/* Members Section */}
            <ProjectMembersSection
                members={members}
                membersLoading={membersLoading}
                projectId={currentProjectId}
                workspaceId={project?.workspace_id}
                onMembersUpdated={() => {
                    if (currentProjectId) {
                        dispatch(fetchProjectMembers({ projectId: currentProjectId }) as any);
                    }
                }}
            />
        </Box>
    );
};

export default ProjectDetails;
