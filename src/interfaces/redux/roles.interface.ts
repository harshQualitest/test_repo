/**
 * Roles & Permissions Redux Slice Interfaces
 *
 * Type definitions for the roles and permissions management Redux slice.
 *
 * Purpose: RBAC types for the roles/permissions slice, consumed alongside
 * `src/utils/roles.ts` for permission checks and gated UI.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/**
 * Access level for a permission
 */
export type PermissionAccess = 'view' | 'edit' | 'full_access' | 'no_access';

/**
 * Permission model
 */
export interface Permission {
    permission_id: string;
    access: PermissionAccess;
}

/**
 * Role model with associated permissions
 */
export interface Role {
    _id: string;
    role_id: string;
    permissions: Permission[];
}

/**
 * Combined roles and permissions data
 */
export interface RolePermissionData {
    roles: Role[];
    permissions: Permission[];
}

/**
 * Redux state for roles and permissions management
 */
export interface RolesState {
    roles: Role[];
    permissions: Permission[];
    loading: boolean;
    error: string | null;
    // Timestamp of the last successful fetch; used to decide whether to refetch/cache.
    lastFetch: string | null;
}
