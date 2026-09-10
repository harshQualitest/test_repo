import {
    Box,
    Drawer,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Collapse,
    Divider,
    Button,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
    alpha,
    useTheme,
} from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import {
    selectOrganizations,
    selectCurrentOrganization,
    fetchOrganizations,
    setCurrentOrganization,
} from '../../redux/slices/organizationSlice';
import {
    deleteWorkspace,
    fetchNavWorkspaces,
    fetchMoreNavWorkspaces,
    selectNavWorkspaces,
    selectNavWorkspaceLoading,
    selectNavWorkspaceHasMore,
    selectNavLoadMoreLoading,
    selectNavCurrentOffset,
    selectNavCurrentLimit,
} from '../../redux/slices/workspaceSlice';
import { selectUser } from '../../redux/slices/loginSlice';
import { getUserRole, canAccessNavSection, NAV_SECTIONS, hasPermission } from '../../utils/roles';
import { useToast } from '../../hooks/useToast';
import OrganisationDialog from '../common/OrganisationDialog';
import WorkspaceCreateDialog from '../common/WorkspaceCreateDialog';
import WorkspaceEditDialog from '../common/WorkspaceEditDialog';
import { Workspaces } from '@mui/icons-material';

type SidenavProps = {
    width: number;
    variant: 'permanent' | 'temporary';
    open: boolean;
    onClose: () => void;
};

// Navigation structure
const overviewItems = [
    { label: 'Dashboard', icon: <DashboardOutlinedIcon />, route: '/' },
    // { label: 'Analytics', icon: <AnalyticsOutlinedIcon />, route: '/analytics' },
];

const settingsItems = [
    { label: 'Users', icon: <PersonOutlineIcon />, route: '/users' },
    // { label: 'Teams', icon: <GroupsOutlinedIcon />, route: '/teams' },
    // { label: 'Projects', icon: <FolderOutlinedIcon />, route: '/projects' },
    { label: 'Email Templates', icon: <EmailOutlinedIcon />, route: '/email-templates' },
    // { label: 'Ontologies', icon: <CategoryOutlinedIcon />, route: '/ontologies' },
    // { label: 'Project Tags', icon: <LabelOutlinedIcon />, route: '/project-tags' },
];

