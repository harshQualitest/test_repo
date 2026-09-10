import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { alpha } from '@mui/material/styles';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
    addUsersToWorkspace,
    fetchWorkspaceById,
    fetchWorkspaceMembers,
    removeUsersFromWorkspace,
    fetchUserWorkspaceProjects,
    clearUserWorkspaceProjects,
    selectCurrentWorkspace,
    selectWorkspaceLoading,
    selectWorkspaceMemberActionLoading,
    selectWorkspaceMembersLoading,
    selectWorkspaceMembers,
    selectUserWorkspaceProjects,
    selectUserWorkspaceProjectsLoading,
    selectWorkspaceMembersTotal,
    selectWorkspaceMembersLimit,
    selectWorkspaceMembersOffset,
} from '../../redux/slices/workspaceSlice';
import { fetchUsers, selectUsers, selectUserLoading, type User } from '../../redux/slices/userSlice';
import { useToast } from '../../hooks/useToast';
import {
    fetchEmailTemplates,
    selectDefaultEmailTemplate,
    selectEmailTemplateLoading,
    selectEmailTemplates,
} from '../../redux/slices/emailTemplateSlice';
import WorkspaceMembersTable from './WorkspaceMembersTable';
import WorkspaceInviteForm from './WorkspaceInviteForm';
import RemoveMemberConfirmDialog from './RemoveMemberConfirmDialog';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FilterListIcon from '@mui/icons-material/FilterList';
import Chip from '@mui/material/Chip';
import { useDebounce } from '../../interfaces/hooks/useDebounce';
import TablePagination from '@mui/material/TablePagination';

