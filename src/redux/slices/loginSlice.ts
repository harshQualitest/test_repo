import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { loginApi, registerApi, verifyOtpApi, logoutApi } from '../../services/api/loginApi';
import type {
    LoginState,
    LoginResponse,
    LoginCredentials,
    AuthError,
    RegisterCredentials,
    User,
    VerifyOtpCredentials,
    OtpRequiredResponse,
    AlreadyLoggedInResponse,
} from '../../interfaces/redux/auth.interface';

// Session configuration
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Safely parses the persisted `user` object out of `sessionStorage`.
 * @returns the stored `User`, or `null` if absent or unparsable (malformed
 * JSON is swallowed rather than thrown, since this runs at module load).
 */
// Helper function to safely parse user from sessionStorage
const getUserFromStorage = (): User | null => {
    try {
        const userStr = sessionStorage.getItem('user');
        return userStr ? (JSON.parse(userStr) as User) : null;
    } catch {
        return null;
    }
};

/**
 * Checks whether the session is still within the inactivity timeout window.
 * @returns `false` if no activity timestamp is stored, or if the elapsed
 * time since `lastActivity` exceeds {@link SESSION_TIMEOUT}.
 */
// Helper to check if session is valid
const isSessionValid = (): boolean => {
    const lastActivity = sessionStorage.getItem('lastActivity');
    if (!lastActivity) return false;

    const now = Date.now();
    const inactiveTime = now - Number.parseInt(lastActivity, 10);
    return inactiveTime < SESSION_TIMEOUT;
};

/**
 * Determines whether the tab has a complete, non-expired authentication
 * state (token + user + session id, all still within the activity window).
 * Used to compute the initial `isAuthenticated` value on module load.
 */
// Helper to validate complete authentication state
const hasValidAuthState = (): boolean => {
    const token = sessionStorage.getItem('authToken');
    const user = getUserFromStorage();
    const sessionId = sessionStorage.getItem('sessionId');
    return !!(token && user && sessionId && isSessionValid());
};

/**
 * One-time reverse migration: tokens previously stored in localStorage are
 * moved back to sessionStorage (tab-isolated) to enforce the single-tab
 * session policy. Runs once per tab on module load.
 * @returns nothing; mutates `sessionStorage`/`localStorage` as a side effect.
 */
const migrateLocalStorageToSessionStorage = (): void => {
    const lsToken = localStorage.getItem('authToken');
    if (!lsToken) return; // nothing to migrate

    // Copy to this tab's sessionStorage only if not already present.
    if (!sessionStorage.getItem('authToken')) {
        sessionStorage.setItem('authToken', lsToken);
        const lsRefresh = localStorage.getItem('refreshToken');
        const lsUser = localStorage.getItem('user');
        const lsActivity = localStorage.getItem('lastActivity');
        const lsSessionId = localStorage.getItem('activeSessionId');

        if (lsRefresh) sessionStorage.setItem('refreshToken', lsRefresh);
        if (lsUser) sessionStorage.setItem('user', lsUser);
        if (lsActivity) sessionStorage.setItem('lastActivity', lsActivity);
        sessionStorage.setItem('sessionId', lsSessionId ?? `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`);
    }
    // Always clean up localStorage — tokens must not persist there.
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('activeSessionId');
};

migrateLocalStorageToSessionStorage();

/**
 * Clears `sessionStorage` entirely if a token is present but the rest of
 * the auth state is incomplete or expired — guards against a half-valid
 * state (e.g. token without user/session, or an expired session) leaking
 * into the app as "authenticated".
 */
// Helper to clear invalid auth state
const clearInvalidAuthState = (): void => {
    const token = sessionStorage.getItem('authToken');
    const user = getUserFromStorage();
    const sessionId = sessionStorage.getItem('sessionId');

    if (token && (!user || !sessionId || !isSessionValid())) {
        sessionStorage.clear();
    }
};

// Clear invalid state on module load
clearInvalidAuthState();

