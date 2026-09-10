import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import projectApi from '../../services/api/projectApi';

// Define the annotation data interface (supports both annotation and review data)
interface AnnotationData {
    status?: string;
    llm1?: Record<string, any>;
    llm2?: Record<string, any>;
    // Review fields
    review_decision?: string;
    review_comments?: string;
    reviewed_at?: string;
    stage?: string;
    [key: string]: any;
}

// Define the state interface
interface UserAnnotationState {
    tasks: any[];
    currentTask: any;
    loading: boolean;
    submitting: boolean;
    error: string | null;
    submitError: string | null;
    noTasksAvailable: boolean;
}

// Initial state
const initialState: UserAnnotationState = {
    tasks: [],
    currentTask: null,
    loading: false,
    submitting: false,
    error: null,
    submitError: null,
    noTasksAvailable: false,
};

/**
 * Fetches the annotation tasks assigned to the current user for a project.
 * @param projectId - the project to fetch assigned tasks for.
 * @returns the API response (task list) for the annotator's queue.
 * @throws (via `rejectWithValue`) the error message prefixed with `404: `
 * when the API returns a 404 (used by the `rejected` reducer to detect the
 * "no tasks available" case), or the plain error message otherwise.
 */
// Async thunk to fetch project task users
export const fetchProjectTaskUsers = createAsyncThunk(
    'userAnnotation/fetchProjectTaskUsers',
    async (projectId: string, { rejectWithValue }) => {
        try {
            const response = await projectApi.getProjectTaskUsers(projectId);
            return response;
        } catch (error: any) {
            console.error('API Error - Project Task Users:', error);
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message || 'Failed to fetch project tasks';

            // Include status code in error message for 404 handling
            if (status === 404) {
                return rejectWithValue(`404: ${message}`);
            }
            return rejectWithValue(message);
        }
    }
);

/**
 * Submits an annotator's ratings/selection for a task.
 * @param args.projectId - the parent project of the task.
 * @param args.taskId - the task being annotated.
 * @param args.data - the annotation payload (`AnnotationData`: ratings for
 * `llm1`/`llm2`, comparison selection, status, etc).
 * @returns the API response for the submitted annotation.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
// Async thunk to submit annotation
export const submitAnnotation = createAsyncThunk(
    'userAnnotation/submitAnnotation',
    async (
        { projectId, taskId, data }: { projectId: string; taskId: string; data: AnnotationData },
        { rejectWithValue }
    ) => {
        try {
            const response = await projectApi.submitAnnotation(projectId, taskId, data);
            return response;
        } catch (error: any) {
            console.error('API Error - Submit Annotation:', error);
            const message = error.response?.data?.message || error.message || 'Failed to submit annotation';
            return rejectWithValue(message);
        }
    }
);

/**
 * Fetches the tasks awaiting review, assigned to the current reviewer, for a project.
 * @param projectId - the project to fetch the reviewer's queue for.
 * @returns the API response (task list) for the reviewer's queue.
 * @throws (via `rejectWithValue`) the error message prefixed with `404: `
 * when the API returns a 404 (used by the `rejected` reducer to detect the
 * "no tasks available" case), or the plain error message otherwise.
 */
// Async thunk to fetch reviewer tasks
export const fetchReviewerTasks = createAsyncThunk(
    'userAnnotation/fetchReviewerTasks',
    async (projectId: string, { rejectWithValue }) => {
        try {
            const response = await projectApi.getReviwerTasks(projectId);
            return response;
        } catch (error: any) {
            console.error('API Error - Reviewer Tasks:', error);
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message || 'Failed to fetch reviewer tasks';

            // Include status code in error message for 404 handling
            if (status === 404) {
                return rejectWithValue(`404: ${message}`);
            }
            return rejectWithValue(message);
        }
    }
);

// Interface for reviewer review data
interface ReviewerReviewData {
    overall_quality?: string;
    writing_style?: string;
    verbosity?: string;
    instruction_following?: string;
    accuracy?: string;
    harmlessness?: string;
    intent?: string;
    feedback?: string;
    ranking?: string;
    ranking_reason?: string;
    overall_annotation_quality?: string;
    status: string;
}