export interface WorkspaceMemberRow {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface WorkspaceMembersDialogProps {
    open: boolean;
    onClose: () => void;
    workspaceId: string;
    orgId?: string;
}

/**
 * Component: WorkspaceMembersDialog
 *
 * Purpose: Primary dialog for managing a workspace's membership — viewing,
 * searching, filtering, paginating, bulk-removing existing members (Members
 * tab), and inviting new organization users (Invite tab).
 *
 * Responsibilities:
 * - "Members" tab: fetches the workspace's members (server-paginated,
 *   searchable, role-filterable) and renders them via `WorkspaceMembersTable`,
 *   supporting single and bulk removal with a confirmation step.
 * - "Invite" tab: renders `WorkspaceInviteForm` for selecting an email
 *   template and candidate users, then dispatches `addUsersToWorkspace`.
 * - Coordinates a `RemoveMemberConfirmDialog` that shows the projects a
 *   member-to-be-removed is currently assigned to, fetched on demand.
 *
 * Props:
 * - open (boolean): whether the dialog is visible.
 * - onClose (() => void): called to dismiss the dialog.
 * - workspaceId (string): the workspace whose members are being managed.
 * - orgId (string, optional): organization id, required for add/remove mutations.
 *
 * State:
 * - tabValue (0 | 1): active tab (0 = Members, 1 = Invite).
 * - selectedUsers (User[]): users chosen in the Invite tab to be added.
 * - selectedMemberIds (Set<string>): member ids checked for bulk removal.
 * - addingMembers (boolean): whether an add-members request is in flight.
 * - removingUserId (string | null): id of the member being removed, or 'bulk'
 *   during a bulk removal, used to show per-row/bulk loading state.
 * - templateId (string): email template selected for new invitations.
 * - confirmTarget (WorkspaceMemberRow | null): member currently targeted by the
 *   remove-confirmation dialog.
 * - memberSearch / debouncedMemberSearch (string): raw and debounced search text for the members list.
 * - memberFilterOpen (boolean): whether the members-list role filter panel is expanded.
 * - selectedRole ('all' | RoleValue | ''): active role filter for the members list.
 * - page / rowsPerPage (number): pagination state for the members table.
 *
 * Redux: reads `selectCurrentWorkspace`, `selectWorkspaceLoading`,
 * `selectWorkspaceMemberActionLoading`, `selectWorkspaceMembersLoading`,
 * `selectWorkspaceMembers`, `selectWorkspaceMembersTotal/Limit/Offset`,
 * `selectUserWorkspaceProjects(Loading)` (workspaceSlice); `selectUsers`,
 * `selectUserLoading` (userSlice); `selectEmailTemplates`,
 * `selectEmailTemplateLoading`, `selectDefaultEmailTemplate` (emailTemplateSlice).
 * Dispatches `fetchWorkspaceById`, `fetchWorkspaceMembers`,
 * `addUsersToWorkspace`, `removeUsersFromWorkspace`,
 * `fetchUserWorkspaceProjects`, `clearUserWorkspaceProjects`, `fetchUsers`,
 * `fetchEmailTemplates`.
 *
 * Custom hooks: `useToast` for success/error notifications; `useDebounce` for the member search box.
 *
 * Side effects:
 * - On open: loads the workspace, a default page of org users, email
 *   templates, and the first page of workspace members.
 * - Reloads members (resetting to page 0) whenever the debounced search or
 *   role filter changes.
 * - Keeps local pagination state (`page`/`rowsPerPage`) in sync with the
 *   store's reported offset/limit after any members fetch.
 * - Resets all local dialog state when the dialog closes.
 * - Auto-selects a default email template once one becomes available.
 *
 * Major child components: `WorkspaceMembersTable`, `WorkspaceInviteForm`, `RemoveMemberConfirmDialog`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const WorkspaceMembersDialog = ({ open, onClose, workspaceId, orgId }: WorkspaceMembersDialogProps) => {
    const dispatch = useAppDispatch();
    const toast = useToast();

    const currentWorkspace = useAppSelector(selectCurrentWorkspace);
    const workspaceLoading = useAppSelector(selectWorkspaceLoading);
    const memberActionLoading = useAppSelector(selectWorkspaceMemberActionLoading);
    const workspaceMembersLoading = useAppSelector(selectWorkspaceMembersLoading);
    const workspaceMembers = useAppSelector(selectWorkspaceMembers);
    const membersTotal = useAppSelector(selectWorkspaceMembersTotal);
    const membersLimit = useAppSelector(selectWorkspaceMembersLimit);
    const membersOffset = useAppSelector(selectWorkspaceMembersOffset);
    const users = useAppSelector(selectUsers);
    const userLoading = useAppSelector(selectUserLoading);
    const emailTemplates = useAppSelector(selectEmailTemplates);
    const emailTemplateLoading = useAppSelector(selectEmailTemplateLoading);
    const defaultEmailTemplate = useAppSelector(selectDefaultEmailTemplate);
    const confirmProjects = useAppSelector(selectUserWorkspaceProjects);
    const confirmProjectsLoading = useAppSelector(selectUserWorkspaceProjectsLoading);

    const [tabValue, setTabValue] = useState<0 | 1>(0);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [addingMembers, setAddingMembers] = useState(false);
    const [removingUserId, setRemovingUserId] = useState<string | null>(null);
    const [templateId, setTemplateId] = useState('');
    const [confirmTarget, setConfirmTarget] = useState<WorkspaceMemberRow | null>(null);
    // Search and filters for members list
    const [memberSearch, setMemberSearch] = useState('');
    const debouncedMemberSearch = useDebounce(memberSearch, 400);
    const [memberFilterOpen, setMemberFilterOpen] = useState(false);
    const ROLE_OPTIONS = [
        { value: 'annotator', label: 'Annotator' },
        { value: 'reviewer', label: 'Reviewer' },
        { value: 'project_manager', label: 'Project Manager' },
        { value: 'workspace_manager', label: 'Workspace Manager' },
    ] as const;
    type RoleValue = (typeof ROLE_OPTIONS)[number]['value'];
    const [selectedRole, setSelectedRole] = useState<'all' | RoleValue | ''>('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(10);

    // Initial data load when the dialog opens for a given workspace: workspace
    // details, a starter page of org users (for the Invite tab), email
    // templates, and the first page of workspace members.
    useEffect(() => {
        if (open && workspaceId) {
            dispatch(fetchWorkspaceById(workspaceId));
            dispatch(fetchUsers({ pageSize: 10 }));
            dispatch(fetchEmailTemplates());
            // initial members load
            setPage(0);
            setRowsPerPage(10);
            dispatch(fetchWorkspaceMembers({ workspaceId, limit: 10, offset: 0 }));
        }
    }, [dispatch, open, workspaceId]);

    // Reload members when search or role filter changes (debounced)
    useEffect(() => {
        if (open && workspaceId) {
            // reset to first page on search/filter change
            setPage(0);
            dispatch(
                fetchWorkspaceMembers({
                    workspaceId,
                    search: debouncedMemberSearch || undefined,
                    filter: selectedRole && selectedRole !== 'all' ? selectedRole : undefined,
                    limit: rowsPerPage,
                    offset: 0,
                }),
            );
        }
    }, [dispatch, open, workspaceId, debouncedMemberSearch, selectedRole]);

    // Keep local page in sync with store offset/limit
    // Runs whenever the store reports a new offset/limit (e.g. after a fetch
    // triggered elsewhere), deriving the equivalent page index so the
    // TablePagination control stays accurate without duplicating fetch logic.
    useEffect(() => {
        if (membersLimit > 0) {
            const derivedPage = Math.floor(membersOffset / membersLimit);
            setPage(derivedPage);
            setRowsPerPage(membersLimit);
        }
    }, [membersOffset, membersLimit]);

    // Resets all local dialog state (tab, selections, in-flight flags, confirm
    // target) whenever the dialog closes, so reopening starts fresh.
    useEffect(() => {
        if (!open) {
            setTabValue(0);
            setSelectedUsers([]);
            setSelectedMemberIds(new Set());
            setRemovingUserId(null);
            setAddingMembers(false);
            setTemplateId('');
            setConfirmTarget(null);
            dispatch(clearUserWorkspaceProjects());
        }
    }, [open]);

    // Auto-selects a default email template (the org's default, else the
    // first available) once templates are loaded and none has been chosen yet.
    useEffect(() => {
        if (open && !templateId) {
            const inferredTemplateId = defaultEmailTemplate?._id || emailTemplates[0]?._id;
            if (inferredTemplateId) setTemplateId(inferredTemplateId);
        }
    }, [defaultEmailTemplate, emailTemplates, templateId, open]);

    // Normalizes the raw member records (which vary in shape between the
    // dedicated members fetch and the workspace's embedded `members` array)
    // into a consistent `WorkspaceMemberRow` shape; recomputed only when the
    // underlying member lists change.
    const existingMembers: WorkspaceMemberRow[] = useMemo(() => {
        const membersSource = workspaceMembers.length ? workspaceMembers : (currentWorkspace?.members ?? []);

        return membersSource
            .map((member) => {
                const memberId = member.user?._id || member.user_id || member._id;
                if (!memberId) return null;
                const displayName =
                    member.user?.name ||
                    member.user?.username ||
                    member.user?.email ||
                    member.username ||
                    member.email ||
                    member.user_id ||
                    'Workspace Member';
                const email = member.user?.email || member.email || '---';
                const role = member.role || member.user?.role || 'member';
                return { id: memberId, name: displayName, email, role };
            })
            .filter((member): member is WorkspaceMemberRow => member !== null);
    }, [currentWorkspace?.members, workspaceMembers]);

    // Filter members based on search and selected role filter
    // Applies an additional client-side pass over the (server-already-filtered)
    // `existingMembers` using the same search/role criteria, so the UI stays
    // responsive to the debounced text even between server round-trips.
    const filteredMembers = useMemo(() => {
        const q = String(debouncedMemberSearch || '')
            .trim()
            .toLowerCase();
        return existingMembers.filter((member) => {
            const matchesSearch =
                !q ||
                (member.name || '').toLowerCase().includes(q) ||
                (member.email || '').toLowerCase().includes(q) ||
                (member.role || '').toLowerCase().includes(q);
            const matchesRole = !selectedRole || selectedRole === 'all' || (member.role || '') === selectedRole;
            return matchesSearch && matchesRole;
        });
    }, [existingMembers, debouncedMemberSearch, selectedRole]);

    // Selection helpers for table header checkbox
    // const filteredIds = useMemo(() => filteredMembers.map((m) => m.id), [filteredMembers]);

    // Keep selectedMemberIds in sync if members change (remove stale ids)
    // Prunes bulk-selection ids that no longer correspond to an existing member
    // (e.g. after a page change or a removal), preventing stale ids from being
    // resubmitted in a later bulk-remove call.
    useEffect(() => {
        setSelectedMemberIds((prev) => {
            const existingIds = new Set(existingMembers.map((m) => m.id));
            const next = new Set(Array.from(prev).filter((id) => existingIds.has(id)));
            return next;
        });
    }, [existingMembers]);

    const existingMemberIds = useMemo(() => new Set(existingMembers.map((m) => m.id)), [existingMembers]);

    // Business rule: a user already a workspace member should not appear as an
    // invite candidate, so existing members are excluded from `userOptions`.
    const userOptions = useMemo(
        () =>
            users.filter((user) => {
                const userId = user._id || user.id;
                return userId ? !existingMemberIds.has(userId) : false;
            }),
        [existingMemberIds, users],
    );

    const selectedUserIds = useMemo(
        () =>
            selectedUsers
                .map((user) => user._id || user.id)
                .filter((id): id is string => typeof id === 'string' && id.length > 0),
        [selectedUsers],
    );

    // Derives the "Add Members" button's label from the current selection/loading
    // state, avoiding recomputation of the pluralization logic on every render.
    const addButtonLabel = useMemo(() => {
        if (addingMembers) return 'Adding...';
        if (selectedUserIds.length === 0) return 'Add Members';
        const count = selectedUserIds.length;
        return `Add ${count} Member${count > 1 ? 's' : ''}`;
    }, [addingMembers, selectedUserIds.length]);

    // True while any underlying data fetch or mutation is in flight; used to
    // disable dialog controls (close button, action buttons) during that window.
    const isBusy = workspaceLoading || memberActionLoading || emailTemplateLoading || workspaceMembersLoading;

    /** Dismisses the dialog, but only if no fetch/mutation is currently in flight. */
    const handleDialogClose = () => {
        if (workspaceLoading || memberActionLoading || userLoading || workspaceMembersLoading) return;
        onClose();
    };

