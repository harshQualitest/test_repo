/**
 * User Redux Slice Interfaces
 *
 * Type definitions for the user management Redux slice.
 *
 * Purpose: User entity, role assignments, and slice state for the user
 * management screens (distinct from the auth-slice `User` in
 * `redux/auth.interface.ts`, which represents the logged-in session user).
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/**
 * Role assignment for a user
 */
export interface UserRoleAssignment {
    role: {
        _id: string;
        code: string;
        name: string;
    };
    permissions: Array<{
        _id: string;
        code: string;
        name: string;
    }>;
    // Scope this role/permission set applies to, e.g. 'organization' | 'workspace' | 'project'.
    permission_for: string;
    entity: string;
}

/**
 * Assignment details for a user
 */
export interface UserAssignment {
    role_id: string;
    entity_id: string;
    entity: string;
}

/**
 * User model representing a user entity
 */
export interface User {
    _id: string;
    id?: string; // For backward compatibility
    username: string | null;
    name: string;
    email: string;
    role: string;
    org_id?: string;
    role_id?: string;
    roles?: UserRoleAssignment[];
    assignments?: UserAssignment[];
    permissions?: string[];
    remarks?: string;
    is_active: number;
    isActive?: boolean; // For backward compatibility
    createdAt?: string;
    updatedAt?: string;
    created_at?: string;
    created_by?: string;
    organization?: any;
}

/**
 * Pagination configuration for user list
 */
export interface UserPagination {
    page: number;
    pageSize: number;
    totalPages: number;
}

/**
 * Redux state for user management
 */
export interface UserState {
    users: User[];
    currentUser: User | null;
    loading: boolean;
    error: string | null;
    createUserLoading: boolean;
    createUserError: string | null;
    totalCount: number;
    pagination: UserPagination;
}
