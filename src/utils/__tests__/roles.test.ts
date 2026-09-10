import { describe, it, expect } from 'vitest';
import {
    ROLES,
    ROLE_HIERARCHY,
    NAV_SECTIONS,
    ROUTES,
    getUserRole,
    getRolePermissions,
    canAccessNavSection,
    canAccessRoute,
    hasEqualOrHigherPrivilege,
    hasPermission,
    getDefaultRouteForRole,
} from '../roles';
import type { UserAssignment } from '../roles';

// ── ROLES constant ────────────────────────────────────────────────────────────

describe('ROLES constant', () => {
    it('exports 7 role values', () => {
        expect(Object.keys(ROLES)).toHaveLength(7);
    });

    it('contains super_admin', () => {
        expect(ROLES.SUPER_ADMIN).toBe('super_admin');
    });

    it('contains all expected role keys', () => {
        const expected = ['SUPER_ADMIN', 'WORKSPACE_MANAGER', 'PROJECT_MANAGER', 'ANNOTATOR', 'REVIEWER', 'QA', 'VIEWER'];
        expect(Object.keys(ROLES)).toEqual(expected);
    });
});

// ── ROLE_HIERARCHY ────────────────────────────────────────────────────────────

describe('ROLE_HIERARCHY', () => {
    it('starts with the lowest privilege role (viewer)', () => {
        expect(ROLE_HIERARCHY[0]).toBe(ROLES.VIEWER);
    });

    it('ends with the highest privilege role (super_admin)', () => {
        expect(ROLE_HIERARCHY[ROLE_HIERARCHY.length - 1]).toBe(ROLES.SUPER_ADMIN);
    });

    it('contains 7 entries (one per role)', () => {
        expect(ROLE_HIERARCHY).toHaveLength(7);
    });

    it('annotator is ranked above viewer', () => {
        expect(ROLE_HIERARCHY.indexOf(ROLES.ANNOTATOR)).toBeGreaterThan(ROLE_HIERARCHY.indexOf(ROLES.VIEWER));
    });

    it('workspace_manager is ranked above project_manager', () => {
        expect(ROLE_HIERARCHY.indexOf(ROLES.WORKSPACE_MANAGER)).toBeGreaterThan(
            ROLE_HIERARCHY.indexOf(ROLES.PROJECT_MANAGER),
        );
    });
});

// ── getUserRole ───────────────────────────────────────────────────────────────

describe('getUserRole', () => {
    it('returns viewer for a null user', () => {
        expect(getUserRole(null)).toBe(ROLES.VIEWER);
    });

    it('returns viewer for a user with no role fields', () => {
        expect(getUserRole({})).toBe(ROLES.VIEWER);
    });

    it('uses the direct role field when present (super_admin)', () => {
        expect(getUserRole({ role: 'super_admin' })).toBe(ROLES.SUPER_ADMIN);
    });

    it('normalises role to lowercase', () => {
        expect(getUserRole({ role: 'WORKSPACE_MANAGER' })).toBe(ROLES.WORKSPACE_MANAGER);
    });

    it('direct role takes priority over organization role', () => {
        const user = { role: 'workspace_manager', organization: { role: 'annotator' } };
        expect(getUserRole(user)).toBe(ROLES.WORKSPACE_MANAGER);
    });

    it('falls back to organization role when no direct role', () => {
        const user = { organization: { role: 'reviewer' } };
        expect(getUserRole(user)).toBe(ROLES.REVIEWER);
    });

    it('prioritises org-level assignment when assignments array is present', () => {
        const orgAssignment: UserAssignment = { role_id: 'annotator', entity_id: 'org-1', entity: 'organization' };
        const wsAssignment: UserAssignment = { role_id: 'reviewer', entity_id: 'ws-1', entity: 'workspace' };
        const user = { assignments: [wsAssignment, orgAssignment] };
        expect(getUserRole(user)).toBe(ROLES.ANNOTATOR);
    });

    it('falls back to first assignment when no org-level assignment', () => {
        const assignments: UserAssignment[] = [
            { role_id: 'reviewer', entity_id: 'ws-1', entity: 'workspace' },
        ];
        expect(getUserRole({ assignments })).toBe(ROLES.REVIEWER);
    });

    it('returns viewer when assignments array is empty', () => {
        expect(getUserRole({ assignments: [] })).toBe(ROLES.VIEWER);
    });
});

// ── getRolePermissions ────────────────────────────────────────────────────────

describe('getRolePermissions', () => {
    it('returns restrictive default permissions for an unknown role', () => {
        const perms = getRolePermissions('totally_unknown');
        expect(perms.canCreateWorkspace).toBe(false);
        expect(perms.canManageUsers).toBe(false);
        expect(perms.canViewAnalytics).toBe(false);
    });

    it('is case-insensitive (SUPER_ADMIN → super_admin permissions)', () => {
        const perms = getRolePermissions('SUPER_ADMIN');
        expect(perms.canCreateWorkspace).toBe(true);
    });
});

