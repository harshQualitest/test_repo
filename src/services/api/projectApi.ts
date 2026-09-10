/**
 * Purpose: API calls for the core project domain — CRUD on projects,
 * project membership, annotation tasks, and reviewer tasks. All calls use
 * the shared `client`; errors are uncaught axios rejections propagated to
 * the caller (typically a Redux thunk). Several endpoints return responses
 * wrapped in varying pagination envelopes, hence the `unwrapApiResponse`
 * helper below that normalizes them.
 */
import type { ICreateProject, IUpdateProject, IUpdateProjectUsers } from '../../interfaces';
import client from '../axiosConfig';

export type ProjectStatusFilter = 'active' | 'delete' | 'archive' | 'draft';

export interface GetAllProjectsParams {
    limit?: number;
    offset?: number;
    search?: string;
    filter?: ProjectStatusFilter;
}

export interface GetProjectMembersParams {
    limit?: number;
    offset?: number;
    search?: string;
    filter?: string;
}

/**
 * Normalizes the several response shapes this API can return into a plain
 * value/array, so callers don't each need to know whether the backend wrapped
 * the payload once, twice, or not at all.
 * @param response - The raw axios response (or already-unwrapped data).
 * @param fallback - Value to return when `response` is falsy (e.g. network failure upstream already handled).
 * @returns The unwrapped payload, typed as `T`.
 */
const unwrapApiResponse = <T>(response: any, fallback: T): T => {
    if (!response) {
        return fallback;
    }

    const data = response.data ?? response;
    if (Array.isArray(data)) {
        return data as T;
    }

    // Handle paginated response: { data: { data: [], offset, limit, total } }
    if (data?.data) {
        // If data.data is an array, return it
        if (Array.isArray(data.data)) {
            return data.data as T;
        }
        // If data.data is an object with a data property (nested pagination), return the nested data
        if (data.data?.data && Array.isArray(data.data.data)) {
            return data.data.data as T;
        }
        // Otherwise return data.data as is
        return data.data as T;
    }

    return data as T;
};

