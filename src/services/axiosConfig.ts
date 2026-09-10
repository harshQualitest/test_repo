/**
 * Purpose: The single shared axios client for the whole app. Every API module
 * under `src/services/api/*` imports `client` (the default export) from here —
 * no other file should call `axios.create()`.
 *
 * What this module provides:
 * - `BASE_URL`: resolved once from `VITE_API_URL`, falling back to a local
 *   dev backend when the env var is not set.
 * - `client`: the exported axios instance with `Content-Type: application/json`,
 *   a 10s timeout, and both interceptors described below wired up.
 * - Request interceptor: reads the access token from sessionStorage (via
 *   `utils/auth`) and attaches it as `Authorization: Bearer <token>`. Before
 *   attaching it, it proactively checks `isTokenExpired` (30s buffer) and, if
 *   the token is expired/expiring, refreshes it first so the outgoing request
 *   always carries a valid token instead of being sent and immediately 401'd.
 * - Response interceptor: catches unexpected 401s (e.g. server-side token
 *   revocation that the proactive check above couldn't have known about),
 *   performs a single refresh-and-retry of the original request, and forces a
 *   logout if the refresh itself fails. Also surfaces 403s as a global toast
 *   event since those are permission errors the UI should tell the user about.
 * - Concurrency control: a shared `isRefreshing` flag + `requestQueue` ensure
 *   that when multiple requests discover an expired/invalid token at the same
 *   time, only one network call hits `/auth/refresh`; the rest await the
 *   in-flight result and are replayed with the new token.
 * - `forceLogout`: clears stored auth data and navigates to `/login` via a
 *   hard `window.location` redirect (this is a plain module, not a React
 *   component, so it has no Router context to call `navigate()` with).
 *
 * Error propagation: both interceptors always re-throw a real `Error` instance
 * (wrapping non-Error rejections) so calling code and try/catch blocks
 * downstream get a consistent error shape.
 */
import axios from 'axios';
import { getAuthToken, getRefreshToken, isTokenExpired, updateAuthTokens, clearAuthData } from '../utils/auth';

// Resolved once at module load; falls back to a local dev backend when the
// env var is not configured (e.g. running the app without a `.env` file).
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/v0';

// ---------------------------------------------------------------------------
// Separate interceptor-free instance used ONLY for the token refresh call.
// This prevents the circular loop: refresh → 401 → refresh → 401 → ...
// ---------------------------------------------------------------------------
const refreshClient = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10_000,
});

// ---------------------------------------------------------------------------
// Request queue — while a refresh is in-flight every other authenticated
// request is suspended here and replayed once new tokens are available.
// ---------------------------------------------------------------------------
type QueuedResolver = (token: string) => void;
type QueuedRejector = (reason: unknown) => void;

let isRefreshing = false;
const requestQueue: Array<{ resolve: QueuedResolver; reject: QueuedRejector }> = [];

/**
 * Settles every request that was parked in `requestQueue` while a refresh
 * was in-flight.
 * @param error - Rejection reason to propagate to all waiters, or `null` on success.
 * @param token - The freshly-refreshed access token to hand to all waiters, or `null` on failure.
 * @returns void — resolves/rejects each queued promise as a side effect and empties the queue.
 */
const processQueue = (error: unknown, token: string | null): void => {
    for (const pending of requestQueue) {
        if (error !== null || token === null) {
            pending.reject(error);
        } else {
            pending.resolve(token);
        }
    }
    requestQueue.length = 0;
};

// ---------------------------------------------------------------------------
// Token refresh helper — calls /auth/refresh with the stored refresh token
// and persists the new token pair to sessionStorage on success.
// ---------------------------------------------------------------------------
/**
 * Calls `POST /auth/refresh` (via the interceptor-free `refreshClient`) with
 * the stored refresh token and persists the returned token pair.
 * @returns The new access token, for immediate use on the request that triggered the refresh.
 * @throws {Error} If no refresh token is stored, or if the network/API call fails —
 * callers treat this as "refresh failed" and force a logout.
 */
