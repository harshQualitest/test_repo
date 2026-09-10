/**
 * Role-Based Access Control (RBAC) Utility
 *
 * This module provides a centralized, scalable role management system.
 * Add new roles and permissions here as the application grows.
 *
 * Model encoded here:
 * - `ROLES` is the fixed set of role identifiers used app-wide (lowercase
 *   strings, matching what the backend sends back in `user.role`/assignments).
 * - `ROLE_HIERARCHY` orders roles from least to most privileged; used only for
 *   relative comparisons (`hasEqualOrHigherPrivilege`), not for permission checks.
 * - `ROLE_PERMISSIONS` is the single lookup table mapping each role to: which
 *   nav sections it can see, which routes it can access (`'*'` = all), and a
 *   handful of boolean capability flags (create workspace, manage users, etc).
 *   This is the file to edit when adding a new role or changing what an
 *   existing role can do.
 * - `getUserRole` resolves a user object's *effective* role from several
 *   possible shapes the backend can return it in (direct `role` field, an
 *   organization-scoped role, or an `assignments` array), in that priority
 *   order, since not every endpoint returns the same user shape.
 * - Unknown/unrecognized roles fall back to `DEFAULT_PERMISSIONS`, which is
 *   deliberately the most restrictive set — the RBAC model fails closed
 *   rather than accidentally granting access to a role it doesn't recognize.
 * - This module only computes *what a role is allowed to do*; consumers
 *   (route guards, `{canX && <Y/>}` conditional renders) are responsible for
 *   actually gating UI/navigation with these results — see
 *   `src/routes/ProtectedRoute.tsx` for the route-level enforcement.
 */

// Available roles in the system
export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    WORKSPACE_MANAGER: 'workspace_manager',
    PROJECT_MANAGER: 'project_manager',
    ANNOTATOR: 'annotator',
    REVIEWER: 'reviewer',
    QA: 'qa',
    VIEWER: 'viewer',
    COLLECTOR: 'collector',
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];

// Role hierarchy (higher index = more privileges)
export const ROLE_HIERARCHY: RoleType[] = [
    ROLES.VIEWER,
    ROLES.COLLECTOR,
    ROLES.ANNOTATOR,
    ROLES.REVIEWER,
    ROLES.QA,
    ROLES.PROJECT_MANAGER,
    ROLES.WORKSPACE_MANAGER,
    ROLES.SUPER_ADMIN,
];

// Define navigation sections
export const NAV_SECTIONS = {
    OVERVIEW: 'overview',
    WORKSPACES: 'workspaces',
    PROJECT_TEMPLATES: 'project_templates',
    SETTINGS: 'settings',
    ADD_WORKSPACE: 'add_workspace',
    ORGANIZATION_SELECTOR: 'organization_selector',
} as const;

export type NavSectionType = typeof NAV_SECTIONS[keyof typeof NAV_SECTIONS];

// Define routes
export const ROUTES = {
    DASHBOARD: '/dashboard',
    ANALYTICS: '/analytics',
    WORKSPACE: '/workspace',
    WORKSPACE_DASHBOARD: '/workspace-dashboard',
    PROJECT_DASHBOARD: '/project-dashboard',
    PROJECT: '/project',
    USERS: '/users',
    EMAIL_TEMPLATES: '/email-templates',
    PROJECT_TEMPLATES: '/project-templates',
    ONTOLOGIES: '/ontologies',
    PROJECT_TAGS: '/project-tags',
    SETTINGS: '/settings',
    USER_ANNOTATION: '/user-annotation',
    USER_REVIEW: '/user-review',
} as const;

