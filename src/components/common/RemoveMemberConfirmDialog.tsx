import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import type { WorkspaceProject } from '../../interfaces/api/workspace.interface';
import type { WorkspaceMemberRow } from './WorkspaceMembersDialog';

interface RemoveMemberConfirmDialogProps {
    open: boolean;
    target: WorkspaceMemberRow | null;
    projects: WorkspaceProject[];
    projectsLoading: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Component: RemoveMemberConfirmDialog
 *
 * Purpose: Confirmation dialog shown before removing a member from a
 * workspace, which additionally lists the projects within that workspace the
 * member is currently assigned to so the admin understands the blast radius.
 *
 * Responsibilities:
 * - Shows a warning message naming the target member.
 * - Renders the list of affected projects (with status chips), a loading
 *   spinner while that list is being fetched, or an empty-state message.
 * - Calls `onConfirm`/`onCancel` based on the user's choice.
 *
 * Props:
 * - open (boolean): whether the dialog is visible.
 * - target (WorkspaceMemberRow | null): the member being considered for removal.
 * - projects (WorkspaceProject[]): projects in this workspace the member is assigned to.
 * - projectsLoading (boolean): whether `projects` is still being fetched.
 * - onConfirm (() => void): called when the user confirms the removal.
 * - onCancel (() => void): called when the user cancels/dismisses the dialog.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const RemoveMemberConfirmDialog = ({
    open,
    target,
    projects,
    projectsLoading,
    onConfirm,
    onCancel,
}: RemoveMemberConfirmDialogProps) => {
    /** Renders the affected-projects section: a spinner while loading, an empty state, or the project rows. */
    const renderProjectList = () => {
        if (projectsLoading) {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                </Box>
            );
        }
        if (projects.length === 0) {
            return (
                <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        This member is not assigned to any projects in this workspace.
                    </Typography>
                </Box>
            );
        }
        return (
            <Box
                sx={{
                    maxHeight: 220,
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
                {projects.map((project, index) => (
                    <Box
                        key={project.project_id ?? index}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 2,
                            py: 1.25,
                            borderBottom: (theme) =>
                                index < projects.length - 1
                                    ? `1px solid ${theme.palette.divider}`
                                    : 'none',
                        }}
                    >
                        <Typography variant="body2" fontWeight={700}>
                            {project.project_name}
                        </Typography>
                        {project.status && (
                            <Chip
                                label={project.status}
                                size="small"
                                sx={{
                                    textTransform: 'capitalize',
                                    fontWeight: 500,
                                    fontSize: '0.7rem',
                                }}
                            />
                        )}
                    </Box>
                ))}
            </Box>
        );
    };

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            maxWidth="sm"
            fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3 } } }}
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
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            backgroundColor: (theme) => alpha(theme.palette.error.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <PersonRemoveIcon color="error" fontSize="small" />
                    </Box>
                    <Typography variant="h6" fontWeight={600}>
                        Remove Member
                    </Typography>
                </Stack>
                <IconButton size="small" onClick={onCancel}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    You are about to remove{' '}
                    <Typography component="span" variant="body2" fontWeight={700}>
                        {target?.name}
                    </Typography>{' '}
                    from this workspace. This action cannot be undone.
                </Typography>

                <Box
                    sx={{
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            px: 2,
                            py: 1.5,
                            backgroundColor: (theme) => alpha(theme.palette.warning.main, 0.06),
                            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Typography variant="subtitle2" color="warning.dark">
                            Projects that will be affected
                        </Typography>
                    </Box>
                    {renderProjectList()}
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button variant="text" onClick={onCancel} sx={{ textTransform: 'none' }}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={onConfirm}
                    disabled={projectsLoading}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                    Remove Member
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default RemoveMemberConfirmDialog;