    /**
     * Opens the remove-confirmation dialog for a single member and kicks off a
     * fetch of that member's project assignments in this workspace (so the
     * confirmation can show what will be affected). Triggered by a row's remove button.
     * @param memberId - id of the member to remove.
     */
    const handleRemoveMember = (memberId: string) => {
        if (!workspaceId || !orgId) {
            toast.showError('Workspace ID and Organization ID are required');
            return;
        }
        const member = existingMembers.find((m) => m.id === memberId);
        if (!member) {
            toast.showError('Member not found');
            return;
        }
        setConfirmTarget(member);
        dispatch(fetchUserWorkspaceProjects({ workspaceId, userId: memberId }));
    };

    /**
     * Confirms and executes removal of the single member targeted by
     * `confirmTarget`, triggered by the confirm dialog's "Remove Member"
     * button. Dispatches the removal, refreshes the members list, and clears
     * the confirmation/loading state regardless of outcome.
     */
    const handleConfirmRemove = async () => {
        if (!confirmTarget || !workspaceId || !orgId) return;
        const memberId = confirmTarget.id;
        setConfirmTarget(null);
        dispatch(clearUserWorkspaceProjects());
        setRemovingUserId(memberId);
        try {
            await dispatch(
                removeUsersFromWorkspace({
                    workspaceId,
                    orgId,
                    workspaceUsers: [{ user_id: memberId, role: confirmTarget.role }],
                }),
            ).unwrap();
            await dispatch(
                fetchWorkspaceMembers({
                    workspaceId,
                    search: debouncedMemberSearch || undefined,
                    filter: selectedRole && selectedRole !== 'all' ? selectedRole : undefined,
                }),
            );
            toast.showSuccess('Member removed from workspace');
        } catch (error: unknown) {
            toast.showError(error instanceof Error ? error.message : 'Failed to remove member');
        } finally {
            setRemovingUserId(null);
        }
    };

