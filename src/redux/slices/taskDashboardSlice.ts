import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { dashboardApi } from '../../services/api/dashboardApi';
import type { TaskDashboardData } from '../../components/task-dashboard/types';

// API Response Interfaces
interface ApiAnnotation {
    round: number;
    annotator_id: string;
    llm1: Record<string, number>;
    llm2: Record<string, number>;
    comparison_selection: string;
    submitted_time: string;
    is_approved: number;
}

interface ApiLog {
    _id: string;
    org_id: string;
    workspace_id: string;
    project_id: string;
    task_id: string;
    stage: string;
    action: string;
    cycle: number;
    created_at: string;
    created_by: string;
    details: any;
}

interface ApiTaskData {
    _id: string;
    task_id: string;
    org_id: string;
    workspace_id: string;
    project_id: string;
    prompt: string;
    llm1: string;
    llm2: string;
    payload: {
        prompt: string;
        llm1: string;
        llm2: string;
    };
    assigned: any;
    annotations: ApiAnnotation[];
    stage: string;
    status: string;
    cycle: number;
    priority: string;
    assigned_to: string | null;
    assigned_annotator: string;
    started_at_by_annotator: string;
    annotator_expiration: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    due_date: string | null;
    is_active: number;
    logs: ApiLog[];
}

// Task Dashboard Slice State Interface
export interface TaskDashboardState {
    data: TaskDashboardData | null;
    loading: boolean;
    error: string | null;
}

/**
 * Transforms the raw task-dashboard API response into the shape the
 * `task-dashboard` components expect (`TaskDashboardData`), rather than
 * making every consumer component re-derive summary/outcome/history views
 * from the raw payload.
 * @param apiData - the raw `ApiTaskData` returned by the dashboard API.
 * @returns a `TaskDashboardData` with `taskSummary`, `reviewerOutcome`,
 * `revisionHistory` (derived from `logs`), and `backendDataSources`
 * (prompt/LLM responses) sections.
 */
// Helper function to transform API data to component format
const transformApiDataToTaskDashboard = (apiData: ApiTaskData): TaskDashboardData => {
    const latestAnnotation = apiData.annotations?.[apiData.annotations.length - 1];

    return {
        taskSummary: {
            taskId: apiData.task_id,
            state: apiData.status,
            dataset: apiData.workspace_id,
            type: 'LLM Grading',
            schemaVersion: 'v1.0',
            guidelineVersion: 'v1.0',
            createdAt: apiData.created_at,
            startedAt: apiData.started_at_by_annotator || apiData.created_at,
            currentStage: apiData.stage,
        },
        reviewerOutcome: {
            status: apiData.status === 'annotated' ? 'IN_PROGRESS' : 
                   latestAnnotation?.is_approved === 1 ? 'PASSED' : 'FAILED',
            reviewer: apiData.assigned_annotator || 'Unassigned',
            lastFailureReason: latestAnnotation?.is_approved === 0 ? 'Pending review' : undefined,
            reviewStarted: apiData.started_at_by_annotator || apiData.created_at,
            source: 'Annotation System',
        },
        revisionHistory: apiData.logs?.map((log, index) => ({
            passNumber: log.cycle + 1,
            stage: log.stage,
            status: log.action === 'annotated' ? 'PASSED' : 
                   log.action === 'assigned_to_annotator' ? 'IN_PROGRESS' : 'IN_PROGRESS',
            actor: log.created_by,
            duration: 'N/A',
            startTime: log.created_at,
            endTime: index < apiData.logs.length - 1 ? apiData.logs[index + 1].created_at : undefined,
        })) || [],
        backendDataSources: [
            {
                title: 'Prompt',
                description: apiData.payload?.prompt || apiData.prompt,
            },
            {
                title: 'LLM 1 Response',
                description: apiData.payload?.llm1 || apiData.llm1,
            },
            {
                title: 'LLM 2 Response',
                description: apiData.payload?.llm2 || apiData.llm2,
            },
        ],
    };
};

// Initial state
const initialState: TaskDashboardState = {
    data: null,
    loading: false,
    error: null,
};

/**
 * Fetches the raw task data for a project/task pair and transforms it into
 * the dashboard's display shape via {@link transformApiDataToTaskDashboard}.
 * @param args.projectId - the parent project of the task.
 * @param args.taskId - the task to load dashboard data for.
 * @returns the transformed `TaskDashboardData`.
 * @throws (via `rejectWithValue`) 'No task data found in response' if the
 * API response contains no data at either nesting level, or the API error
 * message otherwise.
 */
// Async thunk to fetch task dashboard data
export const fetchTaskDashboard = createAsyncThunk(
    'taskDashboard/fetch',
    async ({ projectId, taskId }: { projectId: string; taskId: string }, { rejectWithValue }) => {
        try {
            const response = await dashboardApi.taskDashboardApi(projectId, taskId);
            // The API sometimes nests the payload two levels deep (`data.data.data`)
            // and sometimes one level (`data.data`) — check both before failing.
            const apiData = response.data?.data?.data || response.data?.data;

            if (!apiData) {
                throw new Error('No task data found in response');
            }

            // Transform API data to component format
            return transformApiDataToTaskDashboard(apiData);
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                error.message ||
                'Failed to fetch task dashboard data'
            );
        }
    }
);

/**
 * Slice: taskDashboard
 *
 * Purpose: Owns the "task dashboard" detail view — a single task's summary,
 * reviewer outcome, revision history, and backend data sources (prompt/LLM
 * responses), presented in a transformed, UI-ready shape.
 *
 * State shape:
 * - `data` (TaskDashboardData | null): the transformed dashboard data for
 *   the last-fetched task.
 * - `loading` (boolean): true while `fetchTaskDashboard` is in flight.
 * - `error` (string | null): normalized error message from the last failed fetch.
 *
 * Reducers:
 * - `clearTaskDashboard`: resets `data`/`loading`/`error` (e.g. on unmount).
 *
 * Async thunks: `fetchTaskDashboard` (documented above its definition).
 *
 * Selectors: `selectTaskDashboardData`, `selectTaskDashboardLoading`,
 * `selectTaskDashboardError` (below), reading from `state.taskDashboard`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// Create slice
const taskDashboardSlice = createSlice({
    name: 'taskDashboard',
    initialState,
    reducers: {
        /** Resets the fetched dashboard data, loading, and error back to initial values. */
        clearTaskDashboard: (state) => {
            state.data = null;
            state.loading = false;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTaskDashboard.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTaskDashboard.fulfilled, (state, action: PayloadAction<TaskDashboardData>) => {
                state.loading = false;
                state.data = action.payload;
                state.error = null;
            })
            .addCase(fetchTaskDashboard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

// Export actions
export const { clearTaskDashboard } = taskDashboardSlice.actions;

// Export selectors
export const selectTaskDashboardData = (state: { taskDashboard: TaskDashboardState }) => 
    state.taskDashboard.data;
export const selectTaskDashboardLoading = (state: { taskDashboard: TaskDashboardState }) => 
    state.taskDashboard.loading;
export const selectTaskDashboardError = (state: { taskDashboard: TaskDashboardState }) => 
    state.taskDashboard.error;

// Export reducer
export default taskDashboardSlice.reducer;