/**
 * Component: Sidenav
 *
 * Purpose: Primary application navigation drawer. Renders the current
 * organization, a role-gated "Overview" section, the list of workspaces
 * (paginated with "Load More"), a role-gated "Organization Settings" section,
 * and the dialogs/menus needed to create/edit/delete workspaces.
 *
 * Responsibilities:
 * - Load organizations and auto-select the first one if none is active.
 * - Load the current organization's workspaces (nav-specific, paginated
 *   separately from the Dashboard's own workspace list) and support
 *   "load more" pagination.
 * - Highlight the active nav item based on the current route.
 * - Gate the Overview section, Settings section, and workspace create/edit/
 *   delete affordances by role/permission (see business logic below).
 * - Manage the create-organization, create-workspace, edit-workspace dialogs
 *   and the workspace actions menu (edit/delete) and its delete-confirmation dialog.
 *
 * Props:
 * - `width: number` — drawer width in pixels.
 * - `variant: 'permanent' | 'temporary'` — permanent (desktop, always visible)
 *   vs temporary (mobile, overlay that can be closed).
 * - `open: boolean` — controls visibility for the `temporary` variant.
 * - `onClose: () => void` — closes the drawer (temporary variant only).
 *
 * State:
 * - `selectedIndex: string` — key of the currently highlighted nav item
 *   (route slug or workspace id); kept in sync with the URL via a useEffect.
 * - `settingsOpen: boolean` — whether the collapsible "Organization Settings"
 *   section is expanded.
 * - `orgDialogOpen`, `workspaceDialogOpen`, `workspaceEditDialogOpen: boolean`
 *   — visibility of the create-organization, create-workspace, and
 *   edit-workspace dialogs respectively.
 * - `workspaceToEdit: any` — workspace record passed to the edit dialog.
 * - `workspaceMenuAnchor: { element, workspaceId } | null` — anchor + target
 *   workspace id for the per-workspace actions menu (edit/delete); non-null
 *   while that menu is open.
 * - `deleteConfirmOpen: boolean` / `workspaceToDelete: { id, name } | null`
 *   — controls the delete-confirmation dialog and which workspace it targets.
 * - `isDeleting: boolean` — in-flight state for the delete action (disables
 *   dialog buttons while the delete request is pending).
 *
 * Redux:
 * - `selectUser` (loginSlice) — current user, used to derive role/permissions.
 * - `organizationSlice`: `selectOrganizations`, `selectCurrentOrganization`;
 *   thunks `fetchOrganizations`, action `setCurrentOrganization`.
 * - `workspaceSlice` (nav-specific selectors/thunks): `selectNavWorkspaces`,
 *   `selectNavWorkspaceLoading`, `selectNavWorkspaceHasMore`,
 *   `selectNavLoadMoreLoading`, `selectNavCurrentOffset`, `selectNavCurrentLimit`;
 *   thunks `fetchNavWorkspaces`, `fetchMoreNavWorkspaces`, `deleteWorkspace`.
 *
 * Custom hooks: `useToast` (showSuccess/showError for workspace delete feedback).
 *
 * API calls: all via Redux thunks above (`fetchOrganizations`, `fetchNavWorkspaces`,
 * `fetchMoreNavWorkspaces`, `deleteWorkspace`) — no direct service calls in this file.
 *
 * Major child components: `Drawer`, `List`/`ListItemButton` (nav items and
 * workspaces), `Menu` (workspace actions), `Dialog` (delete confirmation),
 * `OrganisationDialog`, `WorkspaceCreateDialog`, `WorkspaceEditDialog`.
 *
 * Business logic / RBAC:
 * - `canViewOverview`: hidden entirely for `reviewer` and `annotator` roles
 *   regardless of what `canAccessNavSection` returns — annotators/reviewers
 *   share the same restricted navigation and should not see the Overview
 *   section at all.
 * - `canViewSettings`: only `super_admin` sees the "Organization Settings" section.
 * - `canAddWorkspace`: gated by `hasPermission(userRole, 'canCreateWorkspace')`;
 *   controls both the "Add Workspace" button and the per-workspace edit/delete
 *   menu affordance (conditionally rendered out, not merely disabled, per
 *   project RBAC convention).
 * - The sidenav background color adapts to the currently selected workspace's
 *   `color_scheme` (see `currentWorkspaceColor` below) for visual context.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const Sidenav = ({ width, variant, open, onClose }: SidenavProps) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const location = useLocation();
    const [selectedIndex, setSelectedIndex] = useState<string>('dashboard');
    const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
    const [orgDialogOpen, setOrgDialogOpen] = useState<boolean>(false);
    const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState<boolean>(false);
    const [workspaceEditDialogOpen, setWorkspaceEditDialogOpen] = useState<boolean>(false);
    const [workspaceToEdit, setWorkspaceToEdit] = useState<any>(null);
    // Anchor element + target workspace id for the per-workspace actions menu (edit/delete)
    const [workspaceMenuAnchor, setWorkspaceMenuAnchor] = useState<{
        element: HTMLElement;
        workspaceId: string;
    } | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [workspaceToDelete, setWorkspaceToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Get current user from Redux
    const user = useAppSelector(selectUser);
    const { showSuccess, showError } = useToast();

    // Get user role and permissions - memoized for performance
    // Recomputed only when the Redux user object changes, since role derivation
    // is used by several other memoized permission checks below.
    const userRole = useMemo(() => getUserRole(user), [user]);

    // Permission checks using the roles utility
    // RBAC rule: reviewers and annotators are intentionally excluded from the
    // Overview section (they use a reduced/shared navigation), overriding
    // whatever canAccessNavSection would otherwise return for those roles.
    const canViewOverview = useMemo(() => {
        // Exclude reviewers and annotators from viewing overview - they should have same navigation
        if (userRole === 'reviewer' || userRole === 'annotator') {
            return false;
        }
        return canAccessNavSection(userRole, NAV_SECTIONS.OVERVIEW);
    }, [userRole]);

    // RBAC rule: Organization Settings section is super-admin only.
    const canViewSettings = useMemo(() => userRole === 'super_admin', [userRole]);
    // RBAC rule: gates both the "Add Workspace" button and the per-workspace edit/delete menu.
    const canAddWorkspace = useMemo(() => hasPermission(userRole, 'canCreateWorkspace'), [userRole]);

    // Get organizations from Redux
    const organizations = useAppSelector(selectOrganizations);
    const currentOrganization = useAppSelector(selectCurrentOrganization);

    // Get nav workspaces from Redux (separate from Dashboard pagination state)
    const workspaces = useAppSelector(selectNavWorkspaces);
    const workspaceLoading = useAppSelector(selectNavWorkspaceLoading);
    const hasMoreWorkspaces = useAppSelector(selectNavWorkspaceHasMore);
    const loadMoreLoading = useAppSelector(selectNavLoadMoreLoading);
    const currentOffset = useAppSelector(selectNavCurrentOffset);
    const currentLimit = useAppSelector(selectNavCurrentLimit);

    // Load organizations on component mount
    // Guarded by organizations.length so it only fetches once (skips refetching
    // on re-renders once the list is populated).
    useEffect(() => {
        if (organizations.length === 0) {
            dispatch(fetchOrganizations());
        }
    }, [dispatch, organizations.length]);

    // Set first organization as current if none selected
    // Runs whenever organizations or the current selection changes; picks a
    // sensible default so the sidenav never renders with no active organization.
    useEffect(() => {
        if (organizations.length > 0 && !currentOrganization) {
            dispatch(setCurrentOrganization(organizations[0]));
        }
    }, [organizations, currentOrganization, dispatch]);

    // Fetch nav workspaces when current organization changes
    // Re-runs whenever the active organization switches, so the workspace list
    // always reflects the currently selected organization.
    useEffect(() => {
        if (currentOrganization?._id) {
            dispatch(fetchNavWorkspaces({ org_id: currentOrganization._id, limit: 10, offset: 0 }));
        }
    }, [currentOrganization, dispatch]);

    // Sync selectedIndex with current route
    // Keeps the highlighted nav item consistent with browser navigation
    // (back/forward, direct links) rather than relying solely on click handlers.
    useEffect(() => {
        const path = location.pathname;

        // Check if it's a workspace route
        if (path.startsWith('/workspace/')) {
            const workspaceId = path.split('/')[2];
            if (workspaceId) {
                setSelectedIndex(workspaceId);
                return;
            }
        }

        // Map routes to their selectedIndex values
        const routeMap: Record<string, string> = {
            '/': 'dashboard',
            '/analytics': 'analytics',
            '/users': 'users',
            '/email-templates': 'email templates',
            '/settings': 'settings',
        };

        const index = routeMap[path];
        if (index) {
            setSelectedIndex(index);
        }
    }, [location.pathname]);

    /**
     * Marks a nav item/workspace as the active selection (used for highlight styling).
     * @param itemKey - Route slug (e.g. 'dashboard') or workspace id.
     */
    const handleListItemClick = (itemKey: string) => {
        setSelectedIndex(itemKey);
    };

    /** Expands/collapses the "Organization Settings" section. */
    const handleSettingsToggle = () => {
        setSettingsOpen(!settingsOpen);
    };

    /** Opens the create-workspace dialog. */
    const handleAddWorkspace = () => {
        setWorkspaceDialogOpen(true);
    };

    /** Closes the create-organization dialog. */
    const handleOrganizationDialogClose = () => {
        setOrgDialogOpen(false);
    };

    /** Closes the create-workspace dialog. */
    const handleWorkspaceDialogClose = () => {
        setWorkspaceDialogOpen(false);
    };

    /** Success callback for OrganisationDialog: refetches the organizations list. */
    const handleOrganizationCreated = () => {
        // Refresh organizations after creation
        dispatch(fetchOrganizations());
    };

    /**
     * Success callback for WorkspaceCreateDialog: refetches the nav workspaces
     * list for the current organization so the new workspace appears.
     * @param _workspaceData - Created workspace payload (unused; refetch covers it).
     */
    const handleWorkspaceCreated = (_workspaceData: any) => {
        // Refresh nav workspaces list after creation
        if (currentOrganization?._id) {
            dispatch(fetchNavWorkspaces({ org_id: currentOrganization._id, limit: 10, offset: 0 }));
        }
    };

    /** Closes the edit-workspace dialog and clears the workspace being edited. */
    const handleWorkspaceEditDialogClose = () => {
        setWorkspaceEditDialogOpen(false);
        setWorkspaceToEdit(null);
    };

    /**
     * Success callback for WorkspaceEditDialog: refetches the nav workspaces
     * list so edited fields (e.g. name, color) are reflected immediately.
     * @param _workspaceData - Updated workspace payload (unused; refetch covers it).
     */
    const handleWorkspaceUpdated = (_workspaceData: any) => {
        // Refresh nav workspaces list after update
        if (currentOrganization?._id) {
            dispatch(fetchNavWorkspaces({ org_id: currentOrganization._id, limit: 10, offset: 0 }));
        }
    };

    /**
     * Opens the per-workspace actions menu (edit/delete), anchored to the
     * clicked "more" icon button. Stops propagation so it doesn't also
     * trigger the parent `Link`'s navigation.
     * @param event - Click event from the workspace's "more" icon button.
     * @param workspaceId - Id of the workspace the menu applies to.
     */
    const handleWorkspaceMenuOpen = (event: React.MouseEvent<HTMLElement>, workspaceId: string) => {
        event.preventDefault();
        event.stopPropagation();
        setWorkspaceMenuAnchor({ element: event.currentTarget, workspaceId });
    };

    /** Closes the per-workspace actions menu. */
    const handleWorkspaceMenuClose = () => {
        setWorkspaceMenuAnchor(null);
    };

    /**
     * Opens the edit-workspace dialog for the workspace targeted by the
     * currently open actions menu, then closes that menu.
     */
    const handleEditWorkspace = () => {
        const workspaceId = workspaceMenuAnchor?.workspaceId;
        if (workspaceId) {
            const workspace = workspaces.find((w) => w._id === workspaceId);
            if (workspace) {
                setWorkspaceToEdit(workspace);
                setWorkspaceEditDialogOpen(true);
            }
        }
        handleWorkspaceMenuClose();
    };

    /**
     * Opens the delete-confirmation dialog for the workspace targeted by the
     * currently open actions menu, then closes that menu.
     */
    const handleDeleteWorkspace = () => {
        const workspaceId = workspaceMenuAnchor?.workspaceId;
        if (workspaceId) {
            const workspace = workspaces.find((w) => w._id === workspaceId);
            if (workspace) {
                setWorkspaceToDelete({ id: workspaceId, name: workspace.name });
                setDeleteConfirmOpen(true);
            }
        }
        handleWorkspaceMenuClose();
    };

    /**
     * Confirms deletion of `workspaceToDelete`: dispatches `deleteWorkspace`,
     * shows a success/error toast, refreshes the nav workspaces list on
     * success, and always resets the dialog/deleting state in `finally`.
     */
    const handleConfirmDelete = async () => {
        if (!workspaceToDelete) return;

        setIsDeleting(true);
        try {
            await dispatch(deleteWorkspace(workspaceToDelete.id)).unwrap();
            showSuccess(`Workspace "${workspaceToDelete.name}" deleted successfully`);

            // Refresh nav workspaces list
            if (currentOrganization?._id) {
                dispatch(fetchNavWorkspaces({ org_id: currentOrganization._id, limit: 10, offset: 0 }));
            }
        } catch (error: any) {
            showError(error || 'Failed to delete workspace');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setWorkspaceToDelete(null);
        }
    };

    /** Dismisses the delete-confirmation dialog without deleting anything. */
    const handleCancelDelete = () => {
        setDeleteConfirmOpen(false);
        setWorkspaceToDelete(null);
    };

    /**
     * Fetches the next page of workspaces for the current organization,
     * appending to the existing nav workspaces list. No-ops while a
     * load-more request is already in flight (`loadMoreLoading`).
     */
    const handleLoadMoreWorkspaces = () => {
        if (currentOrganization?._id && !loadMoreLoading) {
            dispatch(fetchMoreNavWorkspaces({ 
                org_id: currentOrganization._id, 
                offset: currentOffset,
                limit: currentLimit 
            }));
        }
    };

    /**
     * Maps a workspace's stored `color_scheme` name to its hex color, used to
     * theme the workspace's icon and (via `currentWorkspaceColor`) the drawer background.
     * @param colorScheme - Named color scheme stored on the workspace record.
     * @returns Hex color string, falling back to the theme's primary color if unmapped.
     */
    // Color scheme mapping for workspace icons
    const getWorkspaceColor = (colorScheme: string) => {
        const colorMap: Record<string, string> = {
            blue: '#1976d2',
            green: '#388e3c',
            purple: '#7b1fa2',
            orange: '#f57c00',
            red: '#d32f2f',
            teal: '#00796b',
            indigo: '#303f9f',
            pink: '#c2185b',
        };
        return colorMap[colorScheme] || theme.palette.primary.main;
    };

    // Get current workspace color for sidenav background
    // Recomputed when the selection or workspaces list changes; falls back to
    // the theme's primary color when no workspace is currently selected.
    const currentWorkspaceColor = useMemo(() => {
        const selectedWorkspace = workspaces.find((w) => w._id === selectedIndex);
        if (selectedWorkspace) {
            return getWorkspaceColor(selectedWorkspace.color_scheme || 'blue');
        }
        return theme.palette.primary.main;
    }, [selectedIndex, workspaces, theme.palette.primary.main]);

    /**
     * Renders the workspaces list body: a loading message, an empty-state
     * message, or the list of workspace nav items (each with an optional
     * edit/delete "more" menu trigger gated by `canAddWorkspace`).
     * @returns JSX for the current workspaces list state.
     */
    const renderWorkspacesList = () => {
        if (workspaceLoading) {
            return (
                <Typography
                    variant="body2"
                    sx={{
                        color: 'text.secondary',
                        pl: 2,
                        py: 1,
                        fontSize: '0.75rem',
                    }}
                >
                    Loading workspaces...
                </Typography>
            );
        }

        if (workspaces.length === 0) {
            return (
                <Typography
                    variant="body2"
                    sx={{
                        color: 'text.secondary',
                        pl: 2,
                        py: 1,
                        fontSize: '0.75rem',
                    }}
                >
                    No workspaces found
                </Typography>
            );
        }

        return workspaces.map((workspace) => {
            const isActive = selectedIndex === workspace?._id;
            const workspaceColor = getWorkspaceColor(workspace.color_scheme || 'blue');

            return (
                <Box key={workspace?._id} sx={{ position: 'relative' }}>
                    <Link to={`/workspace/${workspace?._id}`} style={{ textDecoration: 'none' }}>
                        <ListItemButton
                            sx={{
                                borderRadius: 1.5,
                                mb: 0.5,
                                py: 1,
                                pl: 1.5,
                                pr: 0.5,
                                backgroundColor: isActive ? alpha(workspaceColor, 0.12) : 'transparent',
                                color: isActive ? workspaceColor : theme.palette.text.primary,
                                '&:hover': {
                                    backgroundColor: alpha(workspaceColor, 0.08),
                                },
                            }}
                            onClick={() => handleListItemClick(workspace._id)}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 36,
                                    color: workspaceColor,
                                }}
                            >
                                <Workspaces />
                            </ListItemIcon>
                            <ListItemText
                                primary={workspace.name}
                                sx={{
                                    '& .MuiListItemText-primary': {
                                        fontSize: '0.875rem',
                                        fontWeight: isActive ? 600 : 400,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    },
                                }}
                            />
                            {/* Per-workspace edit/delete trigger - only rendered for users permitted to manage workspaces */}
                            {canAddWorkspace && (
                                <IconButton
                                    size="small"
                                    onClick={(e) => handleWorkspaceMenuOpen(e, workspace._id)}
                                    sx={{
                                        ml: 'auto',
                                        opacity: 0.6,
                                        '&:hover': {
                                            opacity: 1,
                                            backgroundColor: alpha(workspaceColor, 0.15),
                                        },
                                    }}
                                >
                                    <MoreVertIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            )}
                        </ListItemButton>
                    </Link>
                </Box>
            );
        });
    };

    return (
        <Drawer
            variant={variant}
            open={open}
            onClose={onClose}
            ModalProps={{ keepMounted: true }}
            sx={{
                width,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width,
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    background:
                        theme.palette.mode === 'light'
                            ? alpha(currentWorkspaceColor, 0.12)
                            : alpha(currentWorkspaceColor, 0.25),
                    backdropFilter: 'blur(24px)',
                    padding: theme.spacing(2),
                    boxShadow:
                        theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.6)' : '0 4px 20px rgba(0,0,0,0.1)',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    transition: 'background 0.3s ease-in-out',
                    // Hide scrollbar for Chrome, Safari and Opera
                    '&::-webkit-scrollbar': {
                        display: 'none',
                    },
                    // Hide scrollbar for IE, Edge and Firefox
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                },
            }}
        >
            {/* Header with Logo and Close Button */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 3,
                }}
            >
                {variant === 'temporary' && (
                    <IconButton
                        onClick={onClose}
                        size="small"
                        sx={{
                            backgroundColor: alpha(theme.palette.background.paper, 0.9),
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.background.paper, 1),
                            },
                        }}
                    >
                        <ChevronLeftRoundedIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {/* Organization Section */}
            <Box sx={{ mb: 3 }}>
                {/* Current Organization Display */}
                <Box
                    sx={{
                        borderRadius: 1.5,
                        mb: 1,
                        py: 1.5,
                        px: 1.5,
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <Box sx={{ minWidth: 40, display: 'flex', alignItems: 'center' }}>
                        <CorporateFareIcon
                            sx={{
                                width: 32,
                                height: 32,
                                color: theme.palette.primary.main,
                            }}
                        />
                    </Box>
                    <Typography
                        sx={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: theme.palette.text.primary,
                            flex: 1,
                        }}
                    >
                        {currentOrganization?.name || 'Organization'}
                    </Typography>
                </Box>
            </Box>

            {/* Navigation Sections */}
            <Box
                sx={{
                    flex: 1,
                    overflow: 'auto',
                    // Hide scrollbar for Chrome, Safari and Opera
                    '&::-webkit-scrollbar': {
                        display: 'none',
                    },
                    // Hide scrollbar for IE, Edge and Firefox
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                }}
            >
                {/* Overview Section - Role-based visibility */}
                {canViewOverview && (
                    <Box sx={{ mb: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{
                                color: theme.palette.text.secondary,
                                mb: 1,
                                pl: 1,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            Overview
                        </Typography>
                        <List sx={{ p: 0 }}>
                            {overviewItems.map((item) => {
                                const isActive = selectedIndex === item.label.toLowerCase();
                                return (
                                    <Link to={item.route} key={item.label} style={{ textDecoration: 'none' }}>
                                        <ListItemButton
                                            sx={{
                                                borderRadius: 1.5,
                                                mb: 0.5,
                                                py: 1,
                                                px: 1.5,
                                                backgroundColor: isActive
                                                    ? alpha(theme.palette.primary.main, 0.12)
                                                    : 'transparent',
                                                color: isActive
                                                    ? theme.palette.primary.main
                                                    : theme.palette.text.primary,
                                                '&:hover': {
                                                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                                },
                                            }}
                                            onClick={() => handleListItemClick(item.label.toLowerCase())}
                                        >
                                            <ListItemIcon
                                                sx={{
                                                    minWidth: 36,
                                                    color: 'inherit',
                                                }}
                                            >
                                                {item.icon}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={item.label}
                                                sx={{
                                                    '& .MuiListItemText-primary': {
                                                        fontSize: '0.875rem',
                                                        fontWeight: isActive ? 600 : 400,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    },
                                                }}
                                            />
                                        </ListItemButton>
                                    </Link>
                                );
                            })}
                        </List>
                    </Box>
                )}

                {/* Workspaces Section */}
                <Box sx={{ mb: 2 }}>
                    {/* Workspaces List */}
                    <Typography
                        variant="body2"
                        sx={{
                            color: theme.palette.text.secondary,
                            mb: 1,
                            pl: 1,
                            mt: 2,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                        }}
                    >
                        Workspaces
                    </Typography>
                    <List sx={{ p: 0 }}>{renderWorkspacesList()}</List>
                    {/* Load More Button - Show when more workspaces are available */}
                    {hasMoreWorkspaces && (
                        <Button
                            fullWidth
                            onClick={handleLoadMoreWorkspaces}
                            disabled={loadMoreLoading}
                            sx={{
                                mt: 1,
                                py: 0.75,
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: theme.palette.text.secondary,
                                textTransform: 'none',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                '&:hover': {
                                    color: theme.palette.primary.main,
                                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                },
                            }}
                            size="small"
                        >
                            {loadMoreLoading ? 'Loading...' : 'Load More'}
                        </Button>
                    )}

                    {/* Add Workspace Button - Role-based visibility */}
                    {canAddWorkspace && (
                        <Button
                            fullWidth
                            startIcon={<AddIcon />}
                            onClick={handleAddWorkspace}
                            sx={{
                                mt: 1,
                                py: 0.75,
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: theme.palette.text.secondary,
                                borderColor: alpha(theme.palette.divider, 0.5),
                                textTransform: 'none',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                    color: theme.palette.primary.main,
                                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                },
                            }}
                            variant="outlined"
                            size="small"
                        >
                            Add Workspace
                        </Button>
                    )}

                    
                </Box>

                {/* Settings Section - Role-based visibility */}
                {canViewSettings && (
                    <>
                        <Divider sx={{ my: 2 }} />

                        {/* Settings Section (Expandable) */}
                        <Box>
                            <ListItemButton
                                onClick={handleSettingsToggle}
                                sx={{
                                    borderRadius: 1.5,
                                    mb: 0.5,
                                    py: 1,
                                    px: 1.5,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 36,
                                        color: theme.palette.text.primary,
                                    }}
                                >
                                    <SettingsOutlinedIcon />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Organization Settings"
                                    sx={{
                                        '& .MuiListItemText-primary': {
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: theme.palette.text.primary,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        },
                                    }}
                                />
                                {settingsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </ListItemButton>
                            <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
                                <List sx={{ pl: 2, py: 0 }}>
                                    {settingsItems.map((item) => {
                                        const isActive = selectedIndex === item.label.toLowerCase();
                                        return (
                                            <Link to={item.route} key={item.label} style={{ textDecoration: 'none' }}>
                                                <ListItemButton
                                                    sx={{
                                                        borderRadius: 1.5,
                                                        mb: 0.5,
                                                        py: 0.75,
                                                        px: 1.5,
                                                        backgroundColor: isActive
                                                            ? alpha(theme.palette.primary.main, 0.12)
                                                            : 'transparent',
                                                        color: isActive
                                                            ? theme.palette.primary.main
                                                            : theme.palette.text.secondary,
                                                        '&:hover': {
                                                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                                        },
                                                    }}
                                                    onClick={() => handleListItemClick(item.label.toLowerCase())}
                                                >
                                                    <ListItemIcon
                                                        sx={{
                                                            minWidth: 32,
                                                            color: 'inherit',
                                                        }}
                                                    >
                                                        {item.icon}
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={item.label}
                                                        sx={{
                                                            '& .MuiListItemText-primary': {
                                                                fontSize: '0.8rem',
                                                                fontWeight: isActive ? 600 : 400,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            },
                                                        }}
                                                    />
                                                </ListItemButton>
                                            </Link>
                                        );
                                    })}
                                </List>
                            </Collapse>
                        </Box>
                    </>
                )}
            </Box>

            {/* Workspace Actions Menu */}
            <Menu
                anchorEl={workspaceMenuAnchor?.element}
                open={Boolean(workspaceMenuAnchor)}
                onClose={handleWorkspaceMenuClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                slotProps={{
                    paper: {
                        sx: {
                            minWidth: 160,
                            borderRadius: 2,
                            boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.15)}`,
                        },
                    },
                }}
            >
                {/* Edit/Delete menu items - reuse the workspace-create permission since both are workspace-management actions */}
                {canAddWorkspace && (
                    <MenuItem
                        onClick={handleEditWorkspace}
                        sx={{
                            fontSize: '0.875rem',
                            py: 1,
                            px: 2,
                            gap: 1.5,
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            },
                        }}
                    >
                        <EditOutlinedIcon sx={{ fontSize: 18 }} />
                        Edit Workspace
                    </MenuItem>
                )}
                {canAddWorkspace && (
                    <MenuItem
                        onClick={handleDeleteWorkspace}
                        sx={{
                            fontSize: '0.875rem',
                            py: 1,
                            px: 2,
                            gap: 1.5,
                            color: theme.palette.error.main,
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.error.main, 0.08),
                            },
                        }}
                    >
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                        Delete Workspace
                    </MenuItem>
                )}
            </Menu>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={isDeleting ? undefined : handleCancelDelete}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 2,
                            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.2)}`,
                        },
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 600, fontSize: '1.25rem' }}>Delete Workspace</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the workspace <strong>"{workspaceToDelete?.name}"</strong>? This
                        action cannot be undone and all associated data will be permanently removed.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={handleCancelDelete}
                        disabled={isDeleting}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 500,
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        variant="contained"
                        color="error"
                        disabled={isDeleting}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            minWidth: 100,
                        }}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Organization Dialog */}
            <OrganisationDialog
                open={orgDialogOpen}
                onClose={handleOrganizationDialogClose}
                onSuccess={handleOrganizationCreated}
            />

            {/* Workspace Dialog */}
            <WorkspaceCreateDialog
                open={workspaceDialogOpen}
                onClose={handleWorkspaceDialogClose}
                onSuccess={handleWorkspaceCreated}
            />

            {/* Workspace Edit Dialog */}
            <WorkspaceEditDialog
                open={workspaceEditDialogOpen}
                onClose={handleWorkspaceEditDialogClose}
                workspace={workspaceToEdit}
                onSuccess={handleWorkspaceUpdated}
            />
        </Drawer>
    );
};

export default Sidenav;
