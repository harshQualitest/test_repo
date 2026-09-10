import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    InputAdornment,
    IconButton,
    Stack,
    Alert,
    CircularProgress,
    useTheme,
    alpha,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Person as PersonIcon,
    Lock as LockIcon,
    Email as EmailIcon,
    CheckCircle as CheckCircleIcon,
    PersonAdd as PersonAddIcon,
    Business as BusinessIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
    fetchUserById,
    selectCurrentUser,
    selectUserLoading,
    selectUserError,
    createUser,
    selectCreateUserLoading,
    selectCreateUserError,
    clearCreateUserState,
} from '../redux/slices/userSlice';

interface InvitationFormData {
    name: string;
    password: string;
    confirmPassword: string;
}

/** Password strength pattern: requires lower, upper, and digit. */
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

/**
 * Pure validation function for the invitation form.
 * Returns a validation error object, or null when the form is valid.
 * Extracted from the component to keep AcceptInvitation's cognitive complexity within limits.
 */
const validateInvitationForm = (
    data: InvitationFormData,
): { message: string; field?: string } | null => {
    if (!data.name.trim()) return { message: 'Full name is required', field: 'name' };
    if (!data.password) return { message: 'Password is required', field: 'password' };
    if (data.password.length < 8) return { message: 'Password must be at least 8 characters', field: 'password' };
    if (!PASSWORD_STRENGTH_REGEX.test(data.password)) {
        return {
            message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
            field: 'password',
        };
    }
    if (!data.confirmPassword) return { message: 'Please confirm your password', field: 'confirmPassword' };
    if (data.password !== data.confirmPassword) return { message: 'Passwords do not match', field: 'confirmPassword' };
    return null;
};