// Role permissions configuration
// Add new roles here with their allowed sections and routes
export const ROLE_PERMISSIONS: Record<RoleType, {
    allowedNavSections: NavSectionType[];
    allowedRoutes: string[];
    canCreateWorkspace: boolean;
    canManageUsers: boolean;
    canManageTemplates: boolean;
    canViewAnalytics: boolean;
    canDeleteProjects: boolean;
    canArchiveProjects: boolean;
}> = {
    [ROLES.SUPER_ADMIN]: {
        allowedNavSections: [
            NAV_SECTIONS.OVERVIEW,
            NAV_SECTIONS.WORKSPACES,
            NAV_SECTIONS.PROJECT_TEMPLATES,
            NAV_SECTIONS.SETTINGS,
            NAV_SECTIONS.ADD_WORKSPACE,
            NAV_SECTIONS.ORGANIZATION_SELECTOR,
        ],
        allowedRoutes: ['*'], // All routes
        canCreateWorkspace: true,
        canManageUsers: true,
        canManageTemplates: true,
        canViewAnalytics: true,
        canDeleteProjects: true,
        canArchiveProjects: true,
    },
    [ROLES.WORKSPACE_MANAGER]: {
        allowedNavSections: [
            NAV_SECTIONS.OVERVIEW,
            NAV_SECTIONS.WORKSPACES,
            NAV_SECTIONS.PROJECT_TEMPLATES,
            NAV_SECTIONS.SETTINGS,
            NAV_SECTIONS.ADD_WORKSPACE,
            NAV_SECTIONS.ORGANIZATION_SELECTOR,
        ],
        allowedRoutes: ['*'],
        canCreateWorkspace: true,
        canManageUsers: true,
        canManageTemplates: true,
        canViewAnalytics: true,
        canDeleteProjects: true,
        canArchiveProjects: true,
    },
    [ROLES.PROJECT_MANAGER]: {
        allowedNavSections: [
            NAV_SECTIONS.OVERVIEW,
            NAV_SECTIONS.WORKSPACES,
            NAV_SECTIONS.PROJECT_TEMPLATES,
            NAV_SECTIONS.SETTINGS,
            NAV_SECTIONS.ORGANIZATION_SELECTOR,
        ],
        allowedRoutes: [
            ROUTES.DASHBOARD,
            ROUTES.ANALYTICS,
            ROUTES.WORKSPACE,
            ROUTES.WORKSPACE_DASHBOARD,
            ROUTES.PROJECT_DASHBOARD,
            ROUTES.PROJECT,
            ROUTES.USERS,
            ROUTES.EMAIL_TEMPLATES,
            ROUTES.PROJECT_TEMPLATES,
            ROUTES.USER_ANNOTATION,
            ROUTES.SETTINGS,
        ],
        canCreateWorkspace: false,
        canManageUsers: true,
        canManageTemplates: true,
        canViewAnalytics: true,
        canDeleteProjects: false,
        canArchiveProjects: false,
    },
    [ROLES.REVIEWER]: {
        allowedNavSections: [
            NAV_SECTIONS.OVERVIEW,
            NAV_SECTIONS.WORKSPACES,
            NAV_SECTIONS.ORGANIZATION_SELECTOR,
        ],
        allowedRoutes: [
            ROUTES.DASHBOARD,
            ROUTES.WORKSPACE,
            ROUTES.USER_ANNOTATION,
            ROUTES.USER_REVIEW,
            ROUTES.SETTINGS,
            '/data-collection/tracking',
            '/data-collection/review',
        ],
        canCreateWorkspace: false,
        canManageUsers: false,
        canManageTemplates: false,
        canViewAnalytics: true,
        canDeleteProjects: false,
        canArchiveProjects: false,
    },
    [ROLES.QA]: {
        allowedNavSections: [
            NAV_SECTIONS.OVERVIEW,
            NAV_SECTIONS.WORKSPACES,
            NAV_SECTIONS.ORGANIZATION_SELECTOR,
        ],
        allowedRoutes: [
            ROUTES.DASHBOARD,
            ROUTES.WORKSPACE,
            ROUTES.USER_ANNOTATION,
        ],
        canCreateWorkspace: false,
        canManageUsers: false,
        canManageTemplates: false,
        canViewAnalytics: true,
        canDeleteProjects: false,
        canArchiveProjects: false,
    },
    [ROLES.ANNOTATOR]: {
        allowedNavSections: [
            NAV_SECTIONS.WORKSPACES,
            NAV_SECTIONS.ORGANIZATION_SELECTOR,
        ],
        allowedRoutes: [
            ROUTES.WORKSPACE,
            ROUTES.USER_ANNOTATION,
            ROUTES.SETTINGS,
        ],
        canCreateWorkspace: false,
        canManageUsers: false,
        canManageTemplates: false,
        canViewAnalytics: false,
        canDeleteProjects: false,
        canArchiveProjects: false,
    },
    [ROLES.VIEWER]: {
        allowedNavSections: [
            NAV_SECTIONS.WORKSPACES,
            NAV_SECTIONS.ORGANIZATION_SELECTOR,
        ],
        allowedRoutes: [
            ROUTES.WORKSPACE,
            ROUTES.USER_ANNOTATION,
        ],
        canCreateWorkspace: false,
        canManageUsers: false,
        canManageTemplates: false,
        canViewAnalytics: false,
        canDeleteProjects: false,
        canArchiveProjects: false,
    },
    [ROLES.COLLECTOR]: {
        allowedNavSections: [],
        allowedRoutes: [
            ROUTES.WORKSPACE,            // /workspace — prefix-matches /workspace/:id
            '/data-collection/upload',
            '/data-collection/collector/view',
            '/settings',
            '/collector/profile',
        ],
        canCreateWorkspace: false,
        canManageUsers: false,
        canManageTemplates: false,
        canViewAnalytics: false,
        canDeleteProjects: false,
        canArchiveProjects: false,
    },
};

