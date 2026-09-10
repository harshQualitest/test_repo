/**
 * Authentication Utility Interfaces
 *
 * Type definitions for authentication utilities.
 *
 * Purpose: Lightweight token/user shapes used by `src/utils/` auth helpers
 * (session storage read/write, token expiry checks), as opposed to the fuller
 * entity types in `redux/auth.interface.ts`.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/**
 * Authentication token structure
 */
export interface AuthToken {
    token: string;
    // ISO timestamp when this token expires; absence implies no known expiry.
    expiresAt?: string;
}

/**
 * Basic authenticated user structure
 * Note: This is a lightweight version. For full user details, see User interface in redux/user.interface.ts
 */
export interface AuthUser {
    _id: string;
    username: string | null;
    name: string;
    email: string;
    password?: string;
    is_active: number;
    roles?: {
        permissions: any[];
    }[];
}
