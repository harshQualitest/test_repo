import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import projectApi from '../../services/api/projectApi';
import type { GetAllProjectsParams } from '../../services/api/projectApi';
import type { ICreateProject, IUpdateProject } from '../../interfaces/api/project.interface';

// Project interface (extend as needed based on your API response)
export interface IProject {
    id?: string;
    _id?: string;
    org_id: string;
    workspace_id: string;
    name: string;
    description: string;
    template_type: 'llm_grading' | 'text_annotation' | 'multi_modal';
    start_date: string;
    end_date: string;
    created_at?: string;
    updated_at?: string;
    status?: 'active' | 'completed' | 'archived' | 'draft';
    progress?: number;
    task_timeout?: number;
    instructions?: { url?: string };
    dataset_file_name?: string;
    instructions_file_name?: string;
    members?: IProjectMember[];
}

// Task interface
export interface IProjectTask {
    _id?: string;
    id?: string;
    org_id?: string;
    workspace_id?: string;
    project_id?: string;
    prompt?: string;
    llm1?: string;
    llm2?: string;
    status?: string;
    stage?: string;
    priority?: string;
    assigned_to?: string;
    assigned_annotator?: string;
    started_at_by_annotator?: string;
    annotator_expiration?: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
    completed_at?: string;
    cycle?: number;
    is_active?: number;
    annotations?: any[];
    payload?: any;
    [key: string]: any;
}

// Member interface
export interface IProjectMember {
    id?: string;
    _id?: string;
    user_id?: string;
    name: string;
    email: string;
    role?: string;
    avatar?: string;
    status?: string;
    [key: string]: any;
}

// State interface
export interface ProjectState {
    projects: IProject[];
    currentProject: IProject | null;
    tasks: IProjectTask[];
    members: IProjectMember[];
    loading: boolean;
    error: string | null;
    tasksLoading: boolean;
    tasksError: string | null;
    tasksPagination: {
        offset: number;
        limit: number;
        total: number;
    } | null;
    membersLoading: boolean;
    membersError: string | null;
    membersPagination: { offset: number; limit: number; total: number } | null;
    createLoading: boolean;
    createError: string | null;
    createSuccess: boolean;
    updateLoading: boolean;
    updateError: string | null;
    updateSuccess: boolean;
}

// Initial state
const initialState: ProjectState = {
    projects: [],
    currentProject: null,
    tasks: [],
    members: [],
    loading: false,
    error: null,
    tasksLoading: false,
    tasksError: null,
    tasksPagination: null,
    membersLoading: false,
    membersError: null,
    membersPagination: null,
    createLoading: false,
    createError: null,
    createSuccess: false,
    updateLoading: false,
    updateError: null,
    updateSuccess: false,
};

// Async thunks

export interface FetchAllProjectsParams extends GetAllProjectsParams {
    workspaceId: string;
}