const performTokenRefresh = async (): Promise<string> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token stored');

    const response = await refreshClient.post<{ access_token: string; refresh_token: string }>(
        '/auth/refresh',
        { refresh_token: refreshToken },
    );

    const { access_token, refresh_token } = response.data;
    updateAuthTokens(access_token, refresh_token);
    return access_token;
};

// ---------------------------------------------------------------------------
// Force logout — clears all stored auth data and navigates to /login.
// ---------------------------------------------------------------------------
const forceLogout = (): void => {
    clearAuthData();
    if (globalThis.location.pathname !== '/login') {
        globalThis.location.href = '/login';
    }
};

// ---------------------------------------------------------------------------
// Main axios client
// ---------------------------------------------------------------------------
const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10_000,
});

// ---------------------------------------------------------------------------
// REQUEST interceptor
// Proactively checks whether the stored access token is expired (with a 30s
// buffer) and silently refreshes it before the request is sent.
// ---------------------------------------------------------------------------
client.interceptors.request.use(
    async (config) => {
        const token = getAuthToken();
        if (!token) return config;

        if (isTokenExpired(token)) {
            // Token expired or expiring within 30 s — refresh now.
            if (!isRefreshing) {
                isRefreshing = true;
                try {
                    const newToken = await performTokenRefresh();
                    isRefreshing = false;
                    processQueue(null, newToken);
                    config.headers.Authorization = `Bearer ${newToken}`;
                    return config;
                } catch (refreshError) {
                    isRefreshing = false;
                    processQueue(refreshError, null);
                    forceLogout();
                    throw refreshError instanceof Error ? refreshError : new Error(String(refreshError));
                }
            }

            // Another concurrent request is already refreshing — wait in queue.
            return new Promise<typeof config>((resolve, reject) => {
                requestQueue.push({
                    resolve: (newToken) => {
                        config.headers.Authorization = `Bearer ${newToken}`;
                        resolve(config);
                    },
                    reject,
                });
            });
        }

        config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error instanceof Error ? error : new Error(String(error))),
);

// ---------------------------------------------------------------------------
// RESPONSE interceptor
// Handles unexpected 401s (e.g., server-side token revocation) by attempting
// one token refresh.  If the refresh also fails, the user is logged out.
// ---------------------------------------------------------------------------
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as import('axios').InternalAxiosRequestConfig & { _retried?: boolean };

        // Skip token refresh for auth endpoints — errors from these should
        // propagate as-is (e.g. "User does not exist or is inactive").
        const isAuthEndpoint =
            originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/verify-otp');

        if (error.response?.status === 401 && !originalRequest._retried && !isAuthEndpoint) {
            // `_retried` guards against an infinite retry loop: if the retried
            // request itself 401s again (e.g. refresh succeeded but the new
            // token is still rejected), we must not attempt another refresh.
            originalRequest._retried = true;

            if (!isRefreshing) {
                isRefreshing = true;
                try {
                    const newToken = await performTokenRefresh();
                    isRefreshing = false;
                    processQueue(null, newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return client(originalRequest);
                } catch (refreshError) {
                    isRefreshing = false;
                    processQueue(refreshError, null);
                    forceLogout();
                    throw refreshError instanceof Error ? refreshError : new Error(String(refreshError));
                }
            }

            // Refresh already in progress — queue the retry.
            return new Promise((resolve, reject) => {
                requestQueue.push({
                    resolve: (newToken) => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        resolve(client(originalRequest));
                    },
                    reject,
                });
            });
        }

        // 403 means the token is valid but the user lacks permission — surface
        // this globally as a toast rather than making every call site handle it.
        if (error.response?.status === 403) {
            globalThis.dispatchEvent(
                new CustomEvent('show-toast', {
                    detail: {
                        message: 'You do not have permission to perform this action',
                        severity: 'error',
                    },
                }),
            );
        }

        // Normalize whatever axios/the interceptor threw into a real Error so
        // every caller's catch block can rely on a consistent shape.
        const err = error instanceof Error
            ? error
            : new Error(error?.message ?? JSON.stringify(error) ?? String(error));
        throw err;
    },
);

// The shared client — import this (never `axios.create()` directly) from any
// API module that needs to make a request.
export default client;