// ── canAccessRoute ────────────────────────────────────────────────────────────

describe('canAccessRoute', () => {
    it('super_admin can access any route (wildcard *)', () => {
        expect(canAccessRoute(ROLES.SUPER_ADMIN, '/anything/at/all')).toBe(true);
    });

    it('workspace_manager can access any route (wildcard *)', () => {
        expect(canAccessRoute(ROLES.WORKSPACE_MANAGER, ROUTES.USERS)).toBe(true);
    });

    it('annotator can access /workspace', () => {
        expect(canAccessRoute(ROLES.ANNOTATOR, ROUTES.WORKSPACE)).toBe(true);
    });

    it('annotator can access a nested workspace route (/workspace/project-123)', () => {
        expect(canAccessRoute(ROLES.ANNOTATOR, '/workspace/project-123')).toBe(true);
    });

    it('annotator cannot access /dashboard', () => {
        expect(canAccessRoute(ROLES.ANNOTATOR, ROUTES.DASHBOARD)).toBe(false);
    });

    it('annotator cannot access /users', () => {
        expect(canAccessRoute(ROLES.ANNOTATOR, ROUTES.USERS)).toBe(false);
    });

    it('reviewer can access /user-review', () => {
        expect(canAccessRoute(ROLES.REVIEWER, ROUTES.USER_REVIEW)).toBe(true);
    });

    it('reviewer can access /dashboard', () => {
        expect(canAccessRoute(ROLES.REVIEWER, ROUTES.DASHBOARD)).toBe(true);
    });

    it('viewer cannot access /dashboard', () => {
        expect(canAccessRoute(ROLES.VIEWER, ROUTES.DASHBOARD)).toBe(false);
    });

    it('viewer can access /workspace', () => {
        expect(canAccessRoute(ROLES.VIEWER, ROUTES.WORKSPACE)).toBe(true);
    });

    it('qa can access /user-annotation', () => {
        expect(canAccessRoute(ROLES.QA, ROUTES.USER_ANNOTATION)).toBe(true);
    });

    it('qa cannot access /users admin page', () => {
        expect(canAccessRoute(ROLES.QA, ROUTES.USERS)).toBe(false);
    });

    it('unknown role falls back to DEFAULT_PERMISSIONS (workspace only)', () => {
        expect(canAccessRoute('ghost_role', ROUTES.WORKSPACE)).toBe(true);
        expect(canAccessRoute('ghost_role', ROUTES.DASHBOARD)).toBe(false);
    });

    it('exact match wins (no false prefix match)', () => {
        // '/dashboardXYZ' should NOT be accessible to annotator even though it starts with '/dashboard'
        // (annotator doesn't have dashboard in its routes at all, so false)
        expect(canAccessRoute(ROLES.ANNOTATOR, '/dashboardXYZ')).toBe(false);
    });
});

// ── canAccessNavSection ───────────────────────────────────────────────────────

describe('canAccessNavSection', () => {
    it('super_admin can access all nav sections', () => {
        Object.values(NAV_SECTIONS).forEach(section => {
            expect(canAccessNavSection(ROLES.SUPER_ADMIN, section)).toBe(true);
        });
    });

    it('annotator can access WORKSPACES nav section', () => {
        expect(canAccessNavSection(ROLES.ANNOTATOR, NAV_SECTIONS.WORKSPACES)).toBe(true);
    });

    it('annotator cannot access SETTINGS nav section', () => {
        expect(canAccessNavSection(ROLES.ANNOTATOR, NAV_SECTIONS.SETTINGS)).toBe(false);
    });

    it('viewer cannot access ADD_WORKSPACE nav section', () => {
        expect(canAccessNavSection(ROLES.VIEWER, NAV_SECTIONS.ADD_WORKSPACE)).toBe(false);
    });

    it('project_manager can access OVERVIEW nav section', () => {
        expect(canAccessNavSection(ROLES.PROJECT_MANAGER, NAV_SECTIONS.OVERVIEW)).toBe(true);
    });
});

// ── hasEqualOrHigherPrivilege ─────────────────────────────────────────────────

