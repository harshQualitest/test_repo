import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import workspaceApi, { type WorkspaceMemberRemovalPayload, type WorkspaceMembersPayload } from '../../services/api/workspaceApi';
import type { CreateWorkspace, WorkspaceAPI, WorkspaceMember, WorkspaceProject, UpdateWorkspace } from '../../interfaces/api';

// Enhanced Workspace interface for the full workspace object
export interface Workspace extends WorkspaceAPI {
    createdAt?: string;
    updatedAt?: string | null;
    createdBy?: string;
    memberCount?: number;
    members?: WorkspaceMember[];
    projects?: WorkspaceProject[];
    status?: 'active' | 'inactive' | 'archived';
}

// Workspace slice state interface
export interface WorkspaceState {
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    loading: boolean;
    error: string | null;
    createLoading: boolean;
    updateLoading: boolean;
    deleteLoading: boolean;
    memberActionLoading: boolean;
    memberActionError: string | null;
    membersLoading: boolean;
    membersError: string | null;
    workspaceMembers: WorkspaceMember[];
    membersLimit: number;
    membersOffset: number;
    membersTotal: number;
    membersHasMore: boolean;
    // Dashboard pagination fields
    hasMore: boolean;
    currentOffset: number;
    currentLimit: number;
    totalCount: number;
    loadMoreLoading: boolean;
    // Sidenav nav-specific fields (independent from dashboard state)
    navWorkspaces: Workspace[];
    navHasMore: boolean;
    navCurrentOffset: number;
    navCurrentLimit: number;
    navLoading: boolean;
    navLoadMoreLoading: boolean;
    userWorkspaceProjects: WorkspaceProject[];
    userWorkspaceProjectsLoading: boolean;
    userWorkspaceProjectsError: string | null;
}

/**
 * Extracts a human-readable error message from an unknown thrown value,
 * without using `any` — checks `Error.message`, then an axios-style
 * `error.response.data.message`, then `error.message`, falling back to a
 * generic string if nothing matches.
 * @param error - the caught value (typed `unknown`, narrowed via guards).
 * @returns a display-safe error message string.
 */
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
        const err = error as { response?: unknown; message?: unknown };
        if (typeof err.message === 'string') return err.message;
        if (typeof err.response === 'object' && err.response !== null) {
            const resp = err.response as { data?: unknown };
            if (typeof resp.data === 'object' && resp.data !== null) {
                const data = resp.data as { message?: unknown };
                if (typeof data.message === 'string') return data.message;
            }
        }
    }
    return 'Failed request';
};

