import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, alpha, useTheme, Alert, Chip, IconButton, Tooltip, Tabs, Tab } from '@mui/material';
import WorkspaceProjectsSkeleton from '../components/skeletons/WorkspaceProjectsSkeleton';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PageErrorBoundary from '../components/common/PageErrorBoundary';
import CommonTable from '../components/shared/CommonTable';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import ProjectCard from '../components/project/ProjectCard';
import ProjectsHeader from '../components/project/ProjectsHeader';
import ProjectsFilters from '../components/project/ProjectsFilters';
import AddProjectCard from '../components/project/AddProjectCard';
import EmptyProjectsState from '../components/project/EmptyProjectsState';
import ProjectTypePickerDialog from '../components/common/ProjectTypePickerDialog';
import type { Column } from '../components/shared/CommonTable';
import dataCollectionApi from '../services/api/dataCollectionApi';
import type { IDataCollectionProject } from '../interfaces/api/dataCollection.interface';
import { mapDcToProject } from '../utils/dataCollectionProjectMapper';

// Lazy load heavy components
const ProjectCreationDialog = lazy(() => import('../components/common/ProjectCreationDialog'));
const ProjectUpdateDialog = lazy(() => import('../components/common/ProjectUpdateDialog'));
const WorkspaceMembersDialog = lazy(() => import('../components/common/WorkspaceMembersDialog'));
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
    fetchAllProjects,
    selectAllProjects,
    selectProjectLoading,
    selectProjectError,
    clearErrors,
    deleteProject,
    updateProject,
} from '../redux/slices/projectSlice';
import type { IProject } from '../redux/slices/projectSlice';
import { selectCurrentOrganization } from '../redux/slices/organizationSlice';
import { selectWorkspaces, fetchWorkspaceMembers, selectWorkspaceMembers } from '../redux/slices/workspaceSlice';
import { selectUser } from '../redux/slices/loginSlice';
import { getUserRole, hasPermission, ROLES } from '../utils/roles';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../interfaces/hooks/useDebounce';