// Initial state
// Hydrated synchronously from sessionStorage so a page refresh doesn't
// momentarily flash an unauthenticated UI. See the slice-level JSDoc above
// `loginSlice` for the full field-by-field breakdown.
const initialState: LoginState = {
    user: getUserFromStorage(),
    token: sessionStorage.getItem('authToken'),
    isLoading: false,
    isAuthenticated: hasValidAuthState(),
    isAlreadyLoggedIn: false,
    error: null,
    lastLoginAttempt: null,
    otpRequired: false,
    otpEmail: null,
    sessionId: sessionStorage.getItem('sessionId') || null,
    lastActivity: Number(sessionStorage.getItem('lastActivity')) || Date.now(),
    sessionTimeout: SESSION_TIMEOUT,
};

// Async thunks
/**
 * Logs a user in via `loginApi`. The API can respond in one of three
 * shapes, all resolved (not rejected) so the reducer can branch on them:
 * an OTP-required response, an already-logged-in-elsewhere response, or a
 * direct `LoginResponse` (used for test accounts that skip OTP).
 * @param credentials - email, password, and an optional `override_token`
 * flag to force login past an existing active session.
 * @returns `LoginResponse | OtpRequiredResponse | AlreadyLoggedInResponse`,
 * with `_email` attached for the OTP-verification step.
 * @throws (via `rejectWithValue`) an `AuthError` with a normalized message
 * and the HTTP status code, for genuine login failures (bad credentials, etc).
 */
export const loginUser = createAsyncThunk<
    LoginResponse | OtpRequiredResponse | AlreadyLoggedInResponse,
    LoginCredentials,
    { rejectValue: AuthError }
>('auth/loginUser', async (credentials, { rejectWithValue }) => {
    try {
        const response = await loginApi(
            credentials.email,
            credentials.password,
            credentials.override_token ?? false,
        );
        // Attach email to response for OTP flow
        return { ...response, _email: credentials.email };
    } catch (error: any) {
        // Handle already-logged-in response (API returns 4xx with is_already_logged_in flag)
        if (error.response?.data?.is_already_logged_in === true) {
            return { error: error.response.data.error, is_already_logged_in: true } as AlreadyLoggedInResponse;
        }
        return rejectWithValue({
            message: error.response?.data?.message || error.response?.data?.error || error.message || 'Login failed. Please try again.',
            code: error.response?.status?.toString(),
        });
    }
});

/**
 * Verifies the OTP sent during the {@link loginUser} OTP-required flow and
 * completes login.
 * @param credentials - the email and OTP code to verify.
 * @returns the `LoginResponse` (tokens + user) on successful verification.
 * @throws (via `rejectWithValue`) an `AuthError` with a normalized message
 * and HTTP status code on failure (wrong/expired OTP, etc).
 */
export const verifyOtp = createAsyncThunk<LoginResponse, VerifyOtpCredentials, { rejectValue: AuthError }>(
    'auth/verifyOtp',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await verifyOtpApi(credentials.email, credentials.otp);
            return response;
        } catch (error: any) {
            return rejectWithValue({
                message: error.response?.data?.message || error.response?.data?.error || error.message || 'OTP verification failed. Please try again.',
                code: error.response?.status?.toString(),
            });
        }
    },
);

/**
 * Registers a new user account.
 * @param credentials - username, email, and password for the new account.
 * @returns the `LoginResponse` (tokens + user) — registration logs the
 * user in immediately on success.
 * @throws (via `rejectWithValue`) an `AuthError` with a normalized message
 * and HTTP status code on failure.
 */
export const registerUser = createAsyncThunk<LoginResponse, RegisterCredentials, { rejectValue: AuthError }>(
    'auth/registerUser',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await registerApi(credentials.username, credentials.email, credentials.password);
            return response;
        } catch (error: any) {
            return rejectWithValue({
                message: error.response?.data?.message || error.message || 'Registration failed. Please try again.',
                code: error.response?.status?.toString(),
            });
        }
    },
);

/**
 * Checks whether the current session is still valid (authenticated and
 * within the inactivity timeout). Intended to be dispatched periodically
 * or on app focus to proactively expire stale sessions.
 * @returns `false` immediately if not authenticated; `false` (and clears
 * `sessionStorage`) if the inactivity timeout has elapsed; `true` otherwise.
 * @throws (via `rejectWithValue`) a generic 'Session validation failed'
 * `AuthError` if the check itself throws unexpectedly.
 */
