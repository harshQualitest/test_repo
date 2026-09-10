import { Box, Button, CircularProgress, DialogActions, alpha, useTheme } from '@mui/material';

interface ProjectDialogActionsProps {
    isSubmitting: boolean;
    activeAction: 'draft' | 'create' | null;
    isDraftDisabled: boolean;
    isCreateDisabled: boolean;
    onCancel: () => void;
    onSaveAsDraft: () => void;
}

/**
 * Component: ProjectDialogActions
 *
 * Purpose: Renders the footer action buttons (Cancel / Save as Draft /
 * Create Project) for the project creation/edit dialog, showing a spinner
 * on whichever button matches the in-flight `activeAction`.
 *
 * Responsibilities:
 * - Disables Cancel while a submission is in progress, so the dialog can't
 *   be dismissed mid-request.
 * - Disables Save as Draft / Create Project independently based on
 *   `isDraftDisabled` / `isCreateDisabled` (typically form validity), and
 *   swaps each button's label for a spinner when it is the `activeAction`
 *   currently submitting.
 * - The Create Project button has `type="submit"`, so it triggers the
 *   enclosing form's `onSubmit` (Formik) rather than calling a handler prop
 *   directly.
 *
 * Props:
 * - `isSubmitting` (`boolean`): whether a submission (draft or create) is in flight.
 * - `activeAction` (`'draft' | 'create' | null`): which action is currently submitting, used to show the correct button's spinner.
 * - `isDraftDisabled` (`boolean`): whether "Save as Draft" should be disabled.
 * - `isCreateDisabled` (`boolean`): whether "Create Project" should be disabled.
 * - `onCancel` (`() => void`): closes the dialog without saving.
 * - `onSaveAsDraft` (`() => void`): triggers the save-as-draft flow.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ProjectDialogActions = ({
    isSubmitting,
    activeAction,
    isDraftDisabled,
    isCreateDisabled,
    onCancel,
    onSaveAsDraft,
}: ProjectDialogActionsProps) => {
    const theme = useTheme();

    return (
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1.5 }}>
            <Button
                onClick={onCancel}
                disabled={isSubmitting}
                variant="outlined"
                sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    borderColor: theme.palette.divider,
                    color: theme.palette.text.primary,
                    '&:hover': {
                        borderColor: theme.palette.text.primary,
                        backgroundColor: alpha(theme.palette.text.primary, 0.04),
                    },
                }}
            >
                Cancel
            </Button>

            <Button
                onClick={onSaveAsDraft}
                disabled={isDraftDisabled}
                variant="outlined"
                sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main,
                    '&:hover': {
                        borderColor: theme.palette.primary.dark,
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    },
                }}
            >
                {isSubmitting && activeAction === 'draft' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} color="inherit" />
                        Saving...
                    </Box>
                ) : (
                    'Save as Draft'
                )}
            </Button>

            <Button
                type="submit"
                disabled={isCreateDisabled}
                variant="contained"
                sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    minWidth: 120,
                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                    '&:hover': {
                        boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                    },
                }}
            >
                {isSubmitting && activeAction === 'create' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={20} color="inherit" />
                        Creating...
                    </Box>
                ) : (
                    'Create Project'
                )}
            </Button>
        </DialogActions>
    );
};

export default ProjectDialogActions;