/**
 * Fetch all projects
 * @param params - `{ workspaceId, ...GetAllProjectsParams }`; `workspaceId`
 * scopes the query, the rest are pass-through list params (pagination/filter/search).
 * @returns the API response containing the project list (and pagination
 * metadata when present — see `fetchAllProjectTasks`-style unwrapping is
 * NOT applied here; `fulfilled` expects a plain `IProject[]`).
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const fetchAllProjects = createAsyncThunk(
    'project/fetchAllProjects',
    async ({ workspaceId, ...params }: FetchAllProjectsParams, { rejectWithValue }) => {
        try {
            const response = await projectApi.getAllProjects(workspaceId, params);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch projects');
        }
    },
);

/**
 * Create a new project
 * @param projectData - either a plain `ICreateProject` object or a
 * `FormData` instance (used when the project includes file uploads, e.g.
 * dataset/instructions files).
 * @returns the created `IProject`.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const createProject = createAsyncThunk(
    'project/createProject',
    async (projectData: FormData | ICreateProject, { rejectWithValue }) => {
        try {
            const response = await projectApi.createProject(projectData);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create project');
        }
    },
);

/**
 * Archive a project
 * @param projectId - the project to archive.
 * @returns the API response merged with the original `projectId`, so the
 * `fulfilled` reducer can locate the project in state without relying on
 * the API to echo it back.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const archiveProject = createAsyncThunk(
    'project/archiveProject',
    async (projectId: string, { rejectWithValue }) => {
        try {
            const response = await projectApi.archiveProject(projectId);
            return { projectId, ...response };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || 'Failed to archive project');
        }
    },
);

/**
 * Delete a project
 * @param projectId - the project to delete.
 * @returns the deleted project's ID (used to filter it out of state).
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const deleteProject = createAsyncThunk(
    'project/deleteProject',
    async (projectId: string, { rejectWithValue }) => {
        try {
            await projectApi.deleteProject(projectId);
            return projectId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete project');
        }
    },
);

/**
 * Update a project
 * @param projectData - either a plain `IUpdateProject` object or `FormData`
 * (for updates that include file uploads).
 * @returns the updated `IProject`.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const updateProject = createAsyncThunk(
    'project/updateProject',
    async (projectData: IUpdateProject | FormData, { rejectWithValue }) => {
        try {
            const response = await projectApi.updateProject(projectData);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update project');
        }
    },
);

/**
 * Fetch all project tasks
 * @param args.projectId - the project whose tasks to fetch.
 * @param args.limit - page size (defaults to 10).
 * @param args.offset - page offset (defaults to 0).
 * @returns the raw API response; the `fulfilled` reducer normalizes both a
 * paginated `{ data, offset, limit, total }` shape and a bare-array shape.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const fetchAllProjectTasks = createAsyncThunk(
    'project/fetchAllProjectTasks',
    async ({ projectId, limit = 10, offset = 0 }: { projectId: string; limit?: number; offset?: number }, { rejectWithValue }) => {
        try {
            const response = await projectApi.getAllProjectTasks(projectId, limit, offset);
            return response;
        } catch (error: any) {
            console.error('fetchAllProjectTasks error:', error);
            return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch project tasks');
        }
    },
);

export interface FetchProjectMembersParams {
    projectId: string;
    limit?: number;
    offset?: number;
    search?: string;
    filter?: string;
}

/**
 * Fetch project members
 * @param params - `{ projectId, ...rest }`; `rest` covers pagination
 * (`limit`/`offset`) and filtering (`search`/`filter`).
 * @returns the raw API response; the `fulfilled` reducer normalizes both a
 * paginated `{ data, offset, limit, total }` shape and a bare-array shape.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const fetchProjectMembers = createAsyncThunk(
    'project/fetchProjectMembers',
    async ({ projectId, ...params }: FetchProjectMembersParams, { rejectWithValue }) => {
        try {
            const response = await projectApi.getProjectMembers(projectId, params);
            return response;
        } catch (error: any) {
            console.error('fetchProjectMembers error:', error);
            return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch project members');
        }
    },
);

/**
 * Slice: project
 *
 * Purpose: Owns the project list, the currently selected project, its
 * tasks, and its members, across list/create/update/archive/delete flows.
 *
 * State shape:
 * - `projects` (IProject[]): the loaded project list.
 * - `currentProject` (IProject | null): the selected/loaded project.
 * - `tasks` (IProjectTask[]) / `tasksLoading` / `tasksError` / `tasksPagination`:
 *   the current project's tasks and their fetch/pagination status.
 * - `members` (IProjectMember[]) / `membersLoading` / `membersError` / `membersPagination`:
 *   the current project's members and their fetch/pagination status.
 * - `loading` / `error`: status for the project list fetch.
 * - `createLoading` / `createError` / `createSuccess`: status of the last create.
 * - `updateLoading` / `updateError` / `updateSuccess`: status of the last update.
 *
 * Reducers: see JSDoc above each one below.
 *
 * Async thunks: `fetchAllProjects`, `createProject`, `archiveProject`,
 * `deleteProject`, `updateProject`, `fetchAllProjectTasks`,
 * `fetchProjectMembers` (documented above each definition).
 *
 * Selectors: `selectAllProjects`, `selectCurrentProject`,
 * `selectProjectLoading`, `selectProjectError`, `selectCreateLoading`,
 * `selectCreateError`, `selectCreateSuccess`, `selectUpdateLoading`,
 * `selectUpdateError`, `selectUpdateSuccess`, `selectProjectTasks`,
 * `selectProjectMembers`, `selectTasksLoading`, `selectTasksError`,
 * `selectTasksPagination`, `selectMembersLoading`, `selectMembersError`,
 * `selectMembersPagination` (below), reading from `state.project`.
 *
 * Business logic: `createProject.fulfilled` and `updateProject.fulfilled`
 * both dedupe against the existing list by `_id`/`id` — an existing entry
 * is merged in place, otherwise the new project is unshifted onto the
 * front (so the newest project appears first without a full re-fetch).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// Slice
const projectSlice = createSlice({
    name: 'project',
    initialState,
    reducers: {
        // Clear errors
        /** Clears the list-fetch, create, and update error fields. */
        clearErrors: (state) => {
            state.error = null;
            state.createError = null;
            state.updateError = null;
        },

        // Clear create success flag
        /** Clears the create-success flag (e.g. after a success toast is shown). */
        clearCreateSuccess: (state) => {
            state.createSuccess = false;
        },

        // Clear update success flag
        /** Clears the update-success flag (e.g. after a success toast is shown). */
        clearUpdateSuccess: (state) => {
            state.updateSuccess = false;
        },

        // Set current project
        /** Sets the currently selected/loaded project (or clears it with `null`). */
        setCurrentProject: (state, action: PayloadAction<IProject | null>) => {
            state.currentProject = action.payload;
        },

        // Clear current project
        /** Clears the currently selected project. */
        clearCurrentProject: (state) => {
            state.currentProject = null;
        },

        // Reset state
        /** Resets the entire slice back to its initial values. */
        resetProjectState: (state) => {
            Object.assign(state, initialState);
        },
    },
    extraReducers: (builder) => {
        // Fetch all projects
        builder
            .addCase(fetchAllProjects.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllProjects.fulfilled, (state, action: PayloadAction<IProject[]>) => {
                state.loading = false;
                state.projects = action.payload;
                state.error = null;
            })
            .addCase(fetchAllProjects.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Create project
        builder
            .addCase(createProject.pending, (state) => {
                state.createLoading = true;
                state.createError = null;
                state.createSuccess = false;
            })
            .addCase(createProject.fulfilled, (state, action: PayloadAction<IProject>) => {
                state.createLoading = false;
                state.createSuccess = true;
                state.createError = null;
                // If the project already exists (e.g. draft re-save), replace it; otherwise prepend
                const returnedId = action.payload._id || action.payload.id;
                const existingIndex = state.projects.findIndex(
                    (p) => (p._id && p._id === returnedId) || (p.id && p.id === returnedId),
                );
                if (existingIndex !== -1) {
                    state.projects[existingIndex] = { ...state.projects[existingIndex], ...action.payload };
                } else {
                    state.projects.unshift(action.payload);
                }
            })
            .addCase(createProject.rejected, (state, action) => {
                state.createLoading = false;
                state.createError = action.payload as string;
                state.createSuccess = false;
            });

        // Archive project
        builder
            .addCase(archiveProject.pending, (state) => {
                state.loading = true;
            })
            .addCase(archiveProject.fulfilled, (state, action) => {
                state.loading = false;
                const projectId = action.payload.projectId;
                const project = state.projects.find((p) => p._id === projectId || p.id === projectId);
                if (project) {
                    project.status = 'archived';
                }
            })
            .addCase(archiveProject.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Delete project
        builder
            .addCase(deleteProject.pending, (state) => {
                state.loading = true;
            })
            .addCase(deleteProject.fulfilled, (state, action: PayloadAction<string>) => {
                state.loading = false;
                state.projects = state.projects.filter(
                    (project) => project._id !== action.payload && project.id !== action.payload,
                );
            })
            .addCase(deleteProject.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Update project
        builder
            .addCase(updateProject.pending, (state) => {
                state.updateLoading = true;
                state.updateError = null;
                state.updateSuccess = false;
            })
            .addCase(updateProject.fulfilled, (state, action: PayloadAction<IProject>) => {
                state.updateLoading = false;
                state.updateSuccess = true;
                state.updateError = null;
                // Update the project in the list
                const projectId = action.payload._id || action.payload.id;
                const index = state.projects.findIndex((p) => p._id === projectId || p.id === projectId);
                if (index !== -1) {
                    state.projects[index] = { ...state.projects[index], ...action.payload };
                }
            })
            .addCase(updateProject.rejected, (state, action) => {
                state.updateLoading = false;
                state.updateError = action.payload as string;
                state.updateSuccess = false;
            });

        // Fetch all project tasks
        builder
            .addCase(fetchAllProjectTasks.pending, (state) => {
                state.tasksLoading = true;
                state.tasksError = null;
            })
            .addCase(fetchAllProjectTasks.fulfilled, (state, action: PayloadAction<any>) => {
                state.tasksLoading = false;
                // Handle both paginated and non-paginated responses
                if (action.payload && typeof action.payload === 'object' && 'data' in action.payload) {
                    state.tasks = action.payload.data || [];
                    state.tasksPagination = {
                        offset: action.payload.offset || 0,
                        limit: action.payload.limit || 10,
                        total: action.payload.total || 0,
                    };
                } else {
                    state.tasks = action.payload || [];
                    state.tasksPagination = null;
                }
                state.tasksError = null;
            })
            .addCase(fetchAllProjectTasks.rejected, (state, action) => {
                state.tasksLoading = false;
                state.tasksError = action.payload as string;
            });

        // Fetch project members
        builder
            .addCase(fetchProjectMembers.pending, (state) => {
                state.membersLoading = true;
                state.membersError = null;
            })
            .addCase(fetchProjectMembers.fulfilled, (state, action: PayloadAction<any>) => {
                state.membersLoading = false;
                if (action.payload && typeof action.payload === 'object' && 'data' in action.payload) {
                    state.members = action.payload.data || [];
                    state.membersPagination = {
                        offset: action.payload.offset || 0,
                        limit: action.payload.limit || -1,
                        total: action.payload.total || 0,
                    };
                } else {
                    state.members = Array.isArray(action.payload) ? action.payload : [];
                    state.membersPagination = null;
                }
                state.membersError = null;
            })
            .addCase(fetchProjectMembers.rejected, (state, action) => {
                state.membersLoading = false;
                state.membersError = action.payload as string;
            });
    },
});

// Export actions
export const { clearErrors, clearCreateSuccess, clearUpdateSuccess, setCurrentProject, clearCurrentProject, resetProjectState } =
    projectSlice.actions;

// Selectors
export const selectAllProjects = (state: { project: ProjectState }) => state.project.projects;
export const selectCurrentProject = (state: { project: ProjectState }) => state.project.currentProject;
export const selectProjectLoading = (state: { project: ProjectState }) => state.project.loading;
export const selectProjectError = (state: { project: ProjectState }) => state.project.error;
export const selectCreateLoading = (state: { project: ProjectState }) => state.project.createLoading;
export const selectCreateError = (state: { project: ProjectState }) => state.project.createError;
export const selectCreateSuccess = (state: { project: ProjectState }) => state.project.createSuccess;
export const selectUpdateLoading = (state: { project: ProjectState }) => state.project.updateLoading;
export const selectUpdateError = (state: { project: ProjectState }) => state.project.updateError;
export const selectUpdateSuccess = (state: { project: ProjectState }) => state.project.updateSuccess;
export const selectProjectTasks = (state: { project: ProjectState }) => state.project.tasks;
export const selectProjectMembers = (state: { project: ProjectState }) => state.project.members;
export const selectTasksLoading = (state: { project: ProjectState }) => state.project.tasksLoading;
export const selectTasksError = (state: { project: ProjectState }) => state.project.tasksError;
export const selectTasksPagination = (state: { project: ProjectState }) => state.project.tasksPagination;
export const selectMembersLoading = (state: { project: ProjectState }) => state.project.membersLoading;
export const selectMembersError = (state: { project: ProjectState }) => state.project.membersError;
export const selectMembersPagination = (state: { project: ProjectState }) => state.project.membersPagination;

// Export reducer
export default projectSlice.reducer;
