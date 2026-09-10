/**
 * Purpose: Authentication/session utilities — the single source of truth for
 * how auth tokens and the current user are stored, read, and expiry-checked.
 *
 * Token-handling rules encoded here:
 * - Access token, refresh token, and the serialized user are kept in
 *   `sessionStorage` (not `localStorage`), so a session does not silently
 *   survive across browser restarts and is scoped per-tab (see
 *   `utils/tabOwnership.ts` for the duplicate-tab safeguard built on top of this).
 * - All storage reads/writes are wrapped in try/catch: sessionStorage can throw
 *   (e.g. disabled storage, private browsing, quota errors), and auth checks
 *   must fail closed (treated as "not authenticated") rather than crash the app.
 * - JWTs are decoded locally (no network round-trip, no JWT library) purely to
 *   read the `exp` claim for client-side expiry checks; this is NOT a signature
 *   verification — the server remains the source of truth for token validity.
 * - `isTokenExpired` applies a 30s buffer so a token that is *about* to expire
 *   is treated as already expired, letting the axios request interceptor
 *   refresh proactively instead of racing the server-side expiry.
 */
// Authentication utility functions
export interface AuthToken {
    token: string;
    expiresAt?: string;
}

export interface UserAssignment {
    role_id: string;
    entity_id: string;
    entity: 'organization' | 'workspace' | 'project';
}

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

/**
 * Check if user is authenticated by verifying token exists and is not expired
 * @returns `true` only when both a stored token and stored user exist and the
 * token has not expired (per `isTokenExpired`'s 30s buffer); `false` on any
 * missing data or storage error.
 */
export const isAuthenticated = (): boolean => {
    try {
        const token = sessionStorage.getItem('authToken');
        const user = sessionStorage.getItem('user');

        if (!token || !user) return false;

        return !isTokenExpired(token);
    } catch {
        return false;
    }
};

/**
 * Get authentication token from sessionStorage
 * @returns The stored access token, or `null` if absent or sessionStorage is unavailable.
 */
export const getAuthToken = (): string | null => {
    try {
        return sessionStorage.getItem('authToken');
    } catch {
        return null;
    }
};

/**
 * Get refresh token from sessionStorage
 * @returns The stored refresh token, or `null` if absent or sessionStorage is unavailable.
 */
export const getRefreshToken = (): string | null => {
    try {
        return sessionStorage.getItem('refreshToken');
    } catch {
        return null;
    }
};

/**
 * Get user data from sessionStorage
 * @returns The parsed `User` object, or `null` if absent, malformed JSON, or sessionStorage is unavailable.
 */
export const getUser = (): User | null => {
    try {
        const userStr = sessionStorage.getItem('user');
        if (!userStr) return null;
        return JSON.parse(userStr) as User;
    } catch {
        return null;
    }
};

/**
 * Set authentication data in sessionStorage
 * @param token - Access token to store.
 * @param refreshToken - Refresh token to store.
 * @param user - User object to serialize and store.
 * @returns void — writes are best-effort; silently no-ops if sessionStorage is unavailable.
 */
export const setAuthData = (token: string, refreshToken: string, user: User): void => {
    try {
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('user', JSON.stringify(user));
    } catch {
        // sessionStorage unavailable — silently skip
    }
};

/**
 * Update only the access and refresh tokens (used after silent token refresh).
 * Preserves existing user data in sessionStorage.
 * @param accessToken - New access token.
 * @param refreshToken - New refresh token.
 * @returns void — best-effort write; silently no-ops if sessionStorage is unavailable.
 */
export const updateAuthTokens = (accessToken: string, refreshToken: string): void => {
    try {
        sessionStorage.setItem('authToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
    } catch {
        // sessionStorage unavailable — silently skip
    }
};

/**
 * Clear authentication data from sessionStorage
 * @returns void — best-effort removal of the token/user keys; silently no-ops if sessionStorage is unavailable.
 */
export const clearAuthData = (): void => {
    try {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
    } catch {
        // sessionStorage unavailable — silently skip
    }
};

/**
 * Logout user — clears all auth data and redirects to /login.
 */
export const logout = (): void => {
    clearAuthData();
    globalThis.location.href = '/login';
};

/**
 * Decode JWT payload without a library.
 * Returns null if the token is malformed.
 * @param token - The raw JWT string (header.payload.signature).
 * @returns The decoded payload claims, or `null` if the token isn't a well-formed 3-part JWT
 * or the payload isn't valid base64url JSON. This does NOT verify the signature.
 */
const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        // Pad base64url to standard base64
        const base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/');
        return JSON.parse(atob(base64)) as Record<string, unknown>;
    } catch {
        return null;
    }
};

/**
 * Returns true if the JWT is expired or malformed.
 * Adds a 30-second clock-skew buffer so tokens expiring very soon are treated
 * as expired and a refresh is triggered proactively.
 * @param token - The raw JWT string to check.
 * @param bufferSeconds - Seconds before the real expiry to already treat the token as expired (default 30).
 * @returns `true` if the token is malformed or genuinely expired (within the buffer); `false`
 * otherwise. A token with no `exp` claim is treated as valid (not expired), since there is
 * nothing to compare against.
 */
export const isTokenExpired = (token: string, bufferSeconds = 30): boolean => {
    const payload = decodeJwtPayload(token);
    if (!payload) return true;
    if (typeof payload.exp !== 'number') return false; // no expiry claim → treat as valid
    return payload.exp < Date.now() / 1000 + bufferSeconds;
};

/**
 * Returns the number of seconds until the JWT expires.
 * Returns 0 if already expired or malformed.
 * @param token - The raw JWT string to check.
 * @returns Seconds remaining until `exp` (never negative), or `0` if malformed/no `exp`/already expired.
 */
export const tokenExpiresInSeconds = (token: string): number => {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return 0;
    return Math.max(0, payload.exp - Date.now() / 1000);
};
/**
 * Verify email with OTP
 * @returns Nothing — this is a stub; see remarks.
 * @remarks Deprecated/inert: the actual OTP verification is implemented by the
 * `verifyOtp` thunk in `redux/slices/loginSlice`. This function is kept only
 * for backward compatibility with any direct (non-Redux) callers and does not
 * perform verification itself.
 */
export const verifyEmail = async (): // email: string, otp: string

Promise<void> => {
    // This function is now handled by the Redux slice
    // Kept for backward compatibility or direct API calls if needed
    console.log('Use verifyOtp thunk from loginSlice instead');
};
