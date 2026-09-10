/**
 * Purpose: API calls that back the dashboard views (workspace, project and
 * task level). All calls go through the shared `client` (see
 * `services/axiosConfig.ts`), so auth headers/token refresh are handled by
 * its interceptors. Errors are not caught here — axios rejections propagate
 * to the caller (typically a Redux thunk) to handle/display.
 */
import client from "../axiosConfig";

export const dashboardApi = {
    /**
     * GET /ws/dashboard/{id}[?days=N] — workspace-level dashboard metrics.
     * @param id - Workspace id.
     * @param days - Optional lookback window in days; omitted from the query when not provided.
     * @returns The raw axios response (not `.data`) for this workspace's dashboard stats.
     */
    workspaceApi: async (id:string, days?: number) => {
        const url = days ? `/ws/dashboard/${id}?days=${days}` : `/ws/dashboard/${id}`;
        const response = await client.get(url);
        return response
    },

    /**
     * GET /project/dashboard/{id} — project-level dashboard metrics.
     * @param id - Project id.
     * @returns The raw axios response for this project's dashboard stats.
     */
    projhectDashboardApi: async (id:string) => {
        const response = await client.get(`/project/dashboard/${id}`);
        return response
    },

    /**
     * GET /project-task/{projectId}/{taskId}/ — dashboard data for a single task.
     * @param projectId - Parent project id.
     * @param taskId - Task id within the project.
     * @returns The raw axios response for this task's dashboard data.
     */
    taskDashboardApi: async (projectId:string, taskId:string) => {
        const response = await client.get(`/project-task/${projectId}/${taskId}/`);
        return response
    }
}