import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button, alpha, useTheme } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface NoTasksDialogProps {
    open: boolean;
    onClose: () => void;
    isCompletion?: boolean;
}

/**
 * Component: NoTasksDialog
 *
 * Purpose: Modal shown to an annotator when there are currently no tasks to annotate,
 * with slightly different copy depending on whether they just finished all available
 * tasks ("completion") versus there simply being none available at all.
 *
 * Responsibilities:
 * - Present a clock icon, heading, and explanatory body text.
 * - Offer a single "Go Back" action to dismiss the dialog.
 *
 * Props:
 * - open (boolean): controls dialog visibility (MUI `Dialog` `open` prop).
 * - onClose () => void: called when the dialog should close (backdrop click or "Go Back").
 * - isCompletion (boolean, optional, default false): when true, shows congratulatory
 *   "No More Tasks Available" copy (all tasks finished); when false, shows the generic
 *   "No Tasks Available" copy (none were ever available).
 *
 * State: none.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const NoTasksDialog = ({ open, onClose, isCompletion = false }: NoTasksDialogProps) => {
    const theme = useTheme();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    p: 1.5,
                },
            }}
        >
            <DialogTitle sx={{ textAlign: 'center', pb: 0.5 }}>
                <Box
                    sx={{
                        width: 70,
                        height: 70,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.warning.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 1.5,
                    }}
                >
                    <AccessTimeIcon sx={{ fontSize: 36, color: theme.palette.warning.main }} />
                </Box>
                <Typography variant="h6" fontWeight={700}>
                    {isCompletion ? 'No More Tasks Available' : 'No Tasks Available'}
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 0.5 }}>
                    {isCompletion
                        ? 'Great job! You have completed all available tasks. Please try again after some time for new tasks.'
                        : 'There are no tasks available for annotation at the moment. Please try again after some time or contact your project manager if you believe this is an error.'}
                </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: isCompletion ? 2 : 1 }}>
                <Button
                    variant="contained"
                    size="small"
                    onClick={onClose}
                    sx={{
                        px: isCompletion ? 4 : 3,
                        py: isCompletion ? 1 : 0.75,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                    }}
                >
                    Go Back
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default NoTasksDialog;
