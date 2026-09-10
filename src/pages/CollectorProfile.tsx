import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Typography,
    IconButton,
    alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { selectUser, logoutUser, clearAuth } from '../redux/slices/loginSlice';
import { withPageErrorBoundary } from '../utils/withPageErrorBoundary';
import { getUserRole } from '../utils/roles';

const C = {
    indigo: '#4338CA',
    indigoMid: '#6366F1',
    indigoLight: '#EEF2FF',
    indigoDark: '#3730A3',
    red: '#DC2626',
    redLight: '#FEF2F2',
    bg: '#F1F5F9',
    surface: '#FFFFFF',
    text: '#0F172A',
    textSec: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
} as const;

/** Formats an ISO date string for display (e.g. "24 July 2026"); returns null when absent or unparsable. */
const fmt = (d?: string) => {
    if (!d) return null;
    try {
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return d;
    }
};

const roleLabel: Record<string, string> = {
    collector: 'Data Collector',
    annotator: 'Annotator',
    reviewer: 'Reviewer',
    qa: 'QA',
    project_manager: 'Project Manager',
    workspace_manager: 'Workspace Manager',
    super_admin: 'Super Admin',
    viewer: 'Viewer',
};

interface InfoRowProps {
    icon: React.ReactNode;
    label: string;
    value: string;
}

/**
 * Component: InfoRow
 * Purpose: Renders a single labeled icon/value row used inside the Account and
 * Organization cards on the collector profile page.
 * Props: icon (leading icon), label (small caption above the value), value (the display text).
 */
const InfoRow = ({ icon, label, value }: InfoRowProps) => (
    <Box sx={{
        display: 'flex', alignItems: 'flex-start', gap: 1.75,
        py: 1.4,
        '&:not(:last-child)': { borderBottom: `1px solid ${C.border}` },
    }}>
        <Box sx={{
            width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
            bgcolor: C.indigoLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mt: 0.1,
        }}>
            {icon}
        </Box>
        <Box minWidth={0}>
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.2 }}>
                {label}
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: C.text, wordBreak: 'break-word' }}>
                {value}
            </Typography>
        </Box>
    </Box>
);

