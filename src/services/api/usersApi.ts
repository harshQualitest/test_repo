/**
 * Purpose: API for user management — creation, paginated listing/search,
 * invitations, lookup, password reset, update, and deletion. All calls use
 * the shared `client`; errors are uncaught axios rejections propagated to
 * the caller.
 */
import type { CreateUser } from '../../interfaces';
import client from '../axiosConfig';
const userApi = {
    /**
     * POST /auth/register — creates a new user account.
     * @param data - New user's fields (name, email, password, role, etc.).
     * @returns `response.data` — the created user.
     */
    createUser: async (data: CreateUser) => {
        const response = await client.post('/auth/register', data);
        return response.data;
    },
    /**
     * GET /auth/users — paginated, searchable, filterable list of users.
     * @param params - `page`/`pageSize` are converted to `offset`/`limit` (page*pageSize);
     * `role: 'all'` is treated as "no filter" and omitted from the query.
     * @returns `response.data` — paginated users payload.
     */
    getAllUsers: async (params?: { page?: number; pageSize?: number; search?: string; role?: string; exclude_role?: string }) => {
        const queryParams: Record<string, string | number | undefined> = {};

        // Calculate offset from page and pageSize
        const pageSize = params?.pageSize || 10;
        const page = params?.page || 0;
        const offset = page * pageSize;

        queryParams.offset = offset;
        queryParams.limit = pageSize;

        if (params?.search) {
            queryParams.search = params.search;
        }

        if (params?.role && params.role !== 'all') {
            queryParams.role = params.role;
        }

        if (params?.exclude_role) {
            queryParams.exclude_role = params.exclude_role;
        }

        const response = await client.get('/auth/users', { params: queryParams });
        return response.data;
    },
    /**
     * POST /auth/invite — invites a single user to an organization with a given role.
     * @param email - Invitee's email.
     * @param role - Role to assign upon acceptance.
     * @param org_id - Organization to invite the user into.
     * @returns `response.data` — invite result confirmation.
     */
    inviteUser: async (email: string, role: string, org_id: string) => {
        const response = await client.post('/auth/invite', { email, role, org_id });
        return response.data;
    },
    /**
     * GET /auth/users/{userId} — fetches a single user by id.
     * @param userId - User id.
     * @returns `response.data` — the user.
     */
    getUserById: async (userId: string) => {
        const response = await client.get(`/auth/users/${userId}`);
        return response.data;
    },
    /**
     * POST /auth/forget-password — initiates the forgot-password email flow.
     * @param email - Account email to send the reset link to.
     * @returns `response.data` — confirmation that the reset email was sent.
     */
    forgotPassword: async (email: string) => {
        const response = await client.post('/auth/forget-password', { email });
        return response.data;
    },
    /**
     * POST /auth/reset-password — completes a password reset using the emailed token.
     * @param token - Reset token from the emailed link.
     * @param newPassword - New password value.
     * @param confirmPassword - Confirmation of the new password (validated server-side too).
     * @returns `response.data` — reset confirmation.
     */
    resetPassword: async (token: string, newPassword: string, confirmPassword: string) => {
        const response = await client.post('/auth/reset-password', { token, new_password: newPassword, confirm_password: confirmPassword });
        return response.data;
    },
    /**
     * PUT /user/ — updates the current/target user's profile fields.
     * @param data - Partial user fields to update.
     * @returns `response.data` — the updated user.
     */
    updateUser: async ( data: Partial<CreateUser>) => {
        const response = await client.put(`/user/`, data);
        return response.data;
    },
    /**
     * DELETE /user/{organizationId}/{userId} — removes a user from an organization.
     * @param organizationId - Organization the user belongs to.
     * @param userId - User id to delete.
     * @returns `response.data` — deletion confirmation.
     */
    deleteUser: async (organizationId:string,userId: string) => {
        const response = await client.delete(`/user/${organizationId}/${userId}`);
        return response.data;
    }
};

export default userApi;