// Default permissions for unknown roles (restrictive by default)
const DEFAULT_PERMISSIONS = {
    allowedNavSections: [NAV_SECTIONS.WORKSPACES, NAV_SECTIONS.ORGANIZATION_SELECTOR],
    allowedRoutes: [ROUTES.WORKSPACE, ROUTES.USER_ANNOTATION],
    canCreateWorkspace: false,
    canManageUsers: false,
    canManageTemplates: false,
    canViewAnalytics: false,
    canDeleteProjects: false,
    canArchiveProjects: false,
};

/**
 * User assignment interface matching API response
 */
export interface UserAssignment {
    role_id: string;
    entity_id: string;
    entity: 'organization' | 'workspace' | 'project';
}

/**
 * Extract the primary role from user data
 * Priority: direct role field > organization role > first assignment role_id
 * @param user - A user-shaped object (or `null`) with any combination of `role`,
 * `organization.role`, or `assignments`.
 * @returns The lowercased role string, or `ROLES.VIEWER` (most restrictive) if `user` is
 * `null`/has no role information.
 */
export const getUserRole = (user: {
    role?: string;
    organization?: { role?: string } | null;
    assignments?: UserAssignment[];
} | null): string => {
    if (!user) return ROLES.VIEWER;

    // Check direct role field (super_admin has this)
    if (user.role) {
        return user.role.toLowerCase() as RoleType;
    }

    // Check organization role
    if (user.organization?.role) {
        return user.organization.role.toLowerCase() as RoleType;
    }

    // Fall back to first assignment role_id
    if (user.assignments && user.assignments.length > 0) {
        // Prioritize organization-level assignment — a user can hold different
        // role_ids per entity (org/workspace/project); the org-level one best
        // represents their overall role when no more specific field is set.
        const orgAssignment = user.assignments.find(a => a.entity === 'organization');
        if (orgAssignment) {
            return orgAssignment.role_id.toLowerCase() as RoleType;
        }
        // Fall back to any assignment
        return user.assignments[0].role_id.toLowerCase() as RoleType;
    }

    return ROLES.VIEWER;
};

