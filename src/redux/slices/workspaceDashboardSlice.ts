import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { dashboardApi } from '../../services/api/dashboardApi';

// Workspace Dashboard Data Interface
export interface WorkspaceTaskMetric {
    total_tasks: number;
    completed_tasks: number;
    completion_percentage: number;
    avg_completed_per_day: number;
    workspace_id: string;
    project_id: string;
    project_name: string;
}

export interface WorkspaceDashboardData {
    avg_throughput: number;
    rejection_percentage: number;
    queued_tasks_count_percentage: number;
    workspace_task_metrics: WorkspaceTaskMetric[];
}

// Workspace Dashboard Slice State Interface
export interface WorkspaceDashboardState {
    data: WorkspaceDashboardData | null;
    loading: boolean;
    error: string | null;
}

// Initial state
const initialState: WorkspaceDashboardState = {
    data: null,
    loading: false,
    error: null,
};

/**
 * Fetches workspace-level dashboard metrics (throughput, rejection rate,
 * queued-task percentage, and per-project task metrics).
 * @param args.workspaceId - the workspace to fetch metrics for.
 * @param args.days - optional lookback window (in days) for the metrics.
 * @returns the `WorkspaceDashboardData` for the workspace.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
// Async thunk to fetch workspace dashboard data
export const fetchWorkspaceDashboard = createAsyncThunk(
    'workspaceDashboard/fetch',
    async ({ workspaceId, days }: { workspaceId: string; days?: number }, { rejectWithValue }) => {
        try {
            const response = await dashboardApi.workspaceApi(workspaceId, days);
            // The API sometimes wraps the payload in an extra `data` envelope
            // and sometimes returns it directly — normalize to the flat shape.
            return response.data?.data || response.data;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                error.message ||
                'Failed to fetch workspace dashboard data'
            );
        }
    }
);

/**
 * Slice: workspaceDashboard
 *
 * Purpose: Owns the "workspace dashboard" view — aggregate metrics across
 * all projects in a workspace (average throughput, rejection percentage,
 * queued-task percentage, and per-project task metrics).
 *
 * State shape:
 * - `data` (WorkspaceDashboardData | null): the last-fetched dashboard metrics.
 * - `loading` (boolean): true while `fetchWorkspaceDashboard` is in flight.
 * - `error` (string | null): normalized error message from the last failed fetch.
 *
 * Reducers:
 * - `clearWorkspaceDashboard`: resets `data`/`error` without touching `loading`.
 *
 * Async thunks: `fetchWorkspaceDashboard` (documented above its definition).
 *
 * Selectors: `selectWorkspaceDashboardData`, `selectWorkspaceDashboardLoading`,
 * `selectWorkspaceDashboardError` (below), reading from `state.workspaceDashboard`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// Create slice
const workspaceDashboardSlice = createSlice({
    name: 'workspaceDashboard',
    initialState,
    reducers: {
        /** Clears the fetched dashboard data and error, leaving `loading` untouched. */
        clearWorkspaceDashboard: (state) => {
            state.data = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchWorkspaceDashboard.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchWorkspaceDashboard.fulfilled, (state, action: PayloadAction<WorkspaceDashboardData>) => {
                state.loading = false;
                state.data = action.payload;
                state.error = null;
            })
            .addCase(fetchWorkspaceDashboard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

// Export actions
export const { clearWorkspaceDashboard } = workspaceDashboardSlice.actions;

// Selectors
export const selectWorkspaceDashboardData = (state: { workspaceDashboard: WorkspaceDashboardState }) => 
    state.workspaceDashboard.data;
export const selectWorkspaceDashboardLoading = (state: { workspaceDashboard: WorkspaceDashboardState }) => 
    state.workspaceDashboard.loading;
export const selectWorkspaceDashboardError = (state: { workspaceDashboard: WorkspaceDashboardState }) => 
    state.workspaceDashboard.error;

// Export reducer
export default workspaceDashboardSlice.reducer;
