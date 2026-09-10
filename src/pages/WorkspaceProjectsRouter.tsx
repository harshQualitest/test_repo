import { lazy, Suspense, useMemo } from 'react';
import { useAppSelector } from '../redux/hooks';
import { selectUser } from '../redux/slices/loginSlice';
import { getUserRole, ROLES, hasEqualOrHigherPrivilege } from '../utils/roles';
import { CircularProgress, Box } from '@mui/material';
import Layout from '../components/layout/Layout';

// Lazy load components
const WorkspaceProjects = lazy(() => import('./WorkspaceProjects'));
const UserWorkspaceProjects = lazy(() => import('./UserWorkspaceProjects'));
const CollectorWorkspaceView = lazy(() => import('./CollectorWorkspaceView'));

/**
 * Component: WorkspaceProjectsRouter
 *
 * Purpose: Router component that renders the appropriate workspace projects
 * page based on the current user's role, so a single route
 * (`/workspace/:id/projects` or similar) can serve very different UIs per role.
 *
 * Responsibilities:
 * - Admin/Manager roles see the full `WorkspaceProjects` with all controls.
 * - Annotator role sees `UserWorkspaceProjects` with a "Start Annotation" button.
 * - Reviewer role sees `UserWorkspaceProjects` with a "Start Review" button.
 * - Collector role sees `CollectorWorkspaceView` with a standalone mobile
 *   upload UI (rendered without the app's `Layout`/side nav).
 * - Lazy-loads all three destination components and shows a spinner fallback
 *   while each loads.
 *
 * Props: none (route component).
 *
 * State: none local — role is derived from Redux user data via `useMemo`.
 *
 * Redux (loginSlice): `selectUser` selector.
 *
 * Major child components: `Layout`, `WorkspaceProjects` (lazy),
 * `UserWorkspaceProjects` (lazy), `CollectorWorkspaceView` (lazy).
 *
 * Business rules: `hasAdminAccess` is true for any role with privilege equal
 * to or higher than Project Manager (see `hasEqualOrHigherPrivilege`); that
 * flag — not a hardcoded role list — decides whether the full
 * `WorkspaceProjects` admin UI or the restricted `UserWorkspaceProjects` UI
 * is shown.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const WorkspaceProjectsRouter = () => {
    const user = useAppSelector(selectUser);
    // Memoized because `getUserRole` re-derives the role from the (possibly
    // large) user object; only needs to run when `user` itself changes.
    const userRole = useMemo(() => getUserRole(user), [user]);

    // Memoized privilege check drives which admin-vs-user project view renders below.
    const hasAdminAccess = useMemo(() => {
        return hasEqualOrHigherPrivilege(userRole, ROLES.PROJECT_MANAGER);
    }, [userRole]);

    const isReviewer = useMemo(() => userRole === ROLES.REVIEWER, [userRole]);
    const isCollector = useMemo(() => userRole === ROLES.COLLECTOR, [userRole]);

    const LoadingFallback = (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 400,
            }}
        >
            <CircularProgress />
        </Box>
    );

    // Collectors get their own standalone mobile UI — no Layout/Sidenav
    if (isCollector) {
        return (
            <Suspense fallback={<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><CircularProgress sx={{ color: '#000' }} /></Box>}>
                <CollectorWorkspaceView />
            </Suspense>
        );
    }

    return (
        <Layout>
            <Suspense fallback={LoadingFallback}>
                {hasAdminAccess ? (
                    <WorkspaceProjects />
                ) : (
                    <UserWorkspaceProjects userRole={userRole} isReviewer={isReviewer} />
                )}
            </Suspense>
        </Layout>
    );
};

export default WorkspaceProjectsRouter;
