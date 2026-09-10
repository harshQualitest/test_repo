import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import userApi from '../../services/api/usersApi';
import type { CreateUser } from '../../interfaces';

// Types for the user slice
export interface User {
  _id: string;
  id?: string; // For backward compatibility
  username: string | null;
  name: string;
  email: string;
  role: string;
  org_id?: string;
  role_id?: string;
  roles?: Array<{
    role: {
      _id: string;
      code: string;
      name: string;
    };
    permissions: Array<{
      _id: string;
      code: string;
      name: string;
    }>;
    permission_for: string;
    entity: string;
  }>;
  assignments?: Array<{
    role_id: string;
    entity_id: string;
    entity: string;
  }>;
  permissions?: string[];
  remarks?: string;
  is_active: number;
  isActive?: boolean; // For backward compatibility
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  created_by?: string;
  organization?: any;
}

export interface UserState {
  users: User[];
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  createUserLoading: boolean;
  createUserError: string | null;
  totalCount: number;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Initial state
const initialState: UserState = {
  users: [],
  currentUser: null,
  loading: false,
  error: null,
  createUserLoading: false,
  createUserError: null,
  totalCount: 0,
  pagination: {
    page: 0,
    pageSize: 10,
    totalPages: 0,
  },
};

/**
 * Creates a new user.
 * @param userData - the user creation payload (`CreateUser`).
 * @returns the API response for the created user.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
// Async thunk for creating a user
export const createUser = createAsyncThunk(
  'user/createUser',
  async (userData: CreateUser, { rejectWithValue }) => {
    try {
      const response = await userApi.createUser(userData);
      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to create user'
      );
    }
  }
);

/**
 * Fetches a paginated, filterable list of users and normalizes each user
 * record for backward compatibility with older component code.
 * @param params - optional `{ page, pageSize, search, role }` query params.
 * @returns `{ users, totalCount, page, pageSize, totalPages }`, where each
 * user has been transformed (see business logic below).
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
// Async thunk for fetching users
export const fetchUsers = createAsyncThunk(
  'user/fetchUsers',
  async (
    params: { page?: number; pageSize?: number; search?: string; role?: string } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const safeParams = params || {};
      const response = await userApi.getAllUsers(safeParams);

      // Extract users from the response structure: { data: [...], total: number, limit: number, offset: number }
      const users = Array.isArray(response?.data) ? response.data : [];
      const totalCount = response?.total || users.length;
      const pageSize = response?.limit || safeParams.pageSize || 10;
      const currentOffset = response?.offset || 0;
      // Prefer an explicit 1-based `page` from the API; otherwise derive a
      // 0-based page index from offset/pageSize so callers always get a
      // consistent, 0-based `page` regardless of what the API returned.
      const currentPage = typeof response?.page === 'number'
        ? Number(response.page) - 1
        : Math.floor(currentOffset / pageSize);

      // Transform users to ensure backward compatibility
      // Why: the backend has migrated user->role association from an
      // embedded `roles` array to a normalized `assignments` array; older
      // UI code still reads `role`/`role_id`/`org_id`/`isActive`/`id`
      // directly off the user object, so both shapes are read here and
      // coalesced into the single flat shape the rest of the app expects.
      const transformedUsers = users.map((user: any) => ({
        ...user,
        id: user._id, // Add id field for backward compatibility
        username: user.username || user.name, // Use name if username is null
        isActive: user.is_active === 1, // Convert to boolean
        // Extract role from assignments array (new structure) or roles array (old structure)
        role: user.assignments?.[0]?.role_id || user.roles?.[0]?.role?.name || 'user',
        org_id: user.assignments?.[0]?.entity_id || user.roles?.[0]?.permission_for || '',
        role_id: user.assignments?.[0]?.role_id || user.roles?.[0]?.role?._id || '',
        permissions: user.roles?.[0]?.permissions?.map((p: any) => p.name) || [],
        // Store assignments for reference
        assignments: user.assignments || [],
      }));

      return {
        users: transformedUsers,
        totalCount: totalCount,
        page: currentPage,
        pageSize: pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch users'
      );
    }
  }
);

/**
 * Fetches a single user by ID and normalizes it to the `User` interface
 * (same backward-compatibility concerns as {@link fetchUsers}, applied to
 * one record).
 * @param userId - the user to fetch.
 * @returns the transformed `User`.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
// Async thunk for fetching user by ID
export const fetchUserById = createAsyncThunk(
  'user/fetchUserById',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await userApi.getUserById(userId);

      // Extract user data from response
      const userData = response?.data || response;

      // Transform user to match our User interface
      const transformedUser = {
        ...userData,
        _id: userData._id,
        id: userData._id, // Add id field for backward compatibility
        username: userData.username || userData.email, // Use email as username if username is null
        name: userData.name || userData.username || userData.email.split('@')[0], // Extract name from email if not provided
        email: userData.email,
        isActive: userData.is_active === 1, // Convert to boolean
        is_active: userData.is_active,
        // Extract role from assignments
        role: userData.assignments?.[0]?.role_id || 'user',
        role_id: userData.assignments?.[0]?.role_id || '',
        // Extract organization ID from assignments or organization object
        org_id: userData.assignments?.[0]?.entity_id || userData.organization?.organization_id || '',
        // Store organization data if available
        organization: userData.organization,
        // Store assignments
        assignments: userData.assignments || [],
        // Add other fields
        created_at: userData.created_at,
        created_by: userData.created_by,
      };
      
      return transformedUser;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch user details'
      );
    }
  }
);

/**
 * Updates a user. NOTE: this is currently a placeholder — no update
 * endpoint is wired up yet; it echoes back `{ id, ...userData }` without
 * calling the API, so state merges optimistically but nothing is
 * persisted server-side until the real API call is implemented.
 * @param args.id - the user to update.
 * @param args.userData - the partial fields to update (`Partial<CreateUser>`).
 * @returns `{ id, ...userData }` (placeholder; not a server response).
 * @throws (via `rejectWithValue`) the API error message if a future
 * implementation throws.
 */
// Async thunk for updating a user (placeholder for future implementation)
export const updateUser = createAsyncThunk(
  'user/updateUser',
  async (
    { id, userData }: { id: string; userData: Partial<CreateUser> },
    { rejectWithValue }
  ) => {
    try {
      // Note: Implement API call when user update endpoint is available
      // const response = await userApi.updateUser(id, userData);
      // return response;

      // Placeholder return for now
      return { id, ...userData };
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update user'
      );
    }
  }
);

