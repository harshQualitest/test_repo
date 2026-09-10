import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ProtectedRoute from '../ProtectedRoute';
import { ROLES } from '../../utils/roles';
import type { RoleType } from '../../utils/roles';

// ── Mock loginSlice ───────────────────────────────────────────────────────────
// loginSlice.ts runs localStorage.getItem() at module-load time.
// We mock the module so its side effects never execute.
vi.mock('../../redux/slices/loginSlice', () => ({
    selectIsAuthenticated: (state: any) => state.auth.isAuthenticated,
    selectUser: (state: any) => state.auth.user,
}));

// ── Minimal test store ────────────────────────────────────────────────────────

interface MinimalAuthState { user: Record<string, unknown> | null; isAuthenticated: boolean; }

function makeStore(isAuthenticated: boolean, user: Record<string, unknown> | null = null) {
    const reducer = (
        state: MinimalAuthState = { user: null, isAuthenticated: false },
        _action: { type: string },
    ) => state;
    return configureStore({
        reducer: { auth: reducer },
        preloadedState: { auth: { user, isAuthenticated } },
    });
}

// ── Render helper ─────────────────────────────────────────────────────────────
//
// Key design rules to avoid "infinite redirect" and "route shadowing":
//   1. The PROTECTED route is listed FIRST in <Routes> so it wins the first match.
//   2. The initial location is always `protectedPath`.
//   3. Redirect-destination routes never duplicate `protectedPath`.
//
// These rules ensure:
//   • The ProtectedRoute is rendered on entry.
//   • When it fires a <Navigate>, the redirect target is handled by a DIFFERENT route.
//
function renderProtected(options: {
    protectedPath: string;
    isAuthenticated: boolean;
    user?: Record<string, unknown> | null;
    allowedRoles?: string[];
    minRole?: RoleType;
}) {
    const { protectedPath, isAuthenticated, user = null, allowedRoles, minRole } = options;
    const store = makeStore(isAuthenticated, user);

    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[protectedPath]}>
                <Routes>
                    {/*
                     * Protected route FIRST — so `initialEntries=[protectedPath]`
                     * matches here rather than falling through to a redirect-destination route.
                     */}
                    <Route
                        path={protectedPath}
                        element={
                            <ProtectedRoute allowedRoles={allowedRoles} minRole={minRole}>
                                <div>Protected Content</div>
                            </ProtectedRoute>
                        }
                    />
                    {/* Redirect-destination stubs — all different from protectedPath */}
                    <Route path="/login" element={<div>Login Page</div>} />
                    <Route path="/workspace" element={<div>Workspace Page</div>} />
                    <Route path="/dashboard" element={<div>Dashboard Page</div>} />
                    <Route path="/user-annotation" element={<div>Annotation Page</div>} />
                    <Route path="/user-review" element={<div>Review Page</div>} />
                    <Route path="/settings" element={<div>Settings Page</div>} />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
}

// ── User fixtures ─────────────────────────────────────────────────────────────

