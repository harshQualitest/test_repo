/**
 * Purpose: API for fetching the roles/permissions matrix used by
 * `redux/slices/rolesSlice` (consumed via the `useRoles` hook). Errors are
 * uncaught axios rejections propagated to the caller.
 */
import client from "../axiosConfig";

export const rolesApi = {
    /**
     * GET /auth/roles_permissions — fetches all roles and their associated permissions.
     * @returns `response.data` — the roles/permissions payload.
     */
    getRoles: async () => {
        const response = await client.get('/auth/roles_permissions');
        return response.data;
    },
};

export default rolesApi;