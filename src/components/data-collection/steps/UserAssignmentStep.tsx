import { useEffect, useRef, useState } from 'react';
import {
    Avatar,
    Box,
    Checkbox,
    Chip,
    CircularProgress,
    IconButton,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
    alpha,
} from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import GroupsIcon from '@mui/icons-material/Groups';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import type { FormikProps } from 'formik';
import userApi from '../../../services/api/usersApi';
import { useDebounce } from '../../../interfaces/hooks/useDebounce';
import type { IProjectFormState } from '../../../interfaces/api/dataCollection.interface';

const STEP_COLOR = '#bf360c';
const STEP_LIGHT = '#e64a19';
const ROWS_PER_PAGE_OPTIONS = [5, 10, 25];

interface UserOption {
    email: string;
    name: string;
    role: string;
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
    annotator: { bg: alpha('#1565c0', 0.1), color: '#1565c0' },
    reviewer: { bg: alpha('#6a1b9a', 0.1), color: '#6a1b9a' },
    project_manager: { bg: alpha('#2e7d32', 0.1), color: '#2e7d32' },
    workspace_manager: { bg: alpha('#e65100', 0.1), color: '#e65100' },
    admin: { bg: alpha('#bf360c', 0.1), color: '#bf360c' },
};

const formatRole = (role: string) => role.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface Props {
    formik: FormikProps<IProjectFormState>;
}

interface OptionCardProps {
    selected: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    description: string;
    badge?: string;
}

/**
 * Small presentational selectable card used for the "All Users" vs.
 * "Specific Users Only" mode picker, showing a checkmark when selected.
 */
const OptionCard = ({ selected, onClick, icon, title, description, badge }: OptionCardProps) => (
    <Box
        onClick={onClick}
        sx={{
            flex: 1,
            cursor: 'pointer',
            p: 1.5,
            borderRadius: 2,
            border: `2px solid`,
            borderColor: selected ? STEP_COLOR : 'divider',
            bgcolor: selected ? alpha(STEP_COLOR, 0.04) : 'background.paper',
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            transition: 'all 0.2s ease',
            boxShadow: selected ? `0 3px 10px ${alpha(STEP_COLOR, 0.15)}` : 'none',
            '&:hover': {
                borderColor: selected ? STEP_COLOR : alpha(STEP_COLOR, 0.4),
                bgcolor: alpha(STEP_COLOR, 0.03),
                transform: 'translateY(-1px)',
            },
            '&:active': { transform: 'translateY(0)' },
        }}
    >
        <Box
            sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                flexShrink: 0,
                background: selected ? `linear-gradient(135deg, ${STEP_COLOR}, ${STEP_LIGHT})` : alpha('#000', 0.06),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                boxShadow: selected ? `0 2px 6px ${alpha(STEP_COLOR, 0.3)}` : 'none',
                color: selected ? 'white' : 'text.secondary',
            }}
        >
            {icon}
        </Box>

        <Box flex={1} minWidth={0}>
            <Box display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                <Typography variant="body2" fontWeight={700} sx={{ color: selected ? STEP_COLOR : 'text.primary' }}>
                    {title}
                </Typography>
                {badge && (
                    <Chip
                        label={badge}
                        size="small"
                        sx={{
                            bgcolor: selected ? alpha(STEP_COLOR, 0.1) : alpha('#000', 0.05),
                            color: selected ? STEP_COLOR : 'text.secondary',
                            fontWeight: 700,
                            height: 16,
                            fontSize: 9,
                        }}
                    />
                )}
            </Box>
            <Typography variant="caption" color="text.secondary" lineHeight={1.3} display="block">
                {description}
            </Typography>
        </Box>

        <Box sx={{ flexShrink: 0 }}>
            {selected ? (
                <CheckCircleIcon sx={{ fontSize: 18, color: STEP_COLOR }} />
            ) : (
                <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            )}
        </Box>
    </Box>
);

/**
 * Derives a 1–2 letter avatar initials string from a user's name, falling
 * back to the first letter of their email when no name is available.
 * @param name - the user's display name (may be empty).
 * @param email - the user's email (used as a fallback source of initials).
 * @returns Up to 2 uppercase initials, or '?' if neither name nor email yield one.
 */