// Validate session thunk
export const validateSession = createAsyncThunk<boolean, void, { rejectValue: AuthError }>(
    'auth/validateSession',
    async (_, { getState, rejectWithValue }) => {
        try {
            const state = getState() as { auth: LoginState };
            const { lastActivity, sessionTimeout, isAuthenticated } = state.auth;

            if (!isAuthenticated) {
                return false;
            }

            const now = Date.now();
            const inactiveTime = now - lastActivity;

            // Check if session has expired due to inactivity
            if (inactiveTime > sessionTimeout) {
                sessionStorage.clear();
                return false;
            }

            return true;
        } catch {
            return rejectWithValue({
                message: 'Session validation failed',
                code: 'SESSION_ERROR',
            });
        }
    },
);

/**
 * Records the current time as the last-activity timestamp, both in
 * `sessionStorage` (for cross-reload persistence) and in state (for the
 * inactivity-timeout check). Dispatched on user interaction to keep the
 * session alive.
 * @returns the new `lastActivity` timestamp (ms since epoch).
 */
// Refresh session activity
export const refreshActivity = createAsyncThunk('auth/refreshActivity', async () => {
    const now = Date.now();
    sessionStorage.setItem('lastActivity', now.toString());
    return now;
});

/**
 * Logs the user out: best-effort calls the server-side logout endpoint,
 * then always clears local session/token storage regardless of whether
 * the server call succeeded — a failed server logout must never leave
 * stale tokens behind on the client.
 * @returns `null` (state reset happens in the `fulfilled` reducer).
 */
// Logout thunk — calls the server-side logout endpoint then clears local session data.
export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
    // Best-effort server-side logout — ignore errors so local cleanup always runs.
    try {
        await logoutApi();
    } catch {
        // Server may already have invalidated the token; local cleanup still proceeds.
    }

    // Clear all session data
    sessionStorage.clear();
    // Clean up any legacy localStorage tokens from previous versions
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('activeSessionId');

    return null;
});

