import * as React from 'react';
import {
    Box,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Chip,
    Menu,
    MenuItem,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    CircularProgress,
    Skeleton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { selectUser } from '../../redux/slices/loginSlice';
import { deleteWorkspace, fetchWorkspaces } from '../../redux/slices/workspaceSlice';
import { selectCurrentOrganization } from '../../redux/slices/organizationSlice';
import { getUserRole, hasPermission } from '../../utils/roles';
import { useToast } from '../../hooks/useToast';

// MUI Icons (closest matches)
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import LockIcon from '@mui/icons-material/Lock';
import HubIcon from '@mui/icons-material/Hub';
import PublicIcon from '@mui/icons-material/Public';
import ShareIcon from '@mui/icons-material/Share';
import ExpandedRowContent from './ExpandedRowContent';

const WorkspaceEditDialog = React.lazy(() => import('../common/WorkspaceEditDialog'));

/**
 * Formats a workspace's project count into a pluralized display label,
 * preferring the numeric `projectCount` field and falling back to a
 * pre-formatted/legacy `projects` value when the count isn't available.
 * @param projectCount - numeric project count from the API, if present.
 * @param projects - legacy/pre-formatted projects value used as a fallback.
 * @returns A display string like "3 projects" or "1 project".
 */
function formatProjectCount(projectCount: number | undefined, projects: any): string {
    if (projectCount !== undefined) {
        const unit = projectCount === 1 ? 'project' : 'projects';
        return `${projectCount} ${unit}`;
    }
    return projects || '0 projects';
}

/**
 * Formats a workspace's member count into a pluralized display label.
 * Tries the primary `memberCount` field first, then an alternate field name
 * (`member_count`), then falls back to a legacy pre-formatted `members` value.
 * @param memberCount - numeric member count (camelCase field), if present.
 * @param memberCountAlt - numeric member count (snake_case field), if present.
 * @param members - legacy/pre-formatted members value used as a final fallback.
 * @returns A display string like "5 members" or "1 member".
 */
function formatMemberCount(memberCount: number | undefined, memberCountAlt: number | undefined, members: any): string {
    if (memberCount !== undefined) {
        const unit = memberCount === 1 ? 'member' : 'members';
        return `${memberCount} ${unit}`;
    }
    if (memberCountAlt !== undefined) {
        const unit = memberCountAlt === 1 ? 'member' : 'members';
        return `${memberCountAlt} ${unit}`;
    }
    return members || '0 members';
}

interface ListViewProps {
    readonly workspaces?: any[];
    readonly isLoading?: boolean;
}

/**
 * Component: ListView
 *
 * Purpose: Renders workspaces as an expandable data table (one row per
 * workspace) with inline actions to open, edit, or delete a workspace, and an
 * expandable sub-row showing that workspace's projects.
 *
 * Responsibilities:
 * - Derive display rows from the raw `workspaces` prop (name, type, visibility,
 *   formatted project/member counts).
 * - Gate Edit/Delete actions behind the current user's role permissions.
 * - Manage row expansion, the row actions menu, and the edit/delete dialogs.
 * - Dispatch workspace deletion and refresh the workspace list afterward.
 * - Show a skeleton loading state and an empty state when there are no workspaces.
 *
 * Props:
 * - `workspaces` - optional array of workspace objects (loosely typed as `any[]`).
 * - `isLoading` - whether the parent is still loading workspace data (drives skeleton rows).
 *
 * State:
 * - `expandedRows` (`Set<string>`) - ids of workspace rows currently expanded to show projects.
 * - `workspaceEditDialogOpen` (`boolean`) - whether the lazy-loaded edit dialog is open.
 * - `workspaceToEdit` (`any`) - the workspace object currently being edited.
 * - `deleteConfirmOpen` (`boolean`) - whether the delete confirmation dialog is open.
 * - `workspaceToDelete` (`{ id, name } | null`) - the workspace targeted for deletion.
 * - `isDeleting` (`boolean`) - whether a delete request is in flight (disables dialog actions).
 * - `menuAnchor` (`HTMLElement | null`) - anchor element for the row actions menu.
 * - `menuRowId` (`string | null`) - id of the row whose actions menu is open.
 *
 * Redux selectors/actions used:
 * - `selectUser` (loginSlice) - current logged-in user, used to compute role/permissions.
 * - `selectCurrentOrganization` (organizationSlice) - current org, used to scope the workspace refresh.
 * - `deleteWorkspace` (workspaceSlice thunk) - deletes a workspace by id.
 * - `fetchWorkspaces` (workspaceSlice thunk) - reloads the workspace list for the current org after edit/delete.
 *
 * Custom hooks used: `useNavigate` (react-router-dom), `useToast` (`showSuccess`/`showError`).
 *
 * API calls made: via `deleteWorkspace` and `fetchWorkspaces` thunks (workspaceSlice), which call the
 * workspace endpoints through the shared axios `client`.
 *
 * Major child components rendered: `ExpandedRowContent` (project sub-rows), lazily-loaded
 * `WorkspaceEditDialog`, MUI `Table`/`Menu`/`Dialog` primitives.
 *
 * Business logic:
 * - Edit and Delete menu items are conditionally rendered (not just disabled) based on
 *   `hasPermission(userRole, 'canCreateWorkspace')`, per this app's RBAC convention.
 * - Visibility icon (lock/public/share/hub) is derived from `row.visibility` the same way
 *   across `ListView`, `KanbanView`, and `GanttView` for consistency.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function ListView(props: Readonly<ListViewProps>) {
    const { workspaces = [], isLoading = false } = props;

    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { showSuccess, showError } = useToast();

    // Get user role and permissions
    const user = useAppSelector(selectUser);
    const currentOrganization = useAppSelector(selectCurrentOrganization);
    // useMemo: avoids recomputing role/permission checks on every render unless
    // the underlying user or role actually changes.
    const userRole = React.useMemo(() => getUserRole(user), [user]);
    const canEditWorkspace = React.useMemo(() => hasPermission(userRole, 'canCreateWorkspace'), [userRole]);
    const canDeleteWorkspace = React.useMemo(() => hasPermission(userRole, 'canCreateWorkspace'), [userRole]);

    // derive rows from workspaces passed from Dashboard
    // Why: incoming workspace objects can use either new API field names
    // (workspace_type, visibility, projectCount) or legacy/mock field names
    // (type, badgeLabel, collapsible.typeChip); each row falls back through
    // both so the table renders correctly regardless of data source.
    const rows = workspaces.map((w) => ({
        id: w.title,
        workspaceId: w.id,
        name: w.title,
        description: w.description || w.desc || '',
        type: w.workspace_type || w.type || w.collapsible?.typeChip || '',
        visibility: w.visibility || w.badgeLabel || 'Private',
        projects: formatProjectCount(w.projectCount, w.projects),
        members: formatMemberCount(w.memberCount, w.member_count, w.members),
        color: w.color ?? '#3B82F6',
        projectCount: w.projectCount,
        projectsData: w.projects || [],
        membersData: w.members || [],
    }));

    // Expansion state
    const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

    // Edit/Delete dialog states
    const [workspaceEditDialogOpen, setWorkspaceEditDialogOpen] = React.useState(false);
    const [workspaceToEdit, setWorkspaceToEdit] = React.useState<any>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    const [workspaceToDelete, setWorkspaceToDelete] = React.useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = React.useState(false);

    /**
     * Toggles whether a given workspace row is expanded to show its projects.
     * @param rowId - the row's `id` (workspace title) to toggle.
     */
    const toggleRowExpansion = (rowId: string) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(rowId)) {
                newSet.delete(rowId);
            } else {
                newSet.add(rowId);
            }
            return newSet;
        });
    };

    // Actions menu state
    const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
    const [menuRowId, setMenuRowId] = React.useState<string | null>(null);
    const menuOpen = Boolean(menuAnchor);

    /**
     * Opens the per-row actions menu anchored to the clicked element.
     * @param event - the triggering mouse event, used to anchor the menu.
     * @param rowId - id of the row the menu was opened for.
     */
    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, rowId: string) => {
        setMenuAnchor(event.currentTarget as HTMLElement);
        setMenuRowId(rowId);
    };

    /** Closes the row actions menu and clears which row it was open for. */
    const handleCloseMenu = () => {
        setMenuAnchor(null);
        setMenuRowId(null);
    };

    // Action handlers
    /** Navigates to the workspace dashboard for the row the actions menu is open on. */
    const handleOpenWorkspace = () => {
        if (menuRowId) {
            const row = rows.find((r) => r.id === menuRowId);
            if (row?.workspaceId) {
                navigate(`/workspace-dashboard/${row.workspaceId}`);
            }
        }
        handleCloseMenu();
    };

    /** Opens the (lazily-loaded) workspace edit dialog for the row the actions menu is open on. */
    const handleEditWorkspace = () => {
        if (menuRowId) {
            const row = rows.find((r) => r.id === menuRowId);
            if (row?.workspaceId) {
                const workspace = workspaces.find((w) => w.id === row.workspaceId);
                if (workspace) {
                    setWorkspaceToEdit(workspace);
                    setWorkspaceEditDialogOpen(true);
                }
            }
        }
        handleCloseMenu();
    };

    /** Opens the delete confirmation dialog for the row the actions menu is open on. */
    const handleDeleteWorkspace = () => {
        if (menuRowId) {
            const row = rows.find((r) => r.id === menuRowId);
            if (row?.workspaceId) {
                const workspace = workspaces.find((w) => w.id === row.workspaceId);
                if (workspace) {
                    setWorkspaceToDelete({ id: row.workspaceId, name: row.name });
                    setDeleteConfirmOpen(true);
                }
            }
        }
        handleCloseMenu();
    };

    /**
     * Confirms deletion of `workspaceToDelete`: dispatches the `deleteWorkspace`
     * thunk, shows a success/error toast, and refreshes the workspace list for
     * the current organization on success. Always closes the confirmation
     * dialog and resets deletion state in the `finally` block.
     * @throws Displays (does not rethrow) any error from the delete thunk via `showError`.
     */
    const handleConfirmDelete = async () => {
        if (!workspaceToDelete) return;

        setIsDeleting(true);
        try {
            await dispatch(deleteWorkspace(workspaceToDelete.id)).unwrap();
            showSuccess(`Workspace "${workspaceToDelete.name}" deleted successfully`);

            // Refresh workspaces list
            if (currentOrganization?._id) {
                dispatch(fetchWorkspaces({ org_id: currentOrganization._id }) as any);
            }
        } catch (error: any) {
            showError(error || 'Failed to delete workspace');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setWorkspaceToDelete(null);
        }
    };

    /** Cancels the pending delete and closes the confirmation dialog without deleting. */
    const handleCancelDelete = () => {
        setDeleteConfirmOpen(false);
        setWorkspaceToDelete(null);
    };

    /** Closes the workspace edit dialog and clears the workspace being edited. */
    const handleWorkspaceEditDialogClose = () => {
        setWorkspaceEditDialogOpen(false);
        setWorkspaceToEdit(null);
    };

    /** Callback for a successful edit: reloads the workspace list for the current organization. */
    const handleWorkspaceUpdated = () => {
        // Refresh workspaces list after update
        if (currentOrganization?._id) {
            dispatch(fetchWorkspaces({ org_id: currentOrganization._id }) as any);
        }
    };

    return (
        <Box
            sx={{
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 2, // rounded-lg
            }}
        >
            <TableContainer
                data-slot="table-container"
                sx={{
                    position: 'relative',
                    width: '100%',
                    overflowX: 'auto',
                }}
            >
                <Table
                    data-slot="table"
                    size="small"
                    sx={{
                        width: '100%',
                        '& caption': { captionSide: 'bottom' }, // caption-bottom
                        fontSize: '0.875rem', // text-sm feel
                    }}
                >
                    <TableHead
                        data-slot="table-header"
                        sx={{
                            '& tr': {
                                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                            },
                        }}
                    >
                        <TableRow
                            data-slot="table-row"
                            sx={{
                                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                                transition: 'background-color 150ms ease',
                                '&:hover': {
                                    backgroundColor: (theme) =>
                                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', // muted/50 approx
                                },
                            }}
                        >
                            <TableCell
                                data-slot="table-head"
                                sx={{
                                    color: 'text.primary',
                                    height: 40, // h-10
                                    px: 1, // px-2
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                    width: 48, // w-12
                                }}
                            />
                            <TableCell
                                data-slot="table-head"
                                sx={{
                                    color: 'text.primary',
                                    height: 40,
                                    px: 1,
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Workspace Name
                            </TableCell>
                            <TableCell
                                data-slot="table-head"
                                sx={{
                                    color: 'text.primary',
                                    height: 40,
                                    px: 1,
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Type
                            </TableCell>
                            <TableCell
                                data-slot="table-head"
                                sx={{
                                    color: 'text.primary',
                                    height: 40,
                                    px: 1,
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Visibility
                            </TableCell>
                            <TableCell
                                data-slot="table-head"
                                sx={{
                                    color: 'text.primary',
                                    height: 40,
                                    px: 1,
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Projects
                            </TableCell>
                            <TableCell
                                data-slot="table-head"
                                sx={{
                                    color: 'text.primary',
                                    height: 40,
                                    px: 1,
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Members
                            </TableCell>
                            <TableCell
                                data-slot="table-head"
                                align="right"
                                sx={{
                                    color: 'text.primary',
                                    height: 40,
                                    px: 1,
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody data-slot="table-body">
                        {isLoading && rows.length === 0
                            ? Array.from({ length: 5 }).map((_, i) => (
                                  <TableRow key={i}>
                                      <TableCell sx={{ p: 1 }}>
                                          <Skeleton variant="circular" width={32} height={32} />
                                      </TableCell>
                                      <TableCell sx={{ p: 1 }}>
                                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                              <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 1.5, flexShrink: 0 }} />
                                              <Box>
                                                  <Skeleton variant="text" width={140} height={18} />
                                                  <Skeleton variant="text" width={200} height={14} />
                                              </Box>
                                          </Box>
                                      </TableCell>
                                      <TableCell sx={{ p: 1 }}><Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: 1 }} /></TableCell>
                                      <TableCell sx={{ p: 1 }}><Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: 1 }} /></TableCell>
                                      <TableCell sx={{ p: 1 }}><Skeleton variant="text" width={80} height={18} /></TableCell>
                                      <TableCell sx={{ p: 1 }}><Skeleton variant="text" width={80} height={18} /></TableCell>
                                      <TableCell sx={{ p: 1 }} align="right"><Skeleton variant="circular" width={32} height={32} /></TableCell>
                                  </TableRow>
                              ))
                            : rows.map((row) => (
                            <React.Fragment key={row.id}>
                                <TableRow
                                    data-slot="table-row"
                                    sx={{
                                        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                                        transition: 'background-color 150ms ease',
                                        '&:hover': {
                                            backgroundColor: (theme) =>
                                                theme.palette.mode === 'dark'
                                                    ? 'rgba(255,255,255,0.06)'
                                                    : 'rgba(0,0,0,0.04)', // hover:bg-muted/50
                                        },
                                        "&[data-state='selected']": {
                                            backgroundColor: (theme) => theme.palette.action.selected, // selected state
                                        },
                                    }}
                                >
                                    {/* Chevron button */}
                                    <TableCell
                                        data-slot="table-cell"
                                        sx={{ p: 1, whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                                    >
                                        <IconButton
                                            size="small"
                                            onClick={() => toggleRowExpansion(row.id)}
                                            sx={{
                                                width: 32,
                                                height: 32, // h-8 w-8
                                                borderRadius: 1, // rounded-md
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: 16,
                                                    pointerEvents: 'none',
                                                    flexShrink: 0,
                                                    transition: 'transform 150ms ease',
                                                    transform: expandedRows.has(row.id)
                                                        ? 'rotate(90deg)'
                                                        : 'rotate(0deg)',
                                                },
                                                '&:hover': {
                                                    bgcolor: (theme) =>
                                                        theme.palette.mode === 'dark'
                                                            ? 'rgba(144,202,249,0.12)'
                                                            : 'rgba(25,118,210,0.08)', // hover:bg-accent
                                                },
                                                '&:focusVisible': {
                                                    boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}80`, // ring/[3px]
                                                    outline: 'none',
                                                },
                                            }}
                                            aria-label={
                                                expandedRows.has(row.id) ? `Collapse ${row.name}` : `Expand ${row.name}`
                                            }
                                            aria-expanded={expandedRows.has(row.id)}
                                        >
                                            <ChevronRightIcon />
                                        </IconButton>
                                    </TableCell>

                                    {/* Workspace name + description */}
                                    <TableCell
                                        data-slot="table-cell"
                                        sx={{ p: 1, whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                cursor: 'pointer',
                                                '&:hover .title': { color: 'primary.main' }, // hover:text-primary
                                            }}
                                        >
                                            {/* Square icon container */}
                                            <Box
                                                sx={{
                                                    height: 32,
                                                    width: 32,
                                                    borderRadius: 1.5, // rounded-lg
                                                    bgcolor: row.color,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {/* Maps workspace visibility to a representative icon; unrecognized
                                                    visibility falls back to the generic "hub" icon. */}
                                                {(function getIcon() {
                                                    const v = (row.visibility || '').toString().toLowerCase();
                                                    if (v === 'private')
                                                        return <LockIcon sx={{ fontSize: 16, color: '#fff' }} />;
                                                    if (v === 'public')
                                                        return <PublicIcon sx={{ fontSize: 16, color: '#fff' }} />;
                                                    if (v === 'shareable')
                                                        return <ShareIcon sx={{ fontSize: 16, color: '#fff' }} />;
                                                    return <HubIcon sx={{ fontSize: 16, color: '#fff' }} />;
                                                })()}
                                            </Box>

                                            <Box sx={{ minWidth: 0, maxWidth: 250 }}>
                                                <Typography
                                                    className="title"
                                                    variant="body2"
                                                    sx={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {row.name}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        color: 'text.secondary',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        display: 'block',
                                                    }}
                                                >
                                                    {row.description}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>

                                    {/* Type badge */}
                                    <TableCell
                                        data-slot="table-cell"
                                        sx={{ p: 1, whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                                    >
                                        <Chip
                                            data-slot="badge"
                                            label={row.type}
                                            size="small"
                                            sx={{
                                                fontSize: '0.75rem', // text-xs
                                                fontWeight: 500,
                                                borderRadius: 1, // rounded-md
                                                bgcolor: (theme) =>
                                                    theme.palette.mode === 'dark'
                                                        ? 'rgba(255,255,255,0.10)'
                                                        : 'rgba(0,0,0,0.06)', // bg-secondary
                                                color: 'text.primary',
                                                borderColor: 'transparent',
                                            }}
                                        />
                                    </TableCell>

                                    {/* Visibility badge */}
                                    <TableCell
                                        data-slot="table-cell"
                                        sx={{ p: 1, whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                                    >
                                        <Chip
                                            data-slot="badge"
                                            size="small"
                                            /* Same visibility -> icon mapping as above, but defaults to
                                               the lock icon (private) rather than the hub icon. */
                                            icon={(function getBadgeIcon() {
                                                const v = (row.visibility || '').toString().toLowerCase();
                                                if (v === 'private') return <LockIcon sx={{ fontSize: 14 }} />;
                                                if (v === 'public') return <PublicIcon sx={{ fontSize: 14 }} />;
                                                if (v === 'shareable') return <ShareIcon sx={{ fontSize: 14 }} />;
                                                return <LockIcon sx={{ fontSize: 14 }} />;
                                            })()}
                                            label={row.visibility}
                                            variant="outlined"
                                            sx={{
                                                fontSize: '0.75rem', // text-xs
                                                fontWeight: 500,
                                                borderRadius: 1,
                                                '&:hover': {
                                                    bgcolor: (theme) =>
                                                        theme.palette.mode === 'dark'
                                                            ? 'rgba(255,255,255,0.06)'
                                                            : 'rgba(0,0,0,0.04)', // [a]:hover:bg-accent
                                                },
                                            }}
                                        />
                                    </TableCell>

                                    {/* Projects */}
                                    <TableCell
                                        data-slot="table-cell"
                                        sx={{ p: 1, whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                                    >
                                        {row.projects}
                                    </TableCell>

                                    {/* Members */}
                                    <TableCell
                                        data-slot="table-cell"
                                        sx={{ p: 1, whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                                    >
                                        {row.members}
                                    </TableCell>

                                    {/* Actions (menu trigger) */}
                                    <TableCell
                                        data-slot="table-cell"
                                        align="right"
                                        sx={{ p: 1, whiteSpace: 'nowrap', verticalAlign: 'middle' }}
                                    >
                                        <IconButton
                                            id={`actions-${row.id}`}
                                            aria-haspopup="menu"
                                            aria-expanded={menuOpen && menuRowId === row.id ? 'true' : 'false'}
                                            onClick={(e) => handleOpenMenu(e, row.id)}
                                            size="small"
                                            sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 1,
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: 16,
                                                    pointerEvents: 'none',
                                                    flexShrink: 0,
                                                },
                                                '&:hover': {
                                                    bgcolor: (theme) =>
                                                        theme.palette.mode === 'dark'
                                                            ? 'rgba(144,202,249,0.12)'
                                                            : 'rgba(25,118,210,0.08)',
                                                },
                                                '&:focusVisible': {
                                                    boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}80`,
                                                    outline: 'none',
                                                },
                                            }}
                                        >
                                            <MoreHorizIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>

                                {/* Expandable row */}
                                {expandedRows.has(row.id) && (
                                    <TableRow
                                        data-slot="table-row"
                                        sx={{
                                            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                                            transition: 'background-color 150ms ease',
                                            bgcolor: (theme) =>
                                                theme.palette.mode === 'dark'
                                                    ? 'rgba(255,255,255,0.03)'
                                                    : 'rgba(0,0,0,0.02)',
                                        }}
                                    >
                                        <TableCell data-slot="table-cell" colSpan={7} sx={{ p: 0 }}>
                                            <ExpandedRowContent
                                                workspace={workspaces.find((w) => w.id === row.workspaceId)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>

                {/* Actions Menu */}
                <Menu
                    anchorEl={menuAnchor}
                    open={menuOpen}
                    onClose={handleCloseMenu}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                    <MenuItem onClick={handleOpenWorkspace}>Open</MenuItem>
                    {canEditWorkspace && <MenuItem onClick={handleEditWorkspace}>Edit</MenuItem>}
                    {canDeleteWorkspace && (
                        <MenuItem onClick={handleDeleteWorkspace} sx={{ color: 'error.main' }}>
                            Delete
                        </MenuItem>
                    )}
                </Menu>

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={deleteConfirmOpen}
                    onClose={isDeleting ? undefined : handleCancelDelete}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>Delete Workspace</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to delete the workspace <strong>"{workspaceToDelete?.name}"</strong>?
                            This action cannot be undone and will permanently remove all associated data.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button onClick={handleCancelDelete} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            color="error"
                            variant="contained"
                            disabled={isDeleting}
                            startIcon={isDeleting ? <CircularProgress size={16} /> : undefined}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Workspace Edit Dialog */}
                {workspaceEditDialogOpen && (
                    <React.Suspense fallback={<CircularProgress />}>
                        <WorkspaceEditDialog
                            open={workspaceEditDialogOpen}
                            onClose={handleWorkspaceEditDialogClose}
                            workspace={workspaceToEdit}
                            onSuccess={handleWorkspaceUpdated}
                        />
                    </React.Suspense>
                )}
            </TableContainer>

            {/* No workspaces message */}
            {!isLoading && workspaces.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Typography variant="h6" color="text.secondary">
                        No workspaces found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Create a new workspace to get started
                    </Typography>
                </Box>
            )}
        </Box>
    );
}