    /** Dismisses the remove-confirmation dialog without removing the member, clearing its fetched project list. */
    const handleCancelConfirm = () => {
        setConfirmTarget(null);
        dispatch(clearUserWorkspaceProjects());
    };

    /**
     * Removes every member currently checked in `selectedMemberIds` in a
     * single request, triggered by the table's bulk "Remove N Members" button.
     * Refreshes the current page of members and clears the selection on success.
     */
    const handleBulkRemove = async () => {
        if (!workspaceId || !orgId) {
            toast.showError('Workspace ID and Organization ID are required');
            return;
        }
        if (selectedMemberIds.size === 0) {
            toast.showError('Select at least one member to remove');
            return;
        }
        const workspaceUsers = Array.from(selectedMemberIds).map((memberId) => {
            const member = existingMembers.find((m) => m.id === memberId);
            return { user_id: memberId, role: member?.role || 'member' };
        });
        setRemovingUserId('bulk');
        try {
            await dispatch(removeUsersFromWorkspace({ workspaceId, orgId, workspaceUsers })).unwrap();
            const offset = page * rowsPerPage;
            await dispatch(
                fetchWorkspaceMembers({
                    workspaceId,
                    search: debouncedMemberSearch || undefined,
                    filter: selectedRole && selectedRole !== 'all' ? selectedRole : undefined,
                    limit: rowsPerPage,
                    offset,
                }),
            );
            setSelectedMemberIds(new Set());
            toast.showSuccess(`${selectedMemberIds.size} member(s) removed successfully`);
        } catch (error: unknown) {
            toast.showError(error instanceof Error ? error.message : 'Failed to remove members');
        } finally {
            setRemovingUserId(null);
        }
    };

