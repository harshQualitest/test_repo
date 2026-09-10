/**
 * Purpose: API calls for organization management — listing organizations,
 * creating a new one, and fetching the organization-level dashboard. All
 * calls use the shared `client`; errors are uncaught axios rejections
 * propagated to the caller.
 */
import type { CreateOrganization } from "../../interfaces/api/organization.interface";
import client from "../axiosConfig";


/**
 * GET /organization/ — lists all organizations visible to the current user.
 * @returns `response.data` — array of organizations.
 */
const getOrganizationsApi = async () => {
    const response = await client.get("/organization/");
    return response.data;
}

/**
 * POST /organization/ — creates a new organization.
 * @param data - Organization fields (name, etc.) required to create it.
 * @returns `response.data` — the created organization.
 */
const createOrganizationApi = async (data: CreateOrganization) => {
    const response = await client.post("/organization/", data);
    return response.data;
}

/**
 * GET /organization/dashboard/{organizationId} — organization-level dashboard metrics.
 * @param organizationId - Organization id.
 * @returns `response.data` — dashboard stats for the organization.
 */
const dashboardApi = async (organizationId: string) => {
    const response = await client.get(`/organization/dashboard/${organizationId}`);
    return response.data;
}

export { getOrganizationsApi, createOrganizationApi, dashboardApi };