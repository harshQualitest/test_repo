import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { dashboardApi } from '../../services/api/dashboardApi';

// Annotation Rating Interface
export interface AnnotationRating {
    overall_quality?: number;
    writing_style?: number;
    verbosity?: number;
    instruction_following?: number;
    accuracy?: number;
    harmlessness?: number;
    intent_understanding?: number;
    comment?: string;
}

// Annotation Interface
export interface TaskAnnotation {
    round: number;
    annotator_id: string;
    llm1: AnnotationRating;
    llm2: AnnotationRating;
    comparison_selection?: string;
    submitted_time: string;
    is_approved: number;
}

// Log Interface
export interface TaskLog {
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

export interface TaskReview {
    llm1: AnnotationRating;
    llm2: AnnotationRating;
    rating: string;
    is_llm1_updated: boolean;
    is_llm2_updated: boolean;
    is_rating_updated: boolean;
    reviewed_by: string;
    reviewed_at: string;
}

// Raw Task Preview Data Interface (matches API response)
export interface TaskPreviewData {
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
    annotations: TaskAnnotation[];
    review?: TaskReview;
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
    logs: TaskLog[];
}

// Task Preview Slice State Interface
export interface TaskPreviewState {
    data: TaskPreviewData | null;
    loading: boolean;
    error: string | null;
}

// Initial state
const initialState: TaskPreviewState = {
    data: null,
    loading: false,
    error: null,
};

/**
 * Fetches the raw (untransformed) task data for a project/task pair. Unlike
 * `taskDashboardSlice.fetchTaskDashboard`, this preserves the original API
 * shape (`TaskPreviewData`) for views that need the raw annotation/review
 * fields rather than a UI-transformed summary.
 * @param args.projectId - the parent project of the task.
 * @param args.taskId - the task to preview.
 * @returns the raw `TaskPreviewData`.
 * @throws (via `rejectWithValue`) 'No task data found in response' if the
 * API response contains no data at either nesting level, or the API error
 * message otherwise.
 */
// Async thunk to fetch task preview data (raw API response)
export const fetchTaskPreview = createAsyncThunk(
    'taskPreview/fetch',
    async ({ projectId, taskId }: { projectId: string; taskId: string }, { rejectWithValue }) => {
        try {
            const response = await dashboardApi.taskDashboardApi(projectId, taskId);
            // Extract raw data from response
            // The API sometimes nests the payload two levels deep (`data.data.data`)
            // and sometimes one level (`data.data`) — check both before failing.
            const rawData = response.data?.data?.data || response.data?.data;

            if (!rawData) {
                throw new Error('No task data found in response');
            }

            // Return raw data without transformation
            return rawData as TaskPreviewData;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                error.message ||
                'Failed to fetch task preview data'
            );
        }
    }
);

/**
 * Slice: taskPreview
 *
 * Purpose: Owns the raw, untransformed task data used by "preview" views
 * (e.g. reviewing a task's original prompt/LLM responses and annotations
 * without the dashboard's derived summary shape).
 *
 * State shape:
 * - `data` (TaskPreviewData | null): the raw task data for the last-fetched task.
 * - `loading` (boolean): true while `fetchTaskPreview` is in flight.
 * - `error` (string | null): normalized error message from the last failed fetch.
 *
 * Reducers:
 * - `clearTaskPreview`: resets `data`/`loading`/`error` (e.g. on unmount).
 *
 * Async thunks: `fetchTaskPreview` (documented above its definition).
 *
 * Selectors: `selectTaskPreviewData`, `selectTaskPreviewLoading`,
 * `selectTaskPreviewError` (below), reading from `state.taskPreview`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// Create slice
const taskPreviewSlice = createSlice({
    name: 'taskPreview',
    initialState,
    reducers: {
        /** Resets the fetched preview data, loading, and error back to initial values. */
        clearTaskPreview: (state) => {
            state.data = null;
            state.loading = false;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTaskPreview.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTaskPreview.fulfilled, (state, action: PayloadAction<TaskPreviewData>) => {
                state.loading = false;
                state.data = action.payload;
                state.error = null;
            })
            .addCase(fetchTaskPreview.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

// Export actions
export const { clearTaskPreview } = taskPreviewSlice.actions;

// Export selectors
export const selectTaskPreviewData = (state: { taskPreview: TaskPreviewState }) => 
    state.taskPreview.data;
export const selectTaskPreviewLoading = (state: { taskPreview: TaskPreviewState }) => 
    state.taskPreview.loading;
export const selectTaskPreviewError = (state: { taskPreview: TaskPreviewState }) => 
    state.taskPreview.error;

// Export reducer
export default taskPreviewSlice.reducer;
