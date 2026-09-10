import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import workspaceReducer, {
    createWorkspace,
    fetchWorkspaces,
    fetchNavWorkspaces,
    fetchMoreNavWorkspaces,
    fetchMoreWorkspaces,
    fetchWorkspaceById,
    updateWorkspace,
    deleteWorkspace,
    fetchWorkspaceMembers,
    addUsersToWorkspace,
    removeUsersFromWorkspace,
    fetchUserWorkspaceProjects,
    clearError,
    clearCurrentWorkspace,
    setCurrentWorkspace,
    resetWorkspaceState,
    clearUserWorkspaceProjects,
    selectWorkspaces,
    selectCurrentWorkspace,
    selectWorkspaceLoading,
    selectWorkspaceError,
    selectCreateLoading,
    selectUpdateLoading,
    selectDeleteLoading,
    selectWorkspaceMemberActionLoading,
    selectWorkspaceMemberActionError,
    selectWorkspaceMembersLoading,
    selectWorkspaceMembersError,
    selectWorkspaceMembers,
    selectWorkspaceHasMore,
    selectWorkspaceTotalCount,
    selectNavWorkspaces,
    selectNavWorkspaceLoading,
    selectNavWorkspaceHasMore,
    selectUserWorkspaceProjects,
    selectLoadMoreLoading,
    selectNavLoadMoreLoading,
} from '../workspaceSlice';
import type { WorkspaceState, Workspace } from '../workspaceSlice';

// ── Module mock ───────────────────────────────────────────────────────────────

vi.mock('../../../services/api/workspaceApi', () => ({
    default: {
        createWorkspace: vi.fn(),
        getWorkspaces: vi.fn(),
        getWorkspaceById: vi.fn(),
        updateWorkspace: vi.fn(),
        deleteWorkspace: vi.fn(),
        getWorkspaceMembers: vi.fn(),
        addUsersToWorkspace: vi.fn(),
        removeUsersFromWorkspace: vi.fn(),
        getUserWorkspacesProjects: vi.fn(),
    },
}));

import workspaceApi from '../../../services/api/workspaceApi';
const mockCreateWorkspace = vi.mocked(workspaceApi.createWorkspace);
const mockGetWorkspaces = vi.mocked(workspaceApi.getWorkspaces);
const mockGetWorkspaceById = vi.mocked(workspaceApi.getWorkspaceById);
const mockUpdateWorkspace = vi.mocked(workspaceApi.updateWorkspace);
const mockDeleteWorkspace = vi.mocked(workspaceApi.deleteWorkspace);
const mockGetWorkspaceMembers = vi.mocked(workspaceApi.getWorkspaceMembers);
const mockAddUsers = vi.mocked(workspaceApi.addUsersToWorkspace);
const mockRemoveUsers = vi.mocked(workspaceApi.removeUsersFromWorkspace);
const mockGetUserWorkspaceProjects = vi.mocked(workspaceApi.getUserWorkspacesProjects);

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_STATE: WorkspaceState = {
    workspaces: [],
    currentWorkspace: null,
    loading: false,
    error: null,
    createLoading: false,
    updateLoading: false,
    deleteLoading: false,
    memberActionLoading: false,
    memberActionError: null,
    membersLoading: false,
    membersError: null,
    workspaceMembers: [],
    membersLimit: 10,
    membersOffset: 0,
    membersTotal: 0,
    membersHasMore: true,
    hasMore: true,
    currentOffset: 0,
    currentLimit: 10,
    totalCount: 0,
    loadMoreLoading: false,
    navWorkspaces: [],
    navHasMore: true,
    navCurrentOffset: 0,
    navCurrentLimit: 10,
    navLoading: false,
    navLoadMoreLoading: false,
    userWorkspaceProjects: [],
    userWorkspaceProjectsLoading: false,
    userWorkspaceProjectsError: null,
};

function makeStore(preloaded?: Partial<WorkspaceState>) {
    return configureStore({
        reducer: { workspace: workspaceReducer },
        preloadedState: preloaded
            ? { workspace: { ...DEFAULT_STATE, ...preloaded } }
            : undefined,
    });
}

type TestStore = ReturnType<typeof makeStore>;
const getState = (store: TestStore) => store.getState() as { workspace: WorkspaceState };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ws1: Workspace = { _id: 'ws-1', name: 'Workspace 1', workspace_type: 'public', visibility: 'public' } as Workspace;
const ws2: Workspace = { _id: 'ws-2', name: 'Workspace 2', workspace_type: 'private', visibility: 'private' } as Workspace;

