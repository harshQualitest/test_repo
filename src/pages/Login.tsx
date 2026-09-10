import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import {
    Box,
    Button,
    Typography,
    Stack,
    Alert,
    CircularProgress,
    useTheme,
    alpha,
    Link,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Divider,
} from '@mui/material';
import {
    Person as PersonIcon,
    Lock as LockIcon,
    VpnKey as VpnKeyIcon,
    Close as CloseIcon,
    WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import Input from '../components/shared/Input';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { useToast } from '../hooks/useToast';
import userApi from '../services/api/usersApi';
import {
    loginUser,
    verifyOtp,
    clearError,
    clearOtpState,
    clearAlreadyLoggedIn,
    selectIsLoading,
    selectAuthError,
    selectIsAuthenticated,
    selectUser,
    selectOtpRequired,
    selectOtpEmail,
    selectIsAlreadyLoggedIn,
} from '../redux/slices/loginSlice';
import { fetchWorkspaces, selectWorkspaces } from '../redux/slices/workspaceSlice';
import { getUserRole, ROLES } from '../utils/roles';
import type { AppDispatch } from '../redux/store';

/**
 * Determines where to redirect an annotator/reviewer after a successful login.
 *
 * Business rule: annotators/reviewers land on their first assigned workspace
 * instead of the admin dashboard. If the user has no organization assignment
 * they are sent home with an onboarding message; if they have an organization
 * but no workspace assignment they are also sent home (nothing to show yet).
 * Otherwise the user's first known workspace is used, fetching the workspace
 * list from the API first if it hasn't been loaded yet.
 *
 * @param user - Authenticated user record (includes assignments/organization).
 * @param workspaces - Workspaces already loaded into Redux state, if any.
 * @param workspacesLoading - Guards against re-triggering the fetch while one is in flight.
 * @param dispatch - Redux dispatch used to trigger `fetchWorkspaces`.
 * @param navigate - React Router navigate function used to redirect the user.
 * @param setWorkspacesLoading - Local setter to track the in-flight fetch.
 * @param showSuccess - Toast helper used to inform users with no org assignment.
 */
const resolveAnnotatorRedirect = (
    user: any,
    workspaces: any[],
    workspacesLoading: boolean,
    dispatch: AppDispatch,
    navigate: NavigateFunction,
    setWorkspacesLoading: (v: boolean) => void,
    showSuccess: (msg: string) => void,
): void => {
    const hasWorkspaceAssignment = user.assignments?.some((a: any) => a.entity === 'workspace');
    const hasOrganizationAssignment = user.assignments?.some((a: any) => a.entity === 'organization');

    // No org assignment at all: account setup is incomplete, so send home with a friendly notice.
    if (!hasOrganizationAssignment) {
        setWorkspacesLoading(false);
        showSuccess('Welcome! Please contact your administrator to complete your account setup.');
        navigate('/', { replace: true });
        return;
    }
    // Org assigned but no workspace assigned yet: nothing to route into.
    if (!hasWorkspaceAssignment) {
        setWorkspacesLoading(false);
        navigate('/', { replace: true });
        return;
    }
    // Workspaces already in Redux state: jump straight to the first one.
    if (workspaces.length > 0) {
        navigate(`/workspace/${workspaces[0]._id}`, { replace: true });
        return;
    }
    // Avoid duplicate fetches if one is already in flight.
    if (workspacesLoading) return;

    setWorkspacesLoading(true);
    const organizationId = user.organization?.organization_id;
    if (!organizationId) {
        setWorkspacesLoading(false);
        navigate('/', { replace: true });
        return;
    }

    // Workspaces not loaded yet: fetch them, then route to the first result (or home if none).
    dispatch(fetchWorkspaces({ org_id: organizationId }))
        .unwrap()
        .then((response) => {
            setWorkspacesLoading(false);
            const fetched = response.data || [];
            navigate(fetched.length > 0 ? `/workspace/${fetched[0]._id}` : '/', { replace: true });
        })
        .catch((error) => {
            setWorkspacesLoading(false);
            console.error('Error fetching workspaces:', error);
            navigate('/', { replace: true });
        });
};

interface LoginFormData {
    email: string;
    password: string;
    otp: string;
}

/**
 * Component: Login
 *
 * Purpose: Public login page for Qualicollect. Handles email/password sign-in,
 * an optional OTP verification step, a "forgot password" flow, and the
 * "already logged in elsewhere" session-override confirmation.
 *
 * Responsibilities:
 * - Collects and validates email/password (or OTP) input.
 * - Dispatches `loginUser` / `verifyOtp` thunks and surfaces auth errors.
 * - Redirects annotators/reviewers to their first workspace after login,
 *   while other roles land on the default route.
 * - Offers a "forgot password" dialog that calls the reset-link API directly.
 * - Confirms overriding an already-active session on another device.
 *
 * State:
 * - `formData` - email/password/otp form fields.
 * - `validationError` - client-side validation error (message + offending field).
 * - `workspacesLoading` - guards the annotator/reviewer workspace redirect fetch.
 * - `forgotPasswordOpen` / `forgotPasswordEmail` / `forgotPasswordLoading` / `forgotPasswordError` -
 *   state for the "forgot password" dialog.
 *
 * Redux:
 * - Selectors (loginSlice): `selectIsLoading`, `selectAuthError`, `selectIsAuthenticated`,
 *   `selectUser`, `selectOtpRequired`, `selectOtpEmail`, `selectIsAlreadyLoggedIn`.
 * - Selector (workspaceSlice): `selectWorkspaces`.
 * - Actions/thunks: `loginUser`, `verifyOtp`, `clearError`, `clearOtpState`,
 *   `clearAlreadyLoggedIn` (loginSlice), `fetchWorkspaces` (workspaceSlice).
 *
 * Custom hooks: `useToast` (showSuccess/showError).
 *
 * API calls: `userApi.forgotPassword(email)` (direct call, not via a thunk).
 *
 * Side effects: see the `useEffect` below — redirects authenticated users based on role.
 *
 * Business rules: annotators/reviewers are redirected to their first workspace
 * instead of the default landing page; users without an organization/workspace
 * assignment are routed home with guidance.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const Login = () => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { showSuccess, showError } = useToast();

    const isLoading = useAppSelector(selectIsLoading);
    const authError = useAppSelector(selectAuthError);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const user = useAppSelector(selectUser);
    const workspaces = useAppSelector(selectWorkspaces);
    const otpRequired = useAppSelector(selectOtpRequired);
    const otpEmail = useAppSelector(selectOtpEmail);
    const isAlreadyLoggedIn = useAppSelector(selectIsAlreadyLoggedIn);

    const successMessage = location.state?.message as string | undefined;
    const warningMessage = location.state?.warningMessage as string | undefined;

    const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '', otp: '' });
    const [validationError, setValidationError] = useState<{ message: string; field?: string } | null>(null);
    const [workspacesLoading, setWorkspacesLoading] = useState(false);

    const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const [forgotPasswordError, setForgotPasswordError] = useState('');

    // Runs whenever auth state changes (e.g. right after a successful login).
    // Business rule: annotators/reviewers are routed to their first workspace,
    // all other authenticated roles go to the default landing route.
    useEffect(() => {
        if (!isAuthenticated || !user) return;
        const userRole = getUserRole(user);
        if (userRole === ROLES.ANNOTATOR || userRole === ROLES.REVIEWER) {
            resolveAnnotatorRedirect(user, workspaces, workspacesLoading, dispatch, navigate, setWorkspacesLoading, showSuccess);
        } else {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, user, workspaces, navigate, dispatch, workspacesLoading, showSuccess]);

    /**
     * Curried change handler for a login form field.
     * Updates the field's value and clears any stale validation/auth error
     * so the user isn't shown an outdated error while retyping.
     * @param field - Which `LoginFormData` key to update.
     * @returns An input change handler bound to that field.
     */
    const handleInputChange = (field: keyof LoginFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [field]: event.target.value }));
        if (validationError) setValidationError(null);
        if (authError) dispatch(clearError());
    };

    /**
     * Validates the currently-visible form (OTP step vs. email/password step)
     * and sets `validationError` on the first failing rule.
     * @returns `true` when the form is valid and can be submitted.
     */
    const validateForm = (): boolean => {
        // OTP step has its own required/length rules and skips email/password checks.
        if (otpRequired) {
            if (!formData.otp) { setValidationError({ message: 'OTP is required', field: 'otp' }); return false; }
            if (formData.otp.length !== 6) { setValidationError({ message: 'OTP must be 6 digits', field: 'otp' }); return false; }
            return true;
        }
        if (!formData.email) { setValidationError({ message: 'Email is required', field: 'email' }); return false; }
        if (!formData.password) { setValidationError({ message: 'Password is required', field: 'password' }); return false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setValidationError({ message: 'Please enter a valid email address', field: 'email' });
            return false;
        }
        if (formData.password.length < 6) {
            setValidationError({ message: 'Password must be at least 6 characters', field: 'password' });
            return false;
        }
        return true;
    };

    /**
     * Form submit handler. Validates input, then dispatches either
     * `verifyOtp` (when the OTP step is active) or `loginUser`.
     * @param event - The form submit event; default is prevented.
     */
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!validateForm()) return;
        setValidationError(null);
        if (authError) dispatch(clearError());
        if (otpRequired && otpEmail) {
            dispatch(verifyOtp({ email: otpEmail, otp: formData.otp }));
        } else {
            dispatch(loginUser({ email: formData.email, password: formData.password }));
        }
    };

    /** Leaves the OTP step and resets the form back to a fresh email/password login. */
    const handleBackToLogin = () => {
        dispatch(clearOtpState());
        dispatch(clearError());
        setFormData({ email: '', password: '', otp: '' });
        setValidationError(null);
    };

    /** Dismisses the "active session elsewhere" dialog without logging in. */
    const handleCancelSessionOverride = () => dispatch(clearAlreadyLoggedIn());

    /** Confirms overriding the other active session and retries login with `override_token`. */
    const handleContinueToLogin = () => {
        dispatch(clearAlreadyLoggedIn());
        dispatch(loginUser({ email: formData.email, password: formData.password, override_token: true }));
    };

    /** Opens the "forgot password" dialog with a blank email field and no prior error. */
    const handleForgotPasswordOpen = () => { setForgotPasswordOpen(true); setForgotPasswordEmail(''); setForgotPasswordError(''); };

    /** Closes the "forgot password" dialog, unless a reset request is currently in flight. */
    const handleForgotPasswordClose = () => {
        if (!forgotPasswordLoading) { setForgotPasswordOpen(false); setForgotPasswordEmail(''); setForgotPasswordError(''); }
    };

    /**
     * Validates the forgot-password email and calls `userApi.forgotPassword`
     * directly (not through Redux). Shows a success toast and closes the
     * dialog on success, or an inline + toast error on failure.
     */
    const handleForgotPasswordSubmit = async () => {
        setForgotPasswordError('');
        if (!forgotPasswordEmail) { setForgotPasswordError('Email is required'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotPasswordEmail)) {
            setForgotPasswordError('Please enter a valid email address');
            return;
        }
        setForgotPasswordLoading(true);
        try {
            await userApi.forgotPassword(forgotPasswordEmail);
            showSuccess('Password reset link has been sent to your email');
            setForgotPasswordOpen(false);
            setForgotPasswordEmail('');
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Failed to send reset link. Please try again.';
            setForgotPasswordError(msg);
            showError(msg);
        } finally {
            setForgotPasswordLoading(false);
        }
    };

    /**
     * Resolves the error to display: local validation error takes priority,
     * otherwise falls back through the several possible shapes the auth
     * error can arrive in (string, Axios response body, thunk rejection value).
     * @returns The message (and optional offending field) to render, or `null`.
     */
    const getErrorMessage = (): { message: string; field?: string } | null => {
        if (validationError) return validationError;
        if (authError) {
            const e = authError as any;
            if (typeof e === 'string') return { message: e };
            const rd = e?.response?.data;
            if (rd?.error) return { message: rd.error };
            if (rd?.message) return { message: rd.message };
            if (e?.data?.error) return { message: e.data.error };
            if (e?.data?.message) return { message: e.data.message };
            if (e?.error) return { message: e.error };
            if (e?.message && !e.message.includes('Request failed with status code')) return { message: e.message };
            return { message: 'Invalid credentials. Please try again.' };
        }
        return null;
    };

    const displayError = getErrorMessage();

    return (
        <>
            {/* ── Page: dark background with monochrome texture ── */}
            <Box sx={{ position: 'fixed', inset: 0, bgcolor: '#0a0a0a', overflow: 'hidden' }}>

                {/* Dot-grid texture */}
                <Box sx={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                    pointerEvents: 'none',
                }} />

                {/* Soft white radial glow — top-left */}
                <Box sx={{
                    position: 'absolute', top: '-200px', left: '-200px',
                    width: '650px', height: '650px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 65%)',
                    pointerEvents: 'none',
                }} />

                {/* Soft white radial glow — bottom-right */}
                <Box sx={{
                    position: 'absolute', bottom: '-220px', right: '-180px',
                    width: '600px', height: '600px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.045) 0%, transparent 65%)',
                    pointerEvents: 'none',
                }} />

                {/* Scrollable centering layer */}
                <Box sx={{
                    position: 'relative', zIndex: 1,
                    height: '100%', overflowY: 'auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    px: 2, py: 4,
                }}>
                    {/* ── Card ── */}
                    <Box
                        sx={{
                            width: '100%', maxWidth: 420,
                            bgcolor: '#ffffff',
                            borderRadius: '20px',
                            overflow: 'hidden',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 32px 72px rgba(0,0,0,0.65)',
                        }}
                    >
                        {/* ── Black card header ── */}
                        <Box
                            sx={{
                                bgcolor: '#000000',
                                px: { xs: 3, sm: 4 },
                                py: { xs: 2.5, sm: 3 },
                                position: 'relative',
                                overflow: 'hidden',
                                borderBottom: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            {/* Header: fine dot grid */}
                            <Box sx={{
                                position: 'absolute', inset: 0,
                                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
                                backgroundSize: '18px 18px',
                                pointerEvents: 'none',
                            }} />
                            {/* Header: corner white glow */}
                            <Box sx={{
                                position: 'absolute', top: '-50px', right: '-50px',
                                width: '180px', height: '180px', borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)',
                                pointerEvents: 'none',
                            }} />

                            {/* Logo + wordmark */}
                            <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    sx={{
                                        width: 38, height: 38,
                                        borderRadius: '10px',
                                        bgcolor: '#ffffff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                                    }}
                                >
                                    <Typography sx={{ fontWeight: 900, color: '#000', fontSize: '1.05rem', lineHeight: 1 }}>
                                        Q
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', letterSpacing: -0.2, lineHeight: 1.25 }}>
                                        Qualicollect
                                    </Typography>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', letterSpacing: 0.3 }}>
                                        Data Collection & Labeling Platform
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>

                        {/* ── White form body ── */}
                        <Box sx={{ px: { xs: 3, sm: 4 }, pt: { xs: 3, sm: 3.5 }, pb: { xs: 3, sm: 3.5 } }}>

                            {/* Heading */}
                            <Box mb={3}>
                                <Typography
                                    variant="h5"
                                    sx={{
                                        fontWeight: 700, color: '#0a0a0a',
                                        letterSpacing: -0.4, mb: 0.5,
                                        fontSize: { xs: '1.25rem', sm: '1.4rem' },
                                    }}
                                >
                                    {otpRequired ? 'Check your email' : 'Welcome back'}
                                </Typography>
                                <Typography sx={{ color: '#6b7280', fontSize: '0.84rem', lineHeight: 1.55 }}>
                                    {otpRequired
                                        ? `Enter the 6-digit code sent to ${otpEmail}`
                                        : 'Sign in to continue to your workspace'}
                                </Typography>
                            </Box>

                            {/* Alerts */}
                            {warningMessage && (
                                <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '10px' }}
                                    onClose={() => navigate(location.pathname, { replace: true, state: {} })}>
                                    {warningMessage}
                                </Alert>
                            )}
                            {successMessage && (
                                <Alert severity="success" sx={{ mb: 2.5, borderRadius: '10px' }}
                                    onClose={() => navigate(location.pathname, { replace: true, state: {} })}>
                                    {successMessage}
                                </Alert>
                            )}
                            {displayError && (
                                <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}
                                    onClose={() => { setValidationError(null); if (authError) dispatch(clearError()); }}>
                                    {displayError.message}
                                </Alert>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit}>
                                <Stack spacing={2}>
                                    {!otpRequired ? (
                                        <>
                                            <Input
                                                fullWidth
                                                label="Email address"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleInputChange('email')}
                                                error={displayError?.field === 'email'}
                                                disabled={isLoading}
                                                startIcon={<PersonIcon sx={{ color: '#9ca3af', fontSize: 18 }} />}
                                                placeholder="you@company.com"
                                            />
                                            <Box>
                                                <Input
                                                    fullWidth
                                                    label="Password"
                                                    isPassword
                                                    value={formData.password}
                                                    onChange={handleInputChange('password')}
                                                    error={displayError?.field === 'password'}
                                                    disabled={isLoading}
                                                    startIcon={<LockIcon sx={{ color: '#9ca3af', fontSize: 18 }} />}
                                                />
                                                <Box sx={{ textAlign: 'right', mt: 1 }}>
                                                    <Link
                                                        component="button"
                                                        type="button"
                                                        onClick={handleForgotPasswordOpen}
                                                        sx={{
                                                            color: '#9ca3af', textDecoration: 'none',
                                                            fontSize: '0.78rem', fontWeight: 500,
                                                            '&:hover': { color: '#000', textDecoration: 'underline' },
                                                        }}
                                                    >
                                                        Forgot password?
                                                    </Link>
                                                </Box>
                                            </Box>
                                        </>
                                    ) : (
                                        <>
                                            <Input
                                                fullWidth
                                                label="One-time password"
                                                type="text"
                                                value={formData.otp}
                                                onChange={handleInputChange('otp')}
                                                error={displayError?.field === 'otp'}
                                                disabled={isLoading}
                                                startIcon={<VpnKeyIcon sx={{ color: '#9ca3af', fontSize: 18 }} />}
                                                placeholder="123456"
                                                slotProps={{ htmlInput: { maxLength: 6 } }}
                                            />
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Link
                                                    component="button"
                                                    type="button"
                                                    onClick={handleBackToLogin}
                                                    sx={{
                                                        color: '#9ca3af', textDecoration: 'none',
                                                        fontSize: '0.78rem', fontWeight: 500,
                                                        '&:hover': { color: '#000', textDecoration: 'underline' },
                                                    }}
                                                >
                                                    ← Back to login
                                                </Link>
                                            </Box>
                                        </>
                                    )}

                                    <Button
                                        type="submit"
                                        fullWidth
                                        variant="contained"
                                        disabled={isLoading}
                                        sx={{
                                            mt: 0.5,
                                            bgcolor: '#000000',
                                            color: '#ffffff',
                                            borderRadius: '11px',
                                            py: 1.5,
                                            fontSize: '0.875rem',
                                            fontWeight: 600,
                                            letterSpacing: 0.1,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                            '&:hover': {
                                                bgcolor: '#1a1a1a',
                                                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                                                transform: 'translateY(-1px)',
                                            },
                                            '&:active': { transform: 'translateY(0)' },
                                            '&:disabled': { bgcolor: '#e5e7eb', color: '#9ca3af', boxShadow: 'none' },
                                            transition: 'all 0.18s ease',
                                        }}
                                    >
                                        {isLoading ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CircularProgress size={16} color="inherit" />
                                                <span>{otpRequired ? 'Verifying…' : 'Signing in…'}</span>
                                            </Box>
                                        ) : otpRequired ? 'Verify code' : 'Sign in'}
                                    </Button>
                                </Stack>
                            </form>

                            {/* Divider + copyright */}
                            <Box sx={{ mt: 3.5, pt: 3, borderTop: '1px solid #f3f4f6', textAlign: 'center' }}>
                                <Typography sx={{ color: '#d1d5db', fontSize: '0.68rem' }}>
                                    © {new Date().getFullYear()} Qualicollect. All rights reserved.
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>

            {/* ── Active Session Warning Dialog ── */}
            <Dialog
                open={isAlreadyLoggedIn}
                onClose={handleCancelSessionOverride}
                maxWidth="xs"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '18px', mx: 2, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' } } }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Box sx={{
                        width: 34, height: 34, borderRadius: '50%',
                        bgcolor: alpha(theme.palette.warning.main, 0.12),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700} sx={{ fontSize: '0.95rem' }}>
                        Active Session Detected
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: 2.5, pb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        You already have an active session on another device or browser. Continuing here will{' '}
                        <strong>sign out that session immediately</strong>.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1.5, flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
                    <Button onClick={handleCancelSessionOverride} variant="outlined" fullWidth
                        sx={{ borderRadius: '10px', fontWeight: 600, borderColor: '#e0e0e0', color: '#333' }}>
                        Cancel
                    </Button>
                    <Button onClick={handleContinueToLogin} variant="contained" color="warning" fullWidth disabled={isLoading}
                        startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{ borderRadius: '10px', fontWeight: 600 }}>
                        {isLoading ? 'Signing in…' : 'Continue anyway'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Forgot Password Dialog ── */}
            <Dialog
                open={forgotPasswordOpen}
                onClose={handleForgotPasswordClose}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '18px', mx: 2, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' } } }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pb: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Box>
                        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem' }}>Reset password</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.8rem' }}>
                            We'll send a reset link to your email
                        </Typography>
                    </Box>
                    <IconButton onClick={handleForgotPasswordClose} disabled={forgotPasswordLoading} size="small"
                        sx={{ color: '#aaa', '&:hover': { color: '#000' } }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 3, pb: 2 }}>
                    <Stack spacing={2}>
                        {forgotPasswordError && (
                            <Alert severity="error" sx={{ borderRadius: '10px' }}>{forgotPasswordError}</Alert>
                        )}
                        <Input
                            fullWidth label="Email address" type="email"
                            value={forgotPasswordEmail}
                            onChange={(e) => { setForgotPasswordEmail(e.target.value); setForgotPasswordError(''); }}
                            error={Boolean(forgotPasswordError)}
                            disabled={forgotPasswordLoading}
                            placeholder="you@example.com"
                            autoFocus
                        />
                        <Typography variant="caption" color="text.secondary">
                            Check your inbox and spam folder after submitting.
                        </Typography>
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5, flexDirection: { xs: 'column-reverse', sm: 'row' } }}>
                    <Button onClick={handleForgotPasswordClose} disabled={forgotPasswordLoading} variant="outlined" fullWidth
                        sx={{ borderRadius: '10px', fontWeight: 600, borderColor: '#e0e0e0', color: '#333' }}>
                        Cancel
                    </Button>
                    <Button onClick={handleForgotPasswordSubmit} disabled={forgotPasswordLoading} variant="contained" fullWidth
                        sx={{ borderRadius: '10px', fontWeight: 700, bgcolor: '#000', '&:hover': { bgcolor: '#1a1a1a' }, '&:disabled': { bgcolor: '#e5e7eb', color: '#9ca3af' } }}>
                        {forgotPasswordLoading ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={16} color="inherit" />
                                Sending…
                            </Box>
                        ) : 'Send reset link'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default Login;
