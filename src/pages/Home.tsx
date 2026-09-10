import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, alpha, useTheme } from '@mui/material';
import WorkspacesOutlinedIcon from '@mui/icons-material/WorkspacesOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { selectUser, selectIsAuthenticated, clearAuth, logoutUser } from '../redux/slices/loginSlice';
import {
    selectNavWorkspaces,
    selectNavWorkspaceLoading,
    fetchNavWorkspaces,
} from '../redux/slices/workspaceSlice';
import {
    selectOrganizations,
    selectCurrentOrganization,
    fetchOrganizations,
    setCurrentOrganization,
} from '../redux/slices/organizationSlice';
import { getUserRole, ROLES } from '../utils/roles';
import Layout from '../components/layout/Layout';
import Dashboard from './Dashboard';

/**
 * Component: Home
 *
 * Purpose: Post-login landing route. Branches by role: Annotators, Reviewers,
 * and Collectors are auto-redirected into their first assigned workspace (or
 * shown a "no workspace" screen), while Admins/Managers see the main `Dashboard`.
 *
 * Responsibilities:
 * - Guard the route: redirect unauthenticated users to /login.
 * - For workspace-redirect roles, load organizations → set the current org →
 *   load that org's nav workspaces → redirect into the first one.
 * - Show a "No Workspace Assigned" screen (with retry/sign-out) when a
 *   workspace-redirect role has zero assigned workspaces.
 * - Render `Dashboard` inside `Layout` for all other roles.
 *
 * Props: none.
 *
 * State:
 * - `hasFetchedWorkspaces` — tracks whether the nav-workspaces fetch has been
 *   dispatched at least once, to avoid a false "not assigned" flash before the
 *   first fetch resolves.
 *
 * Redux:
 * - loginSlice: `selectUser`, `selectIsAuthenticated`, `logoutUser`, `clearAuth`.
 * - organizationSlice: `selectOrganizations`, `selectCurrentOrganization`,
 *   `fetchOrganizations`, `setCurrentOrganization`.
 * - workspaceSlice: `selectNavWorkspaces`, `selectNavWorkspaceLoading`, `fetchNavWorkspaces`.
 *
 * Major child components: `Layout`, `Dashboard`.
 *
 * Side effects: see the five `useEffect` hooks below (auth redirect, org fetch,
 * org auto-select, workspace fetch, workspace redirect).
 *
 * Business logic: Annotators, Reviewers, and Collectors (`needsWorkspaceRedirect`)
 * are routed straight into their first workspace rather than seeing the org
 * dashboard, since those roles operate within a single workspace context.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const Home = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const theme = useTheme();

    const user = useAppSelector(selectUser);
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const organizations = useAppSelector(selectOrganizations);
    const currentOrganization = useAppSelector(selectCurrentOrganization);
    const navWorkspaces = useAppSelector(selectNavWorkspaces);
    const navLoading = useAppSelector(selectNavWorkspaceLoading);

    // Tracks whether we have dispatched the workspace fetch at least once,
    // preventing a false "not assigned" flash before the fetch begins.
    const [hasFetchedWorkspaces, setHasFetchedWorkspaces] = useState(false);

    const userRole = getUserRole(user);
    const isAnnotatorOrReviewer = userRole === ROLES.ANNOTATOR || userRole === ROLES.REVIEWER;
    const isCollector = userRole === ROLES.COLLECTOR;
    // Collectors follow the same workspace-redirect flow as annotators/reviewers
    const needsWorkspaceRedirect = isAnnotatorOrReviewer || isCollector;

    // Redirect unauthenticated users to login
    // Runs whenever auth state changes; guards this route for logged-out visitors.
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    // Fetch organizations for workspace-redirect roles
    // Only triggers for roles that need the workspace-redirect flow, and only
    // if organizations haven't already been loaded (avoids a duplicate fetch).
    useEffect(() => {
        if (isAuthenticated && needsWorkspaceRedirect && organizations.length === 0) {
            dispatch(fetchOrganizations());
        }
    }, [isAuthenticated, needsWorkspaceRedirect, organizations.length, dispatch]);

    // Set first organization as current once organizations are loaded
    // These roles aren't expected to choose an org, so the first one is used implicitly.
    useEffect(() => {
        if (needsWorkspaceRedirect && organizations.length > 0 && !currentOrganization) {
            dispatch(setCurrentOrganization(organizations[0]));
        }
    }, [needsWorkspaceRedirect, organizations, currentOrganization, dispatch]);

    // Fetch nav workspaces once the current organization is known
    // Marks `hasFetchedWorkspaces` true as soon as the fetch is dispatched (not
    // when it resolves), which is what unlocks the "no workspace" branch below
    // once loading finishes rather than showing it prematurely.
    useEffect(() => {
        if (needsWorkspaceRedirect && currentOrganization?._id) {
            dispatch(fetchNavWorkspaces({ org_id: currentOrganization._id, limit: 100, offset: 0 }));
            setHasFetchedWorkspaces(true);
        }
    }, [needsWorkspaceRedirect, currentOrganization?._id, dispatch]);

    // Redirect to first assigned workspace as soon as workspaces are loaded
    useEffect(() => {
        if (needsWorkspaceRedirect && hasFetchedWorkspaces && !navLoading && navWorkspaces.length > 0) {
            navigate(`/workspace/${navWorkspaces[0]._id}`, { replace: true });
        }
    }, [needsWorkspaceRedirect, hasFetchedWorkspaces, navLoading, navWorkspaces, navigate]);

    if (!isAuthenticated) return null;

    // ── Annotator / Reviewer / Collector path ─────────────────────────────
    if (needsWorkspaceRedirect) {
        const isLoading = !currentOrganization || !hasFetchedWorkspaces || navLoading;

        if (isLoading) {
            if (isCollector) {
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                        <CircularProgress size={40} sx={{ color: '#000' }} />
                    </Box>
                );
            }
            return (
                <Layout>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '80vh',
                        }}
                    >
                        <CircularProgress size={40} />
                    </Box>
                </Layout>
            );
        }

        // Workspace fetch completed but user has no assignments
        if (navWorkspaces.length === 0) {
            /** Signs the user out and returns to /login (bound to the "Sign Out" button). */
            const handleSignOut = async () => {
                await dispatch(logoutUser());
                dispatch(clearAuth());
                navigate('/login', { replace: true });
            };

            /** Re-checks for newly assigned workspaces (bound to the "Check Again" button). */
            const handleRefresh = () => {
                if (currentOrganization?._id) {
                    setHasFetchedWorkspaces(false);
                    dispatch(fetchNavWorkspaces({ org_id: currentOrganization._id, limit: 100, offset: 0 }))
                        .finally(() => setHasFetchedWorkspaces(true));
                }
            };

            const noWorkspaceContent = (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: isCollector ? '100vh' : '80vh',
                        px: 3,
                        textAlign: 'center',
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 88,
                            height: 88,
                            borderRadius: '50%',
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            mb: 3,
                        }}
                    >
                        <WorkspacesOutlinedIcon sx={{ fontSize: 44, color: theme.palette.primary.main }} />
                    </Box>

                    <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 1.5 }}>
                        No Workspace Assigned
                    </Typography>

                    <Typography
                        variant="body1"
                        sx={{ color: theme.palette.text.secondary, maxWidth: 420, lineHeight: 1.7, mb: 4 }}
                    >
                        You haven't been assigned to any workspace yet. Please contact your administrator to get access.
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                            disabled={navLoading}
                            sx={{ textTransform: 'none', fontWeight: 600, minWidth: 140 }}
                        >
                            {navLoading ? 'Checking…' : 'Check Again'}
                        </Button>

                        <Button
                            variant="outlined"
                            color="inherit"
                            startIcon={<LogoutIcon />}
                            onClick={handleSignOut}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 500,
                                color: theme.palette.text.secondary,
                                borderColor: theme.palette.divider,
                                '&:hover': { borderColor: theme.palette.text.secondary },
                            }}
                        >
                            Sign Out
                        </Button>
                    </Box>

                    {currentOrganization?.name && (
                        <Typography variant="caption" sx={{ mt: 5, color: theme.palette.text.disabled }}>
                            Organization: {currentOrganization.name}
                        </Typography>
                    )}
                </Box>
            );

            return isCollector ? noWorkspaceContent : <Layout>{noWorkspaceContent}</Layout>;
        }

        // Workspaces found — redirect is already in flight via the useEffect above
        return null;
    }

    // ── Admin / Manager path ───────────────────────────────────────────────
    return (
        <Layout>
            <Dashboard />
        </Layout>
    );
};

export default Home;

