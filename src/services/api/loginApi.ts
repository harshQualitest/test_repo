/**
 * Purpose: API calls for the login/registration/OTP/token flows that back
 * `redux/slices/loginSlice`. Note the request/response interceptors in
 * `axiosConfig.ts` special-case `/auth/login` and `/auth/verify-otp` — 401s
 * from those endpoints are NOT retried via token refresh, since they mean
 * "invalid credentials/OTP", not "expired session". Errors are uncaught
 * axios rejections propagated to the caller.
 */
import client from '../axiosConfig';

/**
 * POST /auth/login — authenticates a user with email/password.
 * @param email - User's email.
 * @param password - User's password.
 * @param override_token - When true, forces login even if the account has an active session elsewhere.
 * @returns `response.data` — expected to include access/refresh tokens and user info.
 */
export const loginApi = async (email: string, password: string, override_token = false) => {
    const response = await client.post('/auth/login', {
        email,
        password,
        override_token,
    });
    return response.data;
};

/**
 * POST /auth/register — creates a new user account.
 * @param username - Desired username.
 * @param email - User's email.
 * @param password - User's password.
 * @returns `response.data` — created-user confirmation (server shape).
 */
export const registerApi = async (username: string, email: string, password: string) => {
    const response = await client.post('/auth/register', {
        username,
        email,
        password,
    });
    return response.data;
};

/**
 * POST /auth/verify-otp — verifies the one-time-password sent after login/registration.
 * @param email - User's email.
 * @param otp - The OTP code entered by the user.
 * @returns `response.data` — verification result (server shape).
 */
export const verifyOtpApi = async (email: string, otp: string) => {
    const response = await client.post('/auth/verify-otp', {
        email,
        otp,
    });

    return response.data;
};

/**
 * Exchange a valid refresh token for a new access + refresh token pair.
 * POST /auth/refresh
 * @param refreshToken - The stored refresh token.
 * @returns `{ access_token, refresh_token }` — the new token pair.
 * @remarks Note: this uses the shared `client` (not a raw axios instance) —
 * unlike `axiosConfig.ts`'s internal refresh, which deliberately uses a
 * separate interceptor-free `refreshClient` to avoid a refresh-triggers-refresh
 * loop. This exported function is for direct/manual refresh calls elsewhere
 * (outside the interceptor), where that loop risk doesn't apply the same way.
 */
export const refreshTokenApi = async (
    refreshToken: string,
): Promise<{ access_token: string; refresh_token: string }> => {
    const response = await client.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
};

/**
 * POST /auth/logout — invalidates the current session server-side.
 * @returns Nothing; caller is responsible for clearing local auth state via `utils/auth`.
 */
export const logoutApi = async (): Promise<void> => {
    await client.post('/auth/logout');
}

// Default export for consumers that import default
export default { loginApi, registerApi, verifyOtpApi, refreshTokenApi, logoutApi };