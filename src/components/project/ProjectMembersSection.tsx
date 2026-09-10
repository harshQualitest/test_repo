import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Button,
    alpha,
    useTheme,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    TablePagination,
    Stack,
    InputAdornment,
    ClickAwayListener,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useToast } from '../../hooks/useToast';
import projectApi from '../../services/api/projectApi';
import MemberManagementDialog from './MemberManagementDialog';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { selectUser } from '../../redux/slices/loginSlice';
import { getUserRole, ROLES } from '../../utils/roles';
import { fetchProjectMembers, selectMembersPagination } from '../../redux/slices/projectSlice';
import { useDebounce } from '../../interfaces/hooks/useDebounce';

const ROLE_OPTIONS = [
    { value: 'annotator', label: 'Annotator' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'workspace_manager', label: 'Workspace Manager' },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]['value'];

interface Member {
    _id?: string;
    id?: string;
    user?: {
        name?: string;
    };
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    user_id?: string;
}

interface ProjectMembersSectionProps {
    members: Member[] | null;
    membersLoading: boolean;
    projectId?: string | null;
    workspaceId?: string | null;
    onMembersUpdated?: () => void;
}

/**
 * Component: ProjectMembersSection
 *
 * Purpose: Displays a searchable, filterable, paginated table of a
 * project's members with bulk/individual removal and an entry point to the
 * "Add Members" dialog (`MemberManagementDialog`).
 *
 * Responsibilities:
 * - Fetches a page of project members (server-side search/filter/paginate)
 *   via the `fetchProjectMembers` thunk whenever relevant query state changes.
 * - Lets the user search by name/email, filter by role, select rows
 *   individually or via "select all on page", and delete one or many
 *   selected members (with a confirmation dialog).
 * - Enforces a role-based restriction: a Project Manager viewing this
 *   section cannot select or remove Workspace Manager members (checkbox
 *   disabled, row dimmed) — this protects workspace-level roles from being
 *   modified by a narrower-scoped role.
 * - Delegates adding members to `MemberManagementDialog`, and calls
 *   `onMembersUpdated` after any change so the parent can refresh dependent
 *   state.
 *
 * Props:
 * - `members` (`Member[] | null`): the current page of project members.
 * - `membersLoading` (`boolean`): whether a members fetch is in flight.
 * - `projectId` (`string | null | undefined`): the project whose members are shown.
 * - `workspaceId` (`string | null | undefined`): forwarded to `MemberManagementDialog`.
 * - `onMembersUpdated` (`() => void`, optional): called after members are added/removed.
 *
 * State:
 * - `manageMembersDialogOpen` (`boolean`): visibility of the "Add Members" dialog.
 * - `memberToDelete` (`Member | null`): the member (or a synthetic "multiple" placeholder) targeted by the delete confirmation.
 * - `deleteConfirmDialogOpen` (`boolean`): visibility of the delete confirmation dialog.
 * - `isDeleting` (`boolean`): true while a remove request is in flight.
 * - `searchQuery` / `debouncedSearch`: raw and debounced (400ms) member search text.
 * - `selectedMemberIds` (`Set<string>`): ids of members checked for bulk deletion.
 * - `page` / `rowsPerPage`: current pagination state for the members table.
 * - `selectedRole` (`RoleValue | null`): active role filter.
 * - `filterOpen` (`boolean`): whether the role-filter dropdown panel is open.
 *
 * Custom hooks used:
 * - `useToast` (`showSuccess`/`showError`): user-facing notifications.
 * - `useDebounce`: debounces the search box before it drives the server query.
 *
 * Redux:
 * - `useAppSelector(selectMembersPagination)` (projectSlice): total count for `TablePagination`.
 * - `useAppSelector(selectUser)` (loginSlice) + `getUserRole`/`ROLES` (`src/utils/roles.ts`): determines the current user's role for RBAC gating.
 * - `useAppDispatch` + `fetchProjectMembers` thunk (projectSlice): loads the members page.
 *
 * API calls:
 * - `projectApi.updateProjectUsers` — removes one or more members (`action: 'remove'`).
 *
 * Side effects:
 * - useEffect [`dispatch`, `projectId`, `debouncedSearch`, `page`, `rowsPerPage`, `selectedRole`]:
 *   re-fetches the current page of project members whenever the project,
 *   search text, pagination, or role filter changes; no-ops if there is no `projectId`.
 *
 * Business rules enforced:
 * - Workspace Manager members cannot be selected or removed by a user whose
 *   own role is Project Manager (`cannotModifyManagers`).
 * - Deleting a single vs. multiple members shows different confirmation copy.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ProjectMembersSection = ({
    members,
    membersLoading,
    projectId,
    workspaceId,
    onMembersUpdated,
}: ProjectMembersSectionProps) => {
    const theme = useTheme();
    const { showSuccess, showError } = useToast();
    const dispatch = useAppDispatch();
    const membersPagination = useAppSelector(selectMembersPagination);

    const currentUser = useAppSelector(selectUser);
    const currentUserRole = getUserRole(currentUser);
    // RBAC rule: Project Managers are scoped below Workspace Managers, so
    // they must not be able to remove/select workspace-level members here.
    const cannotModifyManagers = currentUserRole === ROLES.PROJECT_MANAGER;

    const [manageMembersDialogOpen, setManageMembersDialogOpen] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
    const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedRole, setSelectedRole] = useState<RoleValue | null>(null);
    const [filterOpen, setFilterOpen] = useState(false);

    const debouncedSearch = useDebounce(searchQuery, 400);
    const currentPageMembers = members ?? [];
    const totalCount = membersPagination?.total ?? 0;

    // Re-fetches the current page of members whenever the project, search
    // text, pagination, or role filter changes, so the table always
    // reflects server-side state for the active query.
    useEffect(() => {
        if (!projectId) return;
        dispatch(
            fetchProjectMembers({
                projectId,
                limit: rowsPerPage,
                offset: page * rowsPerPage,
                search: debouncedSearch || undefined,
                filter: selectedRole || undefined,
            }) as any,
        );
    }, [dispatch, projectId, debouncedSearch, page, rowsPerPage, selectedRole]);

    /**
     * Resolves a member's stable id, preferring `user_id` (populated by the
     * project-users API) and falling back to `id`.
     * @param member the member row.
     * @returns the member's id, or `undefined` if neither field is present.
     */
    const getMemberId = (member: Member): string | undefined => member.user_id || member.id;

    /**
     * Updates the search query as the user types and resets to page 0, since
     * a new search invalidates the current page's result set.
     * @param e the input change event from the search field.
     */
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        if (page !== 0) setPage(0);
    };

    /**
     * Applies (or clears) the role filter chip the user clicked, resetting
     * to page 0 since the filtered result set changes.
     * @param role the role to filter by, or `null` for "All".
     */
    const handleSelectRole = (role: RoleValue | null) => {
        setSelectedRole(role);
        if (page !== 0) setPage(0);
    };

    /**
     * Toggles a single member's checkbox in the bulk-selection set, in
     * response to the user clicking a row's checkbox.
     * @param memberId id of the member being toggled; no-ops if undefined.
     */
    const handleSelectMember = (memberId: string | undefined) => {
        if (!memberId) return;
        const next = new Set(selectedMemberIds);
        if (next.has(memberId)) {
            next.delete(memberId);
        } else {
            next.add(memberId);
        }
        setSelectedMemberIds(next);
    };

    /**
     * Selects or clears all selectable members on the current page, in
     * response to the header checkbox. "Selectable" excludes Workspace
     * Manager rows when the current user is a Project Manager, so bulk
     * select can't be used to sneak past the per-row RBAC restriction.
     */
    const handleSelectAll = () => {
        const selectable = currentPageMembers.filter(
            (m) => !(cannotModifyManagers && m.role === ROLES.WORKSPACE_MANAGER),
        );
        if (selectedMemberIds.size === selectable.length && selectable.length > 0) {
            setSelectedMemberIds(new Set());
        } else {
            setSelectedMemberIds(new Set(selectable.map((m) => getMemberId(m)).filter(Boolean) as string[]));
        }
    };

    // Drives the header checkbox's checked state: true only when every
    // member on the current page is already selected.
    const allOnPageSelected =
        currentPageMembers.length > 0 &&
        currentPageMembers.every((u) => selectedMemberIds.has(getMemberId(u)!));

    /**
     * Opens the delete confirmation dialog for the current bulk selection,
     * triggered by the "Delete (N)" button. Uses singular copy/state when
     * exactly one member is selected, otherwise stores a synthetic
     * `{ _id: 'multiple' }` placeholder so the confirm dialog can render
     * appropriate copy and `handleConfirmDelete` knows to delete the whole set.
     */
    const handleDeleteSelected = async () => {
        if (selectedMemberIds.size === 0) return;
        if (selectedMemberIds.size === 1) {
            const memberId = Array.from(selectedMemberIds)[0];
            const member = members?.find((m) => getMemberId(m) === memberId);
            if (member) {
                setMemberToDelete(member);
                setDeleteConfirmDialogOpen(true);
            }
        } else {
            setMemberToDelete({ _id: 'multiple', email: '', name: 'selected members', role: 'member', status: 'active' });
            setDeleteConfirmDialogOpen(true);
        }
    };

    /**
     * Opens the delete confirmation dialog for a single member, triggered by
     * that row's delete icon button.
     * @param member the member to be removed.
     */
    const handleDeleteClick = (member: Member) => {
        setMemberToDelete(member);
        setDeleteConfirmDialogOpen(true);
    };

    /**
     * Confirms removal of the targeted member(s) (single row or the whole
     * bulk selection) by calling `projectApi.updateProjectUsers` with
     * `action: 'remove'`, then refreshes the members list and notifies the
     * parent. Triggered by the "Remove" button in the confirmation dialog.
     */
    const handleConfirmDelete = async () => {
        if (!projectId) {
            showError('Missing project information');
            return;
        }

        const membersToDelete =
            memberToDelete?._id === 'multiple' ? Array.from(selectedMemberIds) : [getMemberId(memberToDelete!)];

        if (membersToDelete.length === 0 || !membersToDelete[0]) {
            showError('Invalid member ID');
            return;
        }

        setIsDeleting(true);
        try {
            const projectUsers = membersToDelete.map((userId) => {
                const member = members?.find((m) => getMemberId(m) === userId);
                return { user_id: userId as string, role: member?.role || 'member' };
            });

            await projectApi.updateProjectUsers({
                project_id: projectId,
                project_users: projectUsers,
                action: 'remove',
                email_template_id: '',
            });

            showSuccess(`${membersToDelete.length === 1 ? 'Member' : 'Members'} removed successfully!`);
            setDeleteConfirmDialogOpen(false);
            setMemberToDelete(null);
            setSelectedMemberIds(new Set());
            dispatch(
                fetchProjectMembers({
                    projectId,
                    limit: rowsPerPage,
                    offset: page * rowsPerPage,
                    search: debouncedSearch || undefined,
                    filter: selectedRole || undefined,
                }) as any,
            );
            if (onMembersUpdated) onMembersUpdated();
        } catch (error) {
            showError('Failed to remove member(s)');
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    /** Dismisses the delete confirmation dialog without removing anyone, in response to its Cancel button. */
    const handleCancelDelete = () => {
        setDeleteConfirmDialogOpen(false);
        setMemberToDelete(null);
    };

    return (
        <>
            {/* Member Management Dialog */}
            <MemberManagementDialog
                open={manageMembersDialogOpen}
                onClose={() => setManageMembersDialogOpen(false)}
                projectId={projectId || null}
                workspaceId={workspaceId || null}
                currentMembers={members || []}
                onMembersUpdated={onMembersUpdated}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmDialogOpen}
                onClose={handleCancelDelete}
                sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 600 }}>
                    {memberToDelete?._id === 'multiple' ? 'Remove Members' : 'Remove Member'}
                </DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <Typography>
                        {memberToDelete?._id === 'multiple'
                            ? `Are you sure you want to remove ${selectedMemberIds.size} selected member(s) from this project?`
                            : `Are you sure you want to remove ${memberToDelete?.user?.name || memberToDelete?.name} from this project?`}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ gap: 1, px: 3, pb: 2 }}>
                    <Button onClick={handleCancelDelete} disabled={isDeleting} variant="outlined" sx={{ borderRadius: 2 }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        variant="contained"
                        color="error"
                        sx={{ borderRadius: 2 }}
                    >
                        {isDeleting ? <CircularProgress size={20} /> : 'Remove'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Card
                sx={{
                    borderRadius: 2.5,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                    mb: 4,
                }}
            >
                <CardContent>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <GroupIcon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
                            <Typography variant="h6" fontWeight={700}>
                                Project Members ({totalCount || members?.length || 0})
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {selectedMemberIds.size > 0 && (
                                <Button
                                    startIcon={<DeleteIcon />}
                                    variant="contained"
                                    color="error"
                                    size="small"
                                    onClick={handleDeleteSelected}
                                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                >
                                    Delete ({selectedMemberIds.size})
                                </Button>
                            )}
                            <Button
                                startIcon={<AddIcon />}
                                variant="contained"
                                size="small"
                                onClick={() => setManageMembersDialogOpen(true)}
                                disabled={membersLoading}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                            >
                                Add Member
                            </Button>
                        </Box>
                    </Box>

                    {/* Search + Filter row */}
                    {projectId && (
                        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
                            {/* Search */}
                            <TextField
                                size="small"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                sx={{ flex: 1 }}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon fontSize="small" />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />

                            {/* Role filter panel */}
                            <Box sx={{ minWidth: 130, position: 'relative' }}>
                                <ClickAwayListener onClickAway={() => setFilterOpen(false)}>
                                    <Box>
                                        {/* Trigger */}
                                        <Box
                                            onClick={() => setFilterOpen((v) => !v)}
                                            sx={{
                                                border: (t) => `1px solid ${selectedRole ? t.palette.primary.main : t.palette.divider}`,
                                                borderRadius: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                px: 1.5,
                                                py: '8px',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                backgroundColor: selectedRole
                                                    ? alpha(theme.palette.primary.main, 0.06)
                                                    : 'transparent',
                                                transition: 'background-color 0.15s',
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                <FilterListIcon
                                                    fontSize="small"
                                                    sx={{ color: selectedRole ? 'primary.main' : 'text.secondary' }}
                                                />
                                                <Typography
                                                    variant="body2"
                                                    color={selectedRole ? 'primary' : 'text.secondary'}
                                                    fontWeight={selectedRole ? 600 : 400}
                                                >
                                                    Role
                                                </Typography>
                                                {selectedRole && (
                                                    <Box
                                                        sx={{
                                                            width: 18,
                                                            height: 18,
                                                            borderRadius: '50%',
                                                            backgroundColor: 'primary.main',
                                                            color: 'white',
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        1
                                                    </Box>
                                                )}
                                            </Box>
                                            {filterOpen ? (
                                                <ExpandLessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                            ) : (
                                                <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                            )}
                                        </Box>

                                        {/* Dropdown */}
                                        {filterOpen && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: 'calc(100% + 4px)',
                                                    right: 0,
                                                    zIndex: 1300,
                                                    minWidth: 220,
                                                    border: (t) => `1px solid ${t.palette.divider}`,
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
                                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                                    <Chip
                                                        label="All"
                                                        size="small"
                                                        onClick={() => handleSelectRole(null)}
                                                        variant={!selectedRole ? 'filled' : 'outlined'}
                                                        color={!selectedRole ? 'primary' : 'default'}
                                                        sx={{ fontWeight: !selectedRole ? 600 : 400, cursor: 'pointer' }}
                                                    />
                                                    {ROLE_OPTIONS.map((r) => (
                                                        <Chip
                                                            key={r.value}
                                                            label={r.label}
                                                            size="small"
                                                            onClick={() => handleSelectRole(r.value)}
                                                            variant={selectedRole === r.value ? 'filled' : 'outlined'}
                                                            color={selectedRole === r.value ? 'primary' : 'default'}
                                                            sx={{
                                                                fontWeight: selectedRole === r.value ? 600 : 400,
                                                                cursor: 'pointer',
                                                            }}
                                                        />
                                                    ))}
                                                </Stack>
                                            </Box>
                                        )}
                                    </Box>
                                </ClickAwayListener>
                            </Box>
                        </Stack>
                    )}

                    {membersLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                            <CircularProgress size={32} />
                        </Box>
                    )}

                    {!membersLoading && currentPageMembers.length > 0 && (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                                        <TableCell padding="checkbox" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={allOnPageSelected}
                                                onChange={handleSelectAll}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Email</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Role</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Status</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {currentPageMembers.map((member, index) => {
                                        const memberId = getMemberId(member);
                                        const isSelected = memberId ? selectedMemberIds.has(memberId) : false;
                                        // RBAC: dim/disable this row's selection and delete controls
                                        // when the viewer (Project Manager) isn't allowed to modify Workspace Managers.
                                        const isManagerRow =
                                            cannotModifyManagers && member.role === ROLES.WORKSPACE_MANAGER;
                                        return (
                                            <TableRow
                                                key={memberId || index}
                                                sx={{
                                                    '&:hover': {
                                                        backgroundColor: alpha(theme.palette.primary.main, 0.02),
                                                    },
                                                    backgroundColor: isSelected
                                                        ? alpha(theme.palette.primary.main, 0.08)
                                                        : 'transparent',
                                                    opacity: isManagerRow ? 0.6 : 1,
                                                }}
                                            >
                                                <TableCell padding="checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        disabled={isManagerRow}
                                                        onChange={() => {
                                                            if (memberId && !isManagerRow) handleSelectMember(memberId);
                                                        }}
                                                        style={{ cursor: isManagerRow ? 'not-allowed' : 'pointer' }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                                    {member.user?.name || member.name || 'Unknown'}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.9rem' }}>{member.email || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={member.role || 'member'}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor: alpha(theme.palette.info.main, 0.1),
                                                            color: theme.palette.info.main,
                                                            fontWeight: 600,
                                                            textTransform: 'capitalize',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={member.status || 'active'}
                                                        size="small"
                                                        sx={{
                                                            backgroundColor:
                                                                member.status === 'active'
                                                                    ? alpha(theme.palette.success.main, 0.1)
                                                                    : alpha(theme.palette.grey[500], 0.1),
                                                            color:
                                                                member.status === 'active'
                                                                    ? theme.palette.success.main
                                                                    : theme.palette.grey[500],
                                                            fontWeight: 600,
                                                            textTransform: 'capitalize',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {!isManagerRow && (
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeleteClick(member)}
                                                            sx={{
                                                                color: theme.palette.error.main,
                                                                '&:hover': {
                                                                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                                                                },
                                                            }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {!membersLoading && currentPageMembers.length === 0 && (searchQuery || selectedRole) && (
                        <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                            No members found matching your search or filter.
                        </Alert>
                    )}
                    {!membersLoading && currentPageMembers.length === 0 && !searchQuery && !selectedRole && (
                        <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                            No members found for this project.
                        </Alert>
                    )}

                    <TablePagination
                        component="div"
                        count={totalCount > 0 ? totalCount : -1}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                    />
                </CardContent>
            </Card>
        </>
    );
};

export default ProjectMembersSection;