/**
 * Slice: auth (login)
 *
 * Purpose: Owns authentication and session state for the whole app — login,
 * registration, OTP verification, session-timeout tracking, and logout.
 * Persists the authoritative copy of tokens/user/session in `sessionStorage`
 * (tab-isolated by design) so a page refresh doesn't lose the session.
 *
 * State shape (`LoginState`):
 * - `user` (User | null): the authenticated user, hydrated from storage at load.
 * - `token` (string | null): the current access token.
 * - `isLoading` (boolean): true while a login/register/OTP/logout thunk is in flight.
 * - `isAuthenticated` (boolean): whether the current tab has a valid session.
 * - `isAlreadyLoggedIn` (boolean): true when the API reports an existing
 *   active session elsewhere, prompting the user to confirm an override.
 * - `error` (AuthError | null): normalized error from the last failed auth action.
 * - `lastLoginAttempt` (number | null): timestamp of the last login attempt.
 * - `otpRequired` / `otpEmail`: whether the login flow is waiting on OTP entry,
 *   and which email the OTP was sent to.
 * - `sessionId` (string | null): a client-generated ID for the active session.
 * - `lastActivity` (number): timestamp used against `sessionTimeout` to expire
 *   idle sessions.
 * - `sessionTimeout` (number): inactivity window in ms (defaults to
 *   {@link SESSION_TIMEOUT}, 30 minutes).
 *
 * Reducers: see JSDoc above each one below.
 *
 * Async thunks: `loginUser`, `verifyOtp`, `registerUser`, `validateSession`,
 * `refreshActivity`, `logoutUser` (documented above each definition).
 *
 * Selectors: `selectAuth`, `selectUser`, `selectIsAuthenticated`,
 * `selectIsLoading`, `selectAuthError`, `selectToken`, `selectRefreshToken`,
 * `selectIsAlreadyLoggedIn`, `selectOtpRequired`, `selectOtpEmail`,
 * `selectSessionId`, `selectLastActivity`, `selectSessionTimeout`,
 * `selectSessionActive` (below), reading from `state.auth`.
 *
 * Business logic: on every successful login/register/OTP-verify, a new
 * `sessionId` is minted and the full auth payload (access token, refresh
 * token, user, session id, activity timestamp) is written to
 * `sessionStorage` so it survives a reload. `loginUser.fulfilled` branches
 * on three possible API response shapes (already-logged-in, OTP-required,
 * direct login) rather than assuming a single response contract.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// Create slice
const loginSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Clear error
        /** Clears the shared `error` field. */
        clearError: (state) => {
            state.error = null;
        },

        // Set authentication from stored token (for app initialization)
        /**
         * Restores authentication from a previously stored token/user pair
         * (used during app bootstrap, outside the normal login thunks).
         * @param action.payload.token - the access token to restore.
         * @param action.payload.user - optional user object to restore alongside it.
         */
        setAuthFromStorage: (state, action: PayloadAction<{ token: string; user?: User }>) => {
            state.token = action.payload.token;
            state.isAuthenticated = true;
            if (action.payload.user) {
                state.user = action.payload.user;
            }
        },

        // Clear authentication
        /**
         * Fully logs the user out on the client: resets auth state and wipes
         * both `sessionStorage` and any legacy `localStorage` auth keys, so
         * no stale tokens are left behind from either storage or prior
         * versions of the app.
         */
        clearAuth: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.error = null;
            state.sessionId = null;
            state.lastActivity = Date.now();

            sessionStorage.clear();
            // Clean up any legacy localStorage tokens from previous versions
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            localStorage.removeItem('lastActivity');
            localStorage.removeItem('activeSessionId');
        },

        // Update user profile
        /**
         * Merges a partial user update into the current user (no-op if not logged in).
         * @param action.payload - the fields to merge into `state.user`.
         */
        updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
            }
        },

        // Clear OTP state
        /** Clears the pending-OTP flag and the email it was sent to. */
        clearOtpState: (state) => {
            state.otpRequired = false;
            state.otpEmail = null;
        },

        // Update last activity
        /** Bumps `lastActivity` to now, in both state and `sessionStorage`. */
        updateActivity: (state) => {
            const now = Date.now();
            state.lastActivity = now;
            sessionStorage.setItem('lastActivity', now.toString());
        },

        // Set session timeout
        /**
         * Overrides the inactivity timeout window.
         * @param action.payload - the new timeout in milliseconds.
         */
        setSessionTimeout: (state, action: PayloadAction<number>) => {
            state.sessionTimeout = action.payload;
        },

        // Clear already-logged-in flag (dismissed or override chosen)
        /** Clears the "already logged in elsewhere" flag once the user dismisses it or chooses to override. */
        clearAlreadyLoggedIn: (state) => {
            state.isAlreadyLoggedIn = false;
        },
    },
    extraReducers: (builder) => {
        builder
            // Login cases
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
                state.lastLoginAttempt = Date.now();
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;

                // Check if user already has an active session
                if ('is_already_logged_in' in action.payload && action.payload.is_already_logged_in) {
                    state.isAlreadyLoggedIn = true;
                    state.isAuthenticated = false;
                    state.error = null;
                    return;
                }

                // Check if OTP is required (when API returns {msg: "OTP sent successfully"})
                if ('msg' in action.payload && action.payload.msg === 'OTP sent successfully') {
                    // OTP required flow
                    state.otpRequired = true;
                    state.otpEmail = (action.payload as any)._email || null;
                    state.isAuthenticated = false;
                    state.error = null;
                } else if ('access_token' in action.payload) {
                    // Direct login flow (test accounts)
                    state.isAuthenticated = true;
                    state.user = action.payload.data;
                    state.token = action.payload.access_token;
                    state.error = null;
                    state.otpRequired = false;
                    state.otpEmail = null;

                    // Initialize session
                    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                    const now = Date.now();
                    state.sessionId = sessionId;
                    state.lastActivity = now;

                    // Store all auth data in sessionStorage (tab-isolated)
                    sessionStorage.setItem('authToken', action.payload.access_token);
                    sessionStorage.setItem('refreshToken', action.payload.refresh_token);
                    sessionStorage.setItem('user', JSON.stringify(action.payload.data));
                    sessionStorage.setItem('sessionId', sessionId);
                    sessionStorage.setItem('lastActivity', now.toString());
                }
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
                state.error = action.payload || { message: 'Login failed' };
                sessionStorage.clear();
            })

            // Register cases
            .addCase(registerUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.data;
                state.token = action.payload.access_token;
                state.error = null;

                // Initialize session
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                const now = Date.now();
                state.sessionId = sessionId;
                state.lastActivity = now;

                // Store all auth data in sessionStorage (tab-isolated)
                sessionStorage.setItem('authToken', action.payload.access_token);
                sessionStorage.setItem('refreshToken', action.payload.refresh_token);
                sessionStorage.setItem('user', JSON.stringify(action.payload.data));
                sessionStorage.setItem('sessionId', sessionId);
                sessionStorage.setItem('lastActivity', now.toString());
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
                state.error = action.payload || { message: 'Registration failed' };
                sessionStorage.clear();
            })

            // Verify OTP cases
            .addCase(verifyOtp.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(verifyOtp.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.data;
                state.token = action.payload.access_token;
                state.error = null;
                state.otpRequired = false;
                state.otpEmail = null;

                // Initialize session
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                const now = Date.now();
                state.sessionId = sessionId;
                state.lastActivity = now;

                // Store all auth data in sessionStorage (tab-isolated)
                sessionStorage.setItem('authToken', action.payload.access_token);
                sessionStorage.setItem('refreshToken', action.payload.refresh_token);
                sessionStorage.setItem('user', JSON.stringify(action.payload.data));
                sessionStorage.setItem('sessionId', sessionId);
                sessionStorage.setItem('lastActivity', now.toString());
            })
            .addCase(verifyOtp.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || { message: 'OTP verification failed' };
            })

            // Logout cases
            .addCase(logoutUser.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.isLoading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
                state.error = null;
                state.otpRequired = false;
                state.otpEmail = null;
                state.sessionId = null;
                state.lastActivity = Date.now();
            })

            // Validate session cases
            .addCase(validateSession.fulfilled, (state, action) => {
                if (!action.payload) {
                    // Session expired — clear authentication state
                    state.isAuthenticated = false;
                    state.user = null;
                    state.token = null;
                    state.sessionId = null;
                    state.error = { 
                        message: 'Session expired. Please login again.',
                        code: 'SESSION_EXPIRED'
                    };
                }
            })
            .addCase(validateSession.rejected, (state) => {
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
                state.sessionId = null;
            })

            // Refresh activity cases
            .addCase(refreshActivity.fulfilled, (state, action) => {
                state.lastActivity = action.payload;
            });
    },
});

