import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dataCollectionApi from '../../services/api/dataCollectionApi';
import type {
    IDataCollectionProject,
    ICreateDataCollectionProject,
    IUpdateDataCollectionProject,
} from '../../interfaces/api/dataCollection.interface';

export interface DataCollectionState {
    userProjects: IDataCollectionProject[];
    userProjectsLoading: boolean;
    userProjectsError: string | null;
    createLoading: boolean;
    createError: string | null;
    createSuccess: boolean;
    currentProject: IDataCollectionProject | null;
    currentProjectLoading: boolean;
    currentProjectError: string | null;
    updateLoading: boolean;
    updateError: string | null;
    updateSuccess: boolean;
}

const initialState: DataCollectionState = {
    userProjects: [],
    userProjectsLoading: false,
    userProjectsError: null,
    createLoading: false,
    createError: null,
    createSuccess: false,
    currentProject: null,
    currentProjectLoading: false,
    currentProjectError: null,
    updateLoading: false,
    updateError: null,
    updateSuccess: false,
};

/**
 * Creates a new data-collection project via `dataCollectionApi.createProject`.
 * @param data - the project creation payload (`ICreateDataCollectionProject`).
 * @returns the API response for the newly created project.
 * @throws (via `rejectWithValue`) the API error message, or a generic
 * fallback string, on failure.
 */
export const createDataCollectionProject = createAsyncThunk(
    'dataCollection/create',
    async (data: ICreateDataCollectionProject, { rejectWithValue }) => {
        try {
            return await dataCollectionApi.createProject(data);
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || err.message || 'Failed to create project');
        }
    },
);

/**
 * Fetches the current user's data-collection projects scoped to a workspace.
 * @param workspaceId - the workspace to scope the query to; required —
 * rejects immediately (without calling the API) if omitted.
 * @returns the list of `IDataCollectionProject` for the workspace.
 * @throws (via `rejectWithValue`) 'Workspace ID is required to fetch
 * projects' when `workspaceId` is missing, or the API error message on
 * request failure.
 */
export const fetchUserDataCollectionProjects = createAsyncThunk(
    'dataCollection/fetchUserProjects',
    async (workspaceId: string | undefined, { rejectWithValue }) => {
        if (!workspaceId) {
            return rejectWithValue('Workspace ID is required to fetch projects');
        }
        try {
            return await dataCollectionApi.getUserProjectsByWorkspace(workspaceId);
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || err.message || 'Failed to fetch projects');
        }
    },
);

/**
 * Fetches a single data-collection project by ID.
 * @param projectId - the project to fetch.
 * @returns the `IDataCollectionProject` for the given ID.
 * @throws (via `rejectWithValue`) the API error message, or a generic
 * fallback string, on failure.
 */
export const fetchDataCollectionProjectById = createAsyncThunk(
    'dataCollection/fetchById',
    async (projectId: string, { rejectWithValue }) => {
        try {
            return await dataCollectionApi.getProjectData(projectId);
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || err.message || 'Failed to fetch project');
        }
    },
);

/**
 * Updates an existing data-collection project.
 * @param data - the update payload (`IUpdateDataCollectionProject`).
 * @returns the API response for the updated project.
 * @throws (via `rejectWithValue`) the API error/message, or a generic
 * fallback string, on failure.
 */
export const updateDataCollectionProject = createAsyncThunk(
    'dataCollection/update',
    async (data: IUpdateDataCollectionProject, { rejectWithValue }) => {
        try {
            return await dataCollectionApi.updateProject(data);
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to update project');
        }
    },
);

