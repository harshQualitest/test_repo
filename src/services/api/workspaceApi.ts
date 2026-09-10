/**
 * Purpose: API for workspace management — CRUD on workspaces, membership
 * (add/remove/list members), and per-user workspace project listings. All
 * calls use the shared `client`; errors are uncaught axios rejections
 * propagated to the caller.
 */
import type { CreateWorkspace, UpdateWorkspace } from '../../interfaces';
import client from '../axiosConfig';

export interface WorkspaceMembersPayload {
    workspace_id: string;
    org_id: string;
    workspace_users: Array<{ user_id: string; role: string }>;
    action: 'add' | 'remove';
    email_template_id?: string;
}

export interface WorkspaceMemberRemovalPayload {
    workspace_id: string;
    org_id: string;
    workspace_users: Array<{ user_id: string; role: string }>;
}

const workspaceApi = {
    /**
     * POST /workspace/ — creates a new workspace.
     * @param data - Workspace fields (name, org id, etc.).
     * @returns `response.data` — the created workspace.
     */
    createWorkspace: async (data: CreateWorkspace) => {
        const response = await client.post('/workspace/', data);
        return response.data;
    },
    /**
     * GET /workspace/{org_id} — paginated, searchable list of workspaces in an organization.
     * @param org_id - Organization id.
     * @param search - Optional search string; omitted from the query when blank.
     * @param limit - Page size (default 10).
     * @param offset - Page offset (default 0).
     * @returns `response.data` — paginated workspaces payload.
     */
    getWorkspaces: async (org_id?: string, search?: string | null, limit: number = 10, offset: number = 0) => {
        const params = new URLSearchParams();
        if (search !== undefined && search !== null && String(search).trim() !== '') params.append('search', String(search));
        if (limit !== undefined && limit !== null) params.append('limit', String(limit));
        if (offset !== undefined && offset !== null) params.append('offset', String(offset));

        const queryString = params.toString();
        const url = queryString ? `/workspace/${org_id}?${queryString}` : `/workspace/${org_id}`;

        const response = await client.get(url);
        return response.data;
    },
    /**
     * GET /workspace/{id} — fetches a single workspace by id.
     * @param id - Workspace id.
     * @returns `response.data` — the workspace.
     */
    getWorkspaceById: async (id: string) => {
        const response = await client.get(`/workspace/${id}`);
        return response.data;
    },
    /**
     * PUT /workspace/{org_id} — updates a workspace's fields.
     * @param org_id - Organization the workspace belongs to.
     * @param data - Update payload.
     * @returns `response.data` — the updated workspace.
     */
    updateWorkspace: async (org_id: string, data: UpdateWorkspace) => {
        const response = await client.put(`/workspace/${org_id}`, data);
        return response.data;
    },
    /**
     * DELETE /workspace/ — deletes a workspace. Uses the axios `data` option since
     * DELETE requests don't take a body param directly.
     * @param id - Workspace id, sent as `{ workspace_id }` in the request body.
     * @returns `response.data` — deletion confirmation.
     */
    deleteWorkspace: async (id: string) => {
        const response = await client.delete(`/workspace/`, { data: { workspace_id: id } });
        return response.data;
    },
    /**
     * GET /workspace/members/{workspaceId} — paginated, filterable list of workspace members.
     * @param workspaceId - Workspace id.
     * @param params - Pagination/role-filter/search options.
     * @returns `response.data` — paginated members payload.
     */
    getWorkspaceMembers: async (
        workspaceId: string,
        params?: {
            limit?: number;
            offset?: number;
            filter?: 'org_admin' | 'workspace_manager' | 'project_manager' | 'reviewer' | 'annotator' | null;
            search?: string | null;
        },
    ) => {
        const query = new URLSearchParams();
        if (params?.limit !== undefined) query.append('limit', String(params.limit));
        if (params?.offset !== undefined) query.append('offset', String(params.offset));
        if (params?.filter) query.append('filter', params.filter);
        if (params?.search) query.append('search', params.search);
        const queryString = query.toString();
        const url = queryString
            ? `/workspace/members/${workspaceId}?${queryString}`
            : `/workspace/members/${workspaceId}`;
        const response = await client.get(url);
        return response.data;
    },
    
    /**
     * POST /workspace/update-user/ — adds users to a workspace (action: 'add').
     * @param data - Workspace/org ids, the users+roles to add, and an optional email template
     * id used to notify the added users.
     * @returns `response.data` — update confirmation.
     */
    addUsersToWorkspace: async (data: WorkspaceMembersPayload) => {
        const payload = {
            workspace_id: data.workspace_id,
            org_id: data.org_id,
            workspace_users: data.workspace_users,
            action: 'add',
            ...(data.email_template_id && { email_template_id: data.email_template_id }),
        };
        const response = await client.post('/workspace/update-user/', payload);
        return response.data;
    },
    /**
     * POST /workspace/update-user/ — removes users from a workspace (action: 'remove').
     * Shares the same endpoint as `addUsersToWorkspace`; only the `action` field differs.
     * @param payload - Workspace/org ids and the users to remove.
     * @returns `response.data` — update confirmation.
     */
    removeUsersFromWorkspace: async ({ workspace_id, org_id, workspace_users }: WorkspaceMemberRemovalPayload) => {
        const payload = {
            workspace_id,
            org_id,
            workspace_users,
            action: 'remove' as const,
        };
        const response = await client.post('/workspace/update-user/', payload);
        return response.data;
    },
    /**
     * GET /project/workspace/{workspace_id}/user/{user_id} — projects a specific user
     * belongs to within a workspace.
     * @param workspace_id - Workspace id.
     * @param user_id - User id.
     * @returns `response.data` — the user's projects in that workspace.
     */
    getUserWorkspacesProjects: async (workspace_id: string, user_id: string) => {
        const response = await client.get(`/project/workspace/${workspace_id}/user/${user_id}`);
        return response.data;
    }
};

export default workspaceApi;