describe('hasEqualOrHigherPrivilege', () => {
    it('super_admin >= super_admin (same level)', () => {
        expect(hasEqualOrHigherPrivilege(ROLES.SUPER_ADMIN, ROLES.SUPER_ADMIN)).toBe(true);
    });

    it('super_admin >= viewer', () => {
        expect(hasEqualOrHigherPrivilege(ROLES.SUPER_ADMIN, ROLES.VIEWER)).toBe(true);
    });

    it('super_admin >= annotator', () => {
        expect(hasEqualOrHigherPrivilege(ROLES.SUPER_ADMIN, ROLES.ANNOTATOR)).toBe(true);
    });

    it('annotator >= annotator (same level)', () => {
        expect(hasEqualOrHigherPrivilege(ROLES.ANNOTATOR, ROLES.ANNOTATOR)).toBe(true);
    });

    it('annotator is NOT >= reviewer', () => {
        expect(hasEqualOrHigherPrivilege(ROLES.ANNOTATOR, ROLES.REVIEWER)).toBe(false);
    });

    it('annotator is NOT >= workspace_manager', () => {
        expect(hasEqualOrHigherPrivilege(ROLES.ANNOTATOR, ROLES.WORKSPACE_MANAGER)).toBe(false);
    });

    it('reviewer >= annotator', () => {
        expect(hasEqualOrHigherPrivilege(ROLES.REVIEWER, ROLES.ANNOTATOR)).toBe(true);
    });

    it('viewer is NOT >= annotator', () => {
        expect(hasEqualOrHigherPrivilege(ROLES.VIEWER, ROLES.ANNOTATOR)).toBe(false);
    });

    it('unknown role returns false (treated as lowest privilege)', () => {
        expect(hasEqualOrHigherPrivilege('ghost', ROLES.VIEWER)).toBe(false);
    });

    it('accepts uppercase role string (case normalised internally)', () => {
        expect(hasEqualOrHigherPrivilege('SUPER_ADMIN', ROLES.VIEWER)).toBe(true);
    });
});

// ── hasPermission ─────────────────────────────────────────────────────────────

describe('hasPermission', () => {
    it('super_admin can create workspace', () => {
        expect(hasPermission(ROLES.SUPER_ADMIN, 'canCreateWorkspace')).toBe(true);
    });

    it('annotator cannot create workspace', () => {
        expect(hasPermission(ROLES.ANNOTATOR, 'canCreateWorkspace')).toBe(false);
    });

    it('workspace_manager can manage users', () => {
        expect(hasPermission(ROLES.WORKSPACE_MANAGER, 'canManageUsers')).toBe(true);
    });

    it('reviewer cannot manage users', () => {
        expect(hasPermission(ROLES.REVIEWER, 'canManageUsers')).toBe(false);
    });

    it('workspace_manager can delete projects', () => {
        expect(hasPermission(ROLES.WORKSPACE_MANAGER, 'canDeleteProjects')).toBe(true);
    });

    it('project_manager cannot delete projects', () => {
        expect(hasPermission(ROLES.PROJECT_MANAGER, 'canDeleteProjects')).toBe(false);
    });

    it('project_manager can manage templates', () => {
        expect(hasPermission(ROLES.PROJECT_MANAGER, 'canManageTemplates')).toBe(true);
    });

    it('viewer cannot view analytics', () => {
        expect(hasPermission(ROLES.VIEWER, 'canViewAnalytics')).toBe(false);
    });

    it('reviewer can view analytics', () => {
        expect(hasPermission(ROLES.REVIEWER, 'canViewAnalytics')).toBe(true);
    });
});

// ── getDefaultRouteForRole ────────────────────────────────────────────────────

describe('getDefaultRouteForRole', () => {
    it('super_admin defaults to /dashboard', () => {
        expect(getDefaultRouteForRole(ROLES.SUPER_ADMIN)).toBe(ROUTES.DASHBOARD);
    });

    it('workspace_manager defaults to /dashboard', () => {
        expect(getDefaultRouteForRole(ROLES.WORKSPACE_MANAGER)).toBe(ROUTES.DASHBOARD);
    });

    it('project_manager defaults to /dashboard', () => {
        expect(getDefaultRouteForRole(ROLES.PROJECT_MANAGER)).toBe(ROUTES.DASHBOARD);
    });

    it('reviewer defaults to /dashboard (dashboard is in their allowed routes)', () => {
        expect(getDefaultRouteForRole(ROLES.REVIEWER)).toBe(ROUTES.DASHBOARD);
    });

    it('annotator defaults to /workspace (first allowed route, no dashboard access)', () => {
        expect(getDefaultRouteForRole(ROLES.ANNOTATOR)).toBe(ROUTES.WORKSPACE);
    });

    it('viewer defaults to /workspace', () => {
        expect(getDefaultRouteForRole(ROLES.VIEWER)).toBe(ROUTES.WORKSPACE);
    });

    it('unknown role defaults to /workspace (fallback)', () => {
        expect(getDefaultRouteForRole('unknown_role')).toBe(ROUTES.WORKSPACE);
    });
});
