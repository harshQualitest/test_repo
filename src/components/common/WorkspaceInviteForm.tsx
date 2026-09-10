import { useMemo, useState, useEffect } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import TablePagination from '@mui/material/TablePagination';
import Skeleton from '@mui/material/Skeleton';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import FilterListIcon from '@mui/icons-material/FilterList';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import type { EmailTemplate } from '../../interfaces/emailTemplateInterface';
import type { User } from '../../redux/slices/userSlice';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchUsers, selectUserPagination, selectUserTotalCount } from '../../redux/slices/userSlice';
import { useDebounce } from '../../interfaces/hooks/useDebounce';

const ROLE_OPTIONS = [
    { value: 'annotator', label: 'Annotator' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'workspace_manager', label: 'Workspace Manager' },
] as const;

type RoleValue = (typeof ROLE_OPTIONS)[number]['value'];

interface WorkspaceInviteFormProps {
    emailTemplates: EmailTemplate[];
    emailTemplateLoading: boolean;
    templateId: string;
    onTemplateChange: (id: string) => void;
    userOptions: User[];
    selectedUsers: User[];
    onUsersChange: (users: User[]) => void;
    userLoading: boolean;
}

/**
 * Component: WorkspaceInviteForm
 *
 * Purpose: The "Invite" tab content of `WorkspaceMembersDialog` — lets an
 * admin pick an email template and select one or more organization users
 * (searchable, role-filterable, paginated) to invite into the workspace.
 *
 * Responsibilities:
 * - Renders the email-template selector, a search box + role filter panel,
 *   and a paginated, multi-select table of candidate users.
 * - Debounces search input and re-fetches the user list from the server on
 *   search/role/page/page-size changes.
 * - Tracks which users are selected and reports changes via `onUsersChange`.
 *
 * Props:
 * - emailTemplates (EmailTemplate[]): templates available for the invite.
 * - emailTemplateLoading (boolean): whether templates are still loading.
 * - templateId (string): currently selected template id.
 * - onTemplateChange ((id: string) => void): called when the template selection changes.
 * - userOptions (User[]): candidate users to invite (already excludes existing members).
 * - selectedUsers (User[]): users currently checked for invitation.
 * - onUsersChange ((users: User[]) => void): called whenever the selection changes.
 * - userLoading (boolean): whether `userOptions` is still loading (renders skeleton rows).
 *
 * State:
 * - search (string): raw search input value.
 * - selectedRoles (Set<RoleValue>): active role filter (single-select in practice, via handleToggleRole).
 * - filterOpen (boolean): whether the floating filter panel is expanded.
 * - page (number): current page index for the users table.
 * - rowsPerPage (number): page size for the users table.
 *
 * Redux: reads `selectUserTotalCount`, `selectUserPagination` (userSlice);
 * dispatches `fetchUsers` whenever search/filter/pagination changes.
 *
 * Custom hooks: `useDebounce` to avoid firing a fetch on every keystroke.
 *
 * Side effects: re-fetches the user list from the server whenever the
 * debounced search text, role filter, page, or rows-per-page changes.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const WorkspaceInviteForm = ({
    emailTemplates,
    emailTemplateLoading,
    templateId,
    onTemplateChange,
    userOptions,
    selectedUsers,
    onUsersChange,
    userLoading,
}: WorkspaceInviteFormProps) => {
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 400);
    const [selectedRoles, setSelectedRoles] = useState<Set<RoleValue>>(new Set());
    const [filterOpen, setFilterOpen] = useState(false);
    const dispatch = useAppDispatch();
    const totalUsers = useAppSelector(selectUserTotalCount);
    const pagination = useAppSelector(selectUserPagination);
    const [page, setPage] = useState<number>(pagination.page || 0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(pagination.pageSize || 10);

    const activeFilterCount = selectedRoles.size;

    // Recomputed only when the selection changes, since it's read on every row
    // render to determine checkbox/highlight state.
    const selectedIds = useMemo(
        () => new Set(selectedUsers.map((u) => u._id || u.id).filter(Boolean) as string[]),
        [selectedUsers],
    );

    // Client-side filter over the already-fetched page of candidate users;
    // recomputed only when the option list, search text, or role filter changes.
    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        return userOptions.filter((user) => {
            const matchesSearch =
                !q ||
                (user.name || '').toLowerCase().includes(q) ||
                (user.username || '').toLowerCase().includes(q) ||
                (user.email || '').toLowerCase().includes(q);
            const matchesRole =
                selectedRoles.size === 0 || selectedRoles.has(user.role as RoleValue);
            return matchesSearch && matchesRole;
        });
    }, [userOptions, search, selectedRoles]);

    // Drives the header checkbox's checked/indeterminate state for "select all" behavior.
    const allFilteredSelected =
        filteredUsers.length > 0 &&
        filteredUsers.every((u) => selectedIds.has((u._id || u.id)!));
    const someFilteredSelected =
        filteredUsers.some((u) => selectedIds.has((u._id || u.id)!)) && !allFilteredSelected;

    /**
     * Toggles a role filter chip. Only a single role can be active at a time —
     * clicking the already-active role clears the filter, clicking another
     * role replaces the current selection (rather than adding to it).
     * @param role - the role chip that was clicked.
     */
    const handleToggleRole = (role: RoleValue) => {
        setSelectedRoles((prev) => {
            if (prev.has(role)) return new Set();
            return new Set([role]);
        });
    };

    /** Clears the active role filter, triggered by the "Clear" link in the filter panel. */
    const handleClearFilters = () => setSelectedRoles(new Set());

    /**
     * Toggles selection of every currently-filtered user at once, triggered by
     * the table header checkbox. Selects all filtered users if not all are
     * already selected; otherwise deselects just the filtered ones (leaving any
     * selections outside the current filter untouched).
     */
    const handleToggleAll = () => {
        if (allFilteredSelected) {
            const filteredIds = new Set(filteredUsers.map((u) => u._id || u.id));
            onUsersChange(selectedUsers.filter((u) => !filteredIds.has(u._id || u.id)));
        } else {
            const existingIds = new Set(selectedUsers.map((u) => u._id || u.id));
            const toAdd = filteredUsers.filter((u) => !existingIds.has(u._id || u.id));
            onUsersChange([...selectedUsers, ...toAdd]);
        }
    };

    /**
     * Toggles a single user's selection, triggered by clicking a table row or
     * its checkbox.
     * @param user - the user row that was clicked.
     */
    const handleToggleUser = (user: User) => {
        const userId = user._id || user.id;
        if (!userId) return;
        if (selectedIds.has(userId)) {
            onUsersChange(selectedUsers.filter((u) => (u._id || u.id) !== userId));
        } else {
            onUsersChange([...selectedUsers, user]);
        }
    };

    /** Renders the clickable "Filters" header row, including the active-filter count badge and expand/collapse chevron. */
    const renderFilterPanelHeader = () => {
        const bgColor = activeFilterCount > 0
            ? (theme: { palette: { primary: { main: string } } }) => alpha(theme.palette.primary.main, 0.05)
            : 'transparent';
        return (
            <Box
                onClick={() => setFilterOpen((v) => !v)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2,
                    py: 1,
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: bgColor,
                    '&:hover': {
                        backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.04),
                    },
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center">
                    <FilterListIcon
                        fontSize="small"
                        color={activeFilterCount > 0 ? 'primary' : 'action'}
                    />
                    <Typography
                        variant="body2"
                        fontWeight={activeFilterCount > 0 ? 600 : 400}
                        color={activeFilterCount > 0 ? 'primary' : 'text.secondary'}
                    >
                        Filters
                    </Typography>
                    {activeFilterCount > 0 && (
                        <Chip
                            label={activeFilterCount}
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
                <Stack direction="row" spacing={1} alignItems="center">
                    {activeFilterCount > 0 && (
                        <Typography
                            variant="caption"
                            color="primary"
                            fontWeight={600}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClearFilters();
                            }}
                            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                        >
                            Clear
                        </Typography>
                    )}
                    {filterOpen ? (
                        <KeyboardArrowUpIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    ) : (
                        <KeyboardArrowDownIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    )}
                </Stack>
            </Box>
        );
    };

    /** Renders the users table body: skeleton rows while loading, an empty state, or the filtered/selectable rows plus pagination controls. */
    const renderTableContent = () => {
        if (userLoading) {
            const rows = Array.from({ length: 5 });
            return (
                <Box>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Skeleton variant="text" width={24} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="text" width={120} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="text" width={160} />
                                </TableCell>
                                <TableCell>
                                    <Skeleton variant="text" width={100} />
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((_, idx) => (
                                <TableRow key={idx}>
                                    <TableCell padding="checkbox">
                                        <Skeleton variant="circular" width={28} height={28} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="text" width={140} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="text" width={180} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="text" width={100} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
            );
        }
        if (filteredUsers.length === 0) {
            return (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        {userOptions.length === 0
                            ? 'No users available to add.'
                            : 'No users match your filters.'}
                    </Typography>
                </Box>
            );
        }
        return (
            <Box>
                <Box
                    sx={{
                        maxHeight: 260,
                        overflowY: 'auto',
                        '&::-webkit-scrollbar': { width: 6 },
                        '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.15),
                            borderRadius: 3,
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                            backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.3),
                        },
                    }}
                >
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        size="small"
                                        checked={allFilteredSelected}
                                        indeterminate={someFilteredSelected}
                                        onChange={handleToggleAll}
                                    />
                                </TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Role</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredUsers.map((user) => {
                                const userId = user._id || user.id;
                                const isSelected = userId ? selectedIds.has(userId) : false;
                                const displayName = user.name || user.username || user.email || 'User';
                                return (
                                    <TableRow
                                        key={userId}
                                        hover
                                        selected={isSelected}
                                        onClick={() => handleToggleUser(user)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                size="small"
                                                checked={isSelected}
                                                onChange={() => handleToggleUser(user)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem' }}>
                                                    {displayName.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {displayName}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {user.email}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={(user.role || 'member').replaceAll('_', ' ')}
                                                size="small"
                                                sx={{
                                                    textTransform: 'capitalize',
                                                    fontWeight: 500,
                                                    fontSize: '0.7rem',
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <TablePagination
                        component="div"
                        count={totalUsers || filteredUsers.length}
                        page={page}
                        onPageChange={(_, newPage) => {
                            setPage(newPage);
                            dispatch(fetchUsers({ page: newPage, pageSize: rowsPerPage, search: debouncedSearch || undefined, role: selectedRoles.size === 1 ? Array.from(selectedRoles)[0] : undefined }));
                        }}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            const newSize = parseInt(e.target.value, 10);
                            setRowsPerPage(newSize);
                            setPage(0);
                            dispatch(fetchUsers({ page: 0, pageSize: newSize, search: debouncedSearch || undefined, role: selectedRoles.size === 1 ? Array.from(selectedRoles)[0] : undefined }));
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                    />
                </Box>
            </Box>
        );
    };

    // Fetch users when search/filter/page/rowsPerPage change
    // Re-runs whenever the debounced search text, role filter, page, or page
    // size changes, keeping the server-backed candidate list in sync with the UI controls.
    useEffect(() => {
        const roleParam = selectedRoles.size === 1 ? Array.from(selectedRoles)[0] : undefined;
        dispatch(fetchUsers({ page, pageSize: rowsPerPage, search: debouncedSearch || undefined, role: roleParam }));
    }, [dispatch, debouncedSearch, selectedRoles, page, rowsPerPage]);

    return (
        <Box>
            {/* Email template selector */}
            <TextField
                select
                value={templateId}
                onChange={(event) => onTemplateChange(event.target.value)}
                label="Email template"
                fullWidth
                sx={{ mb: 2.5 }}
                disabled={emailTemplateLoading || emailTemplates.length === 0}
                helperText={
                    emailTemplates.length === 0
                        ? 'No email templates available'
                        : 'Choose the invitation template to notify new members'
                }
            >
                {emailTemplateLoading && (
                    <MenuItem value="" disabled>
                        Loading templates...
                    </MenuItem>
                )}
                {emailTemplates.map((template) => (
                    <MenuItem key={template._id} value={template._id}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="body2" fontWeight={600}>
                                {template.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {template.subject}
                            </Typography>
                        </Box>
                    </MenuItem>
                ))}
            </TextField>

            {/* Search bar + Filter panel row */}
            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.5 }}>
                <TextField
                    size="small"
                    placeholder="Search by name or email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ flex: 3 }}
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

                {/* Filter panel */}
                <Box sx={{ flex: 1, position: 'relative' }}>
                    <ClickAwayListener onClickAway={() => setFilterOpen(false)}>
                        <Box>
                            {/* Trigger header */}
                            <Box
                                sx={{
                                    border: (theme) => `1px solid ${theme.palette.divider}`,
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                }}
                            >
                                {renderFilterPanelHeader()}
                            </Box>
                            {/* Floating dropdown — overlays content below */}
                            {filterOpen && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        top: 'calc(100% + 4px)',
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
                                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                        <Chip
                                            key="all"
                                            label="All"
                                            size="small"
                                            onClick={handleClearFilters}
                                            variant={selectedRoles.size === 0 ? 'filled' : 'outlined'}
                                            color={selectedRoles.size === 0 ? 'primary' : 'default'}
                                            sx={{ fontWeight: selectedRoles.size === 0 ? 600 : 400, cursor: 'pointer' }}
                                        />
                                        {ROLE_OPTIONS.map((r) => {
                                            const active = selectedRoles.has(r.value);
                                            return (
                                                <Chip
                                                    key={r.value}
                                                    label={r.label}
                                                    size="small"
                                                    onClick={() => handleToggleRole(r.value)}
                                                    variant={active ? 'filled' : 'outlined'}
                                                    color={active ? 'primary' : 'default'}
                                                    sx={{ fontWeight: active ? 600 : 400, cursor: 'pointer' }}
                                                />
                                            );
                                        })}
                                    </Stack>
                                </Box>
                            )}
                        </Box>
                    </ClickAwayListener>
                </Box>
            </Stack>

            {/* Selection summary */}
            {selectedUsers.length > 0 && (
                <Typography
                    variant="caption"
                    color="primary"
                    sx={{ display: 'block', mb: 1, fontWeight: 600 }}
                >
                    {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                </Typography>
            )}

            {/* Users table */}
            <Box
                sx={{
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                }}
            >
                {renderTableContent()}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Selected users will be given access to this workspace immediately and notified
                using the provided template.
            </Typography>
        </Box>
    );
};

export default WorkspaceInviteForm;