/**
 * Component: WorkspaceProjectsContent
 *
 * Purpose: Admin/manager-facing project list for a workspace. Supports both
 * annotation and data-collection projects (via a tab switch), grid/table
 * view modes, searching/filtering, and full project lifecycle actions
 * (create, edit, archive, delete, manage members).
 *
 * Responsibilities:
 * - Fetches workspace members and both annotation + data-collection projects.
 * - Filters the active tab's project list by status/template/date range
 *   (search and status filtering for annotation projects happen server-side).
 * - Gates archive/delete/manage-members actions behind role permissions.
 * - Opens the appropriate creation/update/members dialog (all lazy-loaded)
 *   and re-fetches the project list after any mutating action.
 * - Blocks creating a new annotation project when the workspace has no
 *   Project Manager yet, prompting the admin to add one first.
 *
 * Props: none (route component; workspace id comes from the route param).
 *
 * State:
 * - `isTypePickerOpen` / `isDialogOpen` / `isUpdateDialogOpen` / `membersDialogOpen` /
 *   `noProjectManagerDialogOpen` - dialog visibility flags.
 * - `viewMode` - 'grid' or 'table' display mode.
 * - `activeTab` - 'annotation' or 'data_collection'.
 * - `paginationModel` - table view pagination (page/pageSize).
 * - `archiveDialogOpen` / `deleteDialogOpen` / `selectedProject` / `actionLoading` -
 *   archive/delete confirmation flow state.
 * - `searchQuery` / `debouncedSearchQuery`, `statusFilter`, `templateFilter`,
 *   `startDateFilter`, `endDateFilter` - list filters.
 * - `dcProjects` / `dcLoading` - data-collection projects fetched directly via API.
 *
 * Redux: `selectAllProjects`, `selectProjectLoading`, `selectProjectError`
 * (projectSlice); `selectCurrentOrganization` (organizationSlice);
 * `selectWorkspaces`, `selectWorkspaceMembers` (workspaceSlice); `selectUser`
 * (loginSlice) selectors; `fetchAllProjects`, `clearErrors`, `deleteProject`,
 * `updateProject` (projectSlice), `fetchWorkspaceMembers` (workspaceSlice) actions/thunks.
 *
 * Custom hooks: `useToast`, `useDebounce` (search input).
 *
 * API calls: `dataCollectionApi.getUserProjectsByWorkspace(workspaceId)`
 * (direct call), mapped via `mapDcToProject`.
 *
 * Major child components: `PageErrorBoundary` (wrapping export), `ProjectsHeader`,
 * `ProjectsFilters`, `CommonTable`, `ProjectCard`, `AddProjectCard`,
 * `EmptyProjectsState`, `ProjectTypePickerDialog`, `ProjectCreationDialog` (lazy),
 * `ProjectUpdateDialog` (lazy), `WorkspaceMembersDialog` (lazy), `ConfirmationDialog`.
 *
 * Side effects: see the `useEffect`s below — fetching workspace members,
 * fetching data-collection projects, and fetching annotation projects
 * (re-running on search/status filter changes, with cleanup that clears errors).
 *
 * Business rules: `canDelete`/`canArchive` come from `hasPermission`;
 * `canManageMembers` is true for super admins, workspace managers, or a user
 * explicitly assigned as workspace manager for this workspace. A project's
 * displayed status is dynamically recalculated from its end date
 * (`getDynamicStatus`): overdue projects show "Delayed", projects due within
 * 3 days show "Near Deadline", otherwise the stored status is shown as-is.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const WorkspaceProjectsContent = () => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { showSuccess, showError } = useToast();

    const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [activeTab, setActiveTab] = useState<'annotation' | 'data_collection'>('annotation');
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10,
    });

    // Confirmation dialog states
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<IProject | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [membersDialogOpen, setMembersDialogOpen] = useState(false);
    const [noProjectManagerDialogOpen, setNoProjectManagerDialogOpen] = useState(false);

    // Filter and search states
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [templateFilter, setTemplateFilter] = useState<string>('all');
    const [startDateFilter, setStartDateFilter] = useState<string>('');
    const [endDateFilter, setEndDateFilter] = useState<string>('');

    // Redux selectors
    const projects = useAppSelector(selectAllProjects);
    const loading = useAppSelector(selectProjectLoading);
    const error = useAppSelector(selectProjectError);
    const workspaces = useAppSelector(selectWorkspaces);
    const user = useAppSelector(selectUser);
    const workspaceMembers = useAppSelector(selectWorkspaceMembers);
    // Get current organization from Redux
    const currentOrganization = useAppSelector(selectCurrentOrganization);
    const workspaceId = id;

    // Extract orgId from current organization
    const orgId = currentOrganization?._id || '';

    // Find current workspace
    const currentWorkspace = workspaces.find((ws) => ws._id === workspaceId);

    // Check user permissions
    const userRole = getUserRole(user);
    const canDelete = hasPermission(userRole, 'canDeleteProjects');
    const canArchive = hasPermission(userRole, 'canArchiveProjects');
    const canManageMembers =
        userRole === ROLES.SUPER_ADMIN ||
        userRole === ROLES.WORKSPACE_MANAGER ||
        (user?.assignments?.some(
            (a) => a.entity === 'workspace' && a.entity_id === workspaceId && a.role_id === ROLES.WORKSPACE_MANAGER,
        ) ??
            false);

    // DC project state
    const [dcProjects, setDcProjects] = useState<IDataCollectionProject[]>([]);
    const [dcLoading, setDcLoading] = useState(false);

    // Avoids remapping every DC project on each render; only recomputes when
    // the raw API data (`dcProjects`) actually changes.
    const mappedDcProjects = useMemo(() => dcProjects.map(mapDcToProject), [dcProjects]);

    // Filter and search logic — search and statusFilter are handled server-side for annotation projects.
    // The active tab picks which project source (annotation vs data collection) is shown;
    // templateFilter only sub-filters within the annotation tab.
    const filteredProjects = useMemo((): IProject[] => {
        const applyDateFilter = (start: string, end: string) => {
            if (startDateFilter && start && new Date(start) < new Date(startDateFilter)) return false;
            if (endDateFilter && end && new Date(end) > new Date(endDateFilter)) return false;
            return true;
        };

        if (activeTab === 'data_collection') {
            return mappedDcProjects.filter((p) => applyDateFilter(p.start_date, p.end_date));
        }

        return projects.filter((project) => {
            const matchesTemplate = templateFilter === 'all' || project.template_type === templateFilter;
            return matchesTemplate && applyDateFilter(project.start_date, project.end_date);
        });
    }, [projects, mappedDcProjects, activeTab, templateFilter, startDateFilter, endDateFilter]);

    // Fetch workspace members once when workspaceId changes.
    // Used to check whether the workspace has a Project Manager assigned
    // before allowing annotation-project creation.
    useEffect(() => {
        if (workspaceId) {
            dispatch(fetchWorkspaceMembers({ workspaceId }));
        }
    }, [dispatch, workspaceId]);

    // Fetch DC projects when workspace changes
    useEffect(() => {
        if (!workspaceId) return;
        setDcLoading(true);
        dataCollectionApi.getUserProjectsByWorkspace(workspaceId)
            .then(setDcProjects)
            .catch(() => setDcProjects([]))
            .finally(() => setDcLoading(false));
    }, [workspaceId]);

    // Fetch projects whenever workspaceId, debounced search query, or status
    // filter changes. Cleanup clears any stale project-fetch error on unmount/change.
    useEffect(() => {
        if (workspaceId) {
            dispatch(
                fetchAllProjects({
                    workspaceId,
                    search: debouncedSearchQuery || undefined,
                    filter:
                        statusFilter !== 'all'
                            ? (statusFilter as 'active' | 'delete' | 'archive' | 'draft')
                            : undefined,
                }),
            );
        }

        return () => {
            dispatch(clearErrors());
        };
    }, [dispatch, workspaceId, debouncedSearchQuery, statusFilter]);

    /** Opens the project-type picker dialog. Triggered by the "Add Project" button/card. */
    const handleAddProject = () => {
        setIsTypePickerOpen(true);
    };

    /**
     * Handles the project-type choice from the picker dialog. Data-collection
     * projects go straight to the DC creation route. Annotation projects
     * require the workspace to already have a Project Manager — if not, a
     * blocking dialog is shown instead of the creation dialog.
     * @param kind - Which kind of project the user chose to create.
     */
    const handleTypeSelected = (kind: 'annotation' | 'data_collection') => {
        setIsTypePickerOpen(false);
        if (kind === 'data_collection') {
            navigate('/data-collection/create', {
                state: {
                    fromWorkspace: true,
                    workspaceId,
                    workspaceName: (currentWorkspace as any)?.name ?? 'Workspace',
                },
            });
            return;
        }
        // Annotation — check for project manager then open dialog
        const hasProjectManager = workspaceMembers.some(
            (member) => member.role === 'project_manager' || member.user?.role === 'project_manager',
        );
        if (!hasProjectManager) {
            setNoProjectManagerDialogOpen(true);
            return;
        }
        setIsDialogOpen(true);
    };

    /** Closes the project-creation dialog. */
    const handleCloseDialog = () => {
        setIsDialogOpen(false);
    };

    /** Re-fetches the project list after a new project is created, preserving current search/status filters. */
    const handleProjectCreated = (_project: any) => {
        if (workspaceId) {
            dispatch(
                fetchAllProjects({
                    workspaceId,
                    search: searchQuery || undefined,
                    filter:
                        statusFilter !== 'all'
                            ? (statusFilter as 'active' | 'delete' | 'archive' | 'draft')
                            : undefined,
                }),
            );
        }
    };

    /** Re-fetches the project list after an edit, then closes the update dialog and clears the selection. */
    const handleProjectUpdated = () => {
        if (workspaceId) {
            dispatch(
                fetchAllProjects({
                    workspaceId,
                    search: searchQuery || undefined,
                    filter:
                        statusFilter !== 'all'
                            ? (statusFilter as 'active' | 'delete' | 'archive' | 'draft')
                            : undefined,
                }),
            );
        }
        setIsUpdateDialogOpen(false);
        setSelectedProject(null);
    };

    /**
     * Navigates into a project. Data-collection projects go to the tracking
     * screen; annotation projects go to the project detail screen, but only
     * once they're out of 'draft' status (a draft has nothing to view yet).
     */
    const handleProjectClick = (project: IProject) => {
        if ((project.template_type as string) === 'data_collection') {
            navigate(`/data-collection/tracking/${project._id ?? project.id}`, { state: { project } });
            return;
        }
        const projectId = project._id || project.id;
        if (projectId && project.status !== 'draft') {
            navigate(`/project/${projectId}`, { state: { project } });
        }
    };

    /** Opens the workspace members management dialog. Triggered by the "Manage Members" header action. */
    const handleManageMembersClick = () => {
        setMembersDialogOpen(true);
    };

    /** Closes the workspace members management dialog. */
    const handleMembersDialogClose = () => {
        setMembersDialogOpen(false);
    };

    /** Opens the archive-confirmation dialog for a project. Triggered by a project's Archive action. */
    const handleArchiveClick = (project: IProject, event?: React.MouseEvent) => {
        if (event) {
            event.stopPropagation();
        }
        setSelectedProject(project);
        setArchiveDialogOpen(true);
    };

    /** Opens the delete-confirmation dialog for a project. Triggered by a project's Delete action. */
    const handleDeleteClick = (project: IProject, event?: React.MouseEvent) => {
        if (event) {
            event.stopPropagation();
        }
        setSelectedProject(project);
        setDeleteDialogOpen(true);
    };

    /**
     * Opens the edit flow for a project. Data-collection projects navigate
     * to their own edit route; annotation projects open the in-place
     * `ProjectUpdateDialog`. Triggered by a project's Edit action.
     */
    const handleEditClick = (project: IProject, event?: React.MouseEvent) => {
        if (event) {
            event.stopPropagation();
        }
        if ((project.template_type as string) === 'data_collection') {
            const projectId = project.id || project._id;
            navigate(`/data-collection/edit/${projectId}`, {
                state: {
                    fromWorkspace: true,
                    workspaceId,
                    workspaceName: (currentWorkspace as any)?.name ?? 'Workspace',
                },
            });
            return;
        }
        setSelectedProject(project);
        setIsUpdateDialogOpen(true);
    };

    /**
     * Confirms archiving the selected project via `updateProject`, shows a
     * success/error toast, and closes the dialog on success.
     */
    const handleArchiveConfirm = async () => {
        if (!selectedProject) return;

        setActionLoading(true);
        try {
            const projectId = selectedProject._id || selectedProject.id;
            if (projectId) {
                await dispatch(
                    updateProject({
                        project_id: projectId,
                        status: 'archive',
                    }),
                ).unwrap();
                showSuccess('Project archived successfully!');
                setArchiveDialogOpen(false);
                setSelectedProject(null);
            }
        } catch (error: any) {
            console.error('Failed to archive project:', error);
            showError(error?.message || 'Failed to archive project');
        } finally {
            setActionLoading(false);
        }
    };

    /**
     * Confirms permanently deleting the selected project via `deleteProject`,
     * shows a success/error toast, and closes the dialog on success.
     */
    const handleDeleteConfirm = async () => {
        if (!selectedProject) return;

        setActionLoading(true);
        try {
            const projectId = selectedProject._id || selectedProject.id;
            if (projectId) {
                await dispatch(deleteProject(projectId)).unwrap();
                showSuccess('Project deleted successfully!');
                setDeleteDialogOpen(false);
                setSelectedProject(null);
            }
        } catch (error: any) {
            console.error('Failed to delete project:', error);
            showError(error?.message || 'Failed to delete project');
        } finally {
            setActionLoading(false);
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

    /** Maps a project's template type to its theme accent color, for icons/chips. */
    const getTemplateColor = (template: string) => {
        const colors: Record<string, string> = {
            llm_grading: theme.palette.primary.main,
            text_annotation: theme.palette.info.main,
            data_collection: '#4338CA',
        };
        return colors[template] || theme.palette.grey[500];
    };

    // Calculate dynamic status based on end date.
    // Business rule: the displayed status isn't just the stored value — a
    // project that's past its end date is shown as "delayed", and one within
    // 3 days of its end date is flagged "near_deadline", overriding the raw status.
    const getDynamicStatus = (project: IProject): string => {
        if (!project.end_date) return project.status || 'active';

        const endDate = new Date(project.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // If end date has passed
        if (diffDays < 0) {
            return 'delayed';
        }

        // If end date is within 3 days
        if (diffDays >= 0 && diffDays <= 3) {
            return 'near_deadline';
        }

        // Otherwise return original status
        return project.status || 'active';
    };

    /** Maps a (possibly dynamic) status value to its background/foreground chip colors. */
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delayed':
                return {
                    bg: alpha(theme.palette.error.main, 0.1),
                    color: theme.palette.error.main,
                };
            case 'near_deadline':
                return {
                    bg: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.main,
                };
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
            default:
                return {
                    bg: alpha(theme.palette.grey[500], 0.1),
                    color: theme.palette.grey[500],
                };
        }
    };

    // Format status label for display
    /** Converts a dynamic status value into its display label (e.g. 'delayed' -> 'Delayed'). */
    const formatStatusLabel = (status: string): string => {
        switch (status) {
            case 'delayed':
                return 'Delayed';
            case 'near_deadline':
                return 'Near Deadline';
            default:
                return status;
        }
    };

    // Define table columns
    const columns: Column<IProject>[] = [
        {
            field: 'name',
            headerName: 'Project Name',
            flex: 1,
            minWidth: 200,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            minWidth: 40,
                            flexShrink: 0,
                            borderRadius: 1.5,
                            backgroundColor: alpha(getTemplateColor(params.row.template_type), 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
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
                                overflowWrap: 'break-word',
                                whiteSpace: 'normal',
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
            renderCell: (params) => (
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'normal',
                        py: 1,
                    }}
                >
                    {params.row.description}
                </Typography>
            ),
        },
        {
            field: 'template_type',
            headerName: 'Template',
            width: 150,
            renderCell: (params) => (
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
            ),
        },
        {
            field: 'start_date',
            headerName: 'Start Date',
            width: 130,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
            renderCell: (params) => {
                const dynamicStatus = getDynamicStatus(params.row);
                return dynamicStatus ? (
                    <Chip
                        label={formatStatusLabel(dynamicStatus)}
                        size="small"
                        sx={{
                            backgroundColor: getStatusColor(dynamicStatus).bg,
                            color: getStatusColor(dynamicStatus).color,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                        }}
                    />
                ) : null;
            },
        },
        {
            field: 'actions' as keyof IProject,
            headerName: 'Actions',
            width: 150,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Edit Project">
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(params.row, e);
                            }}
                            sx={{
                                color: theme.palette.info.main,
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                                },
                            }}
                        >
                            <EditIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                    {canArchive && (
                        <Tooltip title="Archive Project">
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleArchiveClick(params.row, e);
                                }}
                                disabled={params.row.status === 'archived'}
                                sx={{
                                    color: theme.palette.warning.main,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.warning.main, 0.1),
                                    },
                                    '&.Mui-disabled': {
                                        color: theme.palette.action.disabled,
                                    },
                                }}
                            >
                                <ArchiveIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {canDelete && (
                        <Tooltip title="Delete Project">
                            <IconButton
                                size="small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(params.row, e);
                                }}
                                sx={{
                                    color: theme.palette.error.main,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                                    },
                                }}
                            >
                                <DeleteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            ),
        },
    ];

    return (
        <Box sx={{ width: '100%', py: 3, px: { xs: 2, md: 4 } }}>
            {/* Header Section */}
            <ProjectsHeader
                workspaceName={(currentWorkspace as any)?.name || 'Workspace Projects'}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onAddProject={handleAddProject}
                onManageMembers={handleManageMembersClick}
                workspaceId={workspaceId}
                canManageMembers={canManageMembers}
            />

            {/* Project Type Tabs */}
            <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', width: '50%' }}
            >
                <Tab label={`Annotation Projects (${projects.length})`} value="annotation" sx={{ width: '50%' }} />
                <Tab label={`Data Collection Projects (${dcProjects.length})`} value="data_collection" sx={{ width: '50%' }} />
            </Tabs>

            {/* Filters Section */}
            <ProjectsFilters
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                templateFilter={templateFilter}
                startDateFilter={startDateFilter}
                endDateFilter={endDateFilter}
                onSearchChange={setSearchQuery}
                onStatusChange={setStatusFilter}
                onTemplateChange={setTemplateFilter}
                onStartDateChange={setStartDateFilter}
                onEndDateChange={setEndDateFilter}
                showTemplateFilter={activeTab === 'annotation'}
                onClearFilters={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setTemplateFilter('all');
                    setStartDateFilter('');
                    setEndDateFilter('');
                }}
            />

            {/* Error Alert */}
            {error && (
                <Alert severity="error" onClose={() => dispatch(clearErrors())} sx={{ mb: 3, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Loading State */}
            {(activeTab === 'data_collection' ? dcLoading : loading) && filteredProjects.length === 0 ? (
                <WorkspaceProjectsSkeleton viewMode={viewMode} />
            ) : (
                <>
                    {/* Table View */}
                    {viewMode === 'table' && (
                        <Box
                            sx={{
                                mb: 3,
                                '& .MuiDataGrid-columnHeaders': {
                                    backgroundColor: theme.palette.background.paper,
                                    borderBottom: `2px solid ${theme.palette.divider}`,
                                },
                                '& .MuiDataGrid-columnHeader': {
                                    backgroundColor: theme.palette.background.paper,
                                },
                            }}
                        >
                            <CommonTable
                                data={filteredProjects}
                                columns={columns}
                                loading={activeTab === 'data_collection' ? dcLoading : loading}
                                paginationModel={paginationModel}
                                onPaginationModelChange={setPaginationModel}
                                pageSizeOptions={[5, 10, 25, 50]}
                                paginationMode="client"
                                onRowClick={(params) => handleProjectClick(params.row)}
                                height={600}
                                getRowId={(row) => row._id || row.id || ''}
                                striped
                                emptyStateMessage="No projects found. Try adjusting your filters."
                            />
                        </Box>
                    )}

                    {/* Grid View */}
                    {viewMode === 'grid' && (
                        <>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 2,
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'repeat(2, 1fr)',
                                        md: 'repeat(3, 1fr)',
                                    },
                                }}
                            >
                                {filteredProjects.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        onProjectClick={handleProjectClick}
                                        onEditClick={handleEditClick}
                                        onArchiveClick={handleArchiveClick}
                                        onDeleteClick={handleDeleteClick}
                                        getTemplateColor={getTemplateColor}
                                        getStatusColor={getStatusColor}
                                        getDynamicStatus={getDynamicStatus}
                                        formatStatusLabel={formatStatusLabel}
                                        formatDate={formatDate}
                                        canArchive={canArchive}
                                        canDelete={canDelete}
                                    />
                                ))}
                                <AddProjectCard onAddProject={handleAddProject} />
                            </Box>

                            {/* Empty state when no projects at all */}
                            {!loading && filteredProjects.length === 0 && (
                                <EmptyProjectsState
                                    hasProjects={(activeTab === 'data_collection' ? dcProjects.length : projects.length) > 0}
                                />
                            )}
                        </>
                    )}
                </>
            )}

            {/* Project Type Picker Dialog */}
            <ProjectTypePickerDialog
                open={isTypePickerOpen}
                onClose={() => setIsTypePickerOpen(false)}
                onSelect={handleTypeSelected}
            />

            {/* Project Creation Dialog */}
            <Suspense fallback={null}>
                <ProjectCreationDialog
                    open={isDialogOpen}
                    onClose={handleCloseDialog}
                    orgId={orgId}
                    workspaceId={workspaceId || ''}
                    onProjectCreated={handleProjectCreated}
                />
            </Suspense>

            {/* Project Update Dialog */}
            <Suspense fallback={null}>
                <ProjectUpdateDialog
                    open={isUpdateDialogOpen}
                    onClose={() => {
                        setIsUpdateDialogOpen(false);
                        setSelectedProject(null);
                    }}
                    project={selectedProject}
                    onProjectUpdated={handleProjectUpdated}
                />
            </Suspense>

            <Suspense fallback={null}>
                <WorkspaceMembersDialog
                    open={membersDialogOpen}
                    onClose={handleMembersDialogClose}
                    workspaceId={workspaceId || ''}
                    orgId={orgId}
                />
            </Suspense>

            {/* Archive Confirmation Dialog */}
            <ConfirmationDialog
                open={archiveDialogOpen}
                title="Archive Project"
                message={`Are you sure you want to archive "${selectedProject?.name}"? You can restore it later from archived projects.`}
                confirmText="Archive"
                cancelText="Cancel"
                confirmColor="warning"
                onConfirm={handleArchiveConfirm}
                onCancel={() => {
                    setArchiveDialogOpen(false);
                    setSelectedProject(null);
                }}
                loading={actionLoading}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteDialogOpen}
                title="Delete Project"
                message={`Are you sure you want to permanently delete "${selectedProject?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                confirmColor="error"
                onConfirm={handleDeleteConfirm}
                onCancel={() => {
                    setDeleteDialogOpen(false);
                    setSelectedProject(null);
                }}
                loading={actionLoading}
            />

            {/* No Project Manager Dialog */}
            <ConfirmationDialog
                open={noProjectManagerDialogOpen}
                title="Project Manager Required"
                message="To create a project, you need at least one user with the 'Project Manager' role in this workspace. Please add a Project Manager from 'Manage Members' before proceeding."
                confirmText="Manage Members"
                cancelText="Cancel"
                confirmColor="primary"
                onConfirm={() => {
                    setNoProjectManagerDialogOpen(false);
                    setMembersDialogOpen(true);
                }}
                onCancel={() => {
                    setNoProjectManagerDialogOpen(false);
                }}
                loading={false}
            />

        </Box>
    );
};

/**
 * Component: WorkspaceProjects
 *
 * Purpose: Thin wrapper that renders `WorkspaceProjectsContent` inside a
 * `PageErrorBoundary`, so an unexpected render error is contained and shown
 * as a page-level fallback instead of crashing the whole app.
 */
const WorkspaceProjects = () => {
    return (
        <PageErrorBoundary pageName="Workspace Projects">
            <WorkspaceProjectsContent />
        </PageErrorBoundary>
    );
};

export default WorkspaceProjects;
