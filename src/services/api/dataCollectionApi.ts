/**
 * Purpose: API calls for the Data Collection project workflow — creating and
 * updating data-collection projects, uploading datasets (file/live/text), and
 * the phase-based reviewer queue (fetching items pending review and recording
 * accept/reject decisions). All calls use the shared `client`; errors are
 * uncaught axios rejections that propagate to the caller (Redux thunks in the
 * data-collection slices).
 */
import client from '../axiosConfig';
import type {
    ICreateDataCollectionProject,
    IDataCollectionProject,
    IDatasetDocument,
    IPhaseDatasetsResponse,
    IUpdateDataCollectionProject,
} from '../../interfaces/api/dataCollection.interface';


const dataCollectionApi = {
    /**
     * POST /data-collector/projects — creates a new data-collection project.
     * @param data - Form values; `startDate`/`endDate` are renamed to `start_date`/`end_date`
     * for the API, and `template_type: 'collection'` is always injected.
     * @returns `response.data` — the created project payload.
     */
    createProject: async (data: ICreateDataCollectionProject) => {
        const { startDate, endDate, ...rest } = data;
        const payload = {
            ...rest,
            start_date: startDate,
            end_date: endDate,
            template_type: 'collection',
        };
        const response = await client.post('/data-collector/projects', payload);
        return response.data;
    },

    /**
     * GET /data-collector/{workspaceId}/projects/ — all data-collection projects
     * for a workspace, unpaginated (`limit: -1`).
     * @param workspaceId - Workspace id.
     * @returns Array of projects; unwraps `response.data.data` when the API paginates, else `response.data`.
     */
    getUserProjectsByWorkspace: async (workspaceId: string): Promise<IDataCollectionProject[]> => {
        const response = await client.get(`/data-collector/${workspaceId}/projects/`, {
            params: { limit: -1 },
        });
        return (response.data?.data ?? response.data ?? []) as IDataCollectionProject[];
    },

    /**
     * GET /data-collector/{workspaceId}/projects/ — same endpoint as
     * `getUserProjectsByWorkspace` but returns the raw `response.data` unwrapped.
     * @param workspaceId - Workspace id.
     * @returns The raw response body (caller handles any pagination envelope).
     */
    getProjectByWorkspace: async (workspaceId: string) => {
        const response = await client.get(`/data-collector/${workspaceId}/projects/`, {
            params: { limit: -1 },
        });
        return response.data
    },

    /**
     * GET /data-collector/my-uploads/{projectId} — files the current user has uploaded to a project.
     * @param projectId - Project id.
     * @returns Array of dataset documents.
     */
    getUserUploads: async (projectId: string): Promise<IDatasetDocument[]> => {
        const response = await client.get(`/data-collector/my-uploads/${projectId}`);
        return (response.data?.data ?? response.data ?? []) as IDatasetDocument[];
    },

    /**
     * GET /data-collector/projects/{projectId}/getdata — fetches full details for one project.
     * @param projectId - Project id.
     * @returns The project object; if the API returns an array, only the first element is used.
     */
    getProjectData: async (projectId: string) => {
        const response = await client.get(`/data-collector/projects/${projectId}/getdata`);
        const raw = response.data?.data ?? response.data;
        return (Array.isArray(raw) ? raw[0] : raw) as IDataCollectionProject;
    },

    /**
     * PUT /data-collector/projects/ — updates an existing data-collection project.
     * @param data - Full/partial update payload including the project id.
     * @returns `response.data` — the updated project.
     */
    updateProject: async (data: IUpdateDataCollectionProject) => {
        const response = await client.put('/data-collector/projects/', data);
        return response.data;
    },

    /**
     * POST /data-collector/projects/{project_id}/upload — uploads a dataset file (multipart).
     * @param formData - Multipart form containing the file to upload.
     * @param project_id - Target project id.
     * @returns `response.data` — upload result/confirmation.
     */
    uploadFile: async (formData: FormData, project_id: string) => {
        const response = await client.post(`/data-collector/projects/${project_id}/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * POST /data-collector/projects/uploadfilelive — uploads a file for the "live" collection flow.
     * @param formData - Multipart form data (includes target project reference).
     * @returns `response.data` — upload result/confirmation.
     */
    uploadFileLive: async (formData: FormData) => {
        const response = await client.post('/data-collector/projects/uploadfilelive', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    /**
     * POST /data-collector/projects/uploadtext — submits free-text data-collection input.
     * @param data - Arbitrary text-submission payload.
     * @returns `response.data` — submission result/confirmation.
     */
    uploadText: async (data: Record<string, unknown>) => {
        const response = await client.post('/data-collector/projects/uploadtext', data);
        return response.data;
    },

    /**
     * Fetches a page of dataset items pending review for one phase/slot of a project.
     * phaseKey/phaseId come from the project's `phases` map (phases[phaseKey][i].id).
     */
    getPhaseDatasets: async (
        projectId: string,
        phaseKey: string,
        phaseId: string,
        params: { limit?: number; offset?: number } = {},
    ): Promise<IPhaseDatasetsResponse> => {
        const { limit = 10, offset = 0 } = params;
        const response = await client.get(`/data-collector/projects/${projectId}/phases/${phaseKey}/${phaseId}`, {
            params: { limit, offset },
        });
        return response.data as IPhaseDatasetsResponse;
    },

    /**
     * Records a reviewer's approve/reject decision on a single dataset item.
     * `datasetId` must be the `_id` of the dataset document as returned by
     * getPhaseDatasets — not the phase id.
     * The review endpoint expects lowercase `quality` values regardless of the
     * capitalized DatasetQualityState casing used for display elsewhere.
     */
    reviewDataset: async (
        projectId: string,
        datasetId: string,
        data: { quality: 'Accepted' | 'Rejected'; reason?: string },
    ) => {
        const payload = { ...data, quality: data.quality.toLowerCase() };
        const response = await client.post(`/data-collector/projects/${projectId}/datasets/${datasetId}/review`, payload);
        return response.data;
    },
};

export default dataCollectionApi;
