/**
 * Purpose: API calls for the user-invitation flow — looking up invitation
 * details, validating an invitation token, accepting an invitation to create
 * an account, and inviting new users (single or bulk CSV upload). All calls
 * use the shared `client`; errors are uncaught axios rejections propagated to
 * the caller (typically a page-level try/catch that shows a toast).
 */
import client from '../axiosConfig';

export interface AcceptInvitationPayload {
    userId: string;
    name: string;
    password: string;
}

export interface InvitationUserDetails {
    _id: string;
    email: string;
    role: string;
    org_id: string;
    organizationName?: string;
    status: string;
}

export interface ValidateInvitationResponse {
    valid: boolean;
    email?: string;
    organization?: string;
    role?: string;
}

export interface ISingleUserInvitePayload {
    email: string;
    org_id: string;
    role: string;
    subject: string;
    body: string;
}

const invitationApi = {
    /**
     * Get user details by invitation ID
     * GET /auth/invitation/{userId}
     * @param userId - The invited user's id (used as the invitation lookup key).
     * @returns The invited user's details (email, role, org, status).
     */
    getUserDetailsByInvitationId: async (userId: string): Promise<InvitationUserDetails> => {
        const response = await client.get(`/auth/invitation/${userId}`);
        return response.data;
    },

    /**
     * Validate an invitation token
     * GET /auth/invitation/validate?token=...
     * @param token - Invitation token from the accept-invitation link.
     * @returns Whether the token is valid, plus the email/organization/role it targets.
     */
    validateToken: async (token: string): Promise<ValidateInvitationResponse> => {
        const response = await client.get(`/auth/invitation/validate`, {
            params: { token },
        });
        return response.data;
    },

    /**
     * Accept invitation and create user account
     * POST /auth/invitation/accept
     * @param data - `{ userId, name, password }` used to finalize account creation.
     * @returns `response.data` — the created/activated user (server shape).
     */
    acceptInvitation: async (data: AcceptInvitationPayload) => {
        const response = await client.post('/auth/invitation/accept', data);
        return response.data;
    },

    /**
     * Bulk invite users to an organization
     * POST /user/bulk-upload (multipart)
     * @param file - CSV/Excel file listing users to invite (see `utils/fileValidation.validateUserCsvFile`).
     * @param org_id - Organization to invite the users into.
     * @param subject - Email subject line for the invitation email.
     * @param body - Email body content for the invitation email.
     * @returns `response.data` — bulk-invite result summary.
     */
    bulkInviteUsers: async (file: File, org_id: string, subject: string, body: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('org_id', org_id);
        formData.append('subject', subject);
        formData.append('body', body);

        const response = await client.post('/user/bulk-upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /**
     * Invite Single User
     * POST /auth/invite
     * @param data - Invitee email/role/org plus the email subject/body to send.
     * @returns `response.data` — invite result confirmation.
     */
    inviteSingleUser: async (data: ISingleUserInvitePayload) => {
        const response = await client.post('/auth/invite', data);
        return response.data;
    },
};

export default invitationApi;