const paginatedResponse = (workspaces: Workspace[], total = 20) => ({
    data: workspaces,
    total,
    limit: 10,
    offset: 0,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('workspaceSlice', () => {
    beforeEach(() => vi.clearAllMocks());

    // ── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('starts with empty workspaces array', () => {
            const store = makeStore();
            expect(selectWorkspaces(getState(store))).toEqual([]);
        });

        it('starts with currentWorkspace null', () => {
            const store = makeStore();
            expect(selectCurrentWorkspace(getState(store))).toBeNull();
        });

        it('starts with loading false', () => {
            const store = makeStore();
            expect(selectWorkspaceLoading(getState(store))).toBe(false);
        });

        it('starts with error null', () => {
            const store = makeStore();
            expect(selectWorkspaceError(getState(store))).toBeNull();
        });

        it('starts with navWorkspaces empty', () => {
            const store = makeStore();
            expect(selectNavWorkspaces(getState(store))).toEqual([]);
        });

        it('starts with hasMore true (default allows first load)', () => {
            const store = makeStore();
            expect(selectWorkspaceHasMore(getState(store))).toBe(true);
        });
    });

    // ── Sync actions ─────────────────────────────────────────────────────────

    describe('clearError', () => {
        it('resets error and memberActionError to null', () => {
            const store = makeStore({ error: 'fetch error', memberActionError: 'member error' });
            store.dispatch(clearError());
            expect(selectWorkspaceError(getState(store))).toBeNull();
            expect(selectWorkspaceMemberActionError(getState(store))).toBeNull();
        });
    });

    describe('clearCurrentWorkspace', () => {
        it('sets currentWorkspace to null', () => {
            const store = makeStore({ currentWorkspace: ws1 });
            store.dispatch(clearCurrentWorkspace());
            expect(selectCurrentWorkspace(getState(store))).toBeNull();
        });
    });

    describe('setCurrentWorkspace', () => {
        it('sets the currentWorkspace to the provided workspace', () => {
            const store = makeStore();
            store.dispatch(setCurrentWorkspace(ws1));
            expect(selectCurrentWorkspace(getState(store))).toEqual(ws1);
        });

        it('replaces the previous currentWorkspace', () => {
            const store = makeStore({ currentWorkspace: ws1 });
            store.dispatch(setCurrentWorkspace(ws2));
            expect(selectCurrentWorkspace(getState(store))?._id).toBe('ws-2');
        });
    });

    describe('resetWorkspaceState', () => {
        it('returns state to initial values', () => {
            const store = makeStore({
                workspaces: [ws1, ws2],
                currentWorkspace: ws1,
                error: 'some error',
                totalCount: 42,
            });
            store.dispatch(resetWorkspaceState());
            const state = getState(store);
            expect(selectWorkspaces(state)).toEqual([]);
            expect(selectCurrentWorkspace(state)).toBeNull();
            expect(selectWorkspaceError(state)).toBeNull();
            expect(selectWorkspaceTotalCount(state)).toBe(0);
        });
    });

    describe('clearUserWorkspaceProjects', () => {
        it('clears userWorkspaceProjects and userWorkspaceProjectsError', () => {
            const store = makeStore({
                userWorkspaceProjects: [{ _id: 'p1' }] as any,
                userWorkspaceProjectsError: 'some error',
            });
            store.dispatch(clearUserWorkspaceProjects());
            expect(selectUserWorkspaceProjects(getState(store))).toEqual([]);
        });
    });

    // ── createWorkspace thunk ────────────────────────────────────────────────

    describe('createWorkspace', () => {
        const payload = { name: 'New WS', org_id: 'org-1' } as any;

        describe('pending', () => {
            it('sets createLoading to true and clears error', async () => {
                let resolve!: (v: unknown) => void;
                mockCreateWorkspace.mockReturnValue(new Promise(res => (resolve = res)));
                const store = makeStore({ error: 'old' });
                const p = store.dispatch(createWorkspace(payload));
                expect(selectCreateLoading(getState(store))).toBe(true);
                expect(selectWorkspaceError(getState(store))).toBeNull();
                resolve({ data: ws1 });
                await p;
            });
        });

        describe('fulfilled', () => {
            it('appends the new workspace and sets createLoading false', async () => {
                mockCreateWorkspace.mockResolvedValue({ data: ws1 } as any);
                const store = makeStore();
                await store.dispatch(createWorkspace(payload));
                expect(selectWorkspaces(getState(store))).toHaveLength(1);
                expect(selectCreateLoading(getState(store))).toBe(false);
            });

            it('handles direct response (no data wrapper)', async () => {
                mockCreateWorkspace.mockResolvedValue(ws1 as any);
                const store = makeStore();
                await store.dispatch(createWorkspace(payload));
                expect(selectWorkspaces(getState(store))[0]._id).toBe('ws-1');
            });
        });

        describe('rejected', () => {
            it('sets error and clears createLoading', async () => {
                mockCreateWorkspace.mockRejectedValue(new Error('Unauthorized'));
                const store = makeStore();
                await store.dispatch(createWorkspace(payload));
                expect(selectWorkspaceError(getState(store))).toBe('Unauthorized');
                expect(selectCreateLoading(getState(store))).toBe(false);
            });
        });
    });

    // ── fetchWorkspaces thunk ────────────────────────────────────────────────

    describe('fetchWorkspaces', () => {
        describe('pending', () => {
            it('sets loading to true', async () => {
                let resolve!: (v: unknown) => void;
                mockGetWorkspaces.mockReturnValue(new Promise(res => (resolve = res)));
                const store = makeStore();
                const p = store.dispatch(fetchWorkspaces({ org_id: 'org-1' }));
                expect(selectWorkspaceLoading(getState(store))).toBe(true);
                resolve(paginatedResponse([ws1]));
                await p;
            });
        });

        describe('fulfilled', () => {
            it('replaces workspaces array', async () => {
                mockGetWorkspaces.mockResolvedValue(paginatedResponse([ws1, ws2]) as any);
                const store = makeStore({ workspaces: [{ _id: 'old' } as any] });
                await store.dispatch(fetchWorkspaces({ org_id: 'org-1' }));
                expect(selectWorkspaces(getState(store))).toHaveLength(2);
                expect(selectWorkspaceLoading(getState(store))).toBe(false);
            });

            it('sets totalCount from response.total', async () => {
                mockGetWorkspaces.mockResolvedValue(paginatedResponse([ws1], 50) as any);
                const store = makeStore();
                await store.dispatch(fetchWorkspaces({ org_id: 'org-1' }));
                expect(selectWorkspaceTotalCount(getState(store))).toBe(50);
            });

            it('sets hasMore=false when all items are loaded', async () => {
                mockGetWorkspaces.mockResolvedValue({ data: [ws1], total: 1, limit: 10, offset: 0 } as any);
                const store = makeStore();
                await store.dispatch(fetchWorkspaces({ org_id: 'org-1' }));
                expect(selectWorkspaceHasMore(getState(store))).toBe(false);
            });

            it('sets hasMore=true when more items remain', async () => {
                mockGetWorkspaces.mockResolvedValue({ data: [ws1, ws2], total: 20, limit: 2, offset: 0 } as any);
                const store = makeStore();
                await store.dispatch(fetchWorkspaces({ org_id: 'org-1' }));
                expect(selectWorkspaceHasMore(getState(store))).toBe(true);
            });

            it('handles direct array response (no data wrapper)', async () => {
                mockGetWorkspaces.mockResolvedValue([ws1] as any);
                const store = makeStore();
                await store.dispatch(fetchWorkspaces({ org_id: 'org-1' }));
                expect(selectWorkspaces(getState(store))).toHaveLength(1);
            });
        });

        describe('rejected', () => {
            it('sets error and clears loading', async () => {
                mockGetWorkspaces.mockRejectedValue({ message: 'Server error' });
                const store = makeStore();
                await store.dispatch(fetchWorkspaces({ org_id: 'org-1' }));
                expect(selectWorkspaceError(getState(store))).toBe('Server error');
                expect(selectWorkspaceLoading(getState(store))).toBe(false);
            });
        });
    });

    // ── fetchMoreWorkspaces thunk ────────────────────────────────────────────

    describe('fetchMoreWorkspaces', () => {
        it('sets loadMoreLoading while pending', async () => {
            let resolve!: (v: unknown) => void;
            mockGetWorkspaces.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(fetchMoreWorkspaces({ org_id: 'org-1', offset: 10 }));
            expect(selectLoadMoreLoading(getState(store))).toBe(true);
            resolve(paginatedResponse([ws2]));
            await p;
        });

        it('APPENDS to existing workspaces on fulfilled (does not replace)', async () => {
            mockGetWorkspaces.mockResolvedValue(paginatedResponse([ws2]) as any);
            const store = makeStore({ workspaces: [ws1] });
            await store.dispatch(fetchMoreWorkspaces({ org_id: 'org-1', offset: 10 }));
            const workspaces = selectWorkspaces(getState(store));
            expect(workspaces).toHaveLength(2);
            expect(workspaces[0]._id).toBe('ws-1'); // original
            expect(workspaces[1]._id).toBe('ws-2'); // appended
        });

        it('sets loadMoreLoading false after rejection', async () => {
            mockGetWorkspaces.mockRejectedValue(new Error('fail'));
            const store = makeStore();
            await store.dispatch(fetchMoreWorkspaces({ org_id: 'org-1', offset: 10 }));
            expect(selectLoadMoreLoading(getState(store))).toBe(false);
        });
    });

    // ── fetchNavWorkspaces thunk ─────────────────────────────────────────────

    describe('fetchNavWorkspaces', () => {
        it('sets navLoading while pending', async () => {
            let resolve!: (v: unknown) => void;
            mockGetWorkspaces.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(fetchNavWorkspaces({ org_id: 'org-1' }));
            expect(selectNavWorkspaceLoading(getState(store))).toBe(true);
            resolve(paginatedResponse([ws1]));
            await p;
        });

        it('populates navWorkspaces independently from dashboard workspaces', async () => {
            mockGetWorkspaces.mockResolvedValue(paginatedResponse([ws1]) as any);
            const store = makeStore({ workspaces: [ws2] });
            await store.dispatch(fetchNavWorkspaces({ org_id: 'org-1' }));
            expect(selectNavWorkspaces(getState(store))).toHaveLength(1);
            // Dashboard workspaces are unchanged
            expect(selectWorkspaces(getState(store))).toHaveLength(1);
            expect(selectWorkspaces(getState(store))[0]._id).toBe('ws-2');
        });

        it('sets navHasMore correctly', async () => {
            mockGetWorkspaces.mockResolvedValue({ data: [ws1], total: 1, limit: 10, offset: 0 } as any);
            const store = makeStore();
            await store.dispatch(fetchNavWorkspaces({ org_id: 'org-1' }));
            expect(selectNavWorkspaceHasMore(getState(store))).toBe(false);
        });

        it('sets navLoading false on rejection (silently)', async () => {
            mockGetWorkspaces.mockRejectedValue(new Error('fail'));
            const store = makeStore();
            await store.dispatch(fetchNavWorkspaces({ org_id: 'org-1' }));
            expect(selectNavWorkspaceLoading(getState(store))).toBe(false);
        });
    });

    // ── fetchMoreNavWorkspaces thunk ─────────────────────────────────────────

    describe('fetchMoreNavWorkspaces', () => {
        it('APPENDS to existing navWorkspaces (does not replace)', async () => {
            mockGetWorkspaces.mockResolvedValue(paginatedResponse([ws2]) as any);
            const store = makeStore({ navWorkspaces: [ws1] });
            await store.dispatch(fetchMoreNavWorkspaces({ org_id: 'org-1', offset: 10 }));
            const nav = selectNavWorkspaces(getState(store));
            expect(nav).toHaveLength(2);
            expect(nav[0]._id).toBe('ws-1');
            expect(nav[1]._id).toBe('ws-2');
        });

        it('sets navLoadMoreLoading while pending', async () => {
            let resolve!: (v: unknown) => void;
            mockGetWorkspaces.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(fetchMoreNavWorkspaces({ org_id: 'org-1', offset: 10 }));
            expect(selectNavLoadMoreLoading(getState(store))).toBe(true);
            resolve(paginatedResponse([ws2]));
            await p;
        });
    });

    // ── fetchWorkspaceById thunk ─────────────────────────────────────────────

    describe('fetchWorkspaceById', () => {
        it('sets currentWorkspace on success', async () => {
            mockGetWorkspaceById.mockResolvedValue({ data: ws1 } as any);
            const store = makeStore();
            await store.dispatch(fetchWorkspaceById('ws-1'));
            expect(selectCurrentWorkspace(getState(store))?._id).toBe('ws-1');
            expect(selectWorkspaceLoading(getState(store))).toBe(false);
        });

        it('handles direct response (no data wrapper)', async () => {
            mockGetWorkspaceById.mockResolvedValue(ws1 as any);
            const store = makeStore();
            await store.dispatch(fetchWorkspaceById('ws-1'));
            expect(selectCurrentWorkspace(getState(store))?._id).toBe('ws-1');
        });

        it('sets error on rejection', async () => {
            mockGetWorkspaceById.mockRejectedValue({ response: { data: { message: 'Not found' } } });
            const store = makeStore();
            await store.dispatch(fetchWorkspaceById('ws-1'));
            expect(selectWorkspaceError(getState(store))).toBe('Not found');
        });
    });

    // ── updateWorkspace thunk ────────────────────────────────────────────────

    describe('updateWorkspace', () => {
        it('sets updateLoading while pending', async () => {
            let resolve!: (v: unknown) => void;
            mockUpdateWorkspace.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(updateWorkspace({ id: 'ws-1', data: { name: 'Updated' } as any }));
            expect(selectUpdateLoading(getState(store))).toBe(true);
            resolve({ data: ws1 });
            await p;
        });

        it('updates the matching workspace in the list', async () => {
            const updatedWs = { ...ws1, name: 'Updated Workspace' };
            mockUpdateWorkspace.mockResolvedValue({ data: updatedWs } as any);
            const store = makeStore({ workspaces: [ws1] });
            await store.dispatch(updateWorkspace({ id: 'ws-1', data: { name: 'Updated Workspace' } as any }));
            expect(selectWorkspaces(getState(store))[0].name).toBe('Updated Workspace');
            expect(selectUpdateLoading(getState(store))).toBe(false);
        });

        it('updates currentWorkspace when it matches the updated id', async () => {
            const updatedWs = { ...ws1, name: 'Updated Workspace' };
            mockUpdateWorkspace.mockResolvedValue({ data: updatedWs } as any);
            const store = makeStore({ currentWorkspace: ws1 });
            await store.dispatch(updateWorkspace({ id: 'ws-1', data: { name: 'Updated Workspace' } as any }));
            expect(selectCurrentWorkspace(getState(store))?.name).toBe('Updated Workspace');
        });

        it('sets error on rejection', async () => {
            mockUpdateWorkspace.mockRejectedValue(new Error('Update failed'));
            const store = makeStore();
            await store.dispatch(updateWorkspace({ id: 'ws-1', data: {} as any }));
            expect(selectWorkspaceError(getState(store))).toBe('Update failed');
            expect(selectUpdateLoading(getState(store))).toBe(false);
        });
    });

    // ── deleteWorkspace thunk ────────────────────────────────────────────────

    describe('deleteWorkspace', () => {
        it('sets deleteLoading while pending', async () => {
            let resolve!: (v: unknown) => void;
            mockDeleteWorkspace.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(deleteWorkspace('ws-1'));
            expect(selectDeleteLoading(getState(store))).toBe(true);
            resolve(undefined);
            await p;
        });

        it('removes the workspace from the list', async () => {
            mockDeleteWorkspace.mockResolvedValue(undefined as any);
            const store = makeStore({ workspaces: [ws1, ws2] });
            await store.dispatch(deleteWorkspace('ws-1'));
            expect(selectWorkspaces(getState(store))).toHaveLength(1);
            expect(selectWorkspaces(getState(store))[0]._id).toBe('ws-2');
        });

        it('clears currentWorkspace when the deleted workspace matches', async () => {
            mockDeleteWorkspace.mockResolvedValue(undefined as any);
            const store = makeStore({ workspaces: [ws1], currentWorkspace: ws1 });
            await store.dispatch(deleteWorkspace('ws-1'));
            expect(selectCurrentWorkspace(getState(store))).toBeNull();
        });

        it('does NOT clear currentWorkspace when IDs differ', async () => {
            mockDeleteWorkspace.mockResolvedValue(undefined as any);
            const store = makeStore({ workspaces: [ws1, ws2], currentWorkspace: ws2 });
            await store.dispatch(deleteWorkspace('ws-1'));
            expect(selectCurrentWorkspace(getState(store))?._id).toBe('ws-2');
        });

        it('sets error on rejection', async () => {
            mockDeleteWorkspace.mockRejectedValue(new Error('Delete failed'));
            const store = makeStore();
            await store.dispatch(deleteWorkspace('ws-1'));
            expect(selectWorkspaceError(getState(store))).toBe('Delete failed');
            expect(selectDeleteLoading(getState(store))).toBe(false);
        });
    });

    // ── fetchWorkspaceMembers thunk ──────────────────────────────────────────

    describe('fetchWorkspaceMembers', () => {
        const rawMember = {
            _id: 'm1',
            workspace_id: 'ws-1',
            user_id: 'u1',
            role: 'annotator',
            status: 'active',
            user: { _id: 'u1', name: 'Alice', email: 'alice@example.com', username: 'alice', role: 'annotator' },
        };

        it('sets membersLoading while pending', async () => {
            let resolve!: (v: unknown) => void;
            mockGetWorkspaceMembers.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(fetchWorkspaceMembers({ workspaceId: 'ws-1' }));
            expect(selectWorkspaceMembersLoading(getState(store))).toBe(true);
            resolve({ data: { members: [rawMember] }, total: 1 });
            await p;
        });

        it('populates workspaceMembers on success', async () => {
            mockGetWorkspaceMembers.mockResolvedValue({ data: { members: [rawMember] }, total: 1, limit: 10, offset: 0 } as any);
            const store = makeStore();
            await store.dispatch(fetchWorkspaceMembers({ workspaceId: 'ws-1' }));
            expect(selectWorkspaceMembers(getState(store))).toHaveLength(1);
            expect(selectWorkspaceMembersLoading(getState(store))).toBe(false);
        });

        it('normalizes member user_id from member.user._id when user_id is missing', async () => {
            const memberWithoutUserId = { ...rawMember, user_id: undefined };
            mockGetWorkspaceMembers.mockResolvedValue({ data: { members: [memberWithoutUserId] }, total: 1 } as any);
            const store = makeStore();
            await store.dispatch(fetchWorkspaceMembers({ workspaceId: 'ws-1' }));
            const member = selectWorkspaceMembers(getState(store))[0];
            expect(member.user_id).toBe('u1'); // falls back to user._id
        });

        it('handles flat array response (raw.members)', async () => {
            mockGetWorkspaceMembers.mockResolvedValue({ members: [rawMember], total: 1 } as any);
            const store = makeStore();
            await store.dispatch(fetchWorkspaceMembers({ workspaceId: 'ws-1' }));
            expect(selectWorkspaceMembers(getState(store))).toHaveLength(1);
        });

        it('sets membersError and clears members on rejection', async () => {
            mockGetWorkspaceMembers.mockRejectedValue(new Error('Forbidden'));
            const store = makeStore({ workspaceMembers: [rawMember as any] });
            await store.dispatch(fetchWorkspaceMembers({ workspaceId: 'ws-1' }));
            expect(selectWorkspaceMembersError(getState(store))).toBe('Forbidden');
            expect(selectWorkspaceMembers(getState(store))).toEqual([]);
        });
    });

    // ── addUsersToWorkspace thunk ────────────────────────────────────────────

    describe('addUsersToWorkspace', () => {
        const addArgs = { workspaceId: 'ws-1', orgId: 'org-1', users: [{ user_id: 'u1', role: 'annotator' }] };

        it('sets memberActionLoading while pending', async () => {
            let resolve!: (v: unknown) => void;
            mockAddUsers.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(addUsersToWorkspace(addArgs));
            expect(selectWorkspaceMemberActionLoading(getState(store))).toBe(true);
            resolve({});
            await p;
        });

        it('clears memberActionLoading and error on success', async () => {
            mockAddUsers.mockResolvedValue({} as any);
            const store = makeStore({ memberActionError: 'old error' });
            await store.dispatch(addUsersToWorkspace(addArgs));
            expect(selectWorkspaceMemberActionLoading(getState(store))).toBe(false);
            expect(selectWorkspaceMemberActionError(getState(store))).toBeNull();
        });

        it('updates currentWorkspace.members when response has updatedMembers', async () => {
            const updatedMembers = [{ _id: 'm1', user_id: 'u1', role: 'annotator' }];
            mockAddUsers.mockResolvedValue({ members: updatedMembers } as any);
            const store = makeStore({ currentWorkspace: ws1 });
            await store.dispatch(addUsersToWorkspace(addArgs));
            expect(selectCurrentWorkspace(getState(store))?.members).toEqual(updatedMembers);
        });

        it('sets memberActionError on rejection', async () => {
            mockAddUsers.mockRejectedValue({ response: { data: { message: 'User already a member' } } });
            const store = makeStore();
            await store.dispatch(addUsersToWorkspace(addArgs));
            expect(selectWorkspaceMemberActionError(getState(store))).toBe('User already a member');
            expect(selectWorkspaceMemberActionLoading(getState(store))).toBe(false);
        });
    });

    // ── removeUsersFromWorkspace thunk ───────────────────────────────────────

    describe('removeUsersFromWorkspace', () => {
        const removeArgs = { workspaceId: 'ws-1', orgId: 'org-1', workspaceUsers: [{ user_id: 'u1', role: 'annotator' }] };
        const existingMember = {
            _id: 'm1',
            user_id: 'u1',
            role: 'annotator',
            user: { _id: 'u1', name: 'Alice' },
        };

        it('filters removed member from currentWorkspace.members when no updatedMembers in response', async () => {
            mockRemoveUsers.mockResolvedValue({} as any);
            const store = makeStore({
                currentWorkspace: { ...ws1, members: [existingMember as any] },
            });
            await store.dispatch(removeUsersFromWorkspace(removeArgs));
            expect(selectCurrentWorkspace(getState(store))?.members).toHaveLength(0);
        });

        it('uses updatedMembers from response when provided (data.members)', async () => {
            const updatedMembers = [{ _id: 'm2', user_id: 'u2', role: 'reviewer' }];
            mockRemoveUsers.mockResolvedValue({ data: { members: updatedMembers } } as any);
            const store = makeStore({ currentWorkspace: { ...ws1, members: [existingMember as any] } });
            await store.dispatch(removeUsersFromWorkspace(removeArgs));
            expect(selectCurrentWorkspace(getState(store))?.members).toEqual(updatedMembers);
        });

        it('sets memberActionError on rejection', async () => {
            mockRemoveUsers.mockRejectedValue(new Error('Cannot remove last member'));
            const store = makeStore();
            await store.dispatch(removeUsersFromWorkspace(removeArgs));
            expect(selectWorkspaceMemberActionError(getState(store))).toBe('Cannot remove last member');
        });
    });

    // ── fetchUserWorkspaceProjects thunk ─────────────────────────────────────

    describe('fetchUserWorkspaceProjects', () => {
        it('clears projects and sets loading while pending', async () => {
            let resolve!: (v: unknown) => void;
            mockGetUserWorkspaceProjects.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore({ userWorkspaceProjects: [{ _id: 'p1' }] as any });
            const p = store.dispatch(fetchUserWorkspaceProjects({ workspaceId: 'ws-1', userId: 'u1' }));
            expect(selectUserWorkspaceProjects(getState(store))).toEqual([]);
            resolve({ data: { data: [] } });
            await p;
        });

        it('populates userWorkspaceProjects on success', async () => {
            const projects = [{ _id: 'p1', name: 'Project 1' }, { _id: 'p2', name: 'Project 2' }];
            mockGetUserWorkspaceProjects.mockResolvedValue({ data: { data: projects } } as any);
            const store = makeStore();
            await store.dispatch(fetchUserWorkspaceProjects({ workspaceId: 'ws-1', userId: 'u1' }));
            expect(selectUserWorkspaceProjects(getState(store))).toHaveLength(2);
        });

        it('returns empty array when response.data.data is not an array', async () => {
            mockGetUserWorkspaceProjects.mockResolvedValue({ data: { data: null } } as any);
            const store = makeStore();
            await store.dispatch(fetchUserWorkspaceProjects({ workspaceId: 'ws-1', userId: 'u1' }));
            expect(selectUserWorkspaceProjects(getState(store))).toEqual([]);
        });

        it('sets userWorkspaceProjectsError on rejection', async () => {
            mockGetUserWorkspaceProjects.mockRejectedValue(new Error('Not authorized'));
            const store = makeStore();
            await store.dispatch(fetchUserWorkspaceProjects({ workspaceId: 'ws-1', userId: 'u1' }));
            const state = getState(store).workspace;
            expect(state.userWorkspaceProjectsError).toBe('Not authorized');
            expect(state.userWorkspaceProjectsLoading).toBe(false);
        });
    });
});
