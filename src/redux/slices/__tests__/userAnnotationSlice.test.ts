import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import userAnnotationReducer, {
    fetchProjectTaskUsers,
    submitAnnotation,
    fetchReviewerTasks,
    submitReviewerReview,
    clearTasks,
    setCurrentTask,
    clearError,
    setNoTasksAvailable,
    resetAnnotationState,
} from '../userAnnotationSlice';

// ── Module mock ───────────────────────────────────────────────────────────────

vi.mock('../../../services/api/projectApi', () => ({
    default: {
        getProjectTaskUsers: vi.fn(),
        submitAnnotation: vi.fn(),
        getReviwerTasks: vi.fn(),
        reviewerReviewTask: vi.fn(),
        getAllProjects: vi.fn(),
        createProject: vi.fn(),
        archiveProject: vi.fn(),
        deleteProject: vi.fn(),
        updateProject: vi.fn(),
        getAllProjectTasks: vi.fn(),
        getProjectMembers: vi.fn(),
    },
}));

import projectApi from '../../../services/api/projectApi';
const mockGetProjectTaskUsers = vi.mocked(projectApi.getProjectTaskUsers);
const mockSubmitAnnotation = vi.mocked(projectApi.submitAnnotation);
const mockGetReviewerTasks = vi.mocked(projectApi.getReviwerTasks);
const mockReviewerReviewTask = vi.mocked(projectApi.reviewerReviewTask);

// ── Helpers ───────────────────────────────────────────────────────────────────

interface UserAnnotationState {
    tasks: any[];
    currentTask: any;
    loading: boolean;
    submitting: boolean;
    error: string | null;
    submitError: string | null;
    noTasksAvailable: boolean;
}

const DEFAULT_STATE: UserAnnotationState = {
    tasks: [],
    currentTask: null,
    loading: false,
    submitting: false,
    error: null,
    submitError: null,
    noTasksAvailable: false,
};

// userAnnotationSlice selectors use RootState — we create a compatible store with matching key
function makeStore(preloaded?: Partial<UserAnnotationState>) {
    return configureStore({
        reducer: { userAnnotation: userAnnotationReducer },
        preloadedState: preloaded ? { userAnnotation: { ...DEFAULT_STATE, ...preloaded } } : undefined,
    });
}

type TestStore = ReturnType<typeof makeStore>;
const getState = (store: TestStore) => store.getState();

