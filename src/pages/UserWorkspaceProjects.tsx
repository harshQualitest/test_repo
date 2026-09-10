import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    alpha,
    useTheme,
    CircularProgress,
    Alert,
    Chip,
    LinearProgress,
    ToggleButtonGroup,
    ToggleButton,
    TextField,
    InputAdornment,
    Button,
    Tabs,
    Tab,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PageErrorBoundary from '../components/common/PageErrorBoundary';
import CommonTable from '../components/shared/CommonTable';
import type { Column } from '../components/shared/CommonTable';

import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
    fetchAllProjects,
    selectAllProjects,
    selectProjectLoading,
    selectProjectError,
    clearErrors,
} from '../redux/slices/projectSlice';
import type { IProject } from '../redux/slices/projectSlice';
import { selectWorkspaces } from '../redux/slices/workspaceSlice';
import { selectUser } from '../redux/slices/loginSlice';
import dataCollectionApi from '../services/api/dataCollectionApi';
import type { IDataCollectionProject } from '../interfaces/api/dataCollection.interface';
import { mapDcToProject } from '../utils/dataCollectionProjectMapper';

/** Checks whether a project is a data-collection project (vs. an annotation project). */
const isDataCollectionProject = (project: IProject) => (project.template_type as string) === 'data_collection';

/** Checks if a user is among a project's assigned users/members. Falls back to true when no membership list is present. */
const projectHasUser = (project: any, userId: string): boolean => {
    const users = project.users || project.members || project.assigned_users;
    if (!Array.isArray(users)) return true;
    return users.some((u: any) => u.user_id === userId || u._id === userId || u.id === userId);
};

interface UserWorkspaceProjectsProps {
    userRole?: string;
    isReviewer?: boolean;
}

