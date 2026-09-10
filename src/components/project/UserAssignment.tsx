import { useState, useMemo, type ReactNode, type UIEvent } from 'react';
import {
    Box,
    Button,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    List,
    ListItemButton,
    ListItemAvatar,
    ListItemText,
    Checkbox,
    Avatar,
    Chip,
    Stack,
    CircularProgress,
} from '@mui/material';

interface MemberOption {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface UserAssignmentProps {
    selectedUsers: string[];
    memberOptions: MemberOption[];
    loading: boolean;
    searchValue: string;
    onSearchValueChange: (value: string) => void;
    hasMore: boolean;
    onLoadMore: () => void;
    disabled?: boolean;
    error?: string;
    touched?: boolean;
    onChange: (users: string[]) => void;
    onBlur: () => void;
    lockedUserIds?: string[];
}

/**
 * Converts a snake_case role value into a space-separated display label
 * (e.g. `project_manager` -> `project manager`).
 * @param role the raw role value.
 * @returns the human-readable role label.
 */
const formatRole = (role: string): string => role.split('_').join(' ');

/**
 * Component: UserAssignment
 *
 * Purpose: Multi-select control for assigning workspace/organization users
 * to a project. Selected users are shown as removable chips inline, with a
 * dialog (search + infinite-scroll list) used to change the selection.
 *
 * Responsibilities:
 * - Renders currently selected users as chips (with role label) and offers
 *   "Select Users" / "Clear Selection" entry points.
 * - Opens a dialog with a searchable, infinite-scrolling member list where
 *   the user builds a *pending* selection that is only committed to the
 *   form on "Apply Selection".
 * - Enforces that any id in `lockedUserIds` (e.g. auto-assigned by business
 *   rule, such as a role that must always be present) can never be
 *   unchecked, removed, or cleared — it is always re-merged back into
 *   whatever the user does.
 *
 * Props:
 * - `selectedUsers` (`string[]`): committed user ids (owned by the parent/form).
 * - `memberOptions` (`MemberOption[]`): candidate users to choose from.
 * - `loading` (`boolean`): whether more member options are being fetched.
 * - `searchValue` (`string`) / `onSearchValueChange`: controlled search text for the dialog's member list.
 * - `hasMore` (`boolean`) / `onLoadMore`: pagination for infinite scroll in the dialog.
 * - `disabled` (`boolean?`): disables the select/clear/remove controls.
 * - `error` (`string?`) / `touched` (`boolean?`): validation error shown when both are set.
 * - `onChange` (`(users: string[]) => void`): commits a new selection to the parent/form.
 * - `onBlur` (`() => void`): marks the field as touched (Formik).
 * - `lockedUserIds` (`string[]`, default `[]`): ids that must always remain selected.
 *
 * State:
 * - `dialogOpen` (`boolean`): visibility of the user-selection dialog.
 * - `pendingSelection` (`string[]`): in-progress selection edited inside the dialog, not yet committed.
 *
 * Business rules enforced:
 * - Locked users (`lockedUserIds`) can never be deselected, removed via
 *   chip delete, or dropped by "Clear Selection" — every mutation re-merges
 *   them back in.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const UserAssignment = ({
    selectedUsers,
    memberOptions,
    loading,
    searchValue,
    onSearchValueChange,
    hasMore,
    onLoadMore,
    disabled,
    error,
    touched,
    onChange,
    onBlur,
    lockedUserIds = [],
}: UserAssignmentProps) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pendingSelection, setPendingSelection] = useState<string[]>([]);

    // Indexes member options by id for O(1) lookup when resolving selected
    // users' display details, instead of re-scanning the array each time.
    const memberMap = useMemo(() => {
        const map = new Map<string, MemberOption>();
        memberOptions.forEach((option) => map.set(option.id, option));
        return map;
    }, [memberOptions]);

    // Resolves full member details (name/email/role) for each selected id,
    // recomputed only when the selection or the member lookup map changes.
    const selectedMemberDetails = useMemo(() => {
        return selectedUsers
            .map((userId) => memberMap.get(userId))
            .filter((member): member is MemberOption => member !== undefined);
    }, [selectedUsers, memberMap]);

    // Client-side filter over the currently loaded member options (search
    // matches name, email, or formatted role), recomputed only when the
    // options or search text change.
    const filteredMembers = useMemo(() => {
        const query = searchValue.trim().toLowerCase();
        if (!query) return memberOptions;

        return memberOptions.filter((member) => {
            const roleLabel = formatRole(member.role);
            return [member.name, member.email, roleLabel].some((value) =>
                    value?.toLowerCase()?.includes(query),
            );
        });
    }, [memberOptions, searchValue]);

    /** Propagates the search input's value up to the parent-controlled `searchValue`. */
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onSearchValueChange(event.target.value);
    };

    /**
     * Infinite-scroll handler for the dialog's member list: requests the
     * next page once the user scrolls within 56px of the bottom, provided
     * nothing is already loading and more pages remain.
     * @param event the scroll event from the member list.
     */
    const handleListScroll = (event: UIEvent<HTMLUListElement>) => {
        const target = event.currentTarget;
        if (loading || !hasMore) {
            return;
        }

        if (target.scrollHeight - target.scrollTop - target.clientHeight < 56) {
            onLoadMore();
        }
    };

    /**
     * Opens the selection dialog, seeding `pendingSelection` with the
     * current committed selection plus any locked users — guarantees locked
     * users always appear checked even if they were somehow dropped from
     * `selectedUsers` upstream.
     */
    const handleOpenDialog = () => {
        // Always ensure locked users are included when opening
        const merged = [...new Set([...selectedUsers, ...lockedUserIds])];
        setPendingSelection(merged);
        setDialogOpen(true);
    };

    /** Closes the dialog without committing `pendingSelection` (discarding any in-progress edits). */
    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    /**
     * Toggles a member's checked state within the dialog's pending
     * selection, in response to clicking a list row. Locked users are
     * immune to toggling — they cannot be unchecked.
     * @param userId id of the member row clicked.
     */
    const toggleSelection = (userId: string) => {
        if (lockedUserIds.includes(userId)) return;
        setPendingSelection((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
        );
    };

    /**
     * Commits the pending selection to the form via `onChange`, re-merging
     * locked users in as a safety net, then marks the field touched and
     * closes the dialog. Triggered by "Apply Selection".
     */
    const handleConfirm = () => {
        // Ensure locked users are always preserved in the final selection
        const merged = [...new Set([...pendingSelection, ...lockedUserIds])];
        onChange(merged);
        onBlur();
        setDialogOpen(false);
    };

    /**
     * Removes a single user from the committed selection, in response to
     * deleting their chip. No-ops for locked users, which cannot be removed.
     * @param userId id of the user to remove.
     */
    const handleRemove = (userId: string) => {
        if (lockedUserIds.includes(userId)) return;
        onChange(selectedUsers.filter((id) => id !== userId));
        onBlur();
    };

    /**
     * Clears the entire selection down to just the locked users, in
     * response to "Clear Selection" — locked users can never be cleared.
     */
    const handleClear = () => {
        // Keep locked users even after clearing
        onChange(lockedUserIds);
        onBlur();
    };

    let dialogContent: ReactNode;
    if (loading && memberOptions.length === 0) {
        dialogContent = (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} />
            </Box>
        );
    } else if (memberOptions.length === 0) {
        dialogContent = (
            <Box sx={{ py: 4, px: 2 }}>
                <Typography variant="body2" color="text.secondary" align="center">
                    No workspace members available to assign.
                </Typography>
            </Box>
        );
    } else {
        dialogContent = (
            <>
                <TextField
                    value={searchValue}
                    onChange={handleSearchChange}
                    placeholder="Search members by name or email"
                    label="Search"
                    fullWidth
                    size="small"
                    sx={{ mt: 2, mb: 2 }}
                />
                {filteredMembers.length === 0 ? (
                    <Box sx={{ py: 4, px: 2 }}>
                        <Typography variant="body2" color="text.secondary" align="center">
                            No members match your search.
                        </Typography>
                    </Box>
                ) : (
                    <List sx={{ maxHeight: 320, overflow: 'auto' }} onScroll={handleListScroll}>
                        {filteredMembers.map((member) => {
                            const isSelected = pendingSelection.includes(member.id);
                            const isLocked = lockedUserIds.includes(member.id);
                            const roleLabel = formatRole(member.role);

                            return (
                                <ListItemButton
                                    key={member.id}
                                    onClick={() => toggleSelection(member.id)}
                                    dense
                                    disabled={isLocked}
                                    sx={isLocked ? { opacity: 1 } : undefined}
                                >
                                    <ListItemAvatar>
                                        <Avatar>{member.name.charAt(0).toUpperCase()}</Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Typography variant="body2">
                                                {member.name}
                                                {isLocked && (
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        color="primary"
                                                        sx={{ ml: 1, fontWeight: 600 }}
                                                    >
                                                        (auto-assigned)
                                                    </Typography>
                                                )}
                                            </Typography>
                                        }
                                        secondary={
                                            <Typography variant="caption" color="text.secondary">
                                                {member.email}
                                                {roleLabel ? ` • ${roleLabel}` : ''}
                                            </Typography>
                                        }
                                    />
                                    <Checkbox edge="end" checked={isSelected} disabled={isLocked} />
                                </ListItemButton>
                            );
                        })}
                        {loading && memberOptions.length > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                                <CircularProgress size={20} />
                            </Box>
                        )}
                    </List>
                )}
            </>
        );
    }

    return (
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Assign Users *
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="outlined" onClick={handleOpenDialog} disabled={disabled} sx={{ textTransform: 'none' }}>
                    Select Users
                </Button>
                {selectedUsers.length > 0 && (
                    <Button variant="text" onClick={handleClear} disabled={disabled} sx={{ textTransform: 'none' }}>
                        Clear Selection
                    </Button>
                )}
            </Stack>

            {selectedMemberDetails.length > 0 ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                    {selectedMemberDetails.map((member) => {
                        const isLocked = lockedUserIds.includes(member.id);
                        const roleLabel = formatRole(member.role);
                        const chipLabel = roleLabel ? `${member.name} • ${roleLabel}` : member.name;

                        return (
                            <Chip
                                key={member.id}
                                label={chipLabel}
                                onDelete={isLocked ? undefined : () => handleRemove(member.id)}
                                disabled={disabled && !isLocked}
                                color={isLocked ? 'primary' : 'default'}
                                variant={isLocked ? 'outlined' : 'filled'}
                                sx={{ textTransform: 'capitalize' }}
                            />
                        );
                    })}
                </Stack>
            ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    No users assigned yet.
                </Typography>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {selectedUsers.length} user(s) selected
            </Typography>

            {touched && error && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {error}
                </Typography>
            )}

            {/* User Selection Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Assign Users *</DialogTitle>
                <DialogContent dividers sx={{ py: 0 }}>
                    {dialogContent}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={loading}
                        variant="contained"
                        sx={{ textTransform: 'none' }}
                    >
                        Apply Selection
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserAssignment;
