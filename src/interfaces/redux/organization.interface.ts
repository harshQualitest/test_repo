/**
 * Organization Redux Slice Interfaces
 *
 * Purpose: Types for the organization management Redux slice — the
 * organization entity, its dashboard metrics, and slice state.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/** Organization entity as stored/returned by the API. */
export interface Organization {
    _id: string;
    name: string;
    description: string;
    code: string;
    type: string;
    details: string;
    industry_type: string;
    org_size: number;
    address: string;
    createdAt?: string;
    updatedAt?: string;
}

/** Summary counts shown on an organization's dashboard. */
export interface OrganizationDashboardMetrics {
    workspace_count: number;
    project_count: number;
    active_project_count?: number;
    archived_project_count?: number;
    draft_project_count?: number;
    org_member_count: number;
}

/** Redux state for organization management. */
export interface OrganizationState {
    organizations: Organization[];
    currentOrganization: Organization | null;
    loading: boolean;
    error: string | null;
    createLoading: boolean;
    createError: string | null;
    dashboardMetrics: OrganizationDashboardMetrics | null;
    dashboardMetricsLoading: boolean;
    dashboardMetricsError: string | null;
}