/**
 * Submits a reviewer's decision for a task (accept/reject with feedback).
 * @param args.projectId - the parent project of the task.
 * @param args.taskId - the task being reviewed.
 * @param args.data - the review payload (`ReviewerReviewData`: quality
 * ratings, feedback, ranking, and overall `status`).
 * @returns the API response for the submitted review.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
// Async thunk to submit reviewer review
export const submitReviewerReview = createAsyncThunk(
    'userAnnotation/submitReviewerReview',
    async (
        { projectId, taskId, data }: { projectId: string; taskId: string; data: ReviewerReviewData },
        { rejectWithValue }
    ) => {
        try {
            const response = await projectApi.reviewerReviewTask(projectId, taskId, data);
            return response;
        } catch (error: any) {
            console.error('API Error - Submit Reviewer Review:', error);
            const message = error.response?.data?.message || error.message || 'Failed to submit review';
            return rejectWithValue(message);
        }
    }
);

/**
 * Slice: userAnnotation
 *
 * Purpose: Owns the annotator/reviewer task-queue workflow — fetching the
 * current user's assigned annotation or review tasks and submitting
 * annotations/reviews for a task.
 *
 * State shape:
 * - `tasks` (any[]): the current user's task queue (annotator or reviewer,
 *   depending on which fetch thunk was last dispatched).
 * - `currentTask` (any): the task currently being worked on.
 * - `loading` / `error`: status for the tasks fetch.
 * - `submitting` / `submitError`: status for annotation/review submission.
 * - `noTasksAvailable` (boolean): true when the queue is empty or the API
 *   returned 404 (no tasks currently assigned).
 *
 * Reducers: see JSDoc above each one below.
 *
 * Async thunks: `fetchProjectTaskUsers`, `submitAnnotation`,
 * `fetchReviewerTasks`, `submitReviewerReview` (documented above each definition).
 *
 * Selectors: `selectUserAnnotationTasks`, `selectCurrentTask`,
 * `selectUserAnnotationLoading`, `selectUserAnnotationError`,
 * `selectUserAnnotationSubmitting`, `selectUserAnnotationSubmitError`,
 * `selectNoTasksAvailable` (below), reading from `state.userAnnotation`.
 *
 * Business logic: `noTasksAvailable` is derived two ways — on a
 * successful-but-empty fetch (empty array payload), and on a 404 rejection
 * (detected by checking the rejection message for a `'404'` prefix set by
 * the fetch thunks) — both are treated as "nothing to do" rather than an error state.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// Create the slice
const userAnnotationSlice = createSlice({
    name: 'userAnnotation',
    initialState,
    reducers: {
        /** Clears the task queue, current task, error, and the no-tasks flag. */
        clearTasks: (state) => {
            state.tasks = [];
            state.currentTask = null;
            state.error = null;
            state.noTasksAvailable = false;
        },
        /**
         * Sets the task currently being worked on.
         * @param action.payload - the task to make current.
         */
        setCurrentTask: (state, action) => {
            state.currentTask = action.payload;
        },
        /** Clears both the fetch error and the submit error. */
        clearError: (state) => {
            state.error = null;
            state.submitError = null;
        },
        /**
         * Manually sets the no-tasks-available flag.
         * @param action.payload - the new flag value.
         */
        setNoTasksAvailable: (state, action) => {
            state.noTasksAvailable = action.payload;
        },
        /** Resets the submission status flags (submitting/submitError). */
        resetAnnotationState: (state) => {
            state.submitting = false;
            state.submitError = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch project task users
            .addCase(fetchProjectTaskUsers.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.noTasksAvailable = false;
            })
            .addCase(fetchProjectTaskUsers.fulfilled, (state, action) => {
                state.loading = false;
                state.tasks = action.payload;
                state.error = null;
                // Check if no tasks available
                if (!action.payload || (Array.isArray(action.payload) && action.payload.length === 0)) {
                    state.noTasksAvailable = true;
                }
            })
            .addCase(fetchProjectTaskUsers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                // If 404, set no tasks available
                if ((action.payload as string)?.includes('404')) {
                    state.noTasksAvailable = true;
                }
            })
            // Submit annotation
            .addCase(submitAnnotation.pending, (state) => {
                state.submitting = true;
                state.submitError = null;
            })
            .addCase(submitAnnotation.fulfilled, (state) => {
                state.submitting = false;
                state.submitError = null;
            })
            .addCase(submitAnnotation.rejected, (state, action) => {
                state.submitting = false;
                state.submitError = action.payload as string;
            })
            // Fetch reviewer tasks
            .addCase(fetchReviewerTasks.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.noTasksAvailable = false;
            })
            .addCase(fetchReviewerTasks.fulfilled, (state, action) => {
                state.loading = false;
                state.tasks = action.payload;
                state.error = null;
                // Check if no tasks available
                if (!action.payload || (Array.isArray(action.payload) && action.payload.length === 0)) {
                    state.noTasksAvailable = true;
                }
            })
            .addCase(fetchReviewerTasks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
                // If 404, set no tasks available
                if ((action.payload as string)?.includes('404')) {
                    state.noTasksAvailable = true;
                }
            })
            // Submit reviewer review
            .addCase(submitReviewerReview.pending, (state) => {
                state.submitting = true;
                state.submitError = null;
            })
            .addCase(submitReviewerReview.fulfilled, (state) => {
                state.submitting = false;
                state.submitError = null;
            })
            .addCase(submitReviewerReview.rejected, (state, action) => {
                state.submitting = false;
                state.submitError = action.payload as string;
            });
    },
});

// Export actions
export const { clearTasks, setCurrentTask, clearError, setNoTasksAvailable, resetAnnotationState } = userAnnotationSlice.actions;

// Selectors
export const selectUserAnnotationTasks = (state: RootState) => state.userAnnotation.tasks;
export const selectCurrentTask = (state: RootState) => state.userAnnotation.currentTask;
export const selectUserAnnotationLoading = (state: RootState) => state.userAnnotation.loading;
export const selectUserAnnotationError = (state: RootState) => state.userAnnotation.error;
export const selectUserAnnotationSubmitting = (state: RootState) => state.userAnnotation.submitting;
export const selectUserAnnotationSubmitError = (state: RootState) => state.userAnnotation.submitError;
export const selectNoTasksAvailable = (state: RootState) => state.userAnnotation.noTasksAvailable;

export default userAnnotationSlice.reducer;
