import { useState, useEffect, lazy, Suspense } from 'react';
import {
    Box,
    Typography,
    Button,
    Chip,
    Stack,
    useTheme,
    alpha,
    TextField,
    InputAdornment,
    MenuItem,
} from '@mui/material';
import { useDebounce } from '../interfaces/hooks/useDebounce';
import {
    Delete as DeleteIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import CommonTable from '../components/shared/CommonTable';
import type { Column, TableAction } from '../components/shared/CommonTable';
import type { GridRowSelectionModel } from '@mui/x-data-grid';

// Lazy load heavy components
const UserCreationDialog = lazy(() => import('../components/common/UserCreationDialog'));
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { fetchUsers, deleteUser, selectUsers, selectUserLoading, selectUserTotalCount, type User } from '../redux/slices/userSlice';
import { fetchRoles, selectRoles } from '../redux/slices/rolesSlice';
import { useToast } from '../hooks/useToast';

// Role hierarchy (from highest to lowest privilege):
// - super admin: Full system access and control
// - admin: Administrative access
// - workspace manager: Manage workspace-level operations
// - project manager: Manage project-level operations
// - engineer: Technical development work
// - review: Review and approve work
// - annotator: Data annotation and labeling tasks


/**
 * Component: Users
 *
 * Purpose: Admin/manager page for browsing, searching, filtering, inviting,
 * and deleting user accounts within the organization.
 *
 * Responsibilities:
 * - Fetches a server-paginated, debounced-search, role-filtered list of users.
 * - Fetches the list of available roles for the role filter dropdown.
 * - Lets an admin open a "create/invite user" dialog (lazy loaded).
 * - Lets an admin delete a user, gated to only `reviewer`/`annotator` roles
 *   via the table row action's `disabled` predicate, with a confirmation dialog.
 *
 * Props: none (route component).
 *
 * State:
 * - `createDialogOpen` - whether the user-creation dialog is open.
 * - `selectedUsers` - current row-selection model for the table's checkboxes.
 * - `searchQuery` / `debouncedSearchQuery` - search text and its debounced value.
 * - `roleFilter` - selected role filter ('all' or a specific role id).
 * - `paginationModel` - current table page/pageSize (server-paginated).
 * - `deleteDialogOpen` / `userToDelete` / `isDeleting` - delete-confirmation flow state.
 *
 * Redux (userSlice): `selectUsers`, `selectUserLoading`, `selectUserTotalCount`
 * selectors; `fetchUsers`, `deleteUser` thunks. (rolesSlice): `selectRoles`
 * selector; `fetchRoles` thunk.
 *
 * Custom hooks: `useDebounce` (search input), `useToast`.
 *
 * Major child components: `CommonTable`, `UserCreationDialog` (lazy),
 * `ConfirmationDialog`.
 *
 * Side effects: see the `useEffect`s below — (re)fetching users/roles when
 * pagination, debounced search, or role filter change, and resetting to
 * page 0 whenever the search text or role filter changes.
 *
 * Business rules: only users with the `reviewer` or `annotator` role can be
 * deleted from this table (see the `disabled` predicate on the Delete action).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const Users = () => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const toast = useToast();

    // Redux state
    const users = useAppSelector(selectUsers);
    const loading = useAppSelector(selectUserLoading);
    const totalCount = useAppSelector(selectUserTotalCount);
    const roles = useAppSelector(selectRoles);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<GridRowSelectionModel>();
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [paginationModel, setPaginationModel] = useState({
        page: 0,
        pageSize: 10,
    });

    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch users and roles whenever pagination/debounced-search/role filter changes.
    // Debouncing the search avoids firing a request on every keystroke.
    useEffect(() => {
        const roleParam = roleFilter === 'all' ? undefined : roleFilter;

        dispatch(
            fetchUsers({
                page: paginationModel.page,
                pageSize: paginationModel.pageSize,
                search: debouncedSearchQuery.trim() || undefined,
                role: roleParam,
            }),
        );
        dispatch(fetchRoles());
    }, [dispatch, paginationModel.page, paginationModel.pageSize, debouncedSearchQuery, roleFilter]);

    // Reset to the first page when search text or role filter changes, so
    // the user doesn't land on an out-of-range page for the new result set.
    useEffect(() => {
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }, [debouncedSearchQuery, roleFilter]);

    // Track pagination returned by the store (server state)
    // const userPagination = useAppSelector((state) => state.user.pagination);

    const tableData = users; // data is already paginated by backend


    // Determine column type based on data source
    type UserDataType = (typeof tableData)[0];

    // Table column definitions
    const userColumns: Column<UserDataType>[] = [
        {
            field: 'name',
            headerName: 'Name',
            flex: 1,
            minWidth: 200,
            valueGetter: (params) => params || 'N/A',
        },
        {
            field: 'email',
            headerName: 'Email',
            flex: 1,
            minWidth: 250,
        },
        {
            field: 'role',
            headerName: 'Role',
            width: 180,
            renderCell: (params) => (
                <Chip
                    label={
                        params.value
                            ? params.value
                                  .replaceAll('_', ' ')
                                  .split(' ')
                                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ')
                            : 'User'
                    }
                    size="small"
                    sx={{
                        backgroundColor: theme.palette.grey[200],
                        color: theme.palette.text.primary,
                        fontWeight: 500,
                    }}
                />
            ),
        },
    ];

    // Handle delete user
    /** Opens the delete-confirmation dialog for a specific user. Triggered by the table row's Delete action. */
    const handleDeleteClick = (user: UserDataType) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    /**
     * Confirms and performs the user deletion via `deleteUser`, then
     * refreshes the users list and closes the dialog. Shows a toast on
     * success/failure either way.
     */
    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;

        setIsDeleting(true);
        try {
            const organizationId = userToDelete.org_id || '';
            const userId = userToDelete._id;

            if (!organizationId) {
                toast.showError('Organization ID not found');
                return;
            }

            await dispatch(deleteUser({ organizationId, userId })).unwrap();
            toast.showSuccess('User deleted successfully');
            
            // Refresh users list
            dispatch(fetchUsers({ page: paginationModel.page, pageSize: paginationModel.pageSize }));
            
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        } catch (error: any) {
            toast.showError(error || 'Failed to delete user');
        } finally {
            setIsDeleting(false);
        }
    };

    /** Closes the delete-confirmation dialog without deleting anything. */
    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setUserToDelete(null);
    };

    // Table actions
    const userActions: TableAction<UserDataType>[] = [
        {
            label: 'Delete',
            icon: <DeleteIcon />,
            onClick: handleDeleteClick,
            disabled: (user) => user.role !== 'reviewer' && user.role !== 'annotator', // Only allow deleting reviewer and annotator users
        },
    ];

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                px: { xs: 2, sm: 3, md: 4 },
                py: { xs: 2, md: 3 },
            }}
        >
            {/* Header Section */}
            <Box sx={{ mb: 3, flexShrink: 0 }}>
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={{ xs: 2, sm: 0 }}
                    sx={{ mb: 3 }}
                >
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Users
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Manage user accounts and permissions across your organization
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            {/* Search and Filter Bar */}
            <Box sx={{ mb: 3, flexShrink: 0 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    {/* Search Bar */}
                    <TextField
                        placeholder="Search users by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                        sx={{
                            flex: 1,
                            minWidth: { xs: '100%', sm: 250 },
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                            },
                        }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />

                    {/* Role Filter Dropdown */}
                    <TextField
                        select
                        label="Filter by Role"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        size="small"
                        sx={{
                            minWidth: { xs: '100%', sm: 200 },
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                            },
                        }}
                    >
                        <MenuItem value="all">All Roles</MenuItem>
                        {roles.map((role) => (
                            <MenuItem key={role._id} value={role.role_id}>
                                {role.role_id
                                    .replaceAll('_', ' ')
                                    .split(' ')
                                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ')}
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* Invite User Button */}
                    <Button
                        variant="contained"
                        startIcon={<PersonAddAltOutlinedIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                            minWidth: { xs: '100%', sm: 'auto' },
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Invite User
                    </Button>
                </Stack>
            </Box>

            {/* Main Content - Users Table */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <CommonTable
                    // title="User Management"
                    data={tableData}
                    columns={userColumns}
                    actions={userActions}
                    loading={loading}
                    checkboxSelection
                    rowSelectionModel={selectedUsers}
                    onRowSelectionModelChange={setSelectedUsers}
                    height="100%"
                    bordered
                    striped
                    emptyStateMessage="No users found. Click 'Add User' to get started."
                    onRowClick={(params) => {
                        console.log('User clicked:', params.row);
                    }}
                    paginationMode="server"
                    rowCount={totalCount}
                    paginationModel={paginationModel}
                    onPaginationModelChange={(newModel) => {
                        setPaginationModel(newModel);
                    }}
                    pageSizeOptions={[5, 10, 25, 50, 100]}
                />
            </Box>

            {/* Create User Dialog */}
            <Suspense fallback={null}>
                <UserCreationDialog
                    open={createDialogOpen}
                    onClose={() => setCreateDialogOpen(false)}
                    onSuccess={() => {
                        setCreateDialogOpen(false);
                        // Refresh users list after successful creation
                        dispatch(fetchUsers());
                    }}
                />
            </Suspense>

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteDialogOpen}
                title="Delete User"
                message={`Are you sure you want to delete ${userToDelete?.name || userToDelete?.username || userToDelete?.email || 'this user'}? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                confirmColor="error"
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                loading={isDeleting}
            />
        </Box>
    );
};

export default Users;
