import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import organizationReducer, {
    fetchOrganizations,
    fetchOrganizationDashboard,
    createOrganization,
    clearError,
    clearCreateError,
    setCurrentOrganization,
    clearCurrentOrganization,
    selectOrganizations,
    selectCurrentOrganization,
    selectOrganizationLoading,
    selectOrganizationError,
    selectCreateLoading,
    selectCreateError,
    selectOrganizationDashboardMetrics,
    selectDashboardMetricsLoading,
    selectDashboardMetricsError,
} from '../organizationSlice';
import type { OrganizationState } from '../../../interfaces/redux';

// ── Module mock ───────────────────────────────────────────────────────────────

vi.mock('../../../services/api/organizationApi', () => ({
    getOrganizationsApi: vi.fn(),
    createOrganizationApi: vi.fn(),
    dashboardApi: vi.fn(),
}));

import { getOrganizationsApi, createOrganizationApi, dashboardApi } from '../../../services/api/organizationApi';
const mockGetOrganizations = vi.mocked(getOrganizationsApi);
const mockCreateOrganization = vi.mocked(createOrganizationApi);
const mockDashboardApi = vi.mocked(dashboardApi);

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_STATE: OrganizationState = {
    organizations: [],
    currentOrganization: null,
    loading: false,
    error: null,
    createLoading: false,
    createError: null,
    dashboardMetrics: null,
    dashboardMetricsLoading: false,
    dashboardMetricsError: null,
};

function makeStore(preloaded?: Partial<OrganizationState>) {
    return configureStore({
        reducer: { organization: organizationReducer },
        preloadedState: preloaded ? { organization: { ...DEFAULT_STATE, ...preloaded } } : undefined,
    });
}

type TestStore = ReturnType<typeof makeStore>;
const getState = (store: TestStore) => store.getState() as { organization: OrganizationState };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const org1 = { _id: 'org-1', name: 'Acme Corp', workspace_count: 2 } as any;
const org2 = { _id: 'org-2', name: 'Beta Inc', workspace_count: 1 } as any;

