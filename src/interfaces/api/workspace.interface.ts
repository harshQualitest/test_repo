/**
 * Workspace API Interfaces
 *
 * Purpose: Request/response types for the Workspace API — creation, updates,
 * the workspace entity itself, its member list, and projects it contains.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/** Request body for creating a new workspace within an organization. */
export interface CreateWorkspace {
    org_id: string;
    name: string;
    description: string;
    // Max number of members allowed in the workspace.
    workspace_size: number;
    workspace_type: string;
    visibility: string;
    color_scheme: string;
}

/** Request body for updating a workspace; extends CreateWorkspace with the target workspace_id. */
export interface UpdateWorkspace extends Partial<CreateWorkspace> {
    workspace_id: string;
    name: string;
    description: string;
    workspace_size: number;
    workspace_type: string;
    visibility: string;
    color_scheme: string;
}

/** Summary of a project as it appears nested within a workspace's project list. */
export interface WorkspaceProject {
    project_id: string;
    project_name: string;
    project_description: string;
    template_type: string;
    status: string;
}

/** Full workspace entity as returned by the API. */
export interface Workspace {
    _id: string;
    org_id: string;
    name: string;
    description: string;
    workspace_size: number;
    workspace_type: string;
    visibility: string;
    color_scheme: string;
    admin_users: string[];
    created_by: string;
    created_at: string;
    updated_at: string | null;
    is_active: number;
    projects?: WorkspaceProject[];
    members?: WorkspaceMember[];
    // member_count/memberCount are duplicate snake_case/camelCase variants from different endpoints.
    member_count?: number;
    memberCount?: number;
}

/** A user's membership record within a workspace. */
export interface WorkspaceMember {
    _id?: string;
    user_id?: string;
    role?: string;
    status?: string;
    added_at?: string;
    email?: string | null;
    username?: string | null;
    // Separate from `status`: tracks whether the invite itself was accepted/pending/expired.
    invitation_status?: string;
    workspace_id?: string;
    // Denormalized user details, present when the API embeds the related user record.
    user?: {
        _id?: string;
        name?: string;
        email?: string;
        username?: string;
        role?: string;
    };
}