const getInitials = (name: string, email: string) => {
    if (name)
        return name
            .split(' ')
            .map((p) => p[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    return email[0]?.toUpperCase() || '?';
};

/**
 * Component: UserAssignmentStep
 *
 * Purpose: Renders Step 4 ("User Assignment") of the data-collection project
 * wizard — lets admins choose between granting access to all uploader-role
 * users automatically, or hand-picking specific users via a searchable,
 * paginated table. Corresponds to the `users`/`allUsers` fields validated by
 * `fullSchema` in `steps/schema.ts` (at least one user, or "All Users", is
 * required at submit time).
 *
 * Responsibilities:
 * - Fetch a server-paginated, searchable list of assignable users (excluding
 *   the 'annotator' role) via `userApi.getAllUsers`.
 * - Let the admin toggle between "All Users" and "Specific Users Only" modes.
 * - Track per-user selection (`values.users`) independent of the current
 *   page, and support "select all on this page" / bulk clear.
 *
 * Props:
 * - formik (FormikProps<IProjectFormState>): the wizard's shared Formik bag;
 *   this step reads/writes `values.allUsers` and `values.users`.
 *
 * State:
 * - userList (UserOption[]): the current page's fetched users (email/name/role).
 * - searchInput (string): the raw search box text.
 * - loadingUsers (boolean): whether a fetch is in flight.
 * - page (number): current zero-based table page.
 * - rowsPerPage (number): rows per page (5/10/25).
 * - totalCount (number): total matching users reported by the API, for pagination.
 *
 * Custom hooks used:
 * - useDebounce(searchInput, 400): delays firing a new search request until
 *   the admin pauses typing, to avoid a request per keystroke.
 *
 * API calls made:
 * - userApi.getAllUsers({ page, pageSize, search, exclude_role: "['annotator']" })
 *   — paginated user directory lookup, excluding annotators since they can't
 *   be assigned as uploaders here.
 *
 * Side effects:
 * - useEffect (on debouncedSearch change): resets to page 0 and refetches,
 *   since a new search invalidates the previous page's result set.
 * - useEffect (on page/rowsPerPage change): refetches for the new page, but
 *   skips its very first run on mount (guarded by `isMounted`) because the
 *   search effect above already performs the initial fetch — avoids a
 *   duplicate request on first render.
 *
 * Business rules:
 * - In "All Users" mode, `values.users` is set to the sentinel `['All']`
 *   array rather than an actual user list, since access is automatic.
 * - Selection state is keyed by email and preserved across pagination/search,
 *   so switching pages or searching doesn't lose previously checked users.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const UserAssignmentStep = ({ formik }: Props) => {
    const { values, setFieldValue } = formik;

    const [userList, setUserList] = useState<UserOption[]>([]);
    const [searchInput, setSearchInput] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const debouncedSearch = useDebounce(searchInput, 400);
    const isMounted = useRef(false);

    /**
     * Fetches one page of assignable users from the API, normalizing each
     * raw record into a UserOption (email/name/role), and resolving each
     * user's role from their organization-level assignment when present.
     * Fails silently — a fetch error simply leaves the table showing no
     * results rather than raising a toast, since this is a background
     * lookup within a form step.
     * @param pageNum - zero-based page index to fetch.
     * @param pageSize - number of users per page.
     * @param search - free-text search term (trimmed; empty means no filter).
     */
    const fetchUsers = async (pageNum: number, pageSize: number, search: string) => {
        setLoadingUsers(true);
        try {
            const response = await userApi.getAllUsers({
                page: pageNum,
                pageSize,
                search: search.trim() || undefined,
                exclude_role: "['annotator']",
            });
            const raw: any[] = Array.isArray(response?.data) ? response.data : [];
            const total: number = typeof response?.total === 'number' ? response.total : raw.length;
            setUserList(
                raw
                    .map((u: any) => {
                        const orgAssignment = Array.isArray(u.assignments)
                            ? u.assignments.find((a: any) => a.entity === 'organization')
                            : null;
                        return {
                            email: (u.email || '').trim(),
                            name: (u.name || u.username || '').trim(),
                            role: (orgAssignment?.role_id || u.role || '').trim(),
                        };
                    })
                    .filter((u) => u.email),
            );
            setTotalCount(total);
        } catch {
            // silent
        } finally {
            setLoadingUsers(false);
        }
    };

    /**
     * Refetches page 0 whenever the debounced search term changes. Resetting
     * to page 0 avoids landing on a page that may no longer exist for the
     * new, narrower result set.
     * Depends on: debouncedSearch.
     */
    // On search change: always reset to page 0 and fetch
    useEffect(() => {
        setPage(0);
        fetchUsers(0, rowsPerPage, debouncedSearch);
    }, [debouncedSearch]);

    /**
     * Refetches the current page whenever pagination changes (page or
     * rowsPerPage). Skips its first run on mount via the `isMounted` ref,
     * since the search effect above already performs the initial fetch —
     * without this guard both effects would fire on mount and double-fetch.
     * Depends on: page, rowsPerPage.
     */
    // On page / rowsPerPage change (skip the very first mount — handled by search effect above)
    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }
        fetchUsers(page, rowsPerPage, debouncedSearch);
    }, [page, rowsPerPage]);

    const isAllUsers = values.allUsers;

    /**
     * Switches between "All Users" and "Specific Users Only" modes. Selecting
     * "all" clears any individual picks in favor of the `['All']` sentinel,
     * since the two representations are mutually exclusive.
     * @param mode - 'all' | 'specific'.
     */
    const handleModeChange = (mode: 'all' | 'specific') => {
        setFieldValue('allUsers', mode === 'all');
        setFieldValue('users', mode === 'all' ? ['All'] : []);
    };

    const selectedSet = new Set(isAllUsers ? [] : values.users);

    /**
     * Adds or removes a single user's email from the selected set.
     * @param email - the user's email to toggle.
     */
    const toggleUser = (email: string) => {
        if (selectedSet.has(email)) {
            setFieldValue(
                'users',
                values.users.filter((e) => e !== email),
            );
        } else {
            setFieldValue('users', [...values.users, email]);
        }
    };

    // Derive the header checkbox's checked/indeterminate state from only the
    // emails visible on the current page, since selection can span pages.
    const pageEmails = userList.map((u) => u.email);
    const allPageSelected = pageEmails.length > 0 && pageEmails.every((e) => selectedSet.has(e));
    const somePageSelected = !allPageSelected && pageEmails.some((e) => selectedSet.has(e));

    /**
     * Toggles selection for every user on the current page: deselects them
     * all if the whole page is already selected, otherwise adds every
     * page email to the existing selection (preserving selections from
     * other pages via a Set union).
     */
    const toggleSelectAll = () => {
        if (allPageSelected) {
            setFieldValue(
                'users',
                values.users.filter((e) => !pageEmails.includes(e)),
            );
        } else {
            setFieldValue('users', Array.from(new Set([...values.users, ...pageEmails])));
        }
    };

    return (
        <Box>
            {/* Step header */}
            <Box
                sx={{
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    pb: 2,
                    borderBottom: `1.5px solid ${alpha(STEP_COLOR, 0.15)}`,
                }}
            >
                <Box
                    sx={{
                        width: 34,
                        height: 34,
                        borderRadius: 1.5,
                        flexShrink: 0,
                        background: `linear-gradient(135deg, ${STEP_COLOR}, ${STEP_LIGHT})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 3px 8px ${alpha(STEP_COLOR, 0.3)}`,
                    }}
                >
                    <PersonAddAlt1Icon sx={{ color: 'white', fontSize: 17 }} />
                </Box>
                <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                            User Assignment
                        </Typography>
                        <Chip
                            label="Step 4"
                            size="small"
                            sx={{
                                bgcolor: alpha(STEP_COLOR, 0.1),
                                color: STEP_COLOR,
                                fontWeight: 700,
                                height: 18,
                                fontSize: 10,
                            }}
                        />
                    </Box>
                    <Typography variant="caption" color="text.secondary" lineHeight={1.3}>
                        Choose who can upload data to this project
                    </Typography>
                </Box>
            </Box>

            {/* Mode selection cards */}
            <Box display="flex" flexDirection="row" gap={1.25} mb={3}>
                <OptionCard
                    selected={isAllUsers}
                    onClick={() => handleModeChange('all')}
                    icon={<GroupsIcon sx={{ fontSize: 18 }} />}
                    title="All Users"
                    badge="Recommended"
                    description="Every account with the uploader role will have automatic access."
                />
                <OptionCard
                    selected={!isAllUsers}
                    onClick={() => handleModeChange('specific')}
                    icon={<ManageSearchIcon sx={{ fontSize: 18 }} />}
                    title="Specific Users Only"
                    description="Manually pick the users who will upload data for this project."
                />
            </Box>

            {/* User selection table */}
            {!isAllUsers && (
                <Box
                    sx={{
                        border: `1.5px solid ${alpha(STEP_COLOR, 0.2)}`,
                        borderRadius: 2.5,
                        overflow: 'hidden',
                    }}
                >
                    {/* Toolbar: search + selection count */}
                    <Box
                        sx={{
                            px: 2,
                            py: 1.25,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            borderBottom: `1px solid ${alpha(STEP_COLOR, 0.1)}`,
                            bgcolor: alpha(STEP_COLOR, 0.02),
                        }}
                    >
                        <TextField
                            size="small"
                            placeholder="Search by name or email…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ fontSize: 17, color: 'text.disabled' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchInput ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchInput('')} edge="end">
                                                <ClearIcon sx={{ fontSize: 15 }} />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null,
                                },
                            }}
                            sx={{
                                flex: 1,
                                '& .MuiOutlinedInput-root': {
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: STEP_COLOR },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: STEP_COLOR },
                                },
                                '& .MuiInputLabel-root.Mui-focused': { color: STEP_COLOR },
                            }}
                        />
                        {values.users.length > 0 && (
                            <Chip
                                label={`${values.users.length} selected`}
                                size="small"
                                onDelete={() => setFieldValue('users', [])}
                                sx={{ bgcolor: alpha(STEP_COLOR, 0.1), color: STEP_COLOR, fontWeight: 700 }}
                            />
                        )}
                        {loadingUsers && <CircularProgress size={16} sx={{ color: STEP_COLOR, flexShrink: 0 }} />}
                    </Box>

                    {/* Table */}
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: alpha(STEP_COLOR, 0.03) }}>
                                    <TableCell padding="checkbox" sx={{ pl: 1.5 }}>
                                        <Checkbox
                                            size="small"
                                            checked={allPageSelected}
                                            indeterminate={somePageSelected}
                                            onChange={toggleSelectAll}
                                            disabled={userList.length === 0}
                                            sx={{
                                                color: alpha(STEP_COLOR, 0.5),
                                                '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: STEP_COLOR },
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="caption"
                                            fontWeight={700}
                                            color="text.secondary"
                                            letterSpacing={0.5}
                                        >
                                            NAME
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="caption"
                                            fontWeight={700}
                                            color="text.secondary"
                                            letterSpacing={0.5}
                                        >
                                            EMAIL
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="caption"
                                            fontWeight={700}
                                            color="text.secondary"
                                            letterSpacing={0.5}
                                        >
                                            ROLE
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {loadingUsers && userList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 5, border: 0 }}>
                                            <CircularProgress size={24} sx={{ color: STEP_COLOR }} />
                                        </TableCell>
                                    </TableRow>
                                ) : userList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 5, border: 0 }}>
                                            <Typography variant="body2" color="text.disabled">
                                                {debouncedSearch ? 'No users match your search' : 'No users found'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    userList.map((user) => {
                                        const isSelected = selectedSet.has(user.email);
                                        return (
                                            <TableRow
                                                key={user.email}
                                                hover
                                                selected={isSelected}
                                                onClick={() => toggleUser(user.email)}
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&.Mui-selected': { bgcolor: alpha(STEP_COLOR, 0.05) },
                                                    '&.Mui-selected:hover': { bgcolor: alpha(STEP_COLOR, 0.08) },
                                                }}
                                            >
                                                <TableCell padding="checkbox" sx={{ pl: 1.5 }}>
                                                    <Checkbox
                                                        size="small"
                                                        checked={isSelected}
                                                        sx={{
                                                            color: alpha(STEP_COLOR, 0.4),
                                                            '&.Mui-checked': { color: STEP_COLOR },
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <Avatar
                                                            sx={{
                                                                width: 28,
                                                                height: 28,
                                                                fontSize: 11,
                                                                bgcolor: isSelected
                                                                    ? alpha(STEP_COLOR, 0.15)
                                                                    : alpha('#000', 0.07),
                                                                color: isSelected ? STEP_COLOR : 'text.secondary',
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            {getInitials(user.name, user.email)}
                                                        </Avatar>
                                                        <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                                                            {user.name || '—'}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {user.email}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {user.role ? (
                                                        <Chip
                                                            label={formatRole(user.role)}
                                                            size="small"
                                                            sx={{
                                                                height: 20,
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                                bgcolor: (
                                                                    ROLE_COLORS[user.role] ?? {
                                                                        bg: alpha('#000', 0.07),
                                                                    }
                                                                ).bg,
                                                                color: (
                                                                    ROLE_COLORS[user.role] ?? {
                                                                        color: 'text.secondary',
                                                                    }
                                                                ).color,
                                                            }}
                                                        />
                                                    ) : (
                                                        <Typography variant="caption" color="text.disabled">
                                                            —
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination */}
                    <TablePagination
                        component="div"
                        count={totalCount}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setPage(0);
                        }}
                        sx={{
                            borderTop: `1px solid ${alpha(STEP_COLOR, 0.1)}`,
                            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                                fontSize: 12,
                            },
                        }}
                    />
                </Box>
            )}
        </Box>
    );
};

export default UserAssignmentStep;
