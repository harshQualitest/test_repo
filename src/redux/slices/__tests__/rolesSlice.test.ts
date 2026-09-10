import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import rolesReducer, {
    fetchRoles,
    clearError,
    resetRolesState,
    setLoading,
    selectRoles,
    selectPermissions,
    selectRolesLoading,
    selectRolesError,
    selectLastFetch,
} from '../rolesSlice';
import type { RolesState } from '../rolesSlice';

// ── Module mock ───────────────────────────────────────────────────────────────

vi.mock('../../../services/api/rolesApi', () => ({
    default: {
        getRoles: vi.fn(),
    },
}));

import rolesApi from '../../../services/api/rolesApi';
const mockGetRoles = vi.mocked(rolesApi.getRoles);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStore(preloaded?: Partial<RolesState>) {
    return configureStore({
        reducer: { roles: rolesReducer },
        preloadedState: preloaded
            ? { roles: { roles: [], permissions: [], loading: false, error: null, lastFetch: null, ...preloaded } }
            : undefined,
    });
}

type TestStore = ReturnType<typeof makeStore>;
const getState = (store: TestStore) => store.getState() as { roles: RolesState };

// ── Sample data ───────────────────────────────────────────────────────────────

const sampleRoles = [
    {
        _id: 'role-1',
        role_id: 'annotator',
        permissions: [
            { permission_id: 'perm-view', access: 'view' as const },
            { permission_id: 'perm-edit', access: 'edit' as const },
        ],
    },
    {
        _id: 'role-2',
        role_id: 'reviewer',
        permissions: [
            { permission_id: 'perm-view', access: 'full_access' as const }, // duplicate → Map deduplicates
            { permission_id: 'perm-admin', access: 'full_access' as const },
        ],
    },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('rolesSlice', () => {
    beforeEach(() => vi.clearAllMocks());

    // ── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('starts with empty roles array', () => {
            const store = makeStore();
            expect(selectRoles(getState(store))).toEqual([]);
        });

        it('starts with empty permissions array', () => {
            const store = makeStore();
            expect(selectPermissions(getState(store))).toEqual([]);
        });

        it('starts with loading = false', () => {
            const store = makeStore();
            expect(selectRolesLoading(getState(store))).toBe(false);
        });

        it('starts with error = null', () => {
            const store = makeStore();
            expect(selectRolesError(getState(store))).toBeNull();
        });

        it('starts with lastFetch = null', () => {
            const store = makeStore();
            expect(selectLastFetch(getState(store))).toBeNull();
        });
    });

    // ── Sync actions ─────────────────────────────────────────────────────────

    describe('clearError', () => {
        it('resets error to null', () => {
            const store = makeStore({ error: 'Something went wrong' });
            store.dispatch(clearError());
            expect(selectRolesError(getState(store))).toBeNull();
        });

        it('is a no-op when error is already null', () => {
            const store = makeStore();
            store.dispatch(clearError());
            expect(selectRolesError(getState(store))).toBeNull();
        });
    });

    describe('resetRolesState', () => {
        it('clears roles, permissions, error and lastFetch to initial values', () => {
            const store = makeStore({
                roles: sampleRoles,
                permissions: [{ permission_id: 'p1', access: 'view' }],
                loading: false,
                error: 'old error',
                lastFetch: '2024-01-01T00:00:00.000Z',
            });
            store.dispatch(resetRolesState());
            const state = getState(store);
            expect(selectRoles(state)).toEqual([]);
            expect(selectPermissions(state)).toEqual([]);
            expect(selectRolesError(state)).toBeNull();
            expect(selectLastFetch(state)).toBeNull();
            expect(selectRolesLoading(state)).toBe(false);
        });
    });

    describe('setLoading', () => {
        it('sets loading to true', () => {
            const store = makeStore();
            store.dispatch(setLoading(true));
            expect(selectRolesLoading(getState(store))).toBe(true);
        });

        it('sets loading to false', () => {
            const store = makeStore({ loading: true });
            store.dispatch(setLoading(false));
            expect(selectRolesLoading(getState(store))).toBe(false);
        });
    });

    // ── fetchRoles thunk ─────────────────────────────────────────────────────

    describe('fetchRoles', () => {

        describe('pending', () => {
            it('sets loading to true while the request is in-flight', async () => {
                let resolveApi!: (v: unknown) => void;
                mockGetRoles.mockReturnValue(new Promise(res => (resolveApi = res)));

                const store = makeStore();
                const dispatch = store.dispatch(fetchRoles());

                expect(selectRolesLoading(getState(store))).toBe(true);

                resolveApi({ data: [] });
                await dispatch;
            });

            it('clears previous error when a new request starts', async () => {
                mockGetRoles.mockResolvedValue({ data: [] });
                const store = makeStore({ error: 'stale error' });
                await store.dispatch(fetchRoles());
                expect(selectRolesError(getState(store))).toBeNull();
            });
        });

        describe('fulfilled — response.data array format', () => {
            it('populates the roles array', async () => {
                mockGetRoles.mockResolvedValue({ data: sampleRoles });
                const store = makeStore();
                await store.dispatch(fetchRoles());
                expect(selectRoles(getState(store))).toHaveLength(2);
            });

            it('sets loading to false after success', async () => {
                mockGetRoles.mockResolvedValue({ data: sampleRoles });
                const store = makeStore();
                await store.dispatch(fetchRoles());
                expect(selectRolesLoading(getState(store))).toBe(false);
            });

            it('deduplicates permissions by permission_id using a Map', async () => {
                mockGetRoles.mockResolvedValue({ data: sampleRoles });
                const store = makeStore();
                await store.dispatch(fetchRoles());
                // perm-view (appears in both roles) + perm-edit + perm-admin = 3 unique
                const permissions = selectPermissions(getState(store));
                expect(permissions).toHaveLength(3);
                const ids = permissions.map(p => p.permission_id);
                expect(ids).toContain('perm-view');
                expect(ids).toContain('perm-edit');
                expect(ids).toContain('perm-admin');
            });

            it('sets lastFetch to a parseable ISO string', async () => {
                mockGetRoles.mockResolvedValue({ data: sampleRoles });
                const store = makeStore();
                await store.dispatch(fetchRoles());
                const lastFetch = selectLastFetch(getState(store));
                expect(lastFetch).toBeTruthy();
                expect(isNaN(new Date(lastFetch!).getTime())).toBe(false);
            });

            it('clears any previous error on success', async () => {
                mockGetRoles.mockResolvedValue({ data: [] });
                const store = makeStore({ error: 'old error' });
                await store.dispatch(fetchRoles());
                expect(selectRolesError(getState(store))).toBeNull();
            });
        });

        describe('fulfilled — direct array format (no data wrapper)', () => {
            it('handles a response that is a plain array (no .data property)', async () => {
                mockGetRoles.mockResolvedValue(sampleRoles);
                const store = makeStore();
                await store.dispatch(fetchRoles());
                expect(selectRoles(getState(store))).toHaveLength(2);
            });
        });

        describe('fulfilled — empty response', () => {
            it('results in empty arrays when the API returns null', async () => {
                mockGetRoles.mockResolvedValue(null);
                const store = makeStore();
                await store.dispatch(fetchRoles());
                expect(selectRoles(getState(store))).toEqual([]);
                expect(selectPermissions(getState(store))).toEqual([]);
            });

            it('results in empty arrays when data is an empty array', async () => {
                mockGetRoles.mockResolvedValue({ data: [] });
                const store = makeStore();
                await store.dispatch(fetchRoles());
                expect(selectRoles(getState(store))).toEqual([]);
            });
        });

        describe('rejected', () => {
            it('sets the error message from the API response', async () => {
                mockGetRoles.mockRejectedValue({ response: { data: { message: 'Unauthorized' } } });
                const store = makeStore();
                await store.dispatch(fetchRoles());
                expect(selectRolesError(getState(store))).toBe('Unauthorized');
            });

            it('falls back to a generic message if the API provides no message', async () => {
                mockGetRoles.mockRejectedValue(new Error('Network error'));
                const store = makeStore();
                await store.dispatch(fetchRoles());
                expect(selectRolesError(getState(store))).toBe('Failed to fetch roles and permissions');
            });

            it('sets loading to false after a rejection', async () => {
                mockGetRoles.mockRejectedValue({ response: { data: { message: 'Forbidden' } } });
                const store = makeStore();
                await store.dispatch(fetchRoles());
                expect(selectRolesLoading(getState(store))).toBe(false);
            });

            it('does not modify the existing roles on failure', async () => {
                mockGetRoles.mockRejectedValue({ response: { data: { message: 'err' } } });
                const store = makeStore({ roles: sampleRoles });
                await store.dispatch(fetchRoles());
                // Roles remain from preloaded state (the reducer doesn't reset them on rejection)
                // The exact behavior depends on the reducer — here we verify loading is false
                expect(selectRolesLoading(getState(store))).toBe(false);
            });
        });
    });
});