/**
 * Slice: dataCollection
 *
 * Purpose: Owns the data-collection project workflow — creating, listing
 * (per workspace), fetching by ID, and updating data-collection projects.
 *
 * State shape:
 * - `userProjects` / `userProjectsLoading` / `userProjectsError`: the
 *   current user's projects for a workspace and the fetch status.
 * - `createLoading` / `createError` / `createSuccess`: status of the most
 *   recent create request.
 * - `currentProject` / `currentProjectLoading` / `currentProjectError`:
 *   the single project loaded by ID (e.g. for a detail/edit view).
 * - `updateLoading` / `updateError` / `updateSuccess`: status of the most
 *   recent update request.
 *
 * Reducers:
 * - `clearCreateState`: resets the create-request status flags.
 * - `clearErrors`: clears `createError` only.
 * - `clearCurrentProject`: clears the loaded project and its status flags.
 * - `clearUpdateState`: resets the update-request status flags.
 *
 * Async thunks: `createDataCollectionProject`, `fetchUserDataCollectionProjects`,
 * `fetchDataCollectionProjectById`, `updateDataCollectionProject` (documented
 * above each definition).
 *
 * Selectors: `selectDCUserProjects`, `selectDCUserProjectsLoading`,
 * `selectDCUserProjectsError`, `selectDCCreateLoading`, `selectDCCreateSuccess`,
 * `selectDCCreateError`, `selectDCCurrentProject`, `selectDCCurrentProjectLoading`,
 * `selectDCCurrentProjectError`, `selectDCUpdateLoading`, `selectDCUpdateError`,
 * `selectDCUpdateSuccess` (below), reading from `state.dataCollection`.
 *
 * Note: unlike most slices here, the create/update/fetch thunks return the
 * raw API client response directly (no `response.data` unwrapping), so
 * `action.payload` shape mirrors whatever `dataCollectionApi` resolves to.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const dataCollectionSlice = createSlice({
    name: 'dataCollection',
    initialState,
    reducers: {
        /** Resets the create-project status flags (loading/error/success). */
        clearCreateState: (state) => {
            state.createLoading = false;
            state.createError = null;
            state.createSuccess = false;
        },
        /** Clears the create-project error only. */
        clearErrors: (state) => {
            state.createError = null;
        },
        /** Clears the currently loaded project and its fetch status flags. */
        clearCurrentProject: (state) => {
            state.currentProject = null;
            state.currentProjectLoading = false;
            state.currentProjectError = null;
        },
        /** Resets the update-project status flags (loading/error/success). */
        clearUpdateState: (state) => {
            state.updateLoading = false;
            state.updateError = null;
            state.updateSuccess = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(createDataCollectionProject.pending, (state) => {
                state.createLoading = true;
                state.createError = null;
                state.createSuccess = false;
            })
            .addCase(createDataCollectionProject.fulfilled, (state) => {
                state.createLoading = false;
                state.createSuccess = true;
            })
            .addCase(createDataCollectionProject.rejected, (state, action) => {
                state.createLoading = false;
                state.createError = action.payload as string;
            });

        builder
            .addCase(fetchUserDataCollectionProjects.pending, (state) => {
                state.userProjectsLoading = true;
                state.userProjectsError = null;
            })
            .addCase(fetchUserDataCollectionProjects.fulfilled, (state, action) => {
                state.userProjectsLoading = false;
                state.userProjects = action.payload;
            })
            .addCase(fetchUserDataCollectionProjects.rejected, (state, action) => {
                state.userProjectsLoading = false;
                state.userProjectsError = action.payload as string;
            });

        builder
            .addCase(fetchDataCollectionProjectById.pending, (state) => {
                state.currentProjectLoading = true;
                state.currentProjectError = null;
            })
            .addCase(fetchDataCollectionProjectById.fulfilled, (state, action) => {
                state.currentProjectLoading = false;
                state.currentProject = action.payload;
            })
            .addCase(fetchDataCollectionProjectById.rejected, (state, action) => {
                state.currentProjectLoading = false;
                state.currentProjectError = action.payload as string;
            });

        builder
            .addCase(updateDataCollectionProject.pending, (state) => {
                state.updateLoading = true;
                state.updateError = null;
                state.updateSuccess = false;
            })
            .addCase(updateDataCollectionProject.fulfilled, (state) => {
                state.updateLoading = false;
                state.updateSuccess = true;
            })
            .addCase(updateDataCollectionProject.rejected, (state, action) => {
                state.updateLoading = false;
                state.updateError = action.payload as string;
            });
    },
});

export const { clearCreateState, clearErrors, clearCurrentProject, clearUpdateState } = dataCollectionSlice.actions;

export const selectDCUserProjects = (state: { dataCollection: DataCollectionState }) => state.dataCollection.userProjects;
export const selectDCUserProjectsLoading = (state: { dataCollection: DataCollectionState }) => state.dataCollection.userProjectsLoading;
export const selectDCUserProjectsError = (state: { dataCollection: DataCollectionState }) => state.dataCollection.userProjectsError;
export const selectDCCreateLoading = (state: { dataCollection: DataCollectionState }) => state.dataCollection.createLoading;
export const selectDCCreateSuccess = (state: { dataCollection: DataCollectionState }) => state.dataCollection.createSuccess;
export const selectDCCreateError = (state: { dataCollection: DataCollectionState }) => state.dataCollection.createError;
export const selectDCCurrentProject = (state: { dataCollection: DataCollectionState }) => state.dataCollection.currentProject;
export const selectDCCurrentProjectLoading = (state: { dataCollection: DataCollectionState }) => state.dataCollection.currentProjectLoading;
export const selectDCCurrentProjectError = (state: { dataCollection: DataCollectionState }) => state.dataCollection.currentProjectError;
export const selectDCUpdateLoading = (state: { dataCollection: DataCollectionState }) => state.dataCollection.updateLoading;
export const selectDCUpdateError = (state: { dataCollection: DataCollectionState }) => state.dataCollection.updateError;
export const selectDCUpdateSuccess = (state: { dataCollection: DataCollectionState }) => state.dataCollection.updateSuccess;

export default dataCollectionSlice.reducer;
