import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { getOrganizationsApi, createOrganizationApi, dashboardApi } from '../../services/api/organizationApi';
import type { CreateOrganization } from '../../interfaces/api';
import type { Organization, OrganizationDashboardMetrics, OrganizationState } from '../../interfaces/redux';
// Types

// Initial state
const initialState: OrganizationState = {
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

// Async thunks
/**
 * Fetches the list of organizations visible to the current user.
 * @returns an array of `Organization`.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const fetchOrganizations = createAsyncThunk<Organization[], void, { rejectValue: string }>(
    'organization/fetchOrganizations',
    async (_, { rejectWithValue }) => {
        try {
            const response = await getOrganizationsApi();
            return response.data || response;
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch organizations';
            return rejectWithValue(errorMessage);
        }
    },
);

/**
 * Fetches dashboard metrics for a single organization.
 * @param organizationId - the organization to fetch metrics for.
 * @returns the `OrganizationDashboardMetrics` for that organization.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const fetchOrganizationDashboard = createAsyncThunk<OrganizationDashboardMetrics, string, { rejectValue: string }>(
    'organization/fetchDashboard',
    async (organizationId, { rejectWithValue }) => {
        try {
            const response = await dashboardApi(organizationId);
            return response.data || response;
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch dashboard metrics';
            return rejectWithValue(errorMessage);
        }
    },
);

/**
 * Creates a new organization.
 * @param organizationData - the organization creation payload (`CreateOrganization`).
 * @returns the created `Organization`.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const createOrganization = createAsyncThunk<Organization, CreateOrganization, { rejectValue: string }>(
    'organization/createOrganization',
    async (organizationData, { rejectWithValue }) => {
        try {
            const response = await createOrganizationApi(organizationData);
            return response.data || response;
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to create organization';
            return rejectWithValue(errorMessage);
        }
    },
);

/**
 * Slice: organization
 *
 * Purpose: Owns the list of organizations, the currently selected
 * organization, and organization-level dashboard metrics.
 *
 * State shape:
 * - `organizations` (Organization[]): all organizations visible to the user.
 * - `currentOrganization` (Organization | null): the selected organization.
 * - `loading` / `error`: status for the organizations list fetch.
 * - `createLoading` / `createError`: status for organization creation.
 * - `dashboardMetrics` / `dashboardMetricsLoading` / `dashboardMetricsError`:
 *   status and data for the organization dashboard fetch.
 *
 * Reducers:
 * - `clearError`: clears both `error` and `createError`.
 * - `clearCreateError`: clears `createError` only.
 * - `setCurrentOrganization` / `clearCurrentOrganization`: set or clear the
 *   selected organization.
 *
 * Async thunks: `fetchOrganizations`, `fetchOrganizationDashboard`,
 * `createOrganization` (documented above each definition).
 *
 * Selectors: `selectOrganizations`, `selectCurrentOrganization`,
 * `selectOrganizationLoading`, `selectOrganizationError`,
 * `selectCreateLoading`, `selectCreateError`,
 * `selectOrganizationDashboardMetrics`, `selectDashboardMetricsLoading`,
 * `selectDashboardMetricsError` (below), reading from `state.organization`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// Slice
const organizationSlice = createSlice({
    name: 'organization',
    initialState,
    reducers: {
        /** Clears both the list-fetch error and the create error. */
        clearError: (state) => {
            state.error = null;
            state.createError = null;
        },
        /** Clears the create-organization error only. */
        clearCreateError: (state) => {
            state.createError = null;
        },
        /** Sets the currently selected organization. */
        setCurrentOrganization: (state, action: PayloadAction<Organization>) => {
            state.currentOrganization = action.payload;
        },
        /** Clears the currently selected organization. */
        clearCurrentOrganization: (state) => {
            state.currentOrganization = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch organizations
            .addCase(fetchOrganizations.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchOrganizations.fulfilled, (state, action) => {
                state.loading = false;
                state.organizations = action.payload;
                state.error = null;
            })
            .addCase(fetchOrganizations.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to fetch organizations';
            })
            // Create organization
            .addCase(createOrganization.pending, (state) => {
                state.createLoading = true;
                state.createError = null;
            })
            .addCase(createOrganization.fulfilled, (state, action) => {
                state.createLoading = false;
                state.organizations.push(action.payload);
                state.createError = null;
            })
            .addCase(createOrganization.rejected, (state, action) => {
                state.createLoading = false;
                state.createError = action.payload || 'Failed to create organization';
            })
            // Fetch organization dashboard metrics
            .addCase(fetchOrganizationDashboard.pending, (state) => {
                state.dashboardMetricsLoading = true;
                state.dashboardMetricsError = null;
            })
            .addCase(fetchOrganizationDashboard.fulfilled, (state, action) => {
                state.dashboardMetricsLoading = false;
                state.dashboardMetrics = action.payload;
                state.dashboardMetricsError = null;
            })
            .addCase(fetchOrganizationDashboard.rejected, (state, action) => {
                state.dashboardMetricsLoading = false;
                state.dashboardMetricsError = action.payload || 'Failed to fetch dashboard metrics';
            });
    },
});

// Actions
export const { clearError, clearCreateError, setCurrentOrganization, clearCurrentOrganization } =
    organizationSlice.actions;

// Selectors
export const selectOrganizations = (state: { organization: OrganizationState }) => state.organization.organizations;
export const selectCurrentOrganization = (state: { organization: OrganizationState }) =>
    state.organization.currentOrganization;
export const selectOrganizationLoading = (state: { organization: OrganizationState }) => state.organization.loading;
export const selectOrganizationError = (state: { organization: OrganizationState }) => state.organization.error;
export const selectCreateLoading = (state: { organization: OrganizationState }) => state.organization.createLoading;
export const selectCreateError = (state: { organization: OrganizationState }) => state.organization.createError;
export const selectOrganizationDashboardMetrics = (state: { organization: OrganizationState }) => state.organization.dashboardMetrics;
export const selectDashboardMetricsLoading = (state: { organization: OrganizationState }) => state.organization.dashboardMetricsLoading;
export const selectDashboardMetricsError = (state: { organization: OrganizationState }) => state.organization.dashboardMetricsError;

export default organizationSlice.reducer;
