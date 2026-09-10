import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import workspaceDashboardReducer, {
    fetchWorkspaceDashboard,
    clearWorkspaceDashboard,
    selectWorkspaceDashboardData,
    selectWorkspaceDashboardLoading,
    selectWorkspaceDashboardError,
} from '../workspaceDashboardSlice';
import type { WorkspaceDashboardState, WorkspaceDashboardData } from '../workspaceDashboardSlice';

// ── Module mock ───────────────────────────────────────────────────────────────

vi.mock('../../../services/api/dashboardApi', () => ({
    dashboardApi: {
        workspaceApi: vi.fn(),
        taskDashboardApi: vi.fn(),
        projhectDashboardApi: vi.fn(),
    },
}));

import { dashboardApi } from '../../../services/api/dashboardApi';
const mockWorkspaceApi = vi.mocked(dashboardApi.workspaceApi);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStore(preloaded?: Partial<WorkspaceDashboardState>) {
    return configureStore({
        reducer: { workspaceDashboard: workspaceDashboardReducer },
        preloadedState: preloaded
            ? { workspaceDashboard: { data: null, loading: false, error: null, ...preloaded } }
            : undefined,
    });
}

type TestStore = ReturnType<typeof makeStore>;
const getState = (store: TestStore) => store.getState() as { workspaceDashboard: WorkspaceDashboardState };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleData: WorkspaceDashboardData = {
    avg_throughput: 35.5,
    rejection_percentage: 12.3,
    queued_tasks_count_percentage: 45.0,
    workspace_task_metrics: [
        {
            total_tasks: 100,
            completed_tasks: 75,
            completion_percentage: 75,
            avg_completed_per_day: 5,
            workspace_id: 'ws-1',
            project_id: 'p-1',
            project_name: 'Project Alpha',
        },
    ],
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('workspaceDashboardSlice', () => {
    beforeEach(() => vi.clearAllMocks());

    // ── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('starts with data null', () => {
            expect(selectWorkspaceDashboardData(getState(makeStore()))).toBeNull();
        });

        it('starts with loading false', () => {
            expect(selectWorkspaceDashboardLoading(getState(makeStore()))).toBe(false);
        });

        it('starts with error null', () => {
            expect(selectWorkspaceDashboardError(getState(makeStore()))).toBeNull();
        });
    });

    // ── Sync actions ─────────────────────────────────────────────────────────

    describe('clearWorkspaceDashboard', () => {
        it('resets data and error to null', () => {
            const store = makeStore({ data: sampleData, error: 'some error' });
            store.dispatch(clearWorkspaceDashboard());
            expect(selectWorkspaceDashboardData(getState(store))).toBeNull();
            expect(selectWorkspaceDashboardError(getState(store))).toBeNull();
        });

        it('is a no-op when already at initial state', () => {
            const store = makeStore();
            store.dispatch(clearWorkspaceDashboard());
            expect(selectWorkspaceDashboardData(getState(store))).toBeNull();
        });
    });

    // ── fetchWorkspaceDashboard thunk ─────────────────────────────────────────

    describe('fetchWorkspaceDashboard', () => {
        describe('pending', () => {
            it('sets loading to true and clears error', async () => {
                let resolve!: (v: any) => void;
                mockWorkspaceApi.mockReturnValue(new Promise(res => (resolve = res)));
                const store = makeStore({ error: 'stale' });
                const p = store.dispatch(fetchWorkspaceDashboard({ workspaceId: 'ws-1' }));
                expect(selectWorkspaceDashboardLoading(getState(store))).toBe(true);
                expect(selectWorkspaceDashboardError(getState(store))).toBeNull();
                resolve({ data: { data: sampleData } });
                await p;
            });
        });

        describe('fulfilled', () => {
            it('populates data from response.data.data', async () => {
                mockWorkspaceApi.mockResolvedValue({ data: { data: sampleData } } as any);
                const store = makeStore();
                await store.dispatch(fetchWorkspaceDashboard({ workspaceId: 'ws-1' }));
                const data = selectWorkspaceDashboardData(getState(store));
                expect(data?.avg_throughput).toBe(35.5);
                expect(data?.workspace_task_metrics).toHaveLength(1);
                expect(selectWorkspaceDashboardLoading(getState(store))).toBe(false);
            });

            it('populates data from response.data when no inner data key', async () => {
                mockWorkspaceApi.mockResolvedValue({ data: sampleData } as any);
                const store = makeStore();
                await store.dispatch(fetchWorkspaceDashboard({ workspaceId: 'ws-1' }));
                expect(selectWorkspaceDashboardData(getState(store))?.rejection_percentage).toBe(12.3);
            });

            it('passes days parameter to the API', async () => {
                mockWorkspaceApi.mockResolvedValue({ data: sampleData } as any);
                const store = makeStore();
                await store.dispatch(fetchWorkspaceDashboard({ workspaceId: 'ws-1', days: 7 }));
                expect(mockWorkspaceApi).toHaveBeenCalledWith('ws-1', 7);
            });

            it('clears error on success', async () => {
                mockWorkspaceApi.mockResolvedValue({ data: sampleData } as any);
                const store = makeStore({ error: 'old error' });
                await store.dispatch(fetchWorkspaceDashboard({ workspaceId: 'ws-1' }));
                expect(selectWorkspaceDashboardError(getState(store))).toBeNull();
            });
        });

        describe('rejected', () => {
            it('sets error from API response message', async () => {
                mockWorkspaceApi.mockRejectedValue({ response: { data: { message: 'Access denied' } } });
                const store = makeStore();
                await store.dispatch(fetchWorkspaceDashboard({ workspaceId: 'ws-1' }));
                expect(selectWorkspaceDashboardError(getState(store))).toBe('Access denied');
                expect(selectWorkspaceDashboardLoading(getState(store))).toBe(false);
            });

            it('falls back to error.message when no response.data.message', async () => {
                mockWorkspaceApi.mockRejectedValue(new Error('Network timeout'));
                const store = makeStore();
                await store.dispatch(fetchWorkspaceDashboard({ workspaceId: 'ws-1' }));
                expect(selectWorkspaceDashboardError(getState(store))).toBe('Network timeout');
            });

            it('uses hardcoded fallback when no error info available', async () => {
                mockWorkspaceApi.mockRejectedValue({});
                const store = makeStore();
                await store.dispatch(fetchWorkspaceDashboard({ workspaceId: 'ws-1' }));
                expect(selectWorkspaceDashboardError(getState(store))).toBe('Failed to fetch workspace dashboard data');
            });
        });
    });
});