// Simple state accessors since the selectors use RootState
const tasks = (store: TestStore) => getState(store).userAnnotation.tasks;
const currentTask = (store: TestStore) => getState(store).userAnnotation.currentTask;
const loading = (store: TestStore) => getState(store).userAnnotation.loading;
const submitting = (store: TestStore) => getState(store).userAnnotation.submitting;
const error = (store: TestStore) => getState(store).userAnnotation.error;
const submitError = (store: TestStore) => getState(store).userAnnotation.submitError;
const noTasksAvailable = (store: TestStore) => getState(store).userAnnotation.noTasksAvailable;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const task1 = { _id: 't1', task_id: 'TASK-001', prompt: 'Hello?', status: 'pending' };
const task2 = { _id: 't2', task_id: 'TASK-002', prompt: 'World?', status: 'pending' };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('userAnnotationSlice', () => {
    beforeEach(() => vi.clearAllMocks());

    // ── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('starts with empty tasks array', () => {
            expect(tasks(makeStore())).toEqual([]);
        });

        it('starts with currentTask null', () => {
            expect(currentTask(makeStore())).toBeNull();
        });

        it('starts with loading false', () => {
            expect(loading(makeStore())).toBe(false);
        });

        it('starts with submitting false', () => {
            expect(submitting(makeStore())).toBe(false);
        });

        it('starts with noTasksAvailable false', () => {
            expect(noTasksAvailable(makeStore())).toBe(false);
        });
    });

    // ── Sync actions ─────────────────────────────────────────────────────────

    describe('clearTasks', () => {
        it('clears tasks, currentTask, error, and noTasksAvailable', () => {
            const store = makeStore({ tasks: [task1], currentTask: task1, error: 'err', noTasksAvailable: true });
            store.dispatch(clearTasks());
            expect(tasks(store)).toEqual([]);
            expect(currentTask(store)).toBeNull();
            expect(error(store)).toBeNull();
            expect(noTasksAvailable(store)).toBe(false);
        });
    });

    describe('setCurrentTask', () => {
        it('sets the currentTask', () => {
            const store = makeStore();
            store.dispatch(setCurrentTask(task1));
            expect(currentTask(store)).toEqual(task1);
        });

        it('replaces the previous currentTask', () => {
            const store = makeStore({ currentTask: task1 });
            store.dispatch(setCurrentTask(task2));
            expect(currentTask(store)?._id).toBe('t2');
        });
    });

    describe('clearError', () => {
        it('resets both error and submitError to null', () => {
            const store = makeStore({ error: 'fetch err', submitError: 'submit err' });
            store.dispatch(clearError());
            expect(error(store)).toBeNull();
            expect(submitError(store)).toBeNull();
        });
    });

    describe('setNoTasksAvailable', () => {
        it('sets noTasksAvailable to true', () => {
            const store = makeStore();
            store.dispatch(setNoTasksAvailable(true));
            expect(noTasksAvailable(store)).toBe(true);
        });

        it('sets noTasksAvailable to false', () => {
            const store = makeStore({ noTasksAvailable: true });
            store.dispatch(setNoTasksAvailable(false));
            expect(noTasksAvailable(store)).toBe(false);
        });
    });

    describe('resetAnnotationState', () => {
        it('resets submitting and submitError to initial values', () => {
            const store = makeStore({ submitting: true, submitError: 'err' });
            store.dispatch(resetAnnotationState());
            expect(submitting(store)).toBe(false);
            expect(submitError(store)).toBeNull();
        });
    });

    // ── fetchProjectTaskUsers thunk ───────────────────────────────────────────

    describe('fetchProjectTaskUsers', () => {
        it('sets loading true and noTasksAvailable false while pending', async () => {
            let resolve!: (v: any) => void;
            mockGetProjectTaskUsers.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore({ noTasksAvailable: true });
            const p = store.dispatch(fetchProjectTaskUsers('p1'));
            expect(loading(store)).toBe(true);
            expect(noTasksAvailable(store)).toBe(false);
            resolve([task1]);
            await p;
        });

        it('populates tasks on success', async () => {
            mockGetProjectTaskUsers.mockResolvedValue([task1, task2] as any);
            const store = makeStore();
            await store.dispatch(fetchProjectTaskUsers('p1'));
            expect(tasks(store)).toHaveLength(2);
            expect(loading(store)).toBe(false);
        });

        it('sets noTasksAvailable when response is empty array', async () => {
            mockGetProjectTaskUsers.mockResolvedValue([] as any);
            const store = makeStore();
            await store.dispatch(fetchProjectTaskUsers('p1'));
            expect(noTasksAvailable(store)).toBe(true);
        });

        it('sets noTasksAvailable when response is null', async () => {
            mockGetProjectTaskUsers.mockResolvedValue(null as any);
            const store = makeStore();
            await store.dispatch(fetchProjectTaskUsers('p1'));
            expect(noTasksAvailable(store)).toBe(true);
        });

        it('sets error on rejection', async () => {
            mockGetProjectTaskUsers.mockRejectedValue({ response: { data: { message: 'Forbidden' } } });
            const store = makeStore();
            await store.dispatch(fetchProjectTaskUsers('p1'));
            expect(error(store)).toBe('Forbidden');
            expect(loading(store)).toBe(false);
        });

        it('sets noTasksAvailable true when error message contains 404', async () => {
            mockGetProjectTaskUsers.mockRejectedValue({ response: { status: 404, data: { message: 'No tasks' } } });
            const store = makeStore();
            await store.dispatch(fetchProjectTaskUsers('p1'));
            expect(noTasksAvailable(store)).toBe(true);
            expect(error(store)).toContain('404');
        });
    });

    // ── submitAnnotation thunk ────────────────────────────────────────────────

    describe('submitAnnotation', () => {
        const annotationArgs = {
            projectId: 'p1',
            taskId: 'task-1',
            data: { status: 'annotated', llm1: { overall_quality: 4 }, llm2: { overall_quality: 3 } },
        };

        it('sets submitting true while pending', async () => {
            let resolve!: (v: any) => void;
            mockSubmitAnnotation.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(submitAnnotation(annotationArgs));
            expect(submitting(store)).toBe(true);
            resolve({});
            await p;
        });

        it('clears submitting and submitError on success', async () => {
            mockSubmitAnnotation.mockResolvedValue({} as any);
            const store = makeStore({ submitError: 'old' });
            await store.dispatch(submitAnnotation(annotationArgs));
            expect(submitting(store)).toBe(false);
            expect(submitError(store)).toBeNull();
        });

        it('sets submitError on rejection', async () => {
            mockSubmitAnnotation.mockRejectedValue({ response: { data: { message: 'Validation failed' } } });
            const store = makeStore();
            await store.dispatch(submitAnnotation(annotationArgs));
            expect(submitError(store)).toBe('Validation failed');
            expect(submitting(store)).toBe(false);
        });

        it('uses fallback error message', async () => {
            mockSubmitAnnotation.mockRejectedValue({});
            const store = makeStore();
            await store.dispatch(submitAnnotation(annotationArgs));
            expect(submitError(store)).toBe('Failed to submit annotation');
        });
    });

    // ── fetchReviewerTasks thunk ──────────────────────────────────────────────

    describe('fetchReviewerTasks', () => {
        it('sets loading true while pending', async () => {
            let resolve!: (v: any) => void;
            mockGetReviewerTasks.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(fetchReviewerTasks('p1'));
            expect(loading(store)).toBe(true);
            resolve([task1]);
            await p;
        });

        it('populates tasks on success', async () => {
            mockGetReviewerTasks.mockResolvedValue([task1] as any);
            const store = makeStore();
            await store.dispatch(fetchReviewerTasks('p1'));
            expect(tasks(store)).toHaveLength(1);
            expect(loading(store)).toBe(false);
        });

        it('sets noTasksAvailable when response is empty', async () => {
            mockGetReviewerTasks.mockResolvedValue([] as any);
            const store = makeStore();
            await store.dispatch(fetchReviewerTasks('p1'));
            expect(noTasksAvailable(store)).toBe(true);
        });

        it('sets noTasksAvailable true when 404 error', async () => {
            mockGetReviewerTasks.mockRejectedValue({ response: { status: 404, data: { message: 'Not found' } } });
            const store = makeStore();
            await store.dispatch(fetchReviewerTasks('p1'));
            expect(noTasksAvailable(store)).toBe(true);
            expect(error(store)).toContain('404');
        });
    });

    // ── submitReviewerReview thunk ────────────────────────────────────────────

    describe('submitReviewerReview', () => {
        const reviewArgs = {
            projectId: 'p1',
            taskId: 'task-1',
            data: { status: 'approved', overall_quality: '5', ranking: '1' },
        };

        it('sets submitting true while pending', async () => {
            let resolve!: (v: any) => void;
            mockReviewerReviewTask.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(submitReviewerReview(reviewArgs));
            expect(submitting(store)).toBe(true);
            resolve({});
            await p;
        });

        it('clears submitting on success', async () => {
            mockReviewerReviewTask.mockResolvedValue({} as any);
            const store = makeStore();
            await store.dispatch(submitReviewerReview(reviewArgs));
            expect(submitting(store)).toBe(false);
            expect(submitError(store)).toBeNull();
        });

        it('sets submitError on rejection', async () => {
            mockReviewerReviewTask.mockRejectedValue({ response: { data: { message: 'Review conflict' } } });
            const store = makeStore();
            await store.dispatch(submitReviewerReview(reviewArgs));
            expect(submitError(store)).toBe('Review conflict');
            expect(submitting(store)).toBe(false);
        });

        it('uses fallback error message', async () => {
            mockReviewerReviewTask.mockRejectedValue({});
            const store = makeStore();
            await store.dispatch(submitReviewerReview(reviewArgs));
            expect(submitError(store)).toBe('Failed to submit review');
        });
    });
});
