import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import type { WorkspaceMemberRow } from './WorkspaceMembersDialog';

interface WorkspaceMembersTableProps {
    members: WorkspaceMemberRow[];
    loading: boolean;
    memberActionLoading: boolean;
    removingUserId: string | null;
    selectedMemberIds: Set<string>;
    onRemoveMember: (id: string) => void;
    onBulkRemove: () => void;
}

/**
 * Component: WorkspaceMembersTable
 *
 * Purpose: Presentational table listing a workspace's current members, with
 * per-row and bulk remove actions. Used inside the "Members" tab of
 * `WorkspaceMembersDialog`; all data fetching/state is owned by the parent.
 *
 * Responsibilities:
 * - Renders a skeleton-row loading state while `loading` is true.
 * - Renders an empty state when there are no members.
 * - Renders member rows (avatar, name, email, role chip) with a per-row remove
 *   button, and a bulk-remove button when any rows are selected.
 *
 * Props:
 * - members (WorkspaceMemberRow[]): members to display (already filtered/paginated by the parent).
 * - loading (boolean): whether the members list is still being fetched.
 * - memberActionLoading (boolean): whether an add/remove mutation is in flight (disables actions).
 * - removingUserId (string | null): id of the member currently being removed,
 *   or 'bulk' during a bulk removal; used to show a spinner on the right row/button.
 * - selectedMemberIds (Set<string>): ids of members checked for bulk removal (row highlight only — no checkboxes rendered here).
 * - onRemoveMember ((id: string) => void): called when a row's remove button is clicked.
 * - onBulkRemove (() => void): called when the bulk "Remove N Members" button is clicked.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const WorkspaceMembersTable = ({
    members,
    loading,
    memberActionLoading,
    removingUserId,
    selectedMemberIds,
    onRemoveMember,
    onBulkRemove,
}: WorkspaceMembersTableProps) => {
    if (loading) {
        const rows = Array.from({ length: 5 });
        return (
            <Box>
                <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                >
                    <Skeleton variant="text" width={200} height={28} />
                    <Skeleton variant="rectangular" width={120} height={36} />
                </Stack>

                <Box
                    sx={{
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            overflowX: 'auto',
                            maxHeight: 300,
                            overflowY: 'auto',
                        }}
                    >
                        <Table stickyHeader size="small" sx={{ minWidth: 560 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>
                                        <Skeleton variant="text" width={120} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="text" width={160} />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton variant="text" width={100} />
                                    </TableCell>
                                    <TableCell align="right" sx={{ minWidth: 90, whiteSpace: 'nowrap' }}>
                                        <Skeleton variant="text" width={80} />
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((_, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Skeleton variant="circular" width={32} height={32} />
                                                <Skeleton variant="text" width={140} />
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton variant="text" width={180} />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton variant="text" width={100} />
                                        </TableCell>
                                        <TableCell align="right" sx={{ minWidth: 90 }}>
                                            <Skeleton variant="rectangular" width={48} height={28} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <Box>
            <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
            >
                <Typography variant="subtitle2">
                    Current Members {members.length > 0 && `(${members.length})`}
                </Typography>
                {selectedMemberIds.size > 0 && (
                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={
                            removingUserId === 'bulk' ? (
                                <CircularProgress size={16} />
                            ) : (
                                <DeleteIcon />
                            )
                        }
                        onClick={onBulkRemove}
                        disabled={removingUserId === 'bulk' || memberActionLoading}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Remove {selectedMemberIds.size} Member
                        {selectedMemberIds.size > 1 ? 's' : ''}
                    </Button>
                )}
            </Stack>

            <Box
                sx={{
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                }}
            >
                {members.length === 0 ? (
                    <Box sx={{ py: 5, textAlign: 'center', px: 3 }}>
                        <Typography variant="body1" fontWeight={600}>
                            No members yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Add teammates below to get started.
                        </Typography>
                    </Box>
                ) : (
                    <Box
                        sx={{
                            overflowX: 'auto',
                            maxHeight: 300,
                            overflowY: 'auto',
                            '&::-webkit-scrollbar': { width: 6, height: 6 },
                            '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
                            '&::-webkit-scrollbar-thumb': {
                                backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.15),
                                borderRadius: 3,
                            },
                            '&::-webkit-scrollbar-thumb:hover': {
                                backgroundColor: (theme) => alpha(theme.palette.text.primary, 0.3),
                            },
                            '&::-webkit-scrollbar-corner': { backgroundColor: 'transparent' },
                        }}
                    >
                        <Table stickyHeader size="small" sx={{ minWidth: 560 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell align="right" sx={{ minWidth: 90, whiteSpace: 'nowrap' }}>
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {members.map((member) => (
                                    <TableRow
                                        key={member.id}
                                        hover
                                        selected={selectedMemberIds.has(member.id)}
                                    >
                                        <TableCell>
                                            <Stack direction="row" spacing={1.5} alignItems="center">
                                                <Avatar sx={{ width: 32, height: 32 }}>
                                                    {member.name.charAt(0).toUpperCase()}
                                                </Avatar>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {member.name}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {member.email}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={member.role.replaceAll('_', ' ')}
                                                size="small"
                                                sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                                            />
                                        </TableCell>
                                        <TableCell align="right" sx={{ minWidth: 90 }}>
                                            <Tooltip title="Remove member">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => onRemoveMember(member.id)}
                                                        disabled={
                                                            removingUserId === member.id ||
                                                            memberActionLoading
                                                        }
                                                    >
                                                        {removingUserId === member.id ? (
                                                            <CircularProgress size={18} />
                                                        ) : (
                                                            <PersonRemoveIcon fontSize="small" />
                                                        )}
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default WorkspaceMembersTable;
