/**
 * Redux Interfaces Barrel Export
 *
 * Central export point for all Redux slice-related interfaces.
 *
 * Purpose: Aggregates state/entity types for every domain slice (project,
 * user, workspace, roles/permissions, auth, organization) registered in
 * `src/redux/store.ts`.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

// Project slice interfaces
export type { IProject, ProjectState } from './project.interface';

// User slice interfaces
export type { User, UserRoleAssignment, UserAssignment, UserPagination, UserState } from './user.interface';

// Workspace slice interfaces
export type { Workspace, WorkspaceState } from './workspace.interface';

// Roles & Permissions slice interfaces
export type { Permission, PermissionAccess, Role, RolePermissionData, RolesState } from './roles.interface';

// Auth/Login slice interfaces (from legacy files)
export type {
    User as LoginUser,
    LoginCredentials,
    RegisterCredentials,
    LoginResponse,
    AuthError,
    LoginState,
} from './auth.interface';

// Organization slice interfaces (from legacy files)
export type { Organization, OrganizationDashboardMetrics, OrganizationState } from './organization.interface';
