import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Box,
    useTheme,
    alpha,
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

interface ConfirmationDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'primary' | 'error' | 'warning' | 'success';
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

/**
 * Component: ConfirmationDialog
 *
 * Purpose: Generic, reusable MUI dialog for confirming a destructive or
 * important action (e.g. delete, remove, archive) before it is executed.
 *
 * Responsibilities:
 * - Renders a title, warning icon, message, and Confirm/Cancel actions.
 * - Themes the icon/button accents based on the `confirmColor` prop.
 * - Disables interaction and shows a "Processing..." label while `loading` is true.
 *
 * Props:
 * - open (boolean): whether the dialog is visible.
 * - title (string): dialog heading text.
 * - message (string): body copy explaining the action to confirm.
 * - confirmText (string, optional): label for the confirm button (default 'Confirm').
 * - cancelText (string, optional): label for the cancel button (default 'Cancel').
 * - confirmColor ('primary' | 'error' | 'warning' | 'success', optional): semantic color for the confirm action (default 'primary').
 * - onConfirm (() => void): called when the user confirms.
 * - onCancel (() => void): called when the user cancels or dismisses the dialog.
 * - loading (boolean, optional): disables both actions and swaps confirm label to a busy state.
 *
 * Business logic: while `loading` is true, closing via backdrop/escape is disabled
 * (onClose is undefined) so an in-flight action cannot be dismissed accidentally.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ConfirmationDialog = ({
    open,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmColor = 'primary',
    onConfirm,
    onCancel,
    loading = false,
}: ConfirmationDialogProps) => {
    const theme = useTheme();

    /**
     * Resolves the semantic `confirmColor` prop to an actual theme color value,
     * used to tint the icon background, icon color, and confirm button shadow.
     * @returns {string} A MUI theme palette color (hex/rgb string).
     */
    const getConfirmColorValue = () => {
        // Map the semantic color name to the matching palette so the icon/badge
        // visually agrees with the confirm button's color prop.
        switch (confirmColor) {
            case 'error':
                return theme.palette.error.main;
            case 'warning':
                return theme.palette.warning.main;
            case 'success':
                return theme.palette.success.main;
            default:
                return theme.palette.primary.main;
        }
    };

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onCancel}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 3,
                        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`,
                    },
                },
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            backgroundColor: alpha(getConfirmColorValue(), 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <WarningAmberRoundedIcon
                            sx={{
                                fontSize: 24,
                                color: getConfirmColorValue(),
                            }}
                        />
                    </Box>
                    <Box sx={{ fontWeight: 600, fontSize: '1.125rem' }}>{title}</Box>
                </Box>
            </DialogTitle>

            <DialogContent>
                <DialogContentText sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>
                    {message}
                </DialogContentText>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
                <Button
                    onClick={onCancel}
                    disabled={loading}
                    variant="outlined"
                    sx={{
                        textTransform: 'none',
                        borderRadius: 2,
                        px: 3,
                        borderColor: theme.palette.divider,
                        color: 'text.primary',
                        '&:hover': {
                            borderColor: theme.palette.text.primary,
                            backgroundColor: alpha(theme.palette.text.primary, 0.04),
                        },
                    }}
                >
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    disabled={loading}
                    variant="contained"
                    color={confirmColor}
                    sx={{
                        textTransform: 'none',
                        borderRadius: 2,
                        px: 3,
                        fontWeight: 600,
                        boxShadow: `0 4px 14px ${alpha(getConfirmColorValue(), 0.25)}`,
                        '&:hover': {
                            boxShadow: `0 6px 20px ${alpha(getConfirmColorValue(), 0.35)}`,
                        },
                    }}
                >
                    {loading ? 'Processing...' : confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;