const dashboardMetrics = {
    total_workspaces: 5,
    total_projects: 12,
    total_users: 50,
    total_tasks: 200,
    completed_tasks: 150,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('organizationSlice', () => {
    beforeEach(() => vi.clearAllMocks());

    // ── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('starts with empty organizations array', () => {
            expect(selectOrganizations(getState(makeStore()))).toEqual([]);
        });

        it('starts with currentOrganization null', () => {
            expect(selectCurrentOrganization(getState(makeStore()))).toBeNull();
        });

        it('starts with loading false', () => {
            expect(selectOrganizationLoading(getState(makeStore()))).toBe(false);
        });

        it('starts with error null', () => {
            expect(selectOrganizationError(getState(makeStore()))).toBeNull();
        });

        it('starts with dashboardMetrics null', () => {
            expect(selectOrganizationDashboardMetrics(getState(makeStore()))).toBeNull();
        });
    });

    // ── Sync actions ─────────────────────────────────────────────────────────

    describe('clearError', () => {
        it('resets error and createError to null', () => {
            const store = makeStore({ error: 'fetch error', createError: 'create error' });
            store.dispatch(clearError());
            expect(selectOrganizationError(getState(store))).toBeNull();
            expect(selectCreateError(getState(store))).toBeNull();
        });
    });

    describe('clearCreateError', () => {
        it('resets only createError to null (does not touch error)', () => {
            const store = makeStore({ error: 'fetch error', createError: 'create error' });
            store.dispatch(clearCreateError());
            expect(selectCreateError(getState(store))).toBeNull();
            expect(selectOrganizationError(getState(store))).toBe('fetch error'); // unchanged
        });
    });

    describe('setCurrentOrganization', () => {
        it('sets the currentOrganization', () => {
            const store = makeStore();
            store.dispatch(setCurrentOrganization(org1));
            expect(selectCurrentOrganization(getState(store))?._id).toBe('org-1');
        });

        it('replaces the previous currentOrganization', () => {
            const store = makeStore({ currentOrganization: org1 });
            store.dispatch(setCurrentOrganization(org2));
            expect(selectCurrentOrganization(getState(store))?._id).toBe('org-2');
        });
    });

    describe('clearCurrentOrganization', () => {
        it('sets currentOrganization to null', () => {
            const store = makeStore({ currentOrganization: org1 });
            store.dispatch(clearCurrentOrganization());
            expect(selectCurrentOrganization(getState(store))).toBeNull();
        });
    });

    // ── fetchOrganizations thunk ──────────────────────────────────────────────

    describe('fetchOrganizations', () => {
        it('sets loading true while pending', async () => {
            let resolve!: (v: any) => void;
            mockGetOrganizations.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(fetchOrganizations());
            expect(selectOrganizationLoading(getState(store))).toBe(true);
            resolve({ data: [] });
            await p;
        });

        it('populates organizations array from response.data', async () => {
            mockGetOrganizations.mockResolvedValue({ data: [org1, org2] } as any);
            const store = makeStore();
            await store.dispatch(fetchOrganizations());
            expect(selectOrganizations(getState(store))).toHaveLength(2);
            expect(selectOrganizationLoading(getState(store))).toBe(false);
        });

        it('handles direct array response (no data wrapper)', async () => {
            mockGetOrganizations.mockResolvedValue([org1] as any);
            const store = makeStore();
            await store.dispatch(fetchOrganizations());
            expect(selectOrganizations(getState(store))).toHaveLength(1);
        });

        it('clears previous error on success', async () => {
            mockGetOrganizations.mockResolvedValue({ data: [] } as any);
            const store = makeStore({ error: 'stale error' });
            await store.dispatch(fetchOrganizations());
            expect(selectOrganizationError(getState(store))).toBeNull();
        });

        it('sets error on rejection', async () => {
            mockGetOrganizations.mockRejectedValue({ response: { data: { message: 'Unauthorized' } } });
            const store = makeStore();
            await store.dispatch(fetchOrganizations());
            expect(selectOrganizationError(getState(store))).toBe('Unauthorized');
            expect(selectOrganizationLoading(getState(store))).toBe(false);
        });

        it('uses fallback error message when API provides none', async () => {
            mockGetOrganizations.mockRejectedValue({});
            const store = makeStore();
            await store.dispatch(fetchOrganizations());
            expect(selectOrganizationError(getState(store))).toBe('Failed to fetch organizations');
        });
    });

    // ── createOrganization thunk ──────────────────────────────────────────────

    describe('createOrganization', () => {
        const newOrgData = { name: 'New Org', type: 'enterprise' } as any;

        it('sets createLoading true while pending', async () => {
            let resolve!: (v: any) => void;
            mockCreateOrganization.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(createOrganization(newOrgData));
            expect(selectCreateLoading(getState(store))).toBe(true);
            resolve({ data: org1 });
            await p;
        });

        it('appends the new organization and sets createLoading false', async () => {
            mockCreateOrganization.mockResolvedValue({ data: org1 } as any);
            const store = makeStore({ organizations: [org2] });
            await store.dispatch(createOrganization(newOrgData));
            const orgs = selectOrganizations(getState(store));
            expect(orgs).toHaveLength(2);
            expect(orgs[1]._id).toBe('org-1'); // appended
            expect(selectCreateLoading(getState(store))).toBe(false);
        });

        it('handles direct response (no data wrapper)', async () => {
            mockCreateOrganization.mockResolvedValue(org1 as any);
            const store = makeStore();
            await store.dispatch(createOrganization(newOrgData));
            expect(selectOrganizations(getState(store))[0]._id).toBe('org-1');
        });

        it('sets createError on rejection', async () => {
            mockCreateOrganization.mockRejectedValue({ response: { data: { message: 'Org already exists' } } });
            const store = makeStore();
            await store.dispatch(createOrganization(newOrgData));
            expect(selectCreateError(getState(store))).toBe('Org already exists');
            expect(selectCreateLoading(getState(store))).toBe(false);
        });
    });

    // ── fetchOrganizationDashboard thunk ─────────────────────────────────────

    describe('fetchOrganizationDashboard', () => {
        it('sets dashboardMetricsLoading true while pending', async () => {
            let resolve!: (v: any) => void;
            mockDashboardApi.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(fetchOrganizationDashboard('org-1'));
            expect(selectDashboardMetricsLoading(getState(store))).toBe(true);
            resolve({ data: dashboardMetrics });
            await p;
        });

        it('populates dashboardMetrics on success', async () => {
            mockDashboardApi.mockResolvedValue({ data: dashboardMetrics } as any);
            const store = makeStore();
            await store.dispatch(fetchOrganizationDashboard('org-1'));
            const metrics = selectOrganizationDashboardMetrics(getState(store));
            expect((metrics as any)?.total_workspaces).toBe(5);
            expect(selectDashboardMetricsLoading(getState(store))).toBe(false);
        });

        it('handles direct response (no data wrapper)', async () => {
            mockDashboardApi.mockResolvedValue(dashboardMetrics as any);
            const store = makeStore();
            await store.dispatch(fetchOrganizationDashboard('org-1'));
            expect(selectOrganizationDashboardMetrics(getState(store))).toEqual(dashboardMetrics);
        });

        it('clears previous error on success', async () => {
            mockDashboardApi.mockResolvedValue({ data: dashboardMetrics } as any);
            const store = makeStore({ dashboardMetricsError: 'old error' });
            await store.dispatch(fetchOrganizationDashboard('org-1'));
            expect(selectDashboardMetricsError(getState(store))).toBeNull();
        });

        it('sets dashboardMetricsError on rejection', async () => {
            mockDashboardApi.mockRejectedValue({ response: { data: { message: 'Dashboard unavailable' } } });
            const store = makeStore();
            await store.dispatch(fetchOrganizationDashboard('org-1'));
            expect(selectDashboardMetricsError(getState(store))).toBe('Dashboard unavailable');
            expect(selectDashboardMetricsLoading(getState(store))).toBe(false);
        });

        it('uses fallback error message', async () => {
            mockDashboardApi.mockRejectedValue({});
            const store = makeStore();
            await store.dispatch(fetchOrganizationDashboard('org-1'));
            expect(selectDashboardMetricsError(getState(store))).toBe('Failed to fetch dashboard metrics');
        });
    });
});
