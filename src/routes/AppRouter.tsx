import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import ProtectedRoute from './ProtectedRoute';
import LazyLoadFallback from '../components/common/LazyLoadFallback';
import { PageNotFound } from '../pages';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { selectIsAuthenticated, clearAuth } from '../redux/slices/loginSlice';
import { claimOwnership, releaseOwnership } from '../utils/tabOwnership';

/**
 * Application route table.
 *
 * Defines the full client-side route map for the SPA: public routes (home,
 * login, invitation acceptance, password reset) and RBAC-protected routes,
 * most of which wrap their page in `Layout` inline. Every page component is
 * lazy-loaded via `React.lazy` and route-level auth/role gating is delegated
 * to `ProtectedRoute` (see `./ProtectedRoute.tsx`). Also mounts
 * `TabOwnershipGuard` at the router root so it applies across all routes.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/**
 * Renders nothing — exists solely to enforce single-tab session ownership.
 * When the authenticated user duplicates a tab the duplicate receives a
 * DENY response and is redirected to /login with a warning message.
 */
const TabOwnershipGuard: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const isAuthenticated = useAppSelector(selectIsAuthenticated);

    useEffect(() => {
        if (!isAuthenticated) {
            releaseOwnership();
            return;
        }

        claimOwnership(() => {
            dispatch(clearAuth());
            navigate('/login', {
                replace: true,
                state: {
                    warningMessage:
                        'This session is already open in another tab. You have been signed out.',
                },
            });
        });
    }, [isAuthenticated, dispatch, navigate]);

    return null;
};

// Lazy load all page components so each route's code splits into its own
// chunk — only the page(s) needed for the current route are downloaded,
// with `LazyLoadFallback` shown via `Suspense` while a chunk streams in.
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Analytics = lazy(() => import('../pages/Analytics'));
const Settings = lazy(() => import('../pages/Settings'));
const WorkspaceProjectsRouter = lazy(() => import('../pages/WorkspaceProjectsRouter'));
const Users = lazy(() => import('../pages/Users'));
const ProjectTemplates = lazy(() => import('../pages/ProjectTemplates'));
const AcceptInvitation = lazy(() => import('../pages/AcceptInvitation'));
const EmailTemplatesPage = lazy(() => import('../pages/EmailTemplatesPage'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const UserAnnotationScreen = lazy(() => import('../pages/UserAnnotationScreen'));
const ProjectDetails = lazy(() => import('../pages/ProjectDetails'));
const ReviewPage = lazy(() => import('../pages/ReviewPage'));
const WorkspaceDashboard = lazy(() => import('../pages/WorkspaceDashboard'));
const ProjectDashboard = lazy(() => import('../pages/ProjectDashboard'));
const TaskDetail = lazy(() => import('../pages/TaskDetail'));
const DataCollectionProjects = lazy(() => import('../pages/DataCollectionProjects'));
const DataCollectionProjectCreate = lazy(() => import('../pages/DataCollectionProjectCreate'));
const DataCollectionProjectEdit = lazy(() => import('../pages/DataCollectionProjectEdit'));
const DataCollectionUpload = lazy(() => import('../pages/DataCollectionUpload'));
const DataCollectionTracking = lazy(() => import('../pages/DataCollectionTracking'));
const DataCollectionReview = lazy(() => import('../pages/DataCollectionReview'));
const DataCollectionUploadsAdmin = lazy(() => import('../pages/DataCollectionUploadsAdmin'));
const CollectorProfile = lazy(() => import('../pages/CollectorProfile'));
const CollectorUploadsView = lazy(() => import('../pages/CollectorUploadsView'));

/**
 * Top-level router component mounted by `App.tsx`.
 *
 * Wraps the whole route table in `BrowserRouter`, mounts the app-wide
 * single-tab-ownership guard so it runs on every route, and wraps all
 * routes in a single `Suspense` boundary that shows `LazyLoadFallback`
 * while any lazily-loaded page chunk is fetched.
 *
 * @returns The router tree for the whole application.
 */
const AppRouter = () => {
    return (
        <BrowserRouter>
            <TabOwnershipGuard />
            <Suspense fallback={<LazyLoadFallback />}>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/accept-invitation/:userId" element={<AcceptInvitation />} />
                    <Route path="/reset-password" element={<ForgotPassword />} />

                    {/* Protected Routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Dashboard />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Protected Routes */}
                    <Route
                        path="/workspace-dashboard/:id"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <WorkspaceDashboard />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    {/* Protected Routes */}
                    <Route
                        path="/project-dashboard/:projectId"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <ProjectDashboard />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/workspace/:id"
                        element={
                            <ProtectedRoute>
                                <WorkspaceProjectsRouter />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/project/:projectId"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <ProjectDetails />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Users />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/analytics"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Analytics />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <Settings />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/project-templates"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <ProjectTemplates />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/email-templates"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <EmailTemplatesPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/user-annotation/:projectId"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <UserAnnotationScreen />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/user-review/:projectId"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <ReviewPage />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/project-dashboard/:projectId"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <ProjectDashboard />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/task-detail/:projectId/:taskId"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <TaskDetail />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    {/* Data Collection Routes */}
                    <Route
                        path="/data-collection/projects"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <DataCollectionProjects />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/data-collection/create"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <DataCollectionProjectCreate />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/data-collection/edit/:projectId"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <DataCollectionProjectEdit />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/data-collection/upload"
                        element={
                            <ProtectedRoute>
                                <DataCollectionUpload />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/data-collection/uploads/:projectId"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <DataCollectionUploadsAdmin />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/data-collection/tracking/:projectId"
                        element={
                            <ProtectedRoute>
                                <Layout>
                                    <DataCollectionTracking />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/data-collection/review/:projectId"
                        element={
                            <ProtectedRoute allowedRoles={['reviewer']}>
                                <Layout>
                                    <DataCollectionReview />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/data-collection/collector/view/:projectId"
                        element={
                            <ProtectedRoute>
                                <CollectorUploadsView />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/collector/profile"
                        element={
                            <ProtectedRoute>
                                <CollectorProfile />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<PageNotFound />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
};

export default AppRouter;
