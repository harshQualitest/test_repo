import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import rolesApi from '../../services/api/rolesApi';

// Types for the roles slice
export interface Permission {
    permission_id: string;
    access: 'view' | 'edit' | 'full_access' | 'no_access';
}

export interface Role {
    _id: string;
    role_id: string;
    permissions: Permission[];
}

export interface RolePermissionData {
    roles: Role[];
    permissions: Permission[];
}

export interface RolesState {
    roles: Role[];
    permissions: Permission[];
    loading: boolean;
    error: string | null;
    lastFetch: string | null;
}

// Initial state
const initialState: RolesState = {
    roles: [],
    permissions: [],
    loading: false,
    error: null,
    lastFetch: null,
};

// Async thunks
/**
 * Fetches all roles (and their permission grants) used to drive RBAC checks
 * throughout the app.
 * @returns an array of `Role`; normalizes both the `{ data: [...] }` wrapped
 * shape and a bare array response, defaulting to `[]` otherwise.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const fetchRoles = createAsyncThunk('roles/fetchRoles', async (_, { rejectWithValue }) => {
    try {
        const response = await rolesApi.getRoles();
        // The API returns roles wrapped in a data property
        if (response && Array.isArray(response.data)) {
            return response.data;
        } else if (Array.isArray(response)) {
            return response;
        }
        return [];
    } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to fetch roles and permissions');
    }
});

/**
 * Slice: roles
 *
 * Purpose: Owns the global role/permission catalog used to drive RBAC
 * (role-based access control) checks across the app.
 *
 * State shape:
 * - `roles` (Role[]): all roles, each with its own permission grants.
 * - `permissions` (Permission[]): the flattened, deduplicated set of
 *   permissions across all roles (see business logic below).
 * - `loading` / `error`: status for the roles fetch.
 * - `lastFetch` (string | null): ISO timestamp of the last successful fetch.
 *
 * Reducers:
 * - `clearError`: clears the `error` field.
 * - `resetRolesState`: resets the entire slice back to its initial values.
 * - `setLoading`: manually overrides `loading` (e.g. for optimistic UI).
 *
 * Async thunks: `fetchRoles` (documented above its definition).
 *
 * Selectors: `selectRoles`, `selectPermissions`, `selectRolesLoading`,
 * `selectRolesError`, `selectLastFetch` (below), reading from `state.roles`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// Roles slice
const rolesSlice = createSlice({
    name: 'roles',
    initialState,
    reducers: {
        // Clear error
        /** Clears the `error` field. */
        clearError: (state) => {
            state.error = null;
        },

        // Reset roles state
        /** Resets the entire slice (roles, permissions, status) to initial values. */
        resetRolesState: (state) => {
            state.roles = [];
            state.permissions = [];
            state.loading = false;
            state.error = null;
            state.lastFetch = null;
        },

        // Set loading state manually if needed
        /**
         * Manually overrides the `loading` flag.
         * @param action.payload - the new loading state.
         */
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch roles
            .addCase(fetchRoles.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchRoles.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                state.roles = action.payload || [];
                // Extract unique permissions from all roles
                // Why: the same permission_id can appear on multiple roles; a Map
                // keyed by permission_id collapses duplicates so `permissions`
                // reflects the distinct set of permissions in the system, not
                // one entry per role that grants it.
                const allPermissions = action.payload.flatMap((role: Role) => role.permissions);
                const uniquePermissions = Array.from(
                    new Map(allPermissions.map((p: Permission) => [p.permission_id, p])).values(),
                );
                state.permissions = uniquePermissions as Permission[];
                state.lastFetch = new Date().toISOString();
            })
            .addCase(fetchRoles.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

// Export actions
export const { clearError, resetRolesState, setLoading } = rolesSlice.actions;

// Export selectors
export const selectRoles = (state: { roles: RolesState }) => state.roles.roles;
export const selectPermissions = (state: { roles: RolesState }) => state.roles.permissions;
export const selectRolesLoading = (state: { roles: RolesState }) => state.roles.loading;
export const selectRolesError = (state: { roles: RolesState }) => state.roles.error;
export const selectLastFetch = (state: { roles: RolesState }) => state.roles.lastFetch;

// Export reducer
export default rolesSlice.reducer;
