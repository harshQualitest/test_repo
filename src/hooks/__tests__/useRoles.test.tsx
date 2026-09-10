import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import rolesReducer from '../../redux/slices/rolesSlice';
import type { RolesState } from '../../redux/slices/rolesSlice';
import { useRoles } from '../useRoles';

// ── Mock rolesSlice thunk so we don't need a real API ─────────────────────────

vi.mock('../../services/api/rolesApi', () => ({
    default: {
        getRoles: vi.fn(),
    },
}));

import rolesApi from '../../services/api/rolesApi';
const mockGetRoles = vi.mocked(rolesApi.getRoles);

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_ROLES_STATE: RolesState = {
    roles: [],
    permissions: [],
    loading: false,
    error: null,
    lastFetch: null,
};

function makeStore(preloaded?: Partial<RolesState>) {
    return configureStore({
        reducer: { roles: rolesReducer },
        preloadedState: preloaded
            ? { roles: { ...DEFAULT_ROLES_STATE, ...preloaded } }
            : undefined,
    });
}

const makeWrapper = (store: ReturnType<typeof makeStore>) =>
    ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );

// ── Sample roles data ─────────────────────────────────────────────────────────

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
            { permission_id: 'perm-view', access: 'full_access' as const },
            { permission_id: 'perm-admin', access: 'full_access' as const },
        ],
    },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useRoles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetRoles.mockResolvedValue({ data: [] } as any);
    });

    // ── Default behavior ──────────────────────────────────────────────────────

    describe('default behavior', () => {
        it('returns roles from the Redux store', () => {
            const store = makeStore({ roles: sampleRoles });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.roles).toHaveLength(2);
        });

        it('returns permissions from the Redux store', () => {
            const store = makeStore({
                permissions: [{ permission_id: 'perm-view', access: 'view' as const }],
            });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.permissions).toHaveLength(1);
        });

        it('returns loading state from the Redux store', () => {
            const store = makeStore({ loading: true });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.loading).toBe(true);
        });

        it('returns error state from the Redux store', () => {
            const store = makeStore({ error: 'API error' });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.error).toBe('API error');
        });

        it('returns lastFetch from the Redux store', () => {
            const ts = new Date().toISOString();
            const store = makeStore({ lastFetch: ts });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.lastFetch).toBe(ts);
        });
    });

    // ── hasData helper ────────────────────────────────────────────────────────

    describe('hasData', () => {
        it('returns false when roles array is empty', () => {
            const store = makeStore();
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.hasData).toBe(false);
        });

        it('returns true when roles array has items', () => {
            const store = makeStore({ roles: sampleRoles });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.hasData).toBe(true);
        });
    });

    // ── isStale helper ────────────────────────────────────────────────────────

    describe('isStale', () => {
        it('returns true when lastFetch is null', () => {
            const store = makeStore({ lastFetch: null });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.isStale).toBe(true);
        });

        it('returns false when lastFetch is recent (within refetchInterval)', () => {
            const recentFetch = new Date().toISOString();
            const store = makeStore({ roles: sampleRoles, lastFetch: recentFetch });
            const { result } = renderHook(() => useRoles(false, 30), { wrapper: makeWrapper(store) });
            expect(result.current.isStale).toBe(false);
        });

        it('returns true when lastFetch is older than refetchInterval', () => {
            // Set lastFetch to 2 hours ago
            const oldFetch = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            const store = makeStore({ roles: sampleRoles, lastFetch: oldFetch });
            const { result } = renderHook(() => useRoles(false, 30), { wrapper: makeWrapper(store) });
            expect(result.current.isStale).toBe(true);
        });
    });

    // ── auto-fetch behavior ───────────────────────────────────────────────────

    describe('auto-fetch behavior', () => {
        it('dispatches fetchRoles when autoFetch=true and roles is empty', async () => {
            mockGetRoles.mockResolvedValue({ data: sampleRoles } as any);
            const store = makeStore();
            renderHook(() => useRoles(true), { wrapper: makeWrapper(store) });
            // Let the effect settle
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });
            expect(mockGetRoles).toHaveBeenCalled();
        });

        it('does NOT dispatch fetchRoles when autoFetch=false', async () => {
            const store = makeStore();
            renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });
            expect(mockGetRoles).not.toHaveBeenCalled();
        });

        it('does NOT refetch when roles are loaded and data is fresh', async () => {
            const recentFetch = new Date().toISOString();
            const store = makeStore({ roles: sampleRoles, lastFetch: recentFetch });
            renderHook(() => useRoles(true, 30), { wrapper: makeWrapper(store) });
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });
            expect(mockGetRoles).not.toHaveBeenCalled();
        });
    });

    // ── refetch function ──────────────────────────────────────────────────────

    describe('refetch', () => {
        it('dispatches fetchRoles when called', async () => {
            mockGetRoles.mockResolvedValue({ data: [] } as any);
            const store = makeStore({ roles: sampleRoles, lastFetch: new Date().toISOString() });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });

            act(() => {
                result.current.refetch();
            });

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });
            expect(mockGetRoles).toHaveBeenCalled();
        });
    });

    // ── getRoleById helper ────────────────────────────────────────────────────

    describe('getRoleById', () => {
        it('finds a role by _id', () => {
            const store = makeStore({ roles: sampleRoles });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            const role = result.current.getRoleById('role-1');
            expect(role?.role_id).toBe('annotator');
        });

        it('returns undefined when id does not match', () => {
            const store = makeStore({ roles: sampleRoles });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.getRoleById('non-existent')).toBeUndefined();
        });
    });

    // ── getRoleByRoleId helper ────────────────────────────────────────────────

    describe('getRoleByRoleId', () => {
        it('finds a role by role_id', () => {
            const store = makeStore({ roles: sampleRoles });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            const role = result.current.getRoleByRoleId('reviewer');
            expect(role?._id).toBe('role-2');
        });

        it('returns undefined when role_id does not match', () => {
            const store = makeStore({ roles: sampleRoles });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.getRoleByRoleId('super_admin')).toBeUndefined();
        });
    });

    // ── hasPermission helper ──────────────────────────────────────────────────

    describe('hasPermission', () => {
        it('returns true when the role has the permission', () => {
            const store = makeStore({ roles: sampleRoles });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.hasPermission('annotator', 'perm-view')).toBe(true);
        });

        it('returns false when the role does not have the permission', () => {
            const store = makeStore({ roles: sampleRoles });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.hasPermission('annotator', 'perm-admin')).toBe(false);
        });

        it('returns false when the role does not exist', () => {
            const store = makeStore({ roles: sampleRoles });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.hasPermission('ghost_role', 'perm-view')).toBe(false);
        });
    });

    // ── getRolePermissions helper ─────────────────────────────────────────────

    describe('getRolePermissions', () => {
        it('returns all permissions for the role', () => {
            const store = makeStore({ roles: sampleRoles });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            const perms = result.current.getRolePermissions('annotator');
            expect(perms).toHaveLength(2);
            expect(perms.map(p => p.permission_id)).toContain('perm-view');
            expect(perms.map(p => p.permission_id)).toContain('perm-edit');
        });

        it('returns empty array for unknown role', () => {
            const store = makeStore({ roles: sampleRoles });
            const { result } = renderHook(() => useRoles(false), { wrapper: makeWrapper(store) });
            expect(result.current.getRolePermissions('ghost')).toEqual([]);
        });
    });
});