const projectApi = {
    /**
     * POST /project/ — creates a new project.
     * @param data - Project fields, or a `FormData` instance when the project includes file uploads
     * (in which case the request is sent as multipart).
     * @returns Unwrapped created-project payload.
     */
    createProject: async (data: FormData | ICreateProject) => {
        const config = data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
        const response = await client.post('/project/', data, config);
        return unwrapApiResponse(response, {} as any);
    },
    /**
     * GET /project/{workspaceId} — paginated list of projects in a workspace.
     * @param workspaceId - Workspace id.
     * @param params - Pagination/search/status-filter options; `limit` defaults to -1 (unbounded).
     * @returns Unwrapped array of projects.
     */
    getAllProjects: async (workspaceId: string, params: GetAllProjectsParams = {}) => {
        const { limit = -1, offset = 0, search, filter } = params;
        const query = new URLSearchParams();
        query.set('limit', String(limit));
        query.set('offset', String(offset));
        if (search) query.set('search', search);
        if (filter) query.set('filter', filter);
        const response = await client.get(`/project/${workspaceId}?${query.toString()}`);
        return unwrapApiResponse(response, [] as any[]);
    },
    /**
     * GET /project/user/projects — all projects the current user belongs to (across workspaces).
     * @returns Unwrapped array of projects.
     */
    getUserProjects: async () => {
        const response = await client.get('/project/user/projects');
        return unwrapApiResponse(response, [] as any[]);
    },
    /**
     * GET /project/details/{projectId} — full details for a single project.
     * @param projectId - Project id.
     * @returns Unwrapped project object.
     */
    getProjectById: async (projectId: string) => {
        const response = await client.get(`/project/details/${projectId}`);
        return unwrapApiResponse(response, {} as any);
    },
    /**
     * PATCH /project/{projectId}/archive — archives a project (soft, reversible action).
     * @param projectId - Project id.
     * @returns Unwrapped updated project.
     */
    archiveProject: async (projectId: string) => {
        const response = await client.patch(`/project/${projectId}/archive`);
        return unwrapApiResponse(response, {} as any);
    },
    /**
     * DELETE /project/ — deletes a project. Uses the axios `data` option since
     * DELETE requests don't take a body param directly.
     * @param projectId - Project id, sent as `{ project_id }` in the request body.
     * @returns Unwrapped deletion confirmation.
     */
    deleteProject: async (projectId: string) => {
        const response = await client.delete(`/data-collector/project/${projectId}`);
        return unwrapApiResponse(response, {} as any);
    },
    /**
     * GET /project-task/{projectId} — users assigned to annotation tasks for a project.
     * @param projectId - Project id.
     * @returns Unwrapped array of task users.
     */
    getProjectTaskUsers: async (projectId: string) => {
        const response = await client.get(`/project-task/${projectId}`);
        return unwrapApiResponse(response, [] as any[]);
    },
    /**
     * PATCH /project-task/{projectId}/{taskId}/ — submits an annotator's work on a task.
     * @param projectId - Project id.
     * @param taskId - Task id.
     * @param data - Annotation payload (shape is task-type dependent).
     * @returns Unwrapped updated task.
     */
    submitAnnotation: async (projectId: string, taskId: string, data: any) => {
        const response = await client.patch(`/project-task/${projectId}/${taskId}/`, data);
        return unwrapApiResponse(response, {} as any);
    },
    /**
     * GET /project-task/{projectId}/tasks — paginated list of a project's annotation tasks.
     * @param projectId - Project id.
     * @param limit - Page size (default 10).
     * @param offset - Page offset (default 0).
     * @returns The full pagination envelope `{ offset, limit, total, data }` — NOT unwrapped to
     * just the array, since callers need the total/offset for paging UI.
     */
    getAllProjectTasks: async (projectId: string, limit: number = 10, offset: number = 0) => {
        const response = await client.get(`/project-task/${projectId}/tasks?limit=${limit}&offset=${offset}`);
        // Return the full pagination object instead of unwrapping to just the data array
        return response.data?.data || { offset: 0, limit: 10, total: 0, data: [] };
    },
    /**
     * GET /project/members/{projectId} — paginated/filterable list of project members.
     * @param projectId - Project id.
     * @param params - Pagination/search/role-filter options.
     * @returns The full pagination envelope `{ offset, limit, total, data }`.
     */
    getProjectMembers: async (projectId: string, params: GetProjectMembersParams = {}) => {
        const { limit = -1, offset = 0, search, filter } = params;
        const query = new URLSearchParams();
        query.set('limit', String(limit));
        query.set('offset', String(offset));
        if (search) query.set('search', search);
        if (filter) query.set('filter', filter);
        const response = await client.get(`/project/members/${projectId}?${query.toString()}`);
        return response.data?.data || { offset: 0, limit: -1, total: 0, data: [] };
    },
    /**
     * POST /project/update-user — no-argument variant retained for callers that don't
     * need to pass a body; see `updateProjectUsers` for the payload-carrying version.
     * @returns Unwrapped response.
     */
    updateProjectMemebers: async () => {
        const response = await client.post(`/project/update-user`);
        return unwrapApiResponse(response, {} as any);
    },
    /**
     * GET /reviewer-task/reviewer/{projectId}/ — tasks awaiting review for a project.
     * @param projectId - Project id.
     * @returns Unwrapped array of reviewer tasks.
     */
    getReviwerTasks: async (projectId: string) => {
        const response = await client.get(`/reviewer-task/reviewer/${projectId}/`);
        return unwrapApiResponse(response, [] as any[]);
    },
    /**
     * GET /reviewer-task/reviewer/{projectId}/{taskId}/ — a single reviewer task's details.
     * @param projectId - Project id.
     * @param taskId - Task id.
     * @returns Unwrapped reviewer task object.
     */
    getReviewerTaskById: async (projectId: string, taskId: string) => {
        const response = await client.get(`/reviewer-task/reviewer/${projectId}/${taskId}/`);
        return unwrapApiResponse(response, {} as any);
    },
    /**
     * POST /reviewer-task/reviewer/{projectId}/{taskId}/reviews — submits a reviewer's decision.
     * @param projectId - Project id.
     * @param taskId - Task id.
     * @param data - Review payload (decision/comments, shape is task-type dependent).
     * @returns Unwrapped review result.
     */
    reviewerReviewTask: async (projectId: string, taskId: string, data: any) => {
        const response = await client.post(`/reviewer-task/reviewer/${projectId}/${taskId}/reviews`, data);
        return unwrapApiResponse(response, {} as any);
    },
    /**
     * PUT /project/ — updates an existing project.
     * @param data - Update payload, or `FormData` when files are included (sent as multipart).
     * @returns Unwrapped updated project.
     */
    updateProject: async (data: IUpdateProject | FormData) => {
        const isFormData = data instanceof FormData;
        const response = await client.put(`/project/`, data, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
        });
        return unwrapApiResponse(response, {} as any);
    },
    /**
     * POST /project/update-user — adds/removes/updates users on a project.
     * @param data - User membership change payload.
     * @returns Unwrapped response.
     */
    updateProjectUsers: async (data: IUpdateProjectUsers) => {
        const response = await client.post(`/project/update-user`, data);
        return unwrapApiResponse(response, {} as any);
    },
};

export default projectApi;
