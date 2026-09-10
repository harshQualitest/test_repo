import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import taskDashboardReducer, {
    fetchTaskDashboard,
    clearTaskDashboard,
    selectTaskDashboardData,
    selectTaskDashboardLoading,
    selectTaskDashboardError,
} from '../taskDashboardSlice';
import type { TaskDashboardState } from '../taskDashboardSlice';

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

function makeStore(preloaded?: Partial<TaskDashboardState>) {
    return configureStore({
        reducer: { taskDashboard: taskDashboardReducer },
        preloadedState: preloaded
            ? { taskDashboard: { data: null, loading: false, error: null, ...preloaded } }
            : undefined,
    });
}

type TestStore = ReturnType<typeof makeStore>;
const getState = (store: TestStore) => store.getState() as { taskDashboard: TaskDashboardState };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const rawApiTask = {
    _id: 'task-1',
    task_id: 'TASK-001',
    org_id: 'org-1',
    workspace_id: 'ws-1',
    project_id: 'p-1',
    prompt: 'What is AI?',
    llm1: 'AI is artificial intelligence.',
    llm2: 'AI is machine intelligence.',
    payload: { prompt: 'What is AI?', llm1: 'AI is AI', llm2: 'AI is MI' },
    assigned: null,
    annotations: [
        {
            round: 1,
            annotator_id: 'u1',
            llm1: { overall_quality: 4 },
            llm2: { overall_quality: 3 },
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
    logs: [
        {
            _id: 'log-1',
            org_id: 'org-1',
            workspace_id: 'ws-1',
            project_id: 'p-1',
            task_id: 'task-1',
            stage: 'annotation',
            action: 'annotated',
            cycle: 1,
            created_at: '2024-01-01T10:00:00Z',
            created_by: 'user-1',
            details: {},
        },
    ],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('taskDashboardSlice', () => {
    beforeEach(() => vi.clearAllMocks());

    // ── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('starts with data null', () => {
            expect(selectTaskDashboardData(getState(makeStore()))).toBeNull();
        });

        it('starts with loading false', () => {
            expect(selectTaskDashboardLoading(getState(makeStore()))).toBe(false);
        });

        it('starts with error null', () => {
            expect(selectTaskDashboardError(getState(makeStore()))).toBeNull();
        });
    });

    // ── Sync actions ─────────────────────────────────────────────────────────

    describe('clearTaskDashboard', () => {
        it('resets data, loading, and error', () => {
            const store = makeStore({ data: {} as any, loading: true, error: 'err' });
            store.dispatch(clearTaskDashboard());
            expect(selectTaskDashboardData(getState(store))).toBeNull();
            expect(selectTaskDashboardLoading(getState(store))).toBe(false);
            expect(selectTaskDashboardError(getState(store))).toBeNull();
        });
    });

    // ── fetchTaskDashboard thunk ──────────────────────────────────────────────

    describe('fetchTaskDashboard', () => {
        describe('pending', () => {
            it('sets loading true and clears error', async () => {
                let resolve!: (v: any) => void;
                mockTaskDashboardApi.mockReturnValue(new Promise(res => (resolve = res)));
                const store = makeStore({ error: 'stale' });
                const p = store.dispatch(fetchTaskDashboard({ projectId: 'p1', taskId: 't1' }));
                expect(selectTaskDashboardLoading(getState(store))).toBe(true);
                expect(selectTaskDashboardError(getState(store))).toBeNull();
                resolve({ data: { data: { data: rawApiTask } } });
                await p;
            });
        });

        describe('fulfilled', () => {
            it('populates data by transforming API response from data.data.data', async () => {
                mockTaskDashboardApi.mockResolvedValue({ data: { data: { data: rawApiTask } } } as any);
                const store = makeStore();
                await store.dispatch(fetchTaskDashboard({ projectId: 'p1', taskId: 'task-1' }));
                const data = selectTaskDashboardData(getState(store));
                expect(data).not.toBeNull();
                expect(data?.taskSummary.taskId).toBe('TASK-001');
                expect(selectTaskDashboardLoading(getState(store))).toBe(false);
            });

            it('populates data from data.data when inner data key is absent', async () => {
                mockTaskDashboardApi.mockResolvedValue({ data: { data: rawApiTask } } as any);
                const store = makeStore();
                await store.dispatch(fetchTaskDashboard({ projectId: 'p1', taskId: 'task-1' }));
                expect(selectTaskDashboardData(getState(store))?.taskSummary.taskId).toBe('TASK-001');
            });

            it('transforms task status to reviewer outcome status', async () => {
                mockTaskDashboardApi.mockResolvedValue({ data: { data: rawApiTask } } as any);
                const store = makeStore();
                await store.dispatch(fetchTaskDashboard({ projectId: 'p1', taskId: 'task-1' }));
                const data = selectTaskDashboardData(getState(store));
                // status='annotated' → reviewerOutcome.status = 'IN_PROGRESS'
                expect(data?.reviewerOutcome.status).toBe('IN_PROGRESS');
            });

            it('maps logs to revisionHistory', async () => {
                mockTaskDashboardApi.mockResolvedValue({ data: { data: rawApiTask } } as any);
                const store = makeStore();
                await store.dispatch(fetchTaskDashboard({ projectId: 'p1', taskId: 'task-1' }));
                const data = selectTaskDashboardData(getState(store));
                expect(data?.revisionHistory).toHaveLength(1);
                expect(data?.revisionHistory[0].status).toBe('PASSED'); // action='annotated'
            });

            it('populates backendDataSources from payload', async () => {
                mockTaskDashboardApi.mockResolvedValue({ data: { data: rawApiTask } } as any);
                const store = makeStore();
                await store.dispatch(fetchTaskDashboard({ projectId: 'p1', taskId: 'task-1' }));
                const data = selectTaskDashboardData(getState(store));
                expect(data?.backendDataSources[0].title).toBe('Prompt');
                expect(data?.backendDataSources[1].title).toBe('LLM 1 Response');
            });

            it('clears error on success', async () => {
                mockTaskDashboardApi.mockResolvedValue({ data: { data: rawApiTask } } as any);
                const store = makeStore({ error: 'old error' });
                await store.dispatch(fetchTaskDashboard({ projectId: 'p1', taskId: 'task-1' }));
                expect(selectTaskDashboardError(getState(store))).toBeNull();
            });
        });

        describe('rejected', () => {
            it('sets error when response has no task data', async () => {
                mockTaskDashboardApi.mockResolvedValue({ data: { data: null } } as any);
                const store = makeStore();
                await store.dispatch(fetchTaskDashboard({ projectId: 'p1', taskId: 'bad-id' }));
                expect(selectTaskDashboardError(getState(store))).toBe('No task data found in response');
                expect(selectTaskDashboardLoading(getState(store))).toBe(false);
            });

            it('sets error from API response message', async () => {
                mockTaskDashboardApi.mockRejectedValue({ response: { data: { message: 'Task not found' } } });
                const store = makeStore();
                await store.dispatch(fetchTaskDashboard({ projectId: 'p1', taskId: 'bad' }));
                expect(selectTaskDashboardError(getState(store))).toBe('Task not found');
            });

            it('uses generic fallback error message', async () => {
                mockTaskDashboardApi.mockRejectedValue({});
                const store = makeStore();
                await store.dispatch(fetchTaskDashboard({ projectId: 'p1', taskId: 't1' }));
                expect(selectTaskDashboardError(getState(store))).toBe('Failed to fetch task dashboard data');
            });
        });
    });
});