/**
 * Component: AcceptInvitation
 *
 * Purpose: Route-level page that lets a newly invited user (identified by
 * `userId` in the URL) set their display name and password to finalize
 * account creation from an invitation link.
 *
 * Responsibilities:
 * - Fetch the invited user's pre-populated details (email, org, role) by ID.
 * - Validate and collect the name/password/confirm-password form.
 * - Submit the registration via `createUser` and redirect to `/login` on success.
 * - Render distinct loading, invalid-invitation, success, and form states.
 *
 * Props: none (reads `userId` from route params via `useParams`).
 *
 * State:
 * - `formData` — { name, password, confirmPassword } form values.
 * - `showPassword` / `showConfirmPassword` — visibility toggles for the two password fields.
 * - `validationError` — current client-side validation or submit error ({ message, field? }).
 * - `isSuccess` — true once account creation succeeds, switches to the success screen.
 *
 * Redux (slice: userSlice):
 * - Selectors: `selectCurrentUser`, `selectUserLoading`, `selectUserError`,
 *   `selectCreateUserLoading`, `selectCreateUserError`.
 * - Thunks/actions dispatched: `fetchUserById`, `createUser`, `clearCreateUserState`.
 *
 * API calls: indirectly via the `fetchUserById` and `createUser` thunks (userSlice).
 *
 * Side effects: see the two `useEffect` hooks below.
 *
 * Business rules:
 * - Password must be 8+ chars and contain lowercase, uppercase, and a digit
 *   (see `PASSWORD_STRENGTH_REGEX` / `validateInvitationForm`).
 * - Confirm-password must match password.
 * - Requires both a valid `userId` and a fetched user with `email`/`org_id`
 *   before allowing account creation.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const AcceptInvitation = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { userId } = useParams<{ userId: string }>();

    // Redux state
    const userDetails = useAppSelector(selectCurrentUser);
    const isLoadingUser = useAppSelector(selectUserLoading);
    const userError = useAppSelector(selectUserError);
    const isCreatingUser = useAppSelector(selectCreateUserLoading);
    const createUserError = useAppSelector(selectCreateUserError);

    // Local state
    const [formData, setFormData] = useState<InvitationFormData>({
        name: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [validationError, setValidationError] = useState<{ message: string; field?: string } | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Fetch user details by ID on mount
    // Runs once when `userId` (from the route) becomes available, so the invitee's
    // email/org/role can be displayed and used later when submitting the form.
    useEffect(() => {
        if (userId) {
            dispatch(fetchUserById(userId));
        }
    }, [userId, dispatch]);

    // Clear create user state on mount
    // Ensures a stale success/error/loading state from a previous visit to this
    // page (or another invitation) doesn't leak into this mount.
    useEffect(() => {
        dispatch(clearCreateUserState());
    }, [dispatch]);

    /**
     * Updates a single form field as the user types and clears any existing
     * validation error so the error message doesn't linger after correction.
     * @param field - which form field to update ('name' | 'password' | 'confirmPassword')
     * @returns an input change handler bound to that field
     */
    const handleInputChange = (field: keyof InvitationFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [field]: event.target.value,
        }));
        // Clear errors when user starts typing
        if (validationError) {
            setValidationError(null);
        }
    };

    /**
     * Toggles the masked/visible state of the password or confirm-password field.
     * Triggered by clicking the show/hide (eye) icon adornment.
     * @param field - which field's visibility to toggle
     */
    const handleTogglePasswordVisibility = (field: 'password' | 'confirmPassword') => () => {
        field === 'password' ? setShowPassword((prev) => !prev) : setShowConfirmPassword((prev) => !prev);
    };

    /**
     * Runs the pure `validateInvitationForm` check against current form state
     * and stores any resulting error for display.
     * @returns true when the form is valid, false otherwise
     */
    const validateForm = (): boolean => {
        const error = validateInvitationForm(formData);
        setValidationError(error);
        return error === null;
    };

    /**
     * Handles the invitation form submission: validates input, then dispatches
     * `createUser` with the invited user's email/org plus the chosen name/password.
     * On success shows the success screen and redirects to /login after 2s;
     * on failure (or missing userId/user details) surfaces an error message.
     * @param event - form submit event (default browser submission is prevented)
     * @throws surfaces errors as a validationError rather than rethrowing
     */
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        setValidationError(null);

        try {
            if (!userId) {
                throw new Error('Invalid invitation - missing user ID');
            }

            if (!userDetails?.email || !userDetails?.org_id) {
                throw new Error('Invalid user details - missing email or organization');
            }

            // Dispatch createUser action with the registration payload
            const resultAction = await dispatch(
                createUser({
                    user_id: userId,
                    name: formData.name,
                    email: userDetails.email,
                    password: formData.password,
                    org_id: userDetails.org_id,
                    status: 'accepted',
                    remarks: `Account created via invitation on ${new Date().toISOString()}`,
                }),
            );

            // Check if the action was successful
            if (createUser.fulfilled.match(resultAction)) {
                setIsSuccess(true);

                // Redirect to login after 2 seconds
                setTimeout(() => {
                    navigate('/login', {
                        state: {
                            message: 'Account created successfully! Please sign in with your credentials.',
                        },
                    });
                }, 2000);
            } else {
                // Handle rejection
                throw new Error((resultAction.payload as string) || 'Failed to create account');
            }
        } catch (error: any) {
            console.error('Failed to create account:', error);
            setValidationError({
                message: error.message || createUserError || 'Failed to create account. Please try again.',
            });
        }
    };

    // Show loading state while fetching user details
    if (isLoadingUser) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Stack spacing={2} alignItems="center">
                    <CircularProgress size={48} />
                    <Typography variant="body1" color="text.secondary">
                        Loading invitation details...
                    </Typography>
                </Stack>
            </Box>
        );
    }

    // Show error if user details fetch failed
    if (userError || !userDetails) {
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
                    px: { xs: 2, sm: 4 },
                }}
            >
                <Card sx={{ maxWidth: 500, borderRadius: 4 }}>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
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
                                mb: 3,
                            }}
                        >
                            <Typography variant="h2" color="error">
                                ✕
                            </Typography>
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                            Invalid Invitation Link
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                            {userError ||
                                'This invitation link is invalid or has expired. Please contact your administrator to receive a new invitation.'}
                        </Typography>
                        <Button variant="contained" onClick={() => navigate('/login')} sx={{ borderRadius: 2 }}>
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    // Show success message
    if (isSuccess) {
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
                    px: { xs: 2, sm: 4 },
                }}
            >
                <Card sx={{ maxWidth: 500, borderRadius: 4 }}>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                        <Box
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                backgroundColor: alpha(theme.palette.success.main, 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 3,
                            }}
                        >
                            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                            Account Created Successfully!
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                            Your account has been created. Redirecting to login page...
                        </Typography>
                        <CircularProgress size={32} />
                    </CardContent>
                </Card>
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
                py: 4,
            }}
        >
            <Card
                sx={{
                    width: '100%',
                    maxWidth: 600,
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
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                        <Box
                            sx={{
                                width: 80,
                                height: 80,
                                borderRadius: 4,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 3,
                                boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.3)}`,
                            }}
                        >
                            <PersonAddIcon sx={{ fontSize: 40, color: 'white' }} />
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                            Welcome to Qualicollect
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Complete your profile to get started
                        </Typography>
                    </Box>

                    {/* User Invitation Details */}
                    {userDetails && (
                        <Stack spacing={2} sx={{ mb: 3 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <EmailIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        Email:
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {userDetails.email}
                                    </Typography>
                                </Stack>
                            </Box>

                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                                }}
                            >
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <BusinessIcon sx={{ color: 'secondary.main', fontSize: 20 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        Role:
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {userDetails.role?.replace('_', ' ').toUpperCase()}
                                    </Typography>
                                </Stack>
                            </Box>
                        </Stack>
                    )}

                    {/* Error Alert */}
                    {validationError && (
                        <Alert
                            severity="error"
                            sx={{ mb: 3, borderRadius: 2 }}
                            onClose={() => setValidationError(null)}
                        >
                            {validationError.message}
                        </Alert>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                label="Full Name"
                                value={formData.name}
                                onChange={handleInputChange('name')}
                                error={validationError?.field === 'name'}
                                disabled={isCreatingUser}
                                required
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonIcon color="action" />
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    },
                                }}
                            />

                            <TextField
                                fullWidth
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={handleInputChange('password')}
                                error={validationError?.field === 'password'}
                                disabled={isCreatingUser}
                                required
                                helperText="Minimum 8 characters with uppercase, lowercase, and number"
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockIcon color="action" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={handleTogglePasswordVisibility('password')}
                                                    disabled={isCreatingUser}
                                                    edge="end"
                                                    size="small"
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    },
                                }}
                            />

                            <TextField
                                fullWidth
                                label="Confirm Password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={handleInputChange('confirmPassword')}
                                error={validationError?.field === 'confirmPassword'}
                                disabled={isCreatingUser}
                                required
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockIcon color="action" />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={handleTogglePasswordVisibility('confirmPassword')}
                                                    disabled={isCreatingUser}
                                                    edge="end"
                                                    size="small"
                                                >
                                                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    },
                                }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={isCreatingUser}
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
                                    isCreatingUser ? <CircularProgress size={20} color="inherit" /> : <PersonAddIcon />
                                }
                            >
                                {isCreatingUser ? 'Creating Account...' : 'Create Account'}
                            </Button>
                        </Stack>
                    </form>

                    {/* Footer */}
                    <Box sx={{ textAlign: 'center', mt: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                            Already have an account?{' '}
                            <Button
                                variant="text"
                                onClick={() => navigate('/login')}
                                sx={{
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    p: 0,
                                    minWidth: 'auto',
                                }}
                            >
                                Sign in
                            </Button>
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default AcceptInvitation;