    /**
     * Invites the users currently selected in the Invite tab to the workspace,
     * using the selected email template, triggered by the "Add Members"
     * button. Validates that a workspace/org, at least one user, and a
     * template are all present before dispatching `addUsersToWorkspace`, then
     * refreshes the members list and clears the invite selection on success.
     */
    const handleAddMembers = async () => {
        if (!workspaceId || !orgId) {
            toast.showError('Workspace ID and Organization ID are required');
            return;
        }
        if (selectedUserIds.length === 0) {
            toast.showError('Select at least one user to add');
            return;
        }
        if (!templateId.trim()) {
            toast.showError('Provide a template ID');
            return;
        }
        const usersPayload = selectedUsers.reduce<Array<{ user_id: string; role: string }>>((acc, user) => {
            const userId = user._id || user.id;
            if (userId) acc.push({ user_id: userId, role: user.role || 'member' });
            return acc;
        }, []);
        if (usersPayload.length === 0) {
            toast.showError('Unable to prepare users for assignment');
            return;
        }
        setAddingMembers(true);
        try {
            await dispatch(
                addUsersToWorkspace({
                    workspaceId,
                    orgId,
                    users: usersPayload,
                    templateId: templateId.trim(),
                }),
            ).unwrap();
            const offset = page * rowsPerPage;
            await dispatch(
                fetchWorkspaceMembers({
                    workspaceId,
                    search: debouncedMemberSearch || undefined,
                    filter: selectedRole && selectedRole !== 'all' ? selectedRole : undefined,
                    limit: rowsPerPage,
                    offset,
                }),
            );
            toast.showSuccess('Members added successfully');
            setSelectedUsers([]);
            setTemplateId('');
        } catch (error: unknown) {
            toast.showError(error instanceof Error ? error.message : 'Failed to add members');
        } finally {
            setAddingMembers(false);
        }
    };

