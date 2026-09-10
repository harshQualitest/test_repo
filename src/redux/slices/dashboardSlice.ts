import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { dashboardApi } from '../../services/api/dashboardApi';

// Project Dashboard Data Interface
export interface ProjectDashboardData {
    project_name: string;
    current_throughput: number;
    avg_completion_time_minutes: number;
    acceptance_rate_percentage: number;
    overall_completion_percentage: number;
    total_tasks_count: number;
    completed_tasks_count: number;
    project_end_date: string;
}

// Project Dashboard Slice State Interface
export interface ProjectDashboardState {
    data: ProjectDashboardData | null;
    loading: boolean;
    error: string | null;
}

// Initial state
const initialState: ProjectDashboardState = {
    data: null,
    loading: false,
    error: null,
};

/**
 * Fetches summary metrics for a single project's dashboard (throughput,
 * completion rate, acceptance rate, etc.) from the dashboard API.
 * @param projectId - the project to fetch dashboard metrics for.
 * @returns the resolved `ProjectDashboardData` on success.
 * @throws (via `rejectWithValue`) the API error message, or a generic
 * fallback string, on failure.
 */
// Async thunk to fetch project dashboard data
export const fetchProjectDashboard = createAsyncThunk(
    'projectDashboard/fetch',
    async (projectId: string, { rejectWithValue }) => {
        try {
            const response = await dashboardApi.projhectDashboardApi(projectId);
            // The API sometimes wraps the payload in an extra `data` envelope
            // and sometimes returns it directly — normalize to the flat shape.
            return response.data?.data || response.data;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                error.message ||
                'Failed to fetch project dashboard data'
            );
        }
    }
);

/**
 * Slice: projectDashboard
 *
 * Purpose: Owns the "project dashboard" view — summary metrics (throughput,
 * completion percentage, acceptance rate, task counts) for a single project.
 *
 * State shape:
 * - `data` (ProjectDashboardData | null): the last fetched dashboard metrics.
 * - `loading` (boolean): true while `fetchProjectDashboard` is in flight.
 * - `error` (string | null): normalized error message from the last failed fetch.
 *
 * Reducers:
 * - `clearProjectDashboard`: resets `data`/`error` (e.g. on unmount/navigation
 *   away from the dashboard) without touching `loading`.
 *
 * Async thunks:
 * - `fetchProjectDashboard`: see JSDoc above.
 *
 * Selectors: `selectProjectDashboardData`, `selectProjectDashboardLoading`,
 * `selectProjectDashboardError` (all below), conventionally reading from
 * `state.projectDashboard`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// Create slice
const projectDashboardSlice = createSlice({
    name: 'projectDashboard',
    initialState,
    reducers: {
        /** Clears the fetched dashboard data and error, leaving `loading` untouched. */
        clearProjectDashboard: (state) => {
            state.data = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProjectDashboard.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProjectDashboard.fulfilled, (state, action: PayloadAction<ProjectDashboardData>) => {
                state.loading = false;
                state.data = action.payload;
                state.error = null;
            })
            .addCase(fetchProjectDashboard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

// Export actions
export const { clearProjectDashboard } = projectDashboardSlice.actions;

// Selectors
export const selectProjectDashboardData = (state: { projectDashboard: ProjectDashboardState }) => 
    state.projectDashboard.data;
export const selectProjectDashboardLoading = (state: { projectDashboard: ProjectDashboardState }) => 
    state.projectDashboard.loading;
export const selectProjectDashboardError = (state: { projectDashboard: ProjectDashboardState }) => 
    state.projectDashboard.error;

// Export reducer
export default projectDashboardSlice.reducer;
