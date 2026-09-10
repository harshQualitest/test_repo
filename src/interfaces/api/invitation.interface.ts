/**
 * Invitation API Interfaces
 *
 * Type definitions for invitation-related API operations.
 *
 * Purpose: Request/response shapes for sending, validating, and accepting
 * user invitations (single and bulk).
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/**
 * Payload for accepting an invitation
 */
export interface AcceptInvitationPayload {
    userId: string;
    name: string;
    password: string;
}

/**
 * User details from an invitation
 */
export interface InvitationUserDetails {
    _id: string;
    email: string;
    role: string;
    org_id: string;
    organizationName?: string;
    // Invitation lifecycle status, e.g. 'pending' | 'accepted' | 'expired'.
    status: string;
}

/**
 * Response from validating an invitation
 */
export interface ValidateInvitationResponse {
    valid: boolean;
    email?: string;
    organization?: string;
    role?: string;
}

/**
 * Payload for inviting a single user
 */
export interface ISingleUserInvitePayload {
    email: string;
    org_id: string;
    role: string;
    subject: string;
    body: string;
    inviterName?: string;
}

/**
 * Payload for bulk user invitation
 */
export interface IBulkUserInvitePayload {
    users: Array<{
        email: string;
        role: string;
    }>;
    org_id: string;
    // Email template to use for all invitations in this batch; falls back to the default when omitted.
    template_id?: string;
}