/**
 * Get permissions for a given role
 * @param role - Role string (case-insensitive).
 * @returns The role's permission set from `ROLE_PERMISSIONS`, or `DEFAULT_PERMISSIONS`
 * (most restrictive) when the role is unrecognized.
 */
export const getRolePermissions = (role: string) => {
    const normalizedRole = role.toLowerCase() as RoleType;
    return ROLE_PERMISSIONS[normalizedRole] || DEFAULT_PERMISSIONS;
};

/**
 * Check if a role has access to a navigation section
 * @param role - Role string (case-insensitive).
 * @param section - The nav section to check (see `NAV_SECTIONS`).
 * @returns `true` if the role's `allowedNavSections` includes `section`.
 */
export const canAccessNavSection = (role: string, section: NavSectionType): boolean => {
    const permissions = getRolePermissions(role);
    return permissions.allowedNavSections.includes(section);
};

/**
 * Check if a role has access to a specific route
 * @param role - Role string (case-insensitive).
 * @param route - The path being navigated to (e.g. from `location.pathname`).
 * @returns `true` if the role has the `'*'` wildcard, or `route` exactly matches or is a
 * sub-path (`{allowedRoute}/...`) of one of the role's `allowedRoutes`.
 */
export const canAccessRoute = (role: string, route: string): boolean => {
    const permissions = getRolePermissions(role);
    
    // Wildcard means all routes
    if (permissions.allowedRoutes.includes('*')) {
        return true;
    }

    // Check exact match or prefix match — prefix matching lets a single entry
    // like `/workspace` also cover nested detail routes such as `/workspace/:id`.
    return permissions.allowedRoutes.some(allowedRoute => 
        route === allowedRoute || route.startsWith(`${allowedRoute}/`)
    );
};

/**
 * Check if role has higher or equal privilege than another role
 * @param userRole - The role to test (case-insensitive).
 * @param requiredRole - The minimum role required.
 * @returns `true` if `userRole`'s position in `ROLE_HIERARCHY` is at or above `requiredRole`'s;
 * `false` for an unrecognized `userRole` (treated as lowest privilege, so it fails closed).
 */
export const hasEqualOrHigherPrivilege = (userRole: string, requiredRole: RoleType): boolean => {
    const userIndex = ROLE_HIERARCHY.indexOf(userRole.toLowerCase() as RoleType);
    const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
    
    // Unknown roles are treated as lowest privilege
    if (userIndex === -1) return false;
    
    return userIndex >= requiredIndex;
};

/**
 * Check specific permission
 * @param role - Role string (case-insensitive).
 * @param permission - One of the boolean capability flags on the permission set
 * (e.g. `canManageUsers`, `canDeleteProjects`) — nav/route arrays are excluded by the type.
 * @returns The boolean value of that permission flag for the role, or `false` if undefined.
 */
export const hasPermission = (
    role: string, 
    permission: keyof Omit<typeof ROLE_PERMISSIONS[RoleType], 'allowedNavSections' | 'allowedRoutes'>
): boolean => {
    const permissions = getRolePermissions(role);
    return permissions[permission] ?? false;
};

/**
 * Get the default redirect route for a role (used when accessing unauthorized routes)
 * @param role - Role string (case-insensitive).
 * @returns `ROUTES.DASHBOARD` if the role can reach it (or has the wildcard); otherwise the
 * role's first allowed route, or `'/'` if that first route is only `/workspace` (not directly
 * routable on its own — see inline comment) or there are no allowed routes at all.
 */
export const getDefaultRouteForRole = (role: string): string => {
    const permissions = getRolePermissions(role);

    if (permissions.allowedRoutes.includes('*') || permissions.allowedRoutes.includes(ROUTES.DASHBOARD)) {
        return ROUTES.DASHBOARD;
    }

    // /workspace alone is not a routable page — go to home, which redirects to the user's workspace
    const firstRoute = permissions.allowedRoutes[0];
    if (!firstRoute || firstRoute === ROUTES.WORKSPACE) {
        return '/';
    }

    return firstRoute;
};