const superAdminUser = { _id: 'u1', name: 'SA', role: 'super_admin' };
const annotatorUser = { _id: 'u2', name: 'Ann', organization: { role: 'annotator' } };
const reviewerUser = { _id: 'u3', name: 'Rev', organization: { role: 'reviewer' } };
const projectManagerUser = { _id: 'u4', name: 'PM', organization: { role: 'project_manager' } };
const workspaceManagerUser = { _id: 'u5', name: 'WM', organization: { role: 'workspace_manager' } };
const viewerUser = { _id: 'u6', name: 'V', organization: { role: 'viewer' } };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Authentication guard ──────────────────────────────────────────────────

    describe('authentication guard', () => {
        it('redirects an unauthenticated visitor to /login', () => {
            renderProtected({ protectedPath: '/dashboard', isAuthenticated: false });
            // ProtectedRoute: !isAuthenticated → <Navigate to="/login" />
            expect(screen.getByText('Login Page')).toBeInTheDocument();
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });

        it('does not render children when user is null and not authenticated', () => {
            renderProtected({ protectedPath: '/dashboard', isAuthenticated: false, user: superAdminUser });
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });
    });

    // ── Route access by role ──────────────────────────────────────────────────

    describe('route access by role', () => {
        it('allows super_admin to access /dashboard (wildcard *)', () => {
            renderProtected({ protectedPath: '/dashboard', isAuthenticated: true, user: superAdminUser });
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('allows workspace_manager to access /dashboard (wildcard *)', () => {
            renderProtected({ protectedPath: '/dashboard', isAuthenticated: true, user: workspaceManagerUser });
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('allows reviewer to access /dashboard (/dashboard is in reviewer allowedRoutes)', () => {
            renderProtected({ protectedPath: '/dashboard', isAuthenticated: true, user: reviewerUser });
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('allows reviewer to access /user-review', () => {
            renderProtected({ protectedPath: '/user-review', isAuthenticated: true, user: reviewerUser });
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('blocks annotator from /dashboard and redirects to /workspace (their default)', () => {
            // annotator allowedRoutes=[/workspace, /user-annotation, /settings]; default=/workspace
            renderProtected({ protectedPath: '/dashboard', isAuthenticated: true, user: annotatorUser });
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            expect(screen.getByText('Workspace Page')).toBeInTheDocument();
        });

        it('blocks viewer from /dashboard and redirects to /workspace', () => {
            renderProtected({ protectedPath: '/dashboard', isAuthenticated: true, user: viewerUser });
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            expect(screen.getByText('Workspace Page')).toBeInTheDocument();
        });

        it('handles unknown role as viewer (no /dashboard access)', () => {
            const unknownUser = { _id: 'ux', role: 'ghost_role' };
            renderProtected({ protectedPath: '/dashboard', isAuthenticated: true, user: unknownUser });
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });

        it('handles null user as viewer when authenticated (no /dashboard access)', () => {
            // getUserRole(null) = ROLES.VIEWER; viewer can't access /dashboard
            renderProtected({ protectedPath: '/dashboard', isAuthenticated: true, user: null });
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });
    });

    // ── allowedRoles prop ─────────────────────────────────────────────────────

    describe('allowedRoles prop', () => {
        it('renders children when the user role is in allowedRoles', () => {
            renderProtected({
                protectedPath: '/dashboard',
                isAuthenticated: true,
                user: superAdminUser,
                allowedRoles: ['super_admin', 'workspace_manager'],
            });
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('blocks and redirects when the user role is NOT in allowedRoles', () => {
            // project_manager CAN access /user-annotation (canAccessRoute passes).
            // allowedRoles=['super_admin'] blocks them.
            // getDefaultRouteForRole('project_manager') = '/dashboard'.
            // /dashboard ≠ /user-annotation → no infinite redirect.
            renderProtected({
                protectedPath: '/user-annotation',
                isAuthenticated: true,
                user: projectManagerUser,
                allowedRoles: ['super_admin'],
            });
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
        });

        it('is case-insensitive (allowedRoles=["SUPER_ADMIN"] matches super_admin user)', () => {
            renderProtected({
                protectedPath: '/dashboard',
                isAuthenticated: true,
                user: superAdminUser,
                allowedRoles: ['SUPER_ADMIN'],
            });
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('treats an empty allowedRoles array as no restriction', () => {
            renderProtected({
                protectedPath: '/dashboard',
                isAuthenticated: true,
                user: reviewerUser,
                allowedRoles: [],
            });
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });
    });

    // ── minRole prop ──────────────────────────────────────────────────────────

    describe('minRole prop', () => {
        it('allows access when the user role meets or exceeds minRole', () => {
            renderProtected({
                protectedPath: '/dashboard',
                isAuthenticated: true,
                user: workspaceManagerUser,
                minRole: ROLES.PROJECT_MANAGER,
            });
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('allows access when the user role exactly matches minRole', () => {
            renderProtected({
                protectedPath: '/dashboard',
                isAuthenticated: true,
                user: reviewerUser,
                minRole: ROLES.REVIEWER,
            });
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('blocks and redirects when the user role is below minRole', () => {
            // reviewer CAN access /settings (canAccessRoute passes).
            // minRole=workspace_manager blocks them.
            // getDefaultRouteForRole('reviewer') = '/dashboard'; /settings ≠ /dashboard → no loop.
            renderProtected({
                protectedPath: '/settings',
                isAuthenticated: true,
                user: reviewerUser,
                minRole: ROLES.WORKSPACE_MANAGER,
            });
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
        });

        it('super_admin passes any minRole check', () => {
            renderProtected({
                protectedPath: '/dashboard',
                isAuthenticated: true,
                user: superAdminUser,
                minRole: ROLES.SUPER_ADMIN,
            });
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('blocks annotator when minRole is reviewer', () => {
            // annotator CAN access /user-annotation; default=/workspace; /user-annotation ≠ /workspace.
            renderProtected({
                protectedPath: '/user-annotation',
                isAuthenticated: true,
                user: annotatorUser,
                minRole: ROLES.REVIEWER,
            });
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            expect(screen.getByText('Workspace Page')).toBeInTheDocument();
        });
    });

    // ── Combined allowedRoles + minRole ───────────────────────────────────────

    describe('allowedRoles and minRole combined', () => {
        it('grants access when both allowedRoles and minRole pass', () => {
            renderProtected({
                protectedPath: '/dashboard',
                isAuthenticated: true,
                user: workspaceManagerUser,
                allowedRoles: ['workspace_manager', 'super_admin'],
                minRole: ROLES.PROJECT_MANAGER,
            });
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
        });

        it('blocks when allowedRoles fails even though minRole passes', () => {
            // reviewer meets minRole=annotator but NOT in allowedRoles=['super_admin'].
            // reviewer CAN access /user-annotation; default=/dashboard; no loop.
            renderProtected({
                protectedPath: '/user-annotation',
                isAuthenticated: true,
                user: reviewerUser,
                allowedRoles: ['super_admin'],
                minRole: ROLES.ANNOTATOR,
            });
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
            expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
        });
    });

    // ── children rendering ────────────────────────────────────────────────────

    describe('children rendering', () => {
        it('renders arbitrary children when all checks pass', () => {
            const store = makeStore(true, superAdminUser);
            render(
                <Provider store={store}>
                    <MemoryRouter initialEntries={['/dashboard']}>
                        <Routes>
                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <p>Child A</p>
                                        <p>Child B</p>
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/login" element={<div>Login Page</div>} />
                        </Routes>
                    </MemoryRouter>
                </Provider>,
            );
            expect(screen.getByText('Child A')).toBeInTheDocument();
            expect(screen.getByText('Child B')).toBeInTheDocument();
        });

        it('renders children exactly once', () => {
            renderProtected({ protectedPath: '/dashboard', isAuthenticated: true, user: superAdminUser });
            expect(screen.getAllByText('Protected Content')).toHaveLength(1);
        });

        it('renders no children when not authenticated', () => {
            renderProtected({ protectedPath: '/dashboard', isAuthenticated: false });
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        });
    });
});