// Initial state
const initialState: WorkspaceState = {
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
    // Pagination
    hasMore: true,
    currentOffset: 0,
    currentLimit: 10,
    totalCount: 0,
    loadMoreLoading: false,
    // Sidenav nav-specific state
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

// Async thunks
/**
 * Creates a new workspace.
 * @param workspaceData - the workspace creation payload (`CreateWorkspace`).
 * @returns the created `Workspace`.
 * @throws (via `rejectWithValue`) a normalized error message (see {@link getErrorMessage}).
 */
export const createWorkspace = createAsyncThunk(
    'workspace/create',
    async (workspaceData: CreateWorkspace, { rejectWithValue }) => {
        try {
            const response = await workspaceApi.createWorkspace(workspaceData);
            return response.data || response;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Fetches a paginated list of workspaces (used by the main Dashboard view;
 * replaces the current list — see {@link fetchMoreWorkspaces} for appending).
 * @param args.org_id - optional organization to scope workspaces to.
 * @param args.search - optional search term.
 * @param args.limit - page size (defaults to 10).
 * @param args.offset - page offset (defaults to 0).
 * @returns `{ data, hasMore, offset, limit, totalCount }` — normalized from
 * whatever shape the API returned (see business logic below).
 * @throws (via `rejectWithValue`) a normalized error message (see {@link getErrorMessage}).
 */
export const fetchWorkspaces = createAsyncThunk(
    'workspace/fetchAll',
    async ({ org_id, search, limit = 10, offset = 0 }: { org_id?: string; search?: string | null; limit?: number; offset?: number }, { rejectWithValue }) => {
        try {
            const response = await workspaceApi.getWorkspaces(org_id, search, limit, offset);
            const rawResponse = response || {};
            // The API sometimes returns a bare array and sometimes a
            // `{ data: [...] }` envelope — normalize to a plain array either way.
            const workspaces = Array.isArray(rawResponse.data)
                ? rawResponse.data
                : Array.isArray(rawResponse)
                ? rawResponse
                : [];

            const totalCount = typeof rawResponse.total === 'number'
                ? rawResponse.total
                : workspaces.length;

            const effectiveLimit = typeof rawResponse.limit === 'number' ? rawResponse.limit : limit;
            const effectiveOffset = typeof rawResponse.offset === 'number' ? rawResponse.offset : offset;

            // Why: if the API reports a total, hasMore is a precise
            // offset+count comparison; otherwise fall back to "the page came
            // back full" as a heuristic (a short page implies no more data).
            const hasMore = typeof rawResponse.total === 'number'
                ? effectiveOffset + workspaces.length < totalCount
                : workspaces.length >= effectiveLimit;

            return {
                data: workspaces,
                hasMore,
                offset: effectiveOffset,
                limit: effectiveLimit,
                totalCount,
            };
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Fetches the initial/refresh page of workspaces for the sidenav's own
 * workspace list — kept independent of the Dashboard's `fetchWorkspaces`
 * pagination state (see `navWorkspaces` vs. `workspaces` in state) so the
 * two views can paginate independently.
 * @param args.org_id - optional organization to scope workspaces to.
 * @param args.search - optional search term.
 * @param args.limit - page size (defaults to 10).
 * @param args.offset - page offset (defaults to 0).
 * @returns `{ data, hasMore, offset, limit }`, normalized the same way as {@link fetchWorkspaces}.
 * @throws (via `rejectWithValue`) a normalized error message (see {@link getErrorMessage}).
 */
// Sidenav-specific thunks — these manage navWorkspaces independently from Dashboard pagination
export const fetchNavWorkspaces = createAsyncThunk(
    'workspace/fetchNav',
    async ({ org_id, search, limit = 10, offset = 0 }: { org_id?: string; search?: string | null; limit?: number; offset?: number }, { rejectWithValue }) => {
        try {
            const response = await workspaceApi.getWorkspaces(org_id, search, limit, offset);
            const rawResponse = response || {};
            const workspaces = Array.isArray(rawResponse.data)
                ? rawResponse.data
                : Array.isArray(rawResponse)
                ? rawResponse
                : [];

            const totalCount = typeof rawResponse.total === 'number'
                ? rawResponse.total
                : workspaces.length;

            const effectiveLimit = typeof rawResponse.limit === 'number' ? rawResponse.limit : limit;
            const effectiveOffset = typeof rawResponse.offset === 'number' ? rawResponse.offset : offset;

            const hasMore = typeof rawResponse.total === 'number'
                ? effectiveOffset + workspaces.length < totalCount
                : workspaces.length >= effectiveLimit;

            return { data: workspaces, hasMore, offset: effectiveOffset, limit: effectiveLimit };
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Fetches the next page of sidenav workspaces to append to `navWorkspaces`
 * (as opposed to {@link fetchNavWorkspaces}, which replaces the list).
 * @param args.org_id - optional organization to scope workspaces to.
 * @param args.search - optional search term.
 * @param args.limit - page size.
 * @param args.offset - page offset to fetch (required — the caller tracks
 * where the next page starts).
 * @returns `{ data, hasMore, offset, limit }`, normalized the same way as {@link fetchWorkspaces}.
 * @throws (via `rejectWithValue`) a normalized error message (see {@link getErrorMessage}).
 */
export const fetchMoreNavWorkspaces = createAsyncThunk(
    'workspace/fetchMoreNav',
    async ({ org_id, search, limit = 10, offset }: { org_id?: string; search?: string | null; limit?: number; offset: number }, { rejectWithValue }) => {
        try {
            const response = await workspaceApi.getWorkspaces(org_id, search, limit, offset);
            const rawResponse = response || {};
            const workspaces = Array.isArray(rawResponse.data)
                ? rawResponse.data
                : Array.isArray(rawResponse)
                ? rawResponse
                : [];

            const effectiveLimit = typeof rawResponse.limit === 'number' ? rawResponse.limit : limit;
            const effectiveOffset = typeof rawResponse.offset === 'number' ? rawResponse.offset : offset;
            const totalCount = typeof rawResponse.total === 'number' ? rawResponse.total : workspaces.length;

            const hasMore = typeof rawResponse.total === 'number'
                ? effectiveOffset + workspaces.length < totalCount
                : workspaces.length >= effectiveLimit;

            return { data: workspaces, hasMore, offset: effectiveOffset, limit: effectiveLimit };
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Fetches the next page of Dashboard workspaces to append to `workspaces`
 * (as opposed to {@link fetchWorkspaces}, which replaces the list).
 * @param args.org_id - optional organization to scope workspaces to.
 * @param args.search - optional search term.
 * @param args.limit - page size.
 * @param args.offset - page offset to fetch (required).
 * @returns `{ data, hasMore, offset, limit, totalCount }`, normalized the
 * same way as {@link fetchWorkspaces}.
 * @throws (via `rejectWithValue`) a normalized error message (see {@link getErrorMessage}).
 */
export const fetchMoreWorkspaces = createAsyncThunk(
    'workspace/fetchMore',
    async ({ org_id, search, limit = 10, offset }: { org_id?: string; search?: string | null; limit?: number; offset: number }, { rejectWithValue }) => {
        try {
            const response = await workspaceApi.getWorkspaces(org_id, search, limit, offset);
            const rawResponse = response || {};
            const workspaces = Array.isArray(rawResponse.data)
                ? rawResponse.data
                : Array.isArray(rawResponse)
                ? rawResponse
                : [];

            const totalCount = typeof rawResponse.total === 'number'
                ? rawResponse.total
                : workspaces.length;

            const effectiveLimit = typeof rawResponse.limit === 'number' ? rawResponse.limit : limit;
            const effectiveOffset = typeof rawResponse.offset === 'number' ? rawResponse.offset : offset;

            const hasMore = typeof rawResponse.total === 'number'
                ? effectiveOffset + workspaces.length < totalCount
                : workspaces.length >= effectiveLimit;

            return {
                data: workspaces,
                hasMore,
                offset: effectiveOffset,
                limit: effectiveLimit,
                totalCount,
            };
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Fetches a single workspace by ID.
 * @param id - the workspace to fetch.
 * @returns the `Workspace`.
 * @throws (via `rejectWithValue`) a normalized error message (see {@link getErrorMessage}).
 */
export const fetchWorkspaceById = createAsyncThunk(
    'workspace/fetchById',
    async (id: string, { rejectWithValue }) => {
        try {
            const response = await workspaceApi.getWorkspaceById(id);
            return response.data || response;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Updates a workspace.
 * @param args.id - the workspace to update.
 * @param args.data - the update payload (`UpdateWorkspace`).
 * @returns the updated `Workspace`.
 * @throws (via `rejectWithValue`) a normalized error message (see {@link getErrorMessage}).
 */
export const updateWorkspace = createAsyncThunk(
    'workspace/update',
    async ({ id, data }: { id: string; data: UpdateWorkspace }, { rejectWithValue }) => {
        try {
            const response = await workspaceApi.updateWorkspace(id, data);
            return response.data || response;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Deletes a workspace.
 * @param id - the workspace to delete.
 * @returns the deleted workspace's ID (used to filter it out of state).
 * @throws (via `rejectWithValue`) a normalized error message (see {@link getErrorMessage}).
 */
export const deleteWorkspace = createAsyncThunk(
    'workspace/delete',
    async (id: string, { rejectWithValue }) => {
        try {
            await workspaceApi.deleteWorkspace(id);
            return id;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

interface AddWorkspaceMembersArgs {
    workspaceId: string;
    orgId: string;
    users: Array<{ user_id: string; role: string }>;
    templateId?: string;
}

interface RemoveWorkspaceMemberArgs {
    workspaceId: string;
    orgId: string;
    workspaceUsers: Array<{ user_id: string; role: string }>;
}

type WorkspaceMembersResponse = {
    data?: {
        members?: WorkspaceMember[];
        workspace?: Workspace;
    };
    members?: WorkspaceMember[];
    workspace?: Workspace;
};

/**
 * Fetches a paginated, filterable list of members for a workspace and
 * normalizes each member record into the app's `WorkspaceMember` shape.
 * @param args.workspaceId - the workspace to fetch members for.
 * @param args.search - optional search term (name/email/username).
 * @param args.filter - optional role filter.
 * @param args.limit - page size (defaults to 10).
 * @param args.offset - page offset (defaults to 0).
 * @returns `{ data, total, limit, offset, hasMore }` with `data` containing
 * normalized `WorkspaceMember` records (see business logic below).
 * @throws (via `rejectWithValue`) a normalized error message (see {@link getErrorMessage}).
 */
export const fetchWorkspaceMembers = createAsyncThunk(
    'workspace/fetchMembers',
    async ({ workspaceId, search, filter, limit = 10, offset = 0 }: { workspaceId: string; search?: string | null; filter?: 'org_admin' | 'workspace_manager' | 'project_manager' | 'reviewer' | 'annotator' | null; limit?: number; offset?: number }, { rejectWithValue }) => {
        try {
            const response = await workspaceApi.getWorkspaceMembers(workspaceId, {
                limit,
                offset,
                filter: filter ?? undefined,
                search: search ?? undefined,
            });

            const raw = response || {};

            // The API has been observed returning members under several
            // different envelopes (`data.members`, `data`, `members`, or a
            // bare array) — check each in turn rather than assuming one shape.
            const members = Array.isArray(raw.data?.members)
                ? raw.data.members
                : Array.isArray(raw.data)
                ? raw.data
                : Array.isArray(raw.members)
                ? raw.members
                : Array.isArray(raw)
                ? raw
                : [];

            const total = typeof raw.total === 'number' ? raw.total : (typeof raw.data?.total === 'number' ? raw.data.total : members.length);
            const effectiveLimit = typeof raw.limit === 'number' ? raw.limit : limit;
            const effectiveOffset = typeof raw.offset === 'number' ? raw.offset : offset;
            const hasMore = typeof total === 'number' ? effectiveOffset + members.length < total : members.length >= effectiveLimit;

            // Why: member records can come back either "flat" (user fields
            // inlined on the member) or nested under `member.user` depending
            // on the endpoint/version — build a consistent `user` sub-object
            // so consumers always read `member.user.name`/`.email`/etc.
            const normalizedMembers = (Array.isArray(members) ? members : []).map((member: any): WorkspaceMember => {
                const userId = member?.user_id || member?.user?._id || member?._id;
                const role = member?.role || member?.user?.role;
                const email = member?.email ?? member?.user?.email ?? null;
                const username = member?.username ?? member?.user?.username ?? null;
                const invitationStatus = member?.invitation_status ?? member?.status;

                const userPayload = {
                    _id: member?.user?._id ?? userId,
                    name:
                        member?.user?.name ??
                        username ??
                        email ??
                        member?.user_id ??
                        'Workspace Member',
                    email: member?.user?.email ?? (email ?? undefined),
                    username: member?.user?.username ?? (username ?? undefined),
                    role: member?.user?.role ?? role,
                };

                return {
                    _id: member?._id,
                    workspace_id: member?.workspace_id,
                    user_id: userId,
                    role,
                    status: member?.status ?? invitationStatus,
                    invitation_status: invitationStatus,
                    added_at: member?.added_at ?? member?.created_at,
                    email,
                    username,
                    user: userPayload,
                };
            });

            return {
                data: normalizedMembers,
                total,
                limit: effectiveLimit,
                offset: effectiveOffset,
                hasMore,
            };
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Adds one or more users to a workspace with assigned roles.
 * @param args.workspaceId - the workspace to add members to.
 * @param args.orgId - the parent organization (required by the API payload).
 * @param args.users - the users to add, each with a `user_id` and `role`.
 * @param args.templateId - optional email template ID to use for the
 * invitation/notification email sent to added users.
 * @returns the `WorkspaceMembersResponse` (updated members and/or workspace), if any.
 * @throws (via `rejectWithValue`) a normalized error message (see {@link getErrorMessage}).
 */
export const addUsersToWorkspace = createAsyncThunk<WorkspaceMembersResponse | undefined, AddWorkspaceMembersArgs>(
    'workspace/addUsersToWorkspace',
    async ({ workspaceId, orgId, users, templateId }, { rejectWithValue }) => {
        try {
            const payload: WorkspaceMembersPayload = {
                workspace_id: workspaceId,
                org_id: orgId,
                workspace_users: users,
                action: 'add',
                email_template_id: templateId,
            };
            const response = await workspaceApi.addUsersToWorkspace(payload);
            return response;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Removes one or more users from a workspace.
 * @param args.workspaceId - the workspace to remove members from.
 * @param args.orgId - the parent organization (required by the API payload).
 * @param args.workspaceUsers - the users to remove, each with a `user_id` and `role`.
 * @returns the `WorkspaceMembersResponse` (updated members and/or workspace), if any.
 * @throws (via `rejectWithValue`) a normalized error message (see {@link getErrorMessage}).
 */
export const removeUsersFromWorkspace = createAsyncThunk<WorkspaceMembersResponse | undefined, RemoveWorkspaceMemberArgs>(
    'workspace/removeUsersFromWorkspace',
    async ({ workspaceId, orgId, workspaceUsers }, { rejectWithValue }) => {
        try {
            const payload: WorkspaceMemberRemovalPayload = {
                workspace_id: workspaceId,
                org_id: orgId,
                workspace_users: workspaceUsers,
            };
            const response = await workspaceApi.removeUsersFromWorkspace(payload);
            return response;
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Fetches the projects a specific user is assigned to within a workspace —
 * used to show the "impact" (which projects would be affected) before
 * removing that user from the workspace.
 * @param args.workspaceId - the workspace to scope the query to.
 * @param args.userId - the user whose project assignments to fetch.
 * @returns an array of `WorkspaceProject`; defaults to `[]` if the expected
 * `data.data` array is missing from the response.
 * @throws (via `rejectWithValue`) a normalized error message (see {@link getErrorMessage}).
 */
export const fetchUserWorkspaceProjects = createAsyncThunk<WorkspaceProject[], { workspaceId: string; userId: string }>(
    'workspace/fetchUserWorkspaceProjects',
    async ({ workspaceId, userId }, { rejectWithValue }) => {
        try {
            const response = await workspaceApi.getUserWorkspacesProjects(workspaceId, userId);
            // API shape: { data: { offset, limit, total, data: [...] } }
            const items = response?.data?.data;
            return Array.isArray(items) ? (items as WorkspaceProject[]) : [];
        } catch (error: unknown) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Slice: workspace
 *
 * Purpose: Owns the workspace domain end-to-end — the Dashboard's workspace
 * list (with its own pagination), the Sidenav's independent workspace list
 * (with its own pagination), the selected workspace, workspace membership
 * (list/add/remove, with pagination), and per-user project assignments
 * within a workspace.
 *
 * State shape (`WorkspaceState`) — grouped by concern:
 * - `workspaces` / `currentWorkspace` / `loading` / `error`: the Dashboard's
 *   workspace list and selection.
 * - `createLoading`, `updateLoading`, `deleteLoading`: per-operation status.
 * - `memberActionLoading` / `memberActionError`: status for add/remove member operations.
 * - `membersLoading` / `membersError` / `workspaceMembers` /
 *   `membersLimit` / `membersOffset` / `membersTotal` / `membersHasMore`:
 *   the current workspace's member list and its own pagination cursor.
 * - `hasMore` / `currentOffset` / `currentLimit` / `totalCount` /
 *   `loadMoreLoading`: Dashboard workspace-list pagination cursor.
 * - `navWorkspaces` / `navHasMore` / `navCurrentOffset` / `navCurrentLimit` /
 *   `navLoading` / `navLoadMoreLoading`: the Sidenav's independent
 *   workspace list and pagination cursor (kept separate so the sidenav and
 *   dashboard don't stomp on each other's pagination state).
 * - `userWorkspaceProjects` / `userWorkspaceProjectsLoading` /
 *   `userWorkspaceProjectsError`: a specific user's project assignments
 *   within the current workspace (used for the remove-member impact dialog).
 *
 * Reducers: see JSDoc above each one below.
 *
 * Async thunks: `createWorkspace`, `fetchWorkspaces`, `fetchNavWorkspaces`,
 * `fetchMoreNavWorkspaces`, `fetchMoreWorkspaces`, `fetchWorkspaceById`,
 * `updateWorkspace`, `deleteWorkspace`, `fetchWorkspaceMembers`,
 * `addUsersToWorkspace`, `removeUsersFromWorkspace`,
 * `fetchUserWorkspaceProjects` (documented above each definition).
 *
 * Selectors: see the `select*` exports below (grouped into general,
 * members-pagination, dashboard-pagination, sidenav-nav, and helper
 * selectors), all reading from `state.workspace`.
 *
 * Business logic: list-fetch thunks normalize several possible API
 * envelope shapes into a consistent `{ data, hasMore, offset, limit,
 * total(Count) }` contract (see {@link fetchWorkspaces} and
 * {@link fetchWorkspaceMembers}); "load more" thunks append to the
 * existing array instead of replacing it; member-count changes from
 * add/remove operations are mirrored onto both the matching entry in
 * `workspaces` and `currentWorkspace` (when it's the affected workspace)
 * so list and detail views stay in sync without a re-fetch.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// Workspace slice
const workspaceSlice = createSlice({
    name: 'workspace',
    initialState,
    reducers: {
        /** Clears both the general `error` and the member-action error. */
        clearError: (state) => {
            state.error = null;
            state.memberActionError = null;
        },
        /** Clears the currently selected workspace. */
        clearCurrentWorkspace: (state) => {
            state.currentWorkspace = null;
        },
        /** Sets the currently selected workspace. */
        setCurrentWorkspace: (state, action: PayloadAction<Workspace>) => {
            state.currentWorkspace = action.payload;
        },
        /** Resets the entire slice back to its initial values. */
        resetWorkspaceState: () => {
            return initialState;
        },
        /** Clears the loaded per-user workspace project assignments and their error. */
        clearUserWorkspaceProjects: (state) => {
            state.userWorkspaceProjects = [];
            state.userWorkspaceProjectsError = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Create workspace
            .addCase(createWorkspace.pending, (state) => {
                state.createLoading = true;
                state.error = null;
            })
            .addCase(createWorkspace.fulfilled, (state, action) => {
                state.createLoading = false;
                state.workspaces.push(action.payload);
                state.error = null;
            })
            .addCase(createWorkspace.rejected, (state, action) => {
                state.createLoading = false;
                state.error = action.payload as string;
            })
            
            // Fetch all workspaces
            .addCase(fetchWorkspaces.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchWorkspaces.fulfilled, (state, action) => {
                state.loading = false;
                state.workspaces = action.payload.data;
                state.hasMore = action.payload.hasMore;
                state.currentOffset = action.payload.offset + action.payload.limit;
                state.currentLimit = action.payload.limit;
                state.totalCount = action.payload.totalCount;
                state.error = null;
            })
            .addCase(fetchWorkspaces.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            
            // Fetch more workspaces (Dashboard)
            .addCase(fetchMoreWorkspaces.pending, (state) => {
                state.loadMoreLoading = true;
                state.error = null;
            })
            .addCase(fetchMoreWorkspaces.fulfilled, (state, action) => {
                state.loadMoreLoading = false;
                state.workspaces = [...state.workspaces, ...action.payload.data];
                state.hasMore = action.payload.hasMore;
                state.currentOffset = action.payload.offset + action.payload.limit;
                state.currentLimit = action.payload.limit;
                state.totalCount = action.payload.totalCount;
                state.error = null;
            })
            .addCase(fetchMoreWorkspaces.rejected, (state, action) => {
                state.loadMoreLoading = false;
                state.error = action.payload as string;
            })

            // Sidenav nav workspaces — initial/refresh load
            .addCase(fetchNavWorkspaces.pending, (state) => {
                state.navLoading = true;
            })
            .addCase(fetchNavWorkspaces.fulfilled, (state, action) => {
                state.navLoading = false;
                state.navWorkspaces = action.payload.data;
                state.navHasMore = action.payload.hasMore;
                state.navCurrentOffset = action.payload.offset + action.payload.limit;
                state.navCurrentLimit = action.payload.limit;
            })
            .addCase(fetchNavWorkspaces.rejected, (state) => {
                state.navLoading = false;
            })

            // Sidenav nav workspaces — load more (append)
            .addCase(fetchMoreNavWorkspaces.pending, (state) => {
                state.navLoadMoreLoading = true;
            })
            .addCase(fetchMoreNavWorkspaces.fulfilled, (state, action) => {
                state.navLoadMoreLoading = false;
                state.navWorkspaces = [...state.navWorkspaces, ...action.payload.data];
                state.navHasMore = action.payload.hasMore;
                state.navCurrentOffset = action.payload.offset + action.payload.limit;
                state.navCurrentLimit = action.payload.limit;
            })
            .addCase(fetchMoreNavWorkspaces.rejected, (state) => {
                state.navLoadMoreLoading = false;
            })
            
            // Fetch workspace by ID
            .addCase(fetchWorkspaceById.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchWorkspaceById.fulfilled, (state, action) => {
                state.loading = false;
                state.currentWorkspace = action.payload;
                state.error = null;
            })
            .addCase(fetchWorkspaceById.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            
            // Fetch workspace members
            .addCase(fetchWorkspaceMembers.pending, (state) => {
                state.membersLoading = true;
                state.membersError = null;
            })
            .addCase(fetchWorkspaceMembers.fulfilled, (state, action) => {
                state.membersLoading = false;
                state.membersError = null;

                const payload = action.payload as any;
                const workspaceId = typeof action.meta.arg === 'string' ? action.meta.arg : action.meta.arg?.workspaceId;

                const members = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
                const total = typeof payload?.total === 'number' ? payload.total : members.length;
                const limit = typeof payload?.limit === 'number' ? payload.limit : state.membersLimit;
                const offset = typeof payload?.offset === 'number' ? payload.offset : 0;
                const hasMore = typeof payload?.hasMore === 'boolean' ? payload.hasMore : (offset + members.length < total);

                state.workspaceMembers = members as WorkspaceMember[];
                state.membersTotal = total;
                state.membersLimit = limit;
                state.membersOffset = offset;
                state.membersHasMore = hasMore;

                const memberCount = members.length;
                const listIndex = state.workspaces.findIndex((ws) => ws._id === workspaceId);
                if (listIndex !== -1) {
                    state.workspaces[listIndex] = {
                        ...state.workspaces[listIndex],
                        members,
                        member_count: memberCount,
                        memberCount,
                    } as Workspace;
                }

                if (state.currentWorkspace?._id === workspaceId) {
                    state.currentWorkspace = {
                        ...state.currentWorkspace,
                        members,
                        member_count: memberCount,
                        memberCount,
                    } as Workspace;
                }
            })
            .addCase(fetchWorkspaceMembers.rejected, (state, action) => {
                state.membersLoading = false;
                state.membersError = action.payload as string;
                state.workspaceMembers = [];
            })

            // Update workspace
            .addCase(updateWorkspace.pending, (state) => {
                state.updateLoading = true;
                state.error = null;
            })
            .addCase(updateWorkspace.fulfilled, (state, action) => {
                state.updateLoading = false;
                const index = state.workspaces.findIndex(workspace => workspace._id === action.payload._id);
                if (index !== -1) {
                    state.workspaces[index] = action.payload;
                }
                if (state.currentWorkspace?._id === action.payload._id) {
                    state.currentWorkspace = action.payload;
                }
                state.error = null;
            })
            .addCase(updateWorkspace.rejected, (state, action) => {
                state.updateLoading = false;
                state.error = action.payload as string;
            })
            
            // Delete workspace
            .addCase(deleteWorkspace.pending, (state) => {
                state.deleteLoading = true;
                state.error = null;
            })
            .addCase(deleteWorkspace.fulfilled, (state, action) => {
                state.deleteLoading = false;
                state.workspaces = state.workspaces.filter(workspace => workspace._id !== action.payload);
                if (state.currentWorkspace?._id === action.payload) {
                    state.currentWorkspace = null;
                }
                state.error = null;
            })
            .addCase(deleteWorkspace.rejected, (state, action) => {
                state.deleteLoading = false;
                state.error = action.payload as string;
            })

            // Add workspace members
            .addCase(addUsersToWorkspace.pending, (state) => {
                state.memberActionLoading = true;
                state.memberActionError = null;
            })
            .addCase(addUsersToWorkspace.fulfilled, (state, action) => {
                state.memberActionLoading = false;
                state.memberActionError = null;

                const payload = action.payload;
                const updatedMembers = payload?.data?.members ?? payload?.members;
                const updatedWorkspace = payload?.data?.workspace ?? payload?.workspace;

                if (updatedWorkspace) {
                    const workspaceId = updatedWorkspace._id;
                    const listIndex = state.workspaces.findIndex((ws) => ws._id === workspaceId);
                    if (listIndex !== -1) {
                        state.workspaces[listIndex] = {
                            ...state.workspaces[listIndex],
                            ...updatedWorkspace,
                        } as Workspace;
                    }
                    if (state.currentWorkspace?._id === workspaceId) {
                        state.currentWorkspace = {
                            ...state.currentWorkspace,
                            ...updatedWorkspace,
                        } as Workspace;
                    }
                } else if (updatedMembers && state.currentWorkspace) {
                    const memberCount = updatedMembers.length;
                    state.currentWorkspace = {
                        ...state.currentWorkspace,
                        members: updatedMembers,
                        member_count: memberCount,
                        memberCount,
                    };
                }
            })
            .addCase(addUsersToWorkspace.rejected, (state, action) => {
                state.memberActionLoading = false;
                state.memberActionError = action.payload as string;
            })

            // Remove workspace members
            .addCase(removeUsersFromWorkspace.pending, (state) => {
                state.memberActionLoading = true;
                state.memberActionError = null;
            })
            .addCase(removeUsersFromWorkspace.fulfilled, (state, action) => {
                state.memberActionLoading = false;
                state.memberActionError = null;

                const payload = action.payload;
                const updatedMembers = payload?.data?.members ?? payload?.members;
                const updatedWorkspace = payload?.data?.workspace ?? payload?.workspace;
                const removedUserIds = action.meta.arg.workspaceUsers.map(u => u.user_id);

                if (updatedWorkspace) {
                    const workspaceId = updatedWorkspace._id;
                    const listIndex = state.workspaces.findIndex((ws) => ws._id === workspaceId);
                    if (listIndex !== -1) {
                        state.workspaces[listIndex] = {
                            ...state.workspaces[listIndex],
                            ...updatedWorkspace,
                        } as Workspace;
                    }
                    if (state.currentWorkspace?._id === workspaceId) {
                        state.currentWorkspace = {
                            ...state.currentWorkspace,
                            ...updatedWorkspace,
                        } as Workspace;
                    }
                } else if (updatedMembers && state.currentWorkspace) {
                    const memberCount = updatedMembers.length;
                    state.currentWorkspace = {
                        ...state.currentWorkspace,
                        members: updatedMembers,
                        member_count: memberCount,
                        memberCount,
                    };
                } else if (state.currentWorkspace?.members) {
                    const filteredMembers = state.currentWorkspace.members.filter((member) => {
                        const memberId = member.user?._id || member.user_id || member._id;
                        return !removedUserIds.includes(memberId!);
                    });
                    const memberCount = filteredMembers.length;
                    state.currentWorkspace = {
                        ...state.currentWorkspace,
                        members: filteredMembers,
                        member_count: memberCount,
                        memberCount,
                    };
                }
            })
            .addCase(removeUsersFromWorkspace.rejected, (state, action) => {
                state.memberActionLoading = false;
                state.memberActionError = action.payload as string;
            })
            // Fetch user workspace projects (for remove impact dialog)
            .addCase(fetchUserWorkspaceProjects.pending, (state) => {
                state.userWorkspaceProjectsLoading = true;
                state.userWorkspaceProjectsError = null;
                state.userWorkspaceProjects = [];
            })
            .addCase(fetchUserWorkspaceProjects.fulfilled, (state, action) => {
                state.userWorkspaceProjectsLoading = false;
                state.userWorkspaceProjects = action.payload;
            })
            .addCase(fetchUserWorkspaceProjects.rejected, (state, action) => {
                state.userWorkspaceProjectsLoading = false;
                state.userWorkspaceProjectsError = action.payload as string;
            });
    },
});

// Action creators
export const { clearError, clearCurrentWorkspace, setCurrentWorkspace, resetWorkspaceState, clearUserWorkspaceProjects } = workspaceSlice.actions;

// Selectors
export const selectWorkspaces = (state: { workspace: WorkspaceState }) => state.workspace.workspaces;
export const selectCurrentWorkspace = (state: { workspace: WorkspaceState }) => state.workspace.currentWorkspace;
export const selectWorkspaceLoading = (state: { workspace: WorkspaceState }) => state.workspace.loading;
export const selectWorkspaceError = (state: { workspace: WorkspaceState }) => state.workspace.error;
export const selectCreateLoading = (state: { workspace: WorkspaceState }) => state.workspace.createLoading;
export const selectUpdateLoading = (state: { workspace: WorkspaceState }) => state.workspace.updateLoading;
export const selectDeleteLoading = (state: { workspace: WorkspaceState }) => state.workspace.deleteLoading;
export const selectWorkspaceMemberActionLoading = (state: { workspace: WorkspaceState }) =>
    state.workspace.memberActionLoading;
export const selectWorkspaceMemberActionError = (state: { workspace: WorkspaceState }) =>
    state.workspace.memberActionError;
export const selectWorkspaceMembersLoading = (state: { workspace: WorkspaceState }) =>
    state.workspace.membersLoading;
export const selectWorkspaceMembersError = (state: { workspace: WorkspaceState }) => state.workspace.membersError;
export const selectWorkspaceMembers = (state: { workspace: WorkspaceState }) => state.workspace.workspaceMembers;
export const selectUserWorkspaceProjects = (state: { workspace: WorkspaceState }) => state.workspace.userWorkspaceProjects;
export const selectUserWorkspaceProjectsLoading = (state: { workspace: WorkspaceState }) => state.workspace.userWorkspaceProjectsLoading;
export const selectUserWorkspaceProjectsError = (state: { workspace: WorkspaceState }) => state.workspace.userWorkspaceProjectsError;

// Members pagination selectors
export const selectWorkspaceMembersTotal = (state: { workspace: WorkspaceState }) => state.workspace.membersTotal;
export const selectWorkspaceMembersLimit = (state: { workspace: WorkspaceState }) => state.workspace.membersLimit;
export const selectWorkspaceMembersOffset = (state: { workspace: WorkspaceState }) => state.workspace.membersOffset;
export const selectWorkspaceMembersHasMore = (state: { workspace: WorkspaceState }) => state.workspace.membersHasMore;

// Dashboard pagination selectors
export const selectWorkspaceHasMore = (state: { workspace: WorkspaceState }) => state.workspace.hasMore;
export const selectWorkspaceCurrentOffset = (state: { workspace: WorkspaceState }) => state.workspace.currentOffset;
export const selectWorkspaceCurrentLimit = (state: { workspace: WorkspaceState }) => state.workspace.currentLimit;
export const selectWorkspaceTotalCount = (state: { workspace: WorkspaceState }) => state.workspace.totalCount;
export const selectLoadMoreLoading = (state: { workspace: WorkspaceState }) => state.workspace.loadMoreLoading;

// Sidenav nav selectors (independent from dashboard state)
export const selectNavWorkspaces = (state: { workspace: WorkspaceState }) => state.workspace.navWorkspaces;
export const selectNavWorkspaceLoading = (state: { workspace: WorkspaceState }) => state.workspace.navLoading;
export const selectNavWorkspaceHasMore = (state: { workspace: WorkspaceState }) => state.workspace.navHasMore;
export const selectNavCurrentOffset = (state: { workspace: WorkspaceState }) => state.workspace.navCurrentOffset;
export const selectNavCurrentLimit = (state: { workspace: WorkspaceState }) => state.workspace.navCurrentLimit;
export const selectNavLoadMoreLoading = (state: { workspace: WorkspaceState }) => state.workspace.navLoadMoreLoading;

// Helper selectors
export const selectWorkspaceById = (id: string) => (state: { workspace: WorkspaceState }) =>
    state.workspace.workspaces.find(workspace => workspace._id === id);

export const selectWorkspacesByType = (type: string) => (state: { workspace: WorkspaceState }) =>
    state.workspace.workspaces.filter(workspace => workspace.workspace_type === type);

export const selectWorkspacesByVisibility = (visibility: string) => (state: { workspace: WorkspaceState }) =>
    state.workspace.workspaces.filter(workspace => workspace.visibility === visibility);

export default workspaceSlice.reducer;
