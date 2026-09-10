import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    Stack,
    Alert,
    CircularProgress,
    useTheme,
    alpha,
} from '@mui/material';
import { Lock as LockIcon, VpnKey as VpnKeyIcon } from '@mui/icons-material';
import Input from '../components/shared/Input';
import { useToast } from '../hooks/useToast';
import userApi from '../services/api/usersApi';

/**
 * Component: ForgotPassword
 *
 * Purpose: Password-reset completion page reached via the emailed reset link
 * (`?token=...` query param) — lets the user set and confirm a new password.
 *
 * Responsibilities:
 * - Extract and validate the presence of the reset `token` from the URL.
 * - Validate the new/confirm password fields client-side.
 * - Submit the reset via `userApi.resetPassword` and redirect to /login on success.
 *
 * Props: none (reads `token` from the URL query string).
 *
 * State:
 * - `newPassword` / `confirmPassword` — the password form fields.
 * - `isLoading` — true while the reset request is in flight.
 * - `validationError` — current client-side validation or submit error.
 * - `token` — the reset token extracted from the URL (null until resolved).
 *
 * Custom hooks: `useToast` (`showSuccess`/`showError`).
 *
 * API calls: `userApi.resetPassword(token, newPassword, confirmPassword)`
 * (src/services/api/usersApi.ts).
 *
 * Side effects: see the `useEffect` below (token extraction / invalid-link redirect).
 *
 * Business logic: password must be 6+ characters (see `validateForm`) and match
 * the confirm field; without a token in the URL, the user is redirected to /login.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ForgotPassword = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showSuccess, showError } = useToast();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [validationError, setValidationError] = useState<{ message: string; field?: string } | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Runs once on mount (and whenever the query string/navigate/showError
    // references change): pulls the reset token out of the URL, or bounces the
    // user back to /login with an error toast if it's missing.
    useEffect(() => {
        const tokenFromUrl = searchParams.get('token');
        if (!tokenFromUrl) {
            showError('Invalid or missing reset token');
            setTimeout(() => navigate('/login'), 2000);
        } else {
            setToken(tokenFromUrl);
        }
    }, [searchParams, navigate, showError]);

    /**
     * Updates the new-password or confirm-password field as the user types,
     * clearing any existing validation error.
     * @param field - which field this handler is bound to
     */
    const handleInputChange = (field: 'newPassword' | 'confirmPassword') => (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = event.target.value;
        if (field === 'newPassword') {
            setNewPassword(value);
        } else {
            setConfirmPassword(value);
        }
        // Clear errors when user starts typing
        if (validationError) {
            setValidationError(null);
        }
    };

    /**
     * Validates the new/confirm password fields (required, minimum length,
     * matching values), setting `validationError` on the first failing rule.
     * @returns true when the form passes all checks
     */
    const validateForm = (): boolean => {
        if (!newPassword) {
            setValidationError({ message: 'New password is required', field: 'newPassword' });
            return false;
        }

        if (newPassword.length < 6) {
            setValidationError({ message: 'Password must be at least 6 characters', field: 'newPassword' });
            return false;
        }

        if (!confirmPassword) {
            setValidationError({ message: 'Please confirm your password', field: 'confirmPassword' });
            return false;
        }

        if (newPassword !== confirmPassword) {
            setValidationError({ message: 'Passwords do not match', field: 'confirmPassword' });
            return false;
        }

        return true;
    };

    /**
     * Validates the form and (given a valid token) submits the new password via
     * `userApi.resetPassword`, showing a success toast and redirecting to
     * /login after 2s, or an error toast/message on failure.
     * @param event - form submit event (default browser submission is prevented)
     */
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!validateForm() || !token) {
            return;
        }

        setValidationError(null);
        setIsLoading(true);

        try {
            await userApi.resetPassword(token, newPassword, confirmPassword);
            showSuccess('Password reset successfully! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error: any) {
            const errorMessage = error?.response?.data?.message || 'Failed to reset password. Please try again.';
            setValidationError({ message: errorMessage });
            showError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                    theme.palette.mode === 'light'
                        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(
                              theme.palette.secondary.main,
                              0.1,
                          )} 100%)`
                        : `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.9)} 0%, ${alpha(
                              theme.palette.grey[900],
                              0.9,
                          )} 100%)`,
                px: { xs: 2, sm: 4, md: 6 },
                py: 2,
            }}
        >
            <Card
                sx={{
                    width: '100%',
                    maxWidth: 500,
                    borderRadius: 4,
                    boxShadow:
                        theme.palette.mode === 'dark'
                            ? `0 24px 48px rgba(0,0,0,0.4)`
                            : `0 24px 48px ${alpha(theme.palette.common.black, 0.12)}`,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    background:
                        theme.palette.mode === 'light'
                            ? 'rgba(255, 255, 255, 0.95)'
                            : alpha(theme.palette.background.paper, 0.95),
                    backdropFilter: 'blur(20px)',
                }}
            >
                <CardContent sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Box
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: 3,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 3,
                                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                            }}
                        >
                            <VpnKeyIcon sx={{ fontSize: 40, color: 'white' }} />
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Reset Password
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Enter your new password below
                        </Typography>
                    </Box>

                    {validationError && (
                        <Alert
                            severity="error"
                            sx={{ mb: 3, borderRadius: 2 }}
                            onClose={() => setValidationError(null)}
                        >
                            {validationError.message}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            <Input
                                fullWidth
                                label="New Password"
                                isPassword
                                value={newPassword}
                                onChange={handleInputChange('newPassword')}
                                error={validationError?.field === 'newPassword'}
                                disabled={isLoading}
                                startIcon={<LockIcon color="action" />}
                                placeholder="Enter new password"
                                autoFocus
                            />

                            <Input
                                fullWidth
                                label="Confirm Password"
                                isPassword
                                value={confirmPassword}
                                onChange={handleInputChange('confirmPassword')}
                                error={validationError?.field === 'confirmPassword'}
                                disabled={isLoading}
                                startIcon={<LockIcon color="action" />}
                                placeholder="Confirm new password"
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={isLoading}
                                sx={{
                                    borderRadius: 2,
                                    py: 1.5,
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                                    '&:hover': {
                                        boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                                    },
                                    '&:disabled': {
                                        background: theme.palette.action.disabledBackground,
                                        boxShadow: 'none',
                                    },
                                }}
                                startIcon={
                                    isLoading ? <CircularProgress size={20} color="inherit" /> : <VpnKeyIcon />
                                }
                            >
                                {isLoading ? 'Resetting Password...' : 'Reset Password'}
                            </Button>

                            <Box sx={{ textAlign: 'center', mt: 2 }}>
                                <Button
                                    variant="text"
                                    onClick={() => navigate('/login')}
                                    disabled={isLoading}
                                    sx={{
                                        textTransform: 'none',
                                        color: theme.palette.primary.main,
                                        fontWeight: 500,
                                    }}
                                >
                                    Back to Login
                                </Button>
                            </Box>
                        </Stack>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
};

export default ForgotPassword;