/**
 * Component: CollectorProfile
 *
 * Purpose: Read-only profile page for the "Collector" role, showing account
 * details (email, username, role, join date), organization info, and a sign-out action.
 *
 * Responsibilities:
 * - Display the logged-in collector's account and organization details.
 * - Provide a sign-out action that clears auth state and redirects to /login.
 *
 * Props: none.
 *
 * Redux (loginSlice): `selectUser` (selector); `logoutUser` (thunk), `clearAuth`
 * (action) dispatched on sign-out.
 *
 * Custom utils used: `getUserRole` (src/utils/roles.ts) to resolve the display role.
 *
 * Major child components: `InfoRow` (one per displayed field).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const CollectorProfile = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);

    const userRole = getUserRole(user);
    const displayRole = roleLabel[userRole] ?? userRole;
    // Build up-to-two-letter initials from the user's name for the avatar (e.g. "Jane Doe" -> "JD").
    const initials = (user?.name ?? 'U')
        .split(' ')
        .map(w => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const joinedDate = fmt(user?.created_at);
    const orgName = (user?.organization as any)?.name ?? null;

    /**
     * Signs the current user out: calls the `logoutUser` thunk (server-side
     * session/token invalidation), clears local auth state, then redirects to
     * the login page. Triggered by the "Sign Out" button.
     */
    const handleLogout = async () => {
        await dispatch(logoutUser());
        dispatch(clearAuth());
        navigate('/login', { replace: true });
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: C.bg, display: 'flex', flexDirection: 'column' }}>

            {/* ── Hero ── */}
            <Box
                sx={{
                    background: `linear-gradient(145deg, ${C.indigoDark} 0%, ${C.indigoMid} 100%)`,
                    position: 'relative',
                    overflow: 'hidden',
                    pt: 'env(safe-area-inset-top, 0px)',
                    pb: 5,
                }}
            >
                {/* Decorative circles */}
                <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                <Box sx={{ position: 'absolute', bottom: -40, left: -30, width: 160, height: 160, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

                <Box sx={{ maxWidth: 600, mx: 'auto', px: { xs: 2, sm: 3 }, pt: 1.25, position: 'relative', zIndex: 1 }}>
                    {/* Back */}
                    <IconButton
                        onClick={() => navigate(-1)}
                        size="small"
                        sx={{ color: 'rgba(255,255,255,0.65)', mb: 3, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}
                    >
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>

                    {/* Avatar */}
                    <Box
                        sx={{
                            width: 76, height: 76, borderRadius: '22px',
                            bgcolor: 'rgba(255,255,255,0.18)',
                            border: '2px solid rgba(255,255,255,0.28)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mb: 2,
                        }}
                    >
                        <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                            {initials}
                        </Typography>
                    </Box>

                    {/* Name */}
                    <Typography fontWeight={800} sx={{ color: '#fff', fontSize: { xs: '1.35rem', sm: '1.5rem' }, lineHeight: 1.2, mb: 0.75 }}>
                        {user?.name ?? '—'}
                    </Typography>

                    {/* Role badge */}
                    <Box sx={{
                        display: 'inline-flex', alignItems: 'center',
                        px: 1.25, py: 0.4, borderRadius: '8px',
                        bgcolor: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.2)',
                    }}>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em' }}>
                            {displayRole}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* ── Content ── */}
            <Box sx={{
                flex: 1,
                maxWidth: 600, width: '100%', mx: 'auto',
                px: { xs: 2, sm: 3 },
                pt: 2.5,
                pb: { xs: 10, sm: 8 },
                display: 'flex', flexDirection: 'column', gap: 2,
                mt: -3,
            }}>

                {/* Account card */}
                <Box sx={{
                    bgcolor: C.surface, borderRadius: '18px',
                    border: `1px solid ${C.border}`,
                    px: { xs: 2, sm: 2.5 }, pt: 1, pb: 0.5,
                    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                }}>
                    <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', pt: 1.5, pb: 0.5 }}>
                        Account
                    </Typography>

                    <InfoRow
                        icon={<EmailOutlinedIcon sx={{ fontSize: 17, color: C.indigo }} />}
                        label="Email"
                        value={user?.email ?? '—'}
                    />

                    {user?.username && (
                        <InfoRow
                            icon={<PersonOutlineIcon sx={{ fontSize: 17, color: C.indigo }} />}
                            label="Username"
                            value={user.username}
                        />
                    )}

                    <InfoRow
                        icon={<BadgeOutlinedIcon sx={{ fontSize: 17, color: C.indigo }} />}
                        label="Role"
                        value={displayRole}
                    />

                    {joinedDate && (
                        <InfoRow
                            icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 17, color: C.indigo }} />}
                            label="Member Since"
                            value={joinedDate}
                        />
                    )}
                </Box>

                {/* Organization card — only shown if org info available */}
                {orgName && (
                    <Box sx={{
                        bgcolor: C.surface, borderRadius: '18px',
                        border: `1px solid ${C.border}`,
                        px: { xs: 2, sm: 2.5 }, pt: 1, pb: 0.5,
                        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                    }}>
                        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em', pt: 1.5, pb: 0.5 }}>
                            Organization
                        </Typography>
                        <InfoRow
                            icon={<BusinessOutlinedIcon sx={{ fontSize: 17, color: C.indigo }} />}
                            label="Organization"
                            value={orgName}
                        />
                    </Box>
                )}

                {/* Sign out */}
                <Box sx={{ mt: 1 }}>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<LogoutIcon />}
                        onClick={handleLogout}
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.93rem',
                            py: 1.3,
                            color: C.red,
                            borderColor: alpha(C.red, 0.35),
                            '&:hover': {
                                bgcolor: C.redLight,
                                borderColor: C.red,
                            },
                        }}
                    >
                        Sign Out
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default withPageErrorBoundary(CollectorProfile, 'Collector Profile');
