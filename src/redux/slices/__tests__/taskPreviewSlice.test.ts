import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import taskPreviewReducer, {
    fetchTaskPreview,
    clearTaskPreview,
    selectTaskPreviewData,
    selectTaskPreviewLoading,
    selectTaskPreviewError,
} from '../taskPreviewSlice';
import type { TaskPreviewState, TaskPreviewData } from '../taskPreviewSlice';

// ── Module mock ───────────────────────────────────────────────────────────────

vi.mock('../../../services/api/dashboardApi', () => ({
    dashboardApi: {
        taskDashboardApi: vi.fn(),
        projhectDashboardApi: vi.fn(),
        workspaceApi: vi.fn(),
    },
}));

import { dashboardApi } from '../../../services/api/dashboardApi';
const mockTaskDashboardApi = vi.mocked(dashboardApi.taskDashboardApi);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStore(preloaded?: Partial<TaskPreviewState>) {
    return configureStore({
        reducer: { taskPreview: taskPreviewReducer },
        preloadedState: preloaded
            ? { taskPreview: { data: null, loading: false, error: null, ...preloaded } }
            : undefined,
    });
}

type TestStore = ReturnType<typeof makeStore>;
const getState = (store: TestStore) => store.getState() as { taskPreview: TaskPreviewState };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const rawTaskData: TaskPreviewData = {
    _id: 'task-1',
    task_id: 'TASK-001',
    org_id: 'org-1',
    workspace_id: 'ws-1',
    project_id: 'p-1',
    prompt: 'What is the capital of France?',
    llm1: 'Paris',
    llm2: 'Paris is the capital',
    payload: { prompt: 'What is...', llm1: 'Paris', llm2: 'Paris is the capital' },
    assigned: null,
    annotations: [
        {
            round: 1,
            annotator_id: 'u1',
            llm1: { overall_quality: 5 },
            llm2: { overall_quality: 4 },
            comparison_selection: 'llm1',
            submitted_time: '2024-01-01T10:00:00Z',
            is_approved: 1,
        },
    ],
    stage: 'annotation',
    status: 'annotated',
    cycle: 1,
    priority: 'normal',
    assigned_to: null,
    assigned_annotator: 'user-1',
    started_at_by_annotator: '2024-01-01T09:00:00Z',
    annotator_expiration: '2024-01-02T09:00:00Z',
    created_by: 'admin',
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    completed_at: null,
    due_date: null,
    is_active: 1,
    logs: [],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('taskPreviewSlice', () => {
    beforeEach(() => vi.clearAllMocks());

    // ── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('starts with data null', () => {
            expect(selectTaskPreviewData(getState(makeStore()))).toBeNull();
        });

        it('starts with loading false', () => {
            expect(selectTaskPreviewLoading(getState(makeStore()))).toBe(false);
        });

        it('starts with error null', () => {
            expect(selectTaskPreviewError(getState(makeStore()))).toBeNull();
        });
    });

    // ── Sync actions ─────────────────────────────────────────────────────────

    describe('clearTaskPreview', () => {
        it('resets data, loading, and error', () => {
            const store = makeStore({ data: rawTaskData, loading: true, error: 'some error' });
            store.dispatch(clearTaskPreview());
            expect(selectTaskPreviewData(getState(store))).toBeNull();
            expect(selectTaskPreviewLoading(getState(store))).toBe(false);
            expect(selectTaskPreviewError(getState(store))).toBeNull();
        });
    });

    // ── fetchTaskPreview thunk ────────────────────────────────────────────────

    describe('fetchTaskPreview', () => {
        describe('pending', () => {
            it('sets loading true and clears error', async () => {
                let resolve!: (v: any) => void;
                mockTaskDashboardApi.mockReturnValue(new Promise(res => (resolve = res)));
                const store = makeStore({ error: 'stale' });
                const p = store.dispatch(fetchTaskPreview({ projectId: 'p1', taskId: 'task-1' }));
                expect(selectTaskPreviewLoading(getState(store))).toBe(true);
                expect(selectTaskPreviewError(getState(store))).toBeNull();
                resolve({ data: { data: { data: rawTaskData } } });
                await p;
            });
        });

        describe('fulfilled — raw data returned unchanged', () => {
            it('stores the raw task data from data.data.data', async () => {
                mockTaskDashboardApi.mockResolvedValue({ data: { data: { data: rawTaskData } } } as any);
                const store = makeStore();
                await store.dispatch(fetchTaskPreview({ projectId: 'p1', taskId: 'task-1' }));
                const data = selectTaskPreviewData(getState(store));
                expect(data?.task_id).toBe('TASK-001');
                expect(data?.prompt).toBe('What is the capital of France?');
                expect(selectTaskPreviewLoading(getState(store))).toBe(false);
            });

            it('stores raw data from data.data when inner data key is absent', async () => {
                mockTaskDashboardApi.mockResolvedValue({ data: { data: rawTaskData } } as any);
                const store = makeStore();
                await store.dispatch(fetchTaskPreview({ projectId: 'p1', taskId: 'task-1' }));
                expect(selectTaskPreviewData(getState(store))?.task_id).toBe('TASK-001');
            });

            it('does NOT transform the data (returns raw API shape)', async () => {
                mockTaskDashboardApi.mockResolvedValue({ data: { data: rawTaskData } } as any);
                const store = makeStore();
                await store.dispatch(fetchTaskPreview({ projectId: 'p1', taskId: 'task-1' }));
                const data = selectTaskPreviewData(getState(store));
                // Unlike taskDashboardSlice, this returns raw shape (has llm1, llm2 fields)
                expect(data?.llm1).toBe('Paris');
                expect(data?.annotations).toHaveLength(1);
            });

            it('clears error on success', async () => {
                mockTaskDashboardApi.mockResolvedValue({ data: { data: rawTaskData } } as any);
                const store = makeStore({ error: 'old' });
                await store.dispatch(fetchTaskPreview({ projectId: 'p1', taskId: 'task-1' }));
                expect(selectTaskPreviewError(getState(store))).toBeNull();
            });
        });

        describe('rejected', () => {
            it('sets error when no task data in response', async () => {
                mockTaskDashboardApi.mockResolvedValue({ data: { data: null } } as any);
                const store = makeStore();
                await store.dispatch(fetchTaskPreview({ projectId: 'p1', taskId: 'bad' }));
                expect(selectTaskPreviewError(getState(store))).toBe('No task data found in response');
            });

            it('sets error from API response message', async () => {
                mockTaskDashboardApi.mockRejectedValue({ response: { data: { message: 'Unauthorized' } } });
                const store = makeStore();
                await store.dispatch(fetchTaskPreview({ projectId: 'p1', taskId: 'task-1' }));
                expect(selectTaskPreviewError(getState(store))).toBe('Unauthorized');
                expect(selectTaskPreviewLoading(getState(store))).toBe(false);
            });

            it('uses fallback error message when none provided', async () => {
                mockTaskDashboardApi.mockRejectedValue({});
                const store = makeStore();
                await store.dispatch(fetchTaskPreview({ projectId: 'p1', taskId: 'task-1' }));
                expect(selectTaskPreviewError(getState(store))).toBe('Failed to fetch task preview data');
            });
        });
    });
});
