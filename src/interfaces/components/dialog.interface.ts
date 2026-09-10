/**
 * Dialog/Form Component Interfaces
 *
 * Type definitions for various dialog form components used throughout the application.
 *
 * Purpose: Form field shapes and prop contracts for the create/edit dialogs used
 * by workspace, user-invitation, and organization management screens.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/**
 * Form data for creating/editing a workspace
 */
export interface WorkspaceFormData {
    name: string;
    description: string;
    type: string; // Maps to workspace_type in API
    visibility: string;
    colorScheme: string; // Maps to color_scheme in API
    org_id: string;
    workspace_size?: number;
}

/**
 * Form data for inviting/creating a user
 */
export interface UserFormData {
    email: string;
    role: string;
    org_id: string;
    // ID of the role record to assign, distinct from the `role` display name/code.
    role_id: string;
}

/**
 * Form data for creating/editing an organization
 */
export interface OrganizationFormData {
    name: string;
    type: string;
    description: string;
    code: string;
    org_admin: string;
}

/**
 * Props for workspace creation dialog
 */
export interface WorkspaceCreateDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: (workspace: any) => void;
    orgId?: string;
}

/**
 * Props for user creation/invitation dialog
 */
export interface UserCreationDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: (user: any) => void;
}

/**
 * Props for organization creation dialog
 */
export interface OrganizationDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: (organization: any) => void;
}