    /**
     * Handles the members table's pagination "next/previous page" control by
     * fetching the corresponding offset of members from the server.
     * @param _ - unused MUI pagination click event.
     * @param newPage - the newly selected zero-based page index.
     */
    const handleChangePage = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
        setPage(newPage);
        const offset = newPage * rowsPerPage;
        dispatch(
            fetchWorkspaceMembers({
                workspaceId,
                search: debouncedMemberSearch || undefined,
                filter: selectedRole && selectedRole !== 'all' ? selectedRole : undefined,
                limit: rowsPerPage,
                offset,
            }),
        );
    };

    /**
     * Handles a page-size change in the members table pagination control,
     * resetting back to page 0 and re-fetching members with the new page size.
     * @param event - the rows-per-page select change event.
     */
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newSize = Number.parseInt(event.target.value, 10);
        setRowsPerPage(newSize);
        setPage(0);
        dispatch(
            fetchWorkspaceMembers({
                workspaceId,
                search: debouncedMemberSearch || undefined,
                filter: selectedRole && selectedRole !== 'all' ? selectedRole : undefined,
                limit: newSize,
                offset: 0,
            }),
        );
    };

    return (
        <>
            <Dialog
                open={open}
                onClose={handleDialogClose}
                maxWidth="md"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        pr: 2,
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 1.5,
                                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <GroupAddIcon color="primary" />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={600} lineHeight={1.2}>
                                Manage Workspace Members
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {currentWorkspace?.name
                                    ? `Workspace: ${currentWorkspace.name}`
                                    : 'Assign teammates to collaborate'}
                            </Typography>
                        </Box>
                    </Stack>
                    <IconButton onClick={handleDialogClose} disabled={isBusy}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ pb: 0, px: 0 }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                        <Tabs value={tabValue} onChange={(_, newValue: 0 | 1) => setTabValue(newValue)}>
                            <Tab
                                label="Members"
                                icon={<PeopleOutlinedIcon />}
                                iconPosition="start"
                                sx={{ textTransform: 'none', minHeight: 48 }}
                            />
                            <Tab
                                label="Invite"
                                icon={<GroupAddIcon />}
                                iconPosition="start"
                                sx={{ textTransform: 'none', minHeight: 48 }}
                            />
                        </Tabs>
                    </Box>

                    {tabValue === 0 && (
                        <Box sx={{ mb: 3, px: 3, pt: 2 }}>
                            {/* Search + filter row for members (client-side filtering) */}
                            <Box sx={{ mb: 1.5 }}>
                                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                    <TextField
                                        size="small"
                                        placeholder="Search by name or email"
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        sx={{ flex: 3 }}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon fontSize="small" />
                                                </InputAdornment>
                                            ),
                                        }}
                                    />

                                    <Box sx={{ flex: 1, position: 'relative' }}>
                                        <ClickAwayListener onClickAway={() => setMemberFilterOpen(false)}>
                                            <Box>
                                                <Box
                                                    onClick={() => setMemberFilterOpen((v) => !v)}
                                                    sx={{
                                                        border: (theme) => `1px solid ${theme.palette.divider}`,
                                                        borderRadius: 2,
                                                        px: 2,
                                                        py: 1,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                    }}
                                                >
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <FilterListIcon
                                                            fontSize="small"
                                                            color={
                                                                selectedRole && selectedRole !== 'all'
                                                                    ? 'primary'
                                                                    : 'action'
                                                            }
                                                        />
                                                        <Typography
                                                            variant="body2"
                                                            color={
                                                                selectedRole && selectedRole !== 'all'
                                                                    ? 'primary'
                                                                    : 'text.secondary'
                                                            }
                                                            sx={{
                                                                fontWeight:
                                                                    selectedRole && selectedRole !== 'all' ? 600 : 400,
                                                            }}
                                                        >
                                                            Filters
                                                        </Typography>
                                                        {selectedRole && selectedRole !== 'all' && (
                                                            <Chip
                                                                label={selectedRole}
                                                                size="small"
                                                                color="primary"
                                                                sx={{
                                                                    height: 18,
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 700,
                                                                    '& .MuiChip-label': { px: 0.75 },
                                                                }}
                                                            />
                                                        )}
                                                    </Stack>
                                                    {memberFilterOpen ? (
                                                        <KeyboardArrowUpIcon
                                                            fontSize="small"
                                                            sx={{ color: 'text.secondary' }}
                                                        />
                                                    ) : (
                                                        <KeyboardArrowDownIcon
                                                            fontSize="small"
                                                            sx={{ color: 'text.secondary' }}
                                                        />
                                                    )}
                                                </Box>

                                                {memberFilterOpen && (
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 'calc(100% + 6px)',
                                                            left: 0,
                                                            right: 0,
                                                            zIndex: 1300,
                                                            border: (theme) => `1px solid ${theme.palette.divider}`,
                                                            borderRadius: 2,
                                                            backgroundColor: 'background.paper',
                                                            boxShadow: 3,
                                                            px: 2,
                                                            py: 1.5,
                                                        }}
                                                    >
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            fontWeight={600}
                                                            sx={{
                                                                display: 'block',
                                                                mb: 1,
                                                                textTransform: 'uppercase',
                                                                letterSpacing: 0.5,
                                                            }}
                                                        >
                                                            Role
                                                        </Typography>
                                                        <Stack
                                                            direction="row"
                                                            spacing={0.75}
                                                            flexWrap="wrap"
                                                            useFlexGap
                                                        >
                                                            <Chip
                                                                key="all"
                                                                label="All"
                                                                size="small"
                                                                onClick={() => setSelectedRole('all')}
                                                                variant={selectedRole === 'all' ? 'filled' : 'outlined'}
                                                                color={selectedRole === 'all' ? 'primary' : 'default'}
                                                                sx={{
                                                                    fontWeight: selectedRole === 'all' ? 600 : 400,
                                                                    cursor: 'pointer',
                                                                }}
                                                            />
                                                            {ROLE_OPTIONS.map((r) => {
                                                                const active = selectedRole === r.value;
                                                                return (
                                                                    <Chip
                                                                        key={r.value}
                                                                        label={r.label}
                                                                        size="small"
                                                                        onClick={() =>
                                                                            setSelectedRole((prev) =>
                                                                                prev === r.value ? 'all' : r.value,
                                                                            )
                                                                        }
                                                                        variant={active ? 'filled' : 'outlined'}
                                                                        color={active ? 'primary' : 'default'}
                                                                        sx={{
                                                                            fontWeight: active ? 600 : 400,
                                                                            cursor: 'pointer',
                                                                        }}
                                                                    />
                                                                );
                                                            })}
                                                        </Stack>
                                                        {selectedRole && selectedRole !== 'all' && (
                                                            <Typography
                                                                variant="caption"
                                                                color="primary"
                                                                fontWeight={600}
                                                                sx={{ mt: 1, cursor: 'pointer' }}
                                                                onClick={() => setSelectedRole('all')}
                                                            >
                                                                Clear
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                )}
                                            </Box>
                                        </ClickAwayListener>
                                    </Box>
                                </Stack>
                            </Box>

                            <WorkspaceMembersTable
                                members={filteredMembers}
                                loading={workspaceMembersLoading}
                                memberActionLoading={memberActionLoading}
                                removingUserId={removingUserId}
                                selectedMemberIds={selectedMemberIds}
                                onRemoveMember={handleRemoveMember}
                                onBulkRemove={handleBulkRemove}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                <TablePagination
                                    component="div"
                                    count={typeof membersTotal === 'number' ? membersTotal : filteredMembers.length}
                                    page={page}
                                    onPageChange={handleChangePage}
                                    rowsPerPage={rowsPerPage}
                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                    rowsPerPageOptions={[5, 10, 25, 50]}
                                />
                            </Box>
                        </Box>
                    )}

                    {tabValue === 1 && (
                        <Box sx={{ px: 3, pt: 2 }}>
                            <WorkspaceInviteForm
                                emailTemplates={emailTemplates}
                                emailTemplateLoading={emailTemplateLoading}
                                templateId={templateId}
                                onTemplateChange={setTemplateId}
                                userOptions={userOptions}
                                selectedUsers={selectedUsers}
                                onUsersChange={setSelectedUsers}
                                userLoading={userLoading}
                            />
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2.5 }}>
                    {tabValue === 0 ? (
                        <Button
                            onClick={handleDialogClose}
                            disabled={isBusy}
                            variant="text"
                            sx={{ textTransform: 'none' }}
                        >
                            Close
                        </Button>
                    ) : (
                        <>
                            <Button
                                onClick={handleDialogClose}
                                disabled={isBusy}
                                variant="text"
                                sx={{ textTransform: 'none' }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAddMembers}
                                disabled={
                                    addingMembers ||
                                    selectedUserIds.length === 0 ||
                                    !templateId.trim() ||
                                    emailTemplateLoading
                                }
                                variant="contained"
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                {addButtonLabel}
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            <RemoveMemberConfirmDialog
                open={confirmTarget !== null}
                target={confirmTarget}
                projects={confirmProjects}
                projectsLoading={confirmProjectsLoading}
                onConfirm={handleConfirmRemove}
                onCancel={handleCancelConfirm}
            />
        </>
    );
};

export default WorkspaceMembersDialog;
