/**
 * Auth Redux Slice Interfaces
 *
 * Purpose: Types for the login/auth Redux slice — credentials, tokens, the
 * authenticated user shape, OTP flow, and session/error state.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/** A single role-per-entity assignment for a user (RBAC building block). */
export interface UserAssignment {
    role_id: string;
    // ID of the org/workspace/project this role applies to.
    entity_id: string;
    entity: 'organization' | 'workspace' | 'project';
}

/** A user's membership/role record within a specific organization. */
export interface UserOrganization {
    _id: string;
    organization_id: string;
    user_id: string;
    role: string;
    invite_status: string;
    is_active: number;
    created_at: string;
    invited_by: string;
    remarks?: string;
}

/** Authenticated user record as returned by the login/auth API. */
export interface User {
    _id: string;
    username: string | null;
    name: string;
    email: string;
    password?: string;
    is_active: number;
    created_at?: string;
    created_by?: string;
    // Direct role field (used by super_admin)
    role?: string;
    // Assignments array (role_id per entity)
    assignments?: UserAssignment[];
    // Organization details with role
    organization?: UserOrganization | null;
    // Legacy field - kept for backward compatibility
    user_type?: string;
    roles?: {
        permissions: any[];
    }[];
}

/** Credentials submitted on the login form. */
export interface LoginCredentials {
    email: string;
    password: string;
    // When true, forces login even if the account has an active session elsewhere.
    override_token?: boolean;
}

/** Error response returned when the account already has an active session (see override_token). */
export interface AlreadyLoggedInResponse {
    error: string;
    is_already_logged_in: true;
}

/** Fields submitted on the registration form. */
export interface RegisterCredentials {
    username: string;
    email: string;
    password: string;
}

/** Successful login API response, including JWT tokens and the user record. */
export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    data: User;
}

/** Response indicating the login flow must continue with OTP verification. */
export interface OtpRequiredResponse {
    msg: string;
}

/** Payload for submitting an OTP code during two-step login. */
export interface VerifyOtpCredentials {
    email: string;
    otp: string;
}

/** Normalized auth error shape used across the login/auth slice. */
export interface AuthError {
    message: string;
    // Form field the error applies to, if it's a field-level validation error.
    field?: string;
    code?: string;
}

/** Redux state for the login/auth slice. */
export interface LoginState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    // True when login failed because of an existing active session (see AlreadyLoggedInResponse).
    isAlreadyLoggedIn: boolean;
    error: AuthError | null;
    lastLoginAttempt: number | null;
    // True while the OTP-verification step of login is pending.
    otpRequired: boolean;
    otpEmail: string | null;
    sessionId: string | null;
    lastActivity: number;
    sessionTimeout: number;
}