// Export actions
export const { 
    clearError, 
    setAuthFromStorage, 
    clearAuth, 
    updateUserProfile, 
    clearOtpState,
    updateActivity,
    setSessionTimeout,
    clearAlreadyLoggedIn,
} = loginSlice.actions;

// Selectors
export const selectAuth = (state: { auth: LoginState }) => state.auth;
export const selectUser = (state: { auth: LoginState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: LoginState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: LoginState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: LoginState }) => state.auth.error;
export const selectToken = (state: { auth: LoginState }) => state.auth.token;
export const selectRefreshToken = () => sessionStorage.getItem('refreshToken');
export const selectIsAlreadyLoggedIn = (state: { auth: LoginState }) => state.auth.isAlreadyLoggedIn;
export const selectOtpRequired = (state: { auth: LoginState }) => state.auth.otpRequired;
export const selectOtpEmail = (state: { auth: LoginState }) => state.auth.otpEmail;
export const selectSessionId = (state: { auth: LoginState }) => state.auth.sessionId;
export const selectLastActivity = (state: { auth: LoginState }) => state.auth.lastActivity;
export const selectSessionTimeout = (state: { auth: LoginState }) => state.auth.sessionTimeout;
export const selectSessionActive = (state: { auth: LoginState }) => {
    const { lastActivity, sessionTimeout, isAuthenticated } = state.auth;
    if (!isAuthenticated) return false;
    return (Date.now() - lastActivity) < sessionTimeout;
};

// Export reducer
export default loginSlice.reducer;
