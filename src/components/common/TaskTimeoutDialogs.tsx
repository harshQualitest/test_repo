import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    alpha,
    useTheme,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimerOffIcon from '@mui/icons-material/TimerOff';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface TaskExpiryWarningDialogProps {
    open: boolean;
    onClose: () => void;
    remainingMinutes?: number;
}

/**
 * Component: TaskExpiryWarningDialog
 *
 * Purpose: Dialog shown when task is about to expire (e.g., 2 minutes remaining),
 * warning the annotator/reviewer to submit their work soon before the task is
 * auto-released back to the pool.
 *
 * Responsibilities:
 * - Displays a pulsing warning icon and a countdown-style "X:00 remaining" readout.
 * - Lets the user dismiss the warning to keep working via "Continue Working".
 *
 * Props:
 * - open (boolean): whether the dialog is visible.
 * - onClose (() => void): called when the user dismisses the warning.
 * - remainingMinutes (number, optional): minutes left before timeout (default 2), shown in the countdown text.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const TaskExpiryWarningDialog = ({
    open,
    onClose,
    remainingMinutes = 2,
}: TaskExpiryWarningDialogProps) => {
    const theme = useTheme();

    /** Dismisses the dialog via the MUI `onClose` path (backdrop click/escape). */
    const handleClose = () => {
        onClose();
    };

    /**
     * Dismisses the dialog when "Continue Working" is clicked. Stops the event
     * from propagating/bubbling so it doesn't trigger any underlying task UI click handlers.
     * @param event - the button click event.
     */
    const handleButtonClick = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown={false}
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    p: 1,
                    border: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                    boxShadow: `0 8px 32px ${alpha(theme.palette.warning.main, 0.2)}`,
                },
            }}
        >
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                <Box
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.warning.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                        animation: 'pulse 1.5s infinite',
                        '@keyframes pulse': {
                            '0%': {
                                boxShadow: `0 0 0 0 ${alpha(theme.palette.warning.main, 0.4)}`,
                            },
                            '70%': {
                                boxShadow: `0 0 0 15px ${alpha(theme.palette.warning.main, 0)}`,
                            },
                            '100%': {
                                boxShadow: `0 0 0 0 ${alpha(theme.palette.warning.main, 0)}`,
                            },
                        },
                    }}
                >
                    <WarningAmberIcon
                        sx={{
                            fontSize: 44,
                            color: theme.palette.warning.main,
                        }}
                    />
                </Box>
                <Typography variant="h5" fontWeight={700} color="warning.main">
                    Time Running Out!
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        mb: 2,
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.warning.main, 0.08),
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                    }}
                >
                    <AccessTimeIcon sx={{ color: theme.palette.warning.main, fontSize: 28 }} />
                    <Typography
                        variant="h4"
                        fontWeight={700}
                        sx={{
                            color: theme.palette.warning.main,
                            fontFamily: 'monospace',
                        }}
                    >
                        {remainingMinutes}:00
                    </Typography>
                    <Typography variant="body1" color="text.secondary" fontWeight={500}>
                        remaining
                    </Typography>
                </Box>
                <Typography
                    variant="body1"
                    color="text.secondary"
                    textAlign="center"
                    sx={{ lineHeight: 1.6 }}
                >
                    You have less than <strong>{remainingMinutes} minutes</strong> to complete this task.
                    Please submit your annotation soon to avoid losing your progress.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2, px: 3 }}>
                <Button
                    variant="contained"
                    onClick={handleButtonClick}
                    sx={{
                        px: 4,
                        py: 1,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        backgroundColor: theme.palette.warning.main,
                        color: 'white',
                        '&:hover': {
                            backgroundColor: theme.palette.warning.dark,
                        },
                    }}
                >
                    Continue Working
                </Button>
            </DialogActions>
        </Dialog>
    );
};

interface TaskExpiredDialogProps {
    open: boolean;
    onContinue: () => void;
    timeoutDuration?: string;
}

/**
 * Component: TaskExpiredDialog
 *
 * Purpose: Dialog shown when task has expired due to timeout — informs the
 * user their task was auto-released and reassigned after a period of
 * inactivity, and offers a way to move on to the next task.
 *
 * Responsibilities:
 * - Displays a non-dismissible (no escape key close) modal explaining the
 *   timeout and duration that elapsed.
 * - Provides a single "Continue to Next Task" action.
 *
 * Props:
 * - open (boolean): whether the dialog is visible.
 * - onContinue (() => void): called when the user acknowledges and wants to proceed.
 * - timeoutDuration (string, optional): human-readable duration shown in the
 *   explanation text (default '10:00').
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const TaskExpiredDialog = ({
    open,
    onContinue,
    timeoutDuration = '10:00',
}: TaskExpiredDialogProps) => {
    const theme = useTheme();

    return (
        <Dialog
            open={open}
            maxWidth="sm"
            fullWidth
            disableEscapeKeyDown
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    p: 1,
                    border: `2px solid ${alpha(theme.palette.error.main, 0.3)}`,
                    boxShadow: `0 8px 32px ${alpha(theme.palette.error.main, 0.2)}`,
                },
            }}
        >
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                <Box
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                    }}
                >
                    <TimerOffIcon
                        sx={{
                            fontSize: 44,
                            color: theme.palette.error.main,
                        }}
                    />
                </Box>
                <Typography variant="h5" fontWeight={700} color="error.main">
                    Task Expired Due to Inactivity
                </Typography>
            </DialogTitle>
            <DialogContent>
                <Box
                    sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.error.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.error.main, 0.15)}`,
                        mb: 1,
                    }}
                >
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        textAlign="center"
                        sx={{ lineHeight: 1.7 }}
                    >
                        This task was automatically released after{' '}
                        <Box
                            component="span"
                            sx={{
                                fontWeight: 700,
                                color: theme.palette.error.main,
                                fontFamily: 'monospace',
                                fontSize: '1.1rem',
                            }}
                        >
                            {timeoutDuration}
                        </Box>{' '}
                        of inactivity. It has been reassigned to another annotator.
                    </Typography>
                </Box>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                    sx={{ mt: 1.5 }}
                >
                    Don't worry! You can continue with the next available task.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 2, px: 3 }}>
                <Button
                    variant="contained"
                    onClick={onContinue}
                    sx={{
                        px: 4,
                        py: 1.25,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        backgroundColor: theme.palette.primary.main,
                        color: 'white',
                        boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.3)}`,
                        '&:hover': {
                            backgroundColor: theme.palette.primary.dark,
                            boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                        },
                    }}
                >
                    Continue to Next Task
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default { TaskExpiryWarningDialog, TaskExpiredDialog };