/**
 * Component: UserWorkspaceProjectsContent
 *
 * Purpose: Lists the projects assigned to the current annotator/reviewer
 * within a workspace, letting them jump into annotation or review work.
 * Reviewers additionally see data-collection projects (via a tab switch)
 * alongside their annotation projects, since reviewers review both types.
 *
 * Responsibilities:
 * - Fetches all workspace projects (annotation) and, for reviewers, the
 *   workspace's data-collection projects as well.
 * - Filters projects down to ones assigned to the current user, then further
 *   by search text and start/end date range.
 * - Renders either a grid of project cards or a data-table view.
 * - Computes each project's action button label/enabled-state and due-date
 *   status (overdue / due soon / on track) for display.
 * - Routes to the appropriate annotation/review/data-collection screen when
 *   a project's action button is clicked.
 *
 * Props:
 * - `userRole?: string` - the current user's role (currently unused directly;
 *   destructured as `_userRole`).
 * - `isReviewer?: boolean` - whether to show reviewer-specific behavior
 *   (data-collection tab, "Start Review" actions) vs. annotator behavior.
 *
 * State:
 * - `viewMode` - 'grid' or 'table' display mode.
 * - `activeTab` - 'annotation' or 'data_collection' (reviewers only).
 * - `paginationModel` - table view pagination (page/pageSize).
 * - `searchQuery`, `startDateFilter`, `endDateFilter` - list filters.
 * - `dcProjects` / `dcLoading` - data-collection projects fetched directly via API (reviewers only).
 *
 * Redux: `selectAllProjects`, `selectProjectLoading`, `selectProjectError`
 * (projectSlice), `selectWorkspaces` (workspaceSlice), `selectUser` (loginSlice)
 * selectors; `fetchAllProjects`, `clearErrors` (projectSlice) actions/thunks.
 *
 * API calls: `dataCollectionApi.getUserProjectsByWorkspace(workspaceId)` (direct
 * call, reviewers only), mapped to `IProject` shape via `mapDcToProject`.
 *
 * Major child components: `PageErrorBoundary` (wrapping export), `CommonTable`.
 *
 * Side effects: see the `useEffect`s below — fetching data-collection
 * projects for reviewers, and fetching annotation projects for the workspace
 * (with cleanup that clears any project-fetch errors).
 *
 * Business rules: a project's "start" action is only enabled when the
 * relevant task count (annotation or review, depending on role) is greater
 * than zero and the project hasn't passed its end date — see
 * `getActionDisabled`/`getActionButtonText`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const UserWorkspaceProjectsContent = ({ userRole: _userRole, isReviewer = false }: UserWorkspaceProjectsProps) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [activeTab, setActiveTab] = useState<'annotation' | 'data_collection'>('annotation');
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10,
    });

    // Filter and search states
    const [searchQuery, setSearchQuery] = useState('');
    const [startDateFilter, setStartDateFilter] = useState<string>('');
    const [endDateFilter, setEndDateFilter] = useState<string>('');

    // Redux selectors
    const projects = useAppSelector(selectAllProjects);
    const loading = useAppSelector(selectProjectLoading);
    const error = useAppSelector(selectProjectError);
    const workspaces = useAppSelector(selectWorkspaces);
    const currentUser = useAppSelector(selectUser);

    const workspaceId = id;

    // Find current workspace
    const currentWorkspace = workspaces.find((ws) => ws._id === workspaceId);

    // Data collection projects — reviewers also need these listed alongside annotation projects
    const [dcProjects, setDcProjects] = useState<IDataCollectionProject[]>([]);
    const [dcLoading, setDcLoading] = useState(false);
    // Avoids remapping every DC project on each render; only recomputes when
    // the raw API data (`dcProjects`) actually changes.
    const mappedDcProjects = useMemo(() => dcProjects.map(mapDcToProject), [dcProjects]);

    // Only reviewers need data-collection projects; fetches them once the
    // workspace is known and clears the list on failure so the UI degrades gracefully.
    useEffect(() => {
        if (!isReviewer || !workspaceId) return;
        setDcLoading(true);
        dataCollectionApi
            .getUserProjectsByWorkspace(workspaceId)
            .then(setDcProjects)
            .catch(() => setDcProjects([]))
            .finally(() => setDcLoading(false));
    }, [isReviewer, workspaceId]);

    // Filter projects assigned to the current user
    // For now, show all projects in the workspace
    // This can be updated when the API provides user-specific project filtering
    // Memoized because it depends on multiple sources (annotation + DC
    // projects) and is derived on every render otherwise.
    const userAssignedProjects = useMemo(() => {
        const annotationProjects = !currentUser?._id
            ? projects
            : projects.filter((project) => projectHasUser(project, currentUser._id));

        if (!isReviewer) return annotationProjects;
        return activeTab === 'data_collection' ? mappedDcProjects : annotationProjects;
    }, [projects, currentUser?._id, isReviewer, activeTab, mappedDcProjects]);

    const isCurrentTabLoading = isReviewer && activeTab === 'data_collection' ? dcLoading : loading;

    // Filter and search logic
    // Recomputed only when the source list or filter inputs change, since
    // this runs a filter+date comparison over the full project list.
    const filteredProjects = useMemo(() => {
        return userAssignedProjects.filter((project) => {
            // Search by name
            const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());

            // Filter by date range
            let matchesDateRange = true;
            if (startDateFilter) {
                matchesDateRange = matchesDateRange && new Date(project.start_date) >= new Date(startDateFilter);
            }
            if (endDateFilter) {
                matchesDateRange = matchesDateRange && new Date(project.end_date) <= new Date(endDateFilter);
            }

            return matchesSearch && matchesDateRange;
        });
    }, [userAssignedProjects, searchQuery, startDateFilter, endDateFilter]);

    // Fetch projects on component mount and when workspaceId changes.
    // Cleanup clears any stale project-fetch error when navigating away.
    useEffect(() => {
        if (workspaceId) {
            dispatch(fetchAllProjects({ workspaceId }));
        }

        return () => {
            dispatch(clearErrors());
        };
    }, [dispatch, workspaceId]);

    /** Navigates to the data-collection review screen. Triggered by clicking a data-collection project card/row. */
    const handleProjectClick = (project: IProject) => {
        if (isDataCollectionProject(project)) {
            navigate(`/data-collection/review/${project._id ?? project.id}`, { state: { project } });
        }
    };

    /** Navigates to the annotation screen for a project. Triggered by the "Start Annotation" action button. */
    const handleStartAnnotation = (project: IProject, event: React.MouseEvent) => {
        event.stopPropagation();

        navigate(`/user-annotation/${project._id}`, {
            state: {
                task_timeout: project.task_timeout,
                instructions: project.instructions,
                template_type: project.template_type,
            },
        });
    };

    /** Navigates to the review screen for a project. Triggered by the "Start Review" action button. */
    const handleStartReview = (project: IProject, event: React.MouseEvent) => {
        event.stopPropagation();
        navigate(`/user-review/${project._id}`, {
            state: {
                task_timeout: project.task_timeout,
                instructions: project.instructions,
                template_type: project.template_type,
            },
        });
    };

    /**
     * Routes the action button click to the correct destination based on
     * project type and role: data-collection projects always go to the DC
     * review screen; otherwise reviewers go to the review screen (when
     * review tasks exist or the template is multi-modal) and annotators go
     * to the annotation screen (when annotation tasks exist).
     */
    const handleStartAction = (project: IProject, event: React.MouseEvent) => {
        if (isDataCollectionProject(project)) {
            event.stopPropagation();
            navigate(`/data-collection/review/${project._id ?? project.id}`, { state: { project } });
            return;
        }
        if (isReviewer) {
            const reviewTasksCount = (project as any).available_review_tasks ?? 0;
            const isMultiModal = project.template_type === 'multi_modal';
            if (reviewTasksCount > 0 || isMultiModal) {
                handleStartReview(project, event);
            }
        } else {
            const annotationTasksCount = (project as any).available_annotation_tasks ?? 0;
            if (annotationTasksCount > 0) {
                handleStartAnnotation(project, event);
            }
        }
    };

    /**
     * Resolves the label for a project's action button based on completion
     * status, project type, role, and whether the project is overdue or has
     * available tasks.
     */
    const getActionButtonText = (project: IProject) => {
        if (project.status === 'completed') {
            return 'Completed';
        }
        if (isDataCollectionProject(project)) {
            return 'Review Uploads';
        }
        const isOverDue = new Date() > new Date(project.end_date);
        if (isReviewer) {
            const reviewTasksCount = (project as any).available_review_tasks ?? 0;
            const isMultiModal = project.template_type === 'multi_modal';
            return (reviewTasksCount > 0 || isMultiModal) && !isOverDue ? 'Start Review' : 'No Review Tasks';
        } else {
            const annotationTasksCount = (project as any).available_annotation_tasks ?? 0;
            return annotationTasksCount > 0 && !isOverDue ? 'Start Annotation' : 'No Annotation Tasks';
        }
    };

    /**
     * Determines whether a project's action button should be disabled:
     * completed projects are always disabled; data-collection projects are
     * never disabled; annotation/review projects are disabled once past
     * their end date or once there are no matching tasks left for the role.
     */
    const getActionDisabled = (project: IProject): boolean => {
        if (project.status === 'completed') return true;
        if (isDataCollectionProject(project)) return false;
        if (isReviewer) {
            const reviewTasksCount = (project as any).available_review_tasks ?? 0;
            return (
                (reviewTasksCount === 0 && project.template_type !== 'multi_modal') ||
                new Date() > new Date(project.end_date)
            );
        }
        const annotationTasksCount = (project as any).available_annotation_tasks ?? 0;
        return annotationTasksCount === 0 || new Date() > new Date(project.end_date);
    };

    /** Formats an ISO date string as a short human-readable date (e.g. "Jan 5, 2026"). */
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    /** Computes whole days remaining until `endDate` (negative when already past). */
    const getDaysRemaining = (endDate: string) => {
        const end = new Date(endDate);
        const today = new Date();
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    /**
     * Buckets a project's due date into a status/color/day-count summary:
     * overdue, due today, due soon (within 3 days), or on track.
     */
    const getDueStatus = (endDate: string) => {
        const daysRemaining = getDaysRemaining(endDate);
        if (daysRemaining < 0) {
            return { label: 'Overdue', color: 'error' as const, days: Math.abs(daysRemaining) };
        } else if (daysRemaining === 0) {
            return { label: 'Due Today', color: 'warning' as const, days: 0 };
        } else if (daysRemaining <= 3) {
            return { label: 'Due Soon', color: 'warning' as const, days: daysRemaining };
        } else {
            return { label: 'On Track', color: 'success' as const, days: daysRemaining };
        }
    };

    // Calculate project statistics
    // Commented out as it's not currently used in the UI
    // const projectStats = useMemo(() => {
    //     const total = userAssignedProjects.length;
    //     const active = userAssignedProjects.filter(p => p.status === 'active').length;
    //     const completed = userAssignedProjects.filter(p => p.status === 'completed').length;
    //     const pending = total - active - completed;
    //     return { total, active, completed, pending };
    // }, [userAssignedProjects]);

    /** Maps a project's template type to its theme accent color, for icons/chips. */
    const getTemplateColor = (template: string) => {
        const colors: Record<string, string> = {
            llm_grading: theme.palette.primary.main,
            text_annotation: theme.palette.info.main,
            data_collection: '#4338CA',
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
            case 'in_progress':
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

    // Define table columns (without action column)
    const columns: Column<IProject>[] = [
        {
            field: 'name',
            headerName: 'Project Name',
            flex: 1,
            minWidth: 200,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1.5,
                        width: '100%',
                        px: 1,
                    }}
                >
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1.5,
                            backgroundColor: alpha(getTemplateColor(params.row.template_type), 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <FolderOpenIcon
                            sx={{
                                fontSize: 20,
                                color: getTemplateColor(params.row.template_type),
                            }}
                        />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{
                                wordBreak: 'break-word',
                                textAlign: 'center',
                            }}
                        >
                            {params.row.name}
                        </Typography>
                    </Box>
                </Box>
            ),
        },
        {
            field: 'description',
            headerName: 'Description',
            flex: 1.5,
            minWidth: 250,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', px: 1 }}>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            wordBreak: 'break-word',
                            textAlign: 'center',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {params.row.description}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'template_type',
            headerName: 'Template',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <Chip
                        label={params.row.template_type}
                        size="small"
                        sx={{
                            backgroundColor: alpha(getTemplateColor(params.row.template_type), 0.1),
                            color: getTemplateColor(params.row.template_type),
                            fontWeight: 600,
                            textTransform: 'capitalize',
                        }}
                    />
                </Box>
            ),
        },
        {
            field: 'start_date',
            headerName: 'Start Date',
            width: 130,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, width: '100%' }}>
                    <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                        {formatDate(params.row.start_date)}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'end_date',
            headerName: 'End Date',
            width: 130,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, width: '100%' }}>
                    <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                        {formatDate(params.row.end_date)}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    {params.row.status ? (
                        <Chip
                            label={params.row.status}
                            size="small"
                            sx={{
                                backgroundColor: getStatusColor(params.row.status).bg,
                                color: getStatusColor(params.row.status).color,
                                fontWeight: 600,
                                textTransform: 'capitalize',
                            }}
                        />
                    ) : null}
                </Box>
            ),
        },
        {
            field: 'actions' as keyof IProject,
            headerName: 'Actions',
            width: 180,
            align: 'center',
            headerAlign: 'center',
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStartAction(params.row, e);
                        }}
                        disabled={getActionDisabled(params.row)}
                        sx={{
                            px: 2,
                            py: 0.5,
                            borderRadius: 1.5,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            minWidth: 140,
                            boxShadow: 'none',
                            '&:hover': {
                                boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                            },
                            '&.Mui-disabled': {
                                backgroundColor: theme.palette.action.disabledBackground,
                                color: theme.palette.action.disabled,
                            },
                        }}
                    >
                        {getActionButtonText(params.row)}
                    </Button>
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ width: '100%', py: 3, px: { xs: 2, md: 4 } }}>
            {/* Header Section */}
            <Box sx={{ mb: 4 }}>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: 2,
                        mb: 3,
                    }}
                >
                    {/* <UserSummaryBox 
                        isReviewer={isReviewer} 
                        userAssignedProjects={userAssignedProjects}
                        currentWorkspace={currentWorkspace}
                    /> */}

                    <Box>
                        <Typography variant="h4" fontWeight={700} gutterBottom>
                            {(currentWorkspace as any)?.name || 'My Projects'}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {isReviewer
                                ? 'View your assigned projects and start reviews'
                                : 'View your assigned projects and start annotations'}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 2,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                        }}
                    >
                        {/* View Toggle */}
                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            onChange={(_, newMode) => newMode && setViewMode(newMode)}
                            size="small"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    px: 2,
                                    py: 0.75,
                                },
                            }}
                        >
                            <ToggleButton value="grid" aria-label="grid view">
                                <GridViewIcon sx={{ fontSize: 20 }} />
                            </ToggleButton>
                            <ToggleButton value="table" aria-label="table view">
                                <ViewListIcon sx={{ fontSize: 20 }} />
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Box>

                {/* Project Statistics Cards */}
                {/* <Box
                    sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            sm: 'repeat(4, 1fr)',
                        },
                        mb: 3,
                    }}
                >
                    <Card
                        sx={{
                            borderRadius: 3,
                            border: `1px solid ${theme.palette.divider}`,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
                        }}
                    >
                        <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h3" fontWeight={700} color="primary.main">
                                        {projectStats.total}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        Total Projects
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.15),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <FolderOpenIcon sx={{ fontSize: 24, color: theme.palette.primary.main }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    <Card
                        sx={{
                            borderRadius: 3,
                            border: `1px solid ${theme.palette.divider}`,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.02)} 100%)`,
                        }}
                    >
                        <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h3" fontWeight={700} color="success.main">
                                        {projectStats.active}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        Active
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        backgroundColor: alpha(theme.palette.success.main, 0.15),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <PlayArrowIcon sx={{ fontSize: 24, color: theme.palette.success.main }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    <Card
                        sx={{
                            borderRadius: 3,
                            border: `1px solid ${theme.palette.divider}`,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.02)} 100%)`,
                        }}
                    >
                        <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h3" fontWeight={700} color="warning.main">
                                        {projectStats.pending}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        In Progress
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        backgroundColor: alpha(theme.palette.warning.main, 0.15),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <PendingActionsIcon sx={{ fontSize: 24, color: theme.palette.warning.main }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    <Card
                        sx={{
                            borderRadius: 3,
                            border: `1px solid ${theme.palette.divider}`,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
                        }}
                    >
                        <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography variant="h3" fontWeight={700} color="info.main">
                                        {projectStats.completed}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                                        Completed
                                    </Typography>
                                </Box>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 2,
                                        backgroundColor: alpha(theme.palette.info.main, 0.15),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <TaskAltIcon sx={{ fontSize: 24, color: theme.palette.info.main }} />
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Box> */}

                {/* Project Type Tabs — reviewers also review data collection projects */}
                {isReviewer && (
                    <Tabs
                        value={activeTab}
                        onChange={(_, newValue) => setActiveTab(newValue)}
                        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', width: '50%' }}
                    >
                        <Tab label={`Annotation Projects (${projects.length})`} value="annotation" sx={{ width: '50%' }} />
                        <Tab label={`Data Collection Projects (${dcProjects.length})`} value="data_collection" sx={{ width: '50%' }} />
                    </Tabs>
                )}

                {/* Search and Filters Section */}
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        alignItems: 'center',
                    }}
                >
                    {/* Search Bar */}
                    <TextField
                        placeholder="Search projects..."
                        size="small"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ minWidth: 250, flex: 1 }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />

                    {/* Status Filter */}
                    {/* <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={statusFilter}
                            label="Status"
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="in_progress">In Progress</MenuItem>
                            <MenuItem value="completed">Completed</MenuItem>
                        </Select>
                    </FormControl> */}

                    {/* Template Type Filter */}
                    {/* <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Template</InputLabel>
                        <Select
                            value={templateFilter}
                            label="Template"
                            onChange={(e) => setTemplateFilter(e.target.value)}
                        >
                            <MenuItem value="all">All Templates</MenuItem>
                            <MenuItem value="llm_grading">LLM Grading</MenuItem>
                            <MenuItem value="text_annotation">Text Annotation</MenuItem>
                        </Select>
                    </FormControl> */}

                    {/* Clear Filters Button */}
                    {(searchQuery || startDateFilter || endDateFilter) && (
                        <Button
                            size="small"
                            onClick={() => {
                                setSearchQuery('');
                                setStartDateFilter('');
                                setEndDateFilter('');
                            }}
                            sx={{ textTransform: 'none' }}
                        >
                            Clear Filters
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Error Alert */}
            {error && (
                <Alert severity="error" onClose={() => dispatch(clearErrors())} sx={{ mb: 3, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Loading State */}
            {isCurrentTabLoading && userAssignedProjects.length === 0 ? (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 400,
                        gap: 2,
                    }}
                >
                    <CircularProgress size={60} />
                    <Typography variant="body1" color="text.secondary">
                        Loading your projects...
                    </Typography>
                </Box>
            ) : (
                <>
                    {/* Table View */}
                    {viewMode === 'table' && (
                        <Box sx={{ mb: 3 }}>
                            <CommonTable
                                data={filteredProjects}
                                columns={columns}
                                loading={isCurrentTabLoading}
                                paginationModel={paginationModel}
                                onPaginationModelChange={setPaginationModel}
                                pageSizeOptions={[5, 10, 25, 50]}
                                paginationMode="client"
                                onRowClick={(params) => handleProjectClick(params.row)}
                                height={600}
                                getRowId={(row) => row._id || row.id || ''}
                                striped
                                emptyStateMessage="No projects assigned to you. Check back later."
                            />
                        </Box>
                    )}

                    {/* Grid View - Redesigned Cards */}
                    {viewMode === 'grid' && filteredProjects.length > 0 && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2,
                            }}
                        >
                            {/* Project Cards */}
                            {filteredProjects.map((project) => {
                                const dueStatus = getDueStatus(project.end_date);

                                return (
                                    <Card
                                        key={project._id || project.id}
                                        sx={{
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            border: `1px solid ${theme.palette.divider}`,
                                            overflow: 'hidden',
                                            '&:hover': {
                                                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.12)}`,
                                                borderColor: theme.palette.primary.main,
                                            },
                                        }}
                                        onClick={() => handleProjectClick(project)}
                                    >
                                        {/* Card Header with Template Color */}
                                        <Box
                                            sx={{
                                                height: 4,
                                                backgroundColor: getTemplateColor(project.template_type),
                                            }}
                                        />

                                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                            {/* Horizontal Layout */}
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 2,
                                                    flexWrap: { xs: 'wrap', md: 'nowrap' },
                                                }}
                                            >
                                                {/* Left Section - Project Info */}
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1.5,
                                                            mb: 0.5,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="subtitle1"
                                                            sx={{
                                                                fontWeight: 600,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {project.name}
                                                        </Typography>
                                                        <Chip
                                                            label={project.template_type?.replace('_', ' ')}
                                                            size="small"
                                                            sx={{
                                                                backgroundColor: alpha(
                                                                    getTemplateColor(project.template_type),
                                                                    0.1,
                                                                ),
                                                                color: getTemplateColor(project.template_type),
                                                                fontWeight: 600,
                                                                fontSize: '0.65rem',
                                                                height: 20,
                                                                textTransform: 'capitalize',
                                                            }}
                                                        />
                                                        {project.status && (
                                                            <Chip
                                                                label={project.status?.replace('_', ' ')}
                                                                size="small"
                                                                sx={{
                                                                    backgroundColor: getStatusColor(project.status).bg,
                                                                    color: getStatusColor(project.status).color,
                                                                    fontWeight: 600,
                                                                    fontSize: '0.65rem',
                                                                    height: 20,
                                                                    textTransform: 'capitalize',
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            fontSize: '0.8rem',
                                                        }}
                                                    >
                                                        {project.description || 'No description available'}
                                                    </Typography>
                                                </Box>

                                                {/* Middle Section - Progress (if available) */}
                                                {project.progress !== undefined && (
                                                    <Box sx={{ width: 120, flexShrink: 0 }}>
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                mb: 0.25,
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                fontSize="0.7rem"
                                                            >
                                                                Progress
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                fontWeight={600}
                                                                fontSize="0.7rem"
                                                            >
                                                                {project.progress}%
                                                            </Typography>
                                                        </Box>
                                                        <LinearProgress
                                                            variant="determinate"
                                                            value={project.progress}
                                                            sx={{
                                                                height: 4,
                                                                borderRadius: 2,
                                                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                                                '& .MuiLinearProgress-bar': {
                                                                    borderRadius: 2,
                                                                    backgroundColor: getTemplateColor(
                                                                        project.template_type,
                                                                    ),
                                                                },
                                                            }}
                                                        />
                                                    </Box>
                                                )}

                                                {/* Due Date Section */}
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                        flexShrink: 0,
                                                        px: 1.5,
                                                        py: 0.75,
                                                        borderRadius: 1.5,
                                                        backgroundColor: alpha(
                                                            dueStatus.color === 'error'
                                                                ? theme.palette.error.main
                                                                : dueStatus.color === 'warning'
                                                                  ? theme.palette.warning.main
                                                                  : theme.palette.success.main,
                                                            0.08,
                                                        ),
                                                    }}
                                                >
                                                    <AccessTimeIcon
                                                        sx={{
                                                            fontSize: 16,
                                                            color:
                                                                dueStatus.color === 'error'
                                                                    ? theme.palette.error.main
                                                                    : dueStatus.color === 'warning'
                                                                      ? theme.palette.warning.main
                                                                      : theme.palette.success.main,
                                                        }}
                                                    />
                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            display="block"
                                                            fontSize="0.65rem"
                                                            lineHeight={1.2}
                                                        >
                                                            Due {formatDate(project.end_date)}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            fontWeight={600}
                                                            fontSize="0.7rem"
                                                            sx={{
                                                                color:
                                                                    dueStatus.color === 'error'
                                                                        ? theme.palette.error.main
                                                                        : dueStatus.color === 'warning'
                                                                          ? theme.palette.warning.main
                                                                          : theme.palette.success.main,
                                                            }}
                                                        >
                                                            {dueStatus.days === 0
                                                                ? dueStatus.label
                                                                : dueStatus.label === 'Overdue'
                                                                  ? `${dueStatus.days}d overdue`
                                                                  : `${dueStatus.days}d left`}
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                {/* Start Annotation/Review Button */}
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
                                                    onClick={(e) => handleStartAction(project, e)}
                                                    disabled={getActionDisabled(project)}
                                                    sx={{
                                                        px: 2.5,
                                                        py: 0.875,
                                                        borderRadius: 1.5,
                                                        textTransform: 'none',
                                                        fontWeight: 600,
                                                        fontSize: '0.8rem',
                                                        flexShrink: 0,
                                                        minWidth: 140,
                                                        backgroundColor: theme.palette.primary.main,
                                                        boxShadow: 'none',
                                                        '&:hover': {
                                                            backgroundColor: theme.palette.primary.dark,
                                                            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                                                        },
                                                        '&.Mui-disabled': {
                                                            backgroundColor: theme.palette.action.disabledBackground,
                                                            color: theme.palette.action.disabled,
                                                        },
                                                    }}
                                                >
                                                    {getActionButtonText(project)}
                                                </Button>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </Box>
                    )}

                    {/* Empty State */}
                    {!isCurrentTabLoading && filteredProjects.length === 0 && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: 400,
                                textAlign: 'center',
                                gap: 2,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 120,
                                    height: 120,
                                    borderRadius: '50%',
                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <AssignmentIcon
                                    sx={{
                                        fontSize: 60,
                                        color: theme.palette.primary.main,
                                    }}
                                />
                            </Box>
                            <Typography variant="h6" fontWeight={600}>
                                {userAssignedProjects.length === 0 ? 'No Projects Assigned' : 'No Projects Found'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                                {userAssignedProjects.length === 0
                                    ? "You haven't been assigned to any projects yet. Please contact your workspace manager for project assignments."
                                    : 'No projects match your current filters. Try adjusting your search criteria.'}
                            </Typography>
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
};

/**
 * Component: UserWorkspaceProjects
 *
 * Purpose: Thin wrapper that renders `UserWorkspaceProjectsContent` inside a
 * `PageErrorBoundary`, so an unexpected render error is contained and shown
 * as a page-level fallback instead of crashing the whole app.
 */
const UserWorkspaceProjects = ({ userRole, isReviewer = false }: UserWorkspaceProjectsProps) => {
    return (
        <PageErrorBoundary pageName="My Projects">
            <UserWorkspaceProjectsContent userRole={userRole} isReviewer={isReviewer} />
        </PageErrorBoundary>
    );
};

export default UserWorkspaceProjects;
