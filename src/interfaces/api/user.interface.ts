/**
 * User API Interfaces
 *
 * Purpose: Request shape for creating/registering a user via the User API.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/** Payload for creating a new user within an organization. */
export interface CreateUser {
    user_id: string;
    name: string;
    email: string;
    password: string;
    org_id: string;
    // Invitation acceptance state: 'pending' until the user completes signup.
    status: 'accepted' | 'pending';
    remarks?: string;
}
