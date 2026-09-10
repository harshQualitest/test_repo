import { useMemo, useState, useEffect } from 'react';
import { Box, Stack, Typography, Pagination, TextField, InputAdornment, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { useDebounce } from '../interfaces/hooks/useDebounce';
import { selectUser } from '../redux/slices/loginSlice';
import { getUserRole, ROLES } from '../utils/roles';
import HubIcon from '@mui/icons-material/Hub';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import MetricsGrid from '../components/dashboard/metrics-cards';
import { WorkSpaceViewTypes } from '../components/dashboard/workspace-view-types';
import WidgetView from '../components/dashboard/WidgetView';
import ListView from '../components/dashboard/ListView';
import GanttView from '../components/dashboard/GanttView';
import KanbanView from '../components/dashboard/KanbanView';
import { workspaceColors } from '../constants/workspace-colors';
import { 
    selectWorkspaces, 
    fetchWorkspaces,
    selectWorkspaceLoading,
    selectWorkspaceTotalCount,
} from '../redux/slices/workspaceSlice';
import { 
    selectCurrentOrganization,
    fetchOrganizationDashboard,
    selectOrganizationDashboardMetrics,
    selectDashboardMetricsLoading,
} from '../redux/slices/organizationSlice';

/**
 * Component: Dashboard
 *
 * Purpose: Main organization dashboard for admins/managers — shows summary
 * metrics (workspaces, projects, members) and a searchable, paginated view of
 * the organization's workspaces in one of four layouts (widget/list/gantt/kanban).
 *
 * Responsibilities:
 * - Fetch and paginate workspaces for the current organization, with debounced search.
 * - Fetch organization-level dashboard metrics (counts) separately from the workspace list.
 * - Let the user switch between widget/list/gantt/kanban views of the same data.
 * - Reset back to page 1 whenever the organization or search term changes.
 *
 * Props: none.
 *
 * State:
 * - `selectedView` — which layout ('widget' | 'list' | 'gantt' | 'kanban') is active.
 * - `currentPage` — 1-based current page of the workspace list.
 * - `searchQuery` — raw (un-debounced) search input value.
 *
 * Custom hooks: `useDebounce` (src/interfaces/hooks/useDebounce.ts) — delays the
 * search term by 500ms before it triggers a fetch, to avoid a request per keystroke.
 *
 * Redux:
 * - workspaceSlice: `fetchWorkspaces`, `selectWorkspaces`, `selectWorkspaceLoading`, `selectWorkspaceTotalCount`.
 * - organizationSlice: `selectCurrentOrganization`, `fetchOrganizationDashboard`,
 *   `selectOrganizationDashboardMetrics`, `selectDashboardMetricsLoading`.
 * - loginSlice: `selectUser` (used to derive `isSuperAdmin` via `getUserRole`).
 *
 * Major child components: `MetricsGrid`, `WorkSpaceViewTypes`, `WidgetView`,
 * `ListView`, `GanttView`, `KanbanView`.
 *
 * Side effects: see the three `useEffect` hooks below (workspace fetch, metrics
 * fetch, and page-reset-on-filter-change).
 *
 * Business logic: the "Total Members" metric card is only shown to Super Admins
 * (see `isSuperAdmin` gating the `allMetrics` array below).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const Dashboard = () => {
    const dispatch = useAppDispatch();
    const [selectedView, setSelectedView] = useState<'widget' | 'list' | 'gantt' | 'kanban'>('widget');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const itemsPerPage = 10;

    // Debounce search query with 500ms delay
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    // Get workspaces and pagination state from Redux
    const workspacesFromRedux = useAppSelector(selectWorkspaces);
    const currentOrganization = useAppSelector(selectCurrentOrganization);
    const isLoading = useAppSelector(selectWorkspaceLoading);
    const totalCount = useAppSelector(selectWorkspaceTotalCount);
    const dashboardMetrics = useAppSelector(selectOrganizationDashboardMetrics);
    const dashboardMetricsLoading = useAppSelector(selectDashboardMetricsLoading);
    const user = useAppSelector(selectUser);
    // Gates the "Total Members" metric card to Super Admins only (see `metrics` below).
    const isSuperAdmin = getUserRole(user) === ROLES.SUPER_ADMIN;

    // Fetch workspaces when organization, page, or debounced search query changes
    useEffect(() => {
        if (currentOrganization?._id) {
            const offset = (currentPage - 1) * itemsPerPage;
            dispatch(fetchWorkspaces({ 
                org_id: currentOrganization._id, 
                limit: itemsPerPage, 
                offset,
                search: debouncedSearchQuery || undefined 
            }));
        }
    }, [currentOrganization, dispatch, currentPage, itemsPerPage, debouncedSearchQuery]);

    // Fetch organization dashboard metrics when organization changes
    useEffect(() => {
        if (currentOrganization?._id) {
            dispatch(fetchOrganizationDashboard(currentOrganization._id));
        }
    }, [currentOrganization?._id, dispatch]);

    // Reset to page 1 when organization or debounced search query changes
    // Prevents landing on an out-of-range page after switching org/search context.
    useEffect(() => {
        setCurrentPage(1);
    }, [currentOrganization?._id, debouncedSearchQuery]);


    // Handle page change
    /** Handles MUI Pagination page changes: updates the page and scrolls back to top. */
    const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle search
    /** Updates the raw search input as the user types; the debounced value drives the actual fetch. */
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
    };

    /** Clears the search field, triggered by the input's clear ("x") button. */
    const handleClearSearch = () => {
        setSearchQuery('');
    };

    // Calculate pagination info
    const totalPages = totalCount > 0 ? Math.ceil(totalCount / itemsPerPage) : 1;
    const startItem = workspacesFromRedux.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0;
    const endItem = workspacesFromRedux.length > 0 ? ((currentPage - 1) * itemsPerPage) + workspacesFromRedux.length : 0;

    // Transform Redux workspaces to match dashboard format
    // Memoized because this remapping runs on every render otherwise and feeds
    // multiple view components (Widget/List/Gantt/Kanban) that would each re-render
    // on a new array reference even when the underlying workspace data hasn't changed.
    const workspaces = useMemo(() => {
        return workspacesFromRedux.map((workspace) => ({
            ...workspace,
            id: workspace._id,
            title: workspace.name,
            desc: workspace.description,
            type: workspace.workspace_type,
            colorScheme: workspace.color_scheme || 'blue',
            memberCount: workspace.members?.length || workspace.member_count || workspace.memberCount || 0,
            projectCount: workspace.projects?.length || 0,
            projects: workspace.projects || [],
            members: workspace.members || [],
            badgeLabel: workspace.visibility || 'Private',
        }));
    }, [workspacesFromRedux]);

    // Calculate metrics from organization dashboard API response
    // Memoized so the metric-card array (and its icon components) isn't rebuilt
    // on unrelated re-renders — only when the underlying metrics/loading/role change.
    const metrics = useMemo(() => {
        const workspaceCount = dashboardMetrics?.workspace_count ?? 0;
        const projectCount = dashboardMetrics?.project_count ?? 0;
        const memberCount = dashboardMetrics?.org_member_count ?? 0;

        // Super Admins additionally see an org-wide member count card; other roles don't.
        const allMetrics = [
            {
                title: 'Total Workspaces',
                value: dashboardMetricsLoading ? '—' : workspaceCount.toString(),
                subtitle: `${workspaceCount} total available`,
                Icon: HubIcon,
                iconSx: { color: '#3B82F6' },
            },
            {
                title: 'Total Projects',
                value: dashboardMetricsLoading ? '—' : projectCount.toString(),
                subtitle: `Across ${workspaceCount} workspaces`,
                Icon: FolderOpenIcon,
                iconSx: { color: '#A855F7' },
                hoverable: true,
                projectBreakdown: {
                    active: dashboardMetrics?.active_project_count ?? 0,
                    archived: dashboardMetrics?.archived_project_count ?? 0,
                    draft: dashboardMetrics?.draft_project_count ?? 0,
                },
            },
            ...(isSuperAdmin ? [{
                title: 'Total Members',
                value: dashboardMetricsLoading ? '—' : memberCount.toString(),
                subtitle: 'Active organization members',
                Icon: TaskAltIcon,
                iconSx: { color: '#F59E0B' },
                hoverable: true,
            }] : []),
        ];

        return allMetrics;
    }, [dashboardMetrics, dashboardMetricsLoading, isSuperAdmin]);

    return (
        <Box sx={{ 
            px: { xs: 2, md: 3 }, 
            py: 2, 
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            overflow: 'hidden',
        }}>
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                sx={{ mb: 2 }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                        AI Data Services Organization Insights
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#807a7a', mt: 0 }}>
                        Welcome back! Here's an overview of your data management platform.
                    </Typography>
                </Box>
            </Stack>

            {/* <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                sx={{ mt: 2 }}
            >
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 500 }}>
                        AI Data Services Workspaces
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#807a7a', mt: 0 }}>
                        Quick access to your assigned workspaces
                    </Typography>
                </Box>
            </Stack> */}

            {/* Search Bar */}
            <Box sx={{ mb: 3 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search workspaces by name, description, or type..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                        endAdornment: searchQuery && (
                            <InputAdornment position="end">
                                <IconButton
                                    size="small"
                                    onClick={handleClearSearch}
                                    edge="end"
                                    aria-label="clear search"
                                >
                                    <ClearIcon />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: 'background.paper',
                        },
                    }}
                />
            </Box>

             {/* metrics grid */}
            <Box>
              <MetricsGrid metrics={metrics} columns={metrics.length} loading={dashboardMetricsLoading} />
            </Box>

            <WorkSpaceViewTypes selectedView={selectedView} onViewChange={setSelectedView} />

            {/* widget view */}
            {selectedView === 'widget' && (
                <>
                    <WidgetView 
                        workspaces={workspaces} 
                        workspaceColors={workspaceColors}
                        isLoading={isLoading}
                    />
                    {workspaces.length > 0 && (
                        <Box sx={{ mt: 4, mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                Showing {startItem}-{endItem} of {totalCount} workspaces
                            </Typography>
                            <Pagination 
                                count={totalPages} 
                                page={currentPage} 
                                onChange={handlePageChange}
                                color="primary"
                                size="large"
                                showFirstButton
                                showLastButton
                                disabled={isLoading}
                            />
                        </Box>
                    )}
                </>
            )}

            {/* list view */}
            {selectedView === 'list' && (
                <>
                    <ListView 
                        workspaces={workspaces}
                        isLoading={isLoading}
                    />
                    {workspaces.length > 0 && (
                        <Box sx={{ mt: 3, mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                Showing {startItem}-{endItem} of {totalCount} workspaces
                            </Typography>
                            <Pagination 
                                count={totalPages} 
                                page={currentPage} 
                                onChange={handlePageChange}
                                color="primary"
                                size="large"
                                showFirstButton
                                showLastButton
                                disabled={isLoading}
                            />
                        </Box>
                    )}
                </>
            )}

            {/* gantt view */}
            {selectedView === 'gantt' && <GanttView workspaces={workspaces} />}

            {/* kanban view */}
            {selectedView === 'kanban' && <KanbanView workspaces={workspaces} />}

            {/* filters */}

        </Box>
    );
};

export default Dashboard;