/**
 * Deletes a user from an organization.
 * @param args.organizationId - the organization the user belongs to.
 * @param args.userId - the user to delete.
 * @returns the deleted user's ID (used to filter it out of state).
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
// Async thunk for deleting a user
export const deleteUser = createAsyncThunk(
  'user/deleteUser',
  async ({ organizationId, userId }: { organizationId: string; userId: string }, { rejectWithValue }) => {
    try {
      await userApi.deleteUser(organizationId, userId);
      return userId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to delete user'
      );
    }
  }
);

/**
 * Slice: user
 *
 * Purpose: Owns the org/workspace user directory — listing (paginated,
 * searchable), creating, fetching by ID, updating, and deleting users.
 *
 * State shape:
 * - `users` (User[]): the currently loaded, paginated user list.
 * - `currentUser` (User | null): a single user loaded by ID (e.g. detail view).
 * - `loading` / `error`: status for list/get/update/delete operations.
 * - `createUserLoading` / `createUserError`: status of the last create request.
 * - `totalCount` (number): total users matching the last list query (for pagination UI).
 * - `pagination` (`{ page, pageSize, totalPages }`): current pagination state.
 *
 * Reducers: see JSDoc above each one below.
 *
 * Async thunks: `createUser`, `fetchUsers`, `fetchUserById`, `updateUser`,
 * `deleteUser` (documented above each definition).
 *
 * Selectors: `selectUsers`, `selectCurrentUser`, `selectUserLoading`,
 * `selectUserError`, `selectCreateUserLoading`, `selectCreateUserError`,
 * `selectUserTotalCount`, `selectUserPagination` (below), reading from
 * `state.user`.
 *
 * Business logic: `fetchUsers`/`fetchUserById` normalize API records into a
 * single flat `User` shape (see comments above those thunks) so components
 * don't need to branch on old vs. new backend response structures.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// User slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Clear errors
    /** Clears both the general `error` and the create-user error. */
    clearErrors: (state) => {
      state.error = null;
      state.createUserError = null;
    },

    // Clear create user state
    /** Resets the create-user status flags (loading/error). */
    clearCreateUserState: (state) => {
      state.createUserLoading = false;
      state.createUserError = null;
    },

    // Set current user
    /** Sets the currently loaded user (or clears it with `null`). */
    setCurrentUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload;
    },

    // Update pagination
    /**
     * Merges partial pagination fields into the current pagination state.
     * @param action.payload - the pagination fields to update.
     */
    updatePagination: (state, action: PayloadAction<Partial<UserState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    // Add user to local state (for optimistic updates)
    /**
     * Prepends a user to local state without a round-trip fetch (optimistic update).
     * @param action.payload - the user to add.
     */
    addUserToState: (state, action: PayloadAction<User>) => {
      state.users.unshift(action.payload);
      state.totalCount += 1;
    },

    // Remove user from local state
    /**
     * Removes a user from local state by ID (optimistic update).
     * @param action.payload - the ID of the user to remove.
     */
    removeUserFromState: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(user => user.id !== action.payload);
      state.totalCount -= 1;
    },

    // Update user in local state
    /**
     * Replaces a user in local state by ID (optimistic update).
     * @param action.payload - the updated user (matched by `id`).
     */
    updateUserInState: (state, action: PayloadAction<User>) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    // Create user
    builder
      .addCase(createUser.pending, (state) => {
        state.createUserLoading = true;
        state.createUserError = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.createUserLoading = false;
        state.createUserError = null;
        // Add the new user to the state
        if (action.payload?.id) {
          state.users.unshift(action.payload);
          state.totalCount += 1;
        }
      })
      .addCase(createUser.rejected, (state, action) => {
        state.createUserLoading = false;
        state.createUserError = action.payload as string;
      })

    // Fetch users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.users = action.payload.users;
        state.totalCount = action.payload.totalCount;
        state.pagination = {
          page: action.payload.page,
          pageSize: action.payload.pageSize,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

    // Fetch user by ID
    builder
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.currentUser = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

    // Update user
    builder
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // Update user in state
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = { ...state.users[index], ...action.payload };
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

    // Delete user
    builder
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // Remove user from state
        state.users = state.users.filter(user => user.id !== action.payload);
        state.totalCount -= 1;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const {
  clearErrors,
  clearCreateUserState,
  setCurrentUser,
  updatePagination,
  addUserToState,
  removeUserFromState,
  updateUserInState,
} = userSlice.actions;

// Export selectors
export const selectUsers = (state: { user: UserState }) => state.user.users;
export const selectCurrentUser = (state: { user: UserState }) => state.user.currentUser;
export const selectUserLoading = (state: { user: UserState }) => state.user.loading;
export const selectUserError = (state: { user: UserState }) => state.user.error;
export const selectCreateUserLoading = (state: { user: UserState }) => state.user.createUserLoading;
export const selectCreateUserError = (state: { user: UserState }) => state.user.createUserError;
export const selectUserTotalCount = (state: { user: UserState }) => state.user.totalCount;
export const selectUserPagination = (state: { user: UserState }) => state.user.pagination;

// Export reducer
export default userSlice.reducer;
