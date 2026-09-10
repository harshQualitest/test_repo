import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist localStorage polyfill BEFORE module imports ─────────────────────────
// loginSlice.ts calls localStorage.getItem() at module-load time (migration fn).
// vi.hoisted ensures this runs before any imports so the polyfill is in place.
vi.hoisted(() => {
    const store: Record<string, string> = {};
    const impl = {
        getItem: (key: string): string | null => store[key] ?? null,
        setItem: (key: string, value: string): void => { store[key] = String(value); },
        removeItem: (key: string): void => { delete store[key]; },
        clear: (): void => { for (const k of Object.keys(store)) delete store[k]; },
    };
    try {
        Object.defineProperty(globalThis, 'localStorage', { value: impl, writable: true, configurable: true });
    } catch {
        (globalThis as any).localStorage = impl;
    }
    return null;
});

import { configureStore } from '@reduxjs/toolkit';
import loginReducer, {
    loginUser,
    verifyOtp,
    registerUser,
    logoutUser,
    validateSession,
    refreshActivity,
    clearError,
    clearAuth,
    updateUserProfile,
    clearOtpState,
    updateActivity,
    setSessionTimeout,
    clearAlreadyLoggedIn,
    setAuthFromStorage,
    selectIsAuthenticated,
    selectUser,
    selectIsLoading,
    selectAuthError,
    selectToken,
    selectOtpRequired,
    selectOtpEmail,
    selectIsAlreadyLoggedIn,
} from '../loginSlice';
import type { LoginState } from '../../../interfaces/redux/auth.interface';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../../services/api/loginApi', () => ({
    loginApi: vi.fn(),
    registerApi: vi.fn(),
    verifyOtpApi: vi.fn(),
    logoutApi: vi.fn(),
}));

import { loginApi, registerApi, verifyOtpApi, logoutApi } from '../../../services/api/loginApi';
const mockLoginApi = vi.mocked(loginApi);
const mockRegisterApi = vi.mocked(registerApi);
const mockVerifyOtpApi = vi.mocked(verifyOtpApi);
const mockLogoutApi = vi.mocked(logoutApi);

// ── Helpers ───────────────────────────────────────────────────────────────────

const SESSION_TIMEOUT = 30 * 60 * 1000;

function makeAuthState(overrides: Partial<LoginState> = {}): LoginState {
    return {
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        isAlreadyLoggedIn: false,
        error: null,
        lastLoginAttempt: null,
        otpRequired: false,
        otpEmail: null,
        sessionId: null,
        lastActivity: Date.now(),
        sessionTimeout: SESSION_TIMEOUT,
        ...overrides,
    } as LoginState;
}

function makeStore(authState?: Partial<LoginState>) {
    return configureStore({
        reducer: { auth: loginReducer },
        preloadedState: { auth: makeAuthState(authState) },
    });
}

type TestStore = ReturnType<typeof makeStore>;
const getState = (store: TestStore) => store.getState() as { auth: LoginState };

const mockUser = {
    _id: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    is_active: 1,
    username: 'tester',
    role: 'annotator',
};

const mockLoginResponse = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    data: mockUser,
};

const mockOtpResponse = {
    msg: 'OTP sent successfully',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('loginSlice', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        localStorage.clear();
    });

    // ── Sync actions ─────────────────────────────────────────────────────────

    describe('sync actions', () => {
        describe('clearError', () => {
            it('sets error to null', () => {
                const store = makeStore({ error: { message: 'Bad credentials' } });
                store.dispatch(clearError());
                expect(selectAuthError(getState(store))).toBeNull();
            });
        });

        describe('clearAuth', () => {
            it('sets isAuthenticated, user, and token to their empty values', () => {
                const store = makeStore({
                    isAuthenticated: true,
                    user: mockUser,
                    token: 'abc',
                    sessionId: 'sess-1',
                });
                store.dispatch(clearAuth());
                const state = getState(store);
                expect(selectIsAuthenticated(state)).toBe(false);
                expect(selectUser(state)).toBeNull();
                expect(selectToken(state)).toBeNull();
            });

            it('clears sessionStorage', () => {
                sessionStorage.setItem('authToken', 'abc');
                const store = makeStore({ isAuthenticated: true });
                store.dispatch(clearAuth());
                expect(sessionStorage.getItem('authToken')).toBeNull();
            });
        });

        describe('updateUserProfile', () => {
            it('merges partial user data into the existing user', () => {
                const store = makeStore({ user: mockUser });
                store.dispatch(updateUserProfile({ name: 'Updated Name' }));
                expect(selectUser(getState(store))?.name).toBe('Updated Name');
            });

            it('is a no-op when user is null', () => {
                const store = makeStore({ user: null });
                store.dispatch(updateUserProfile({ name: 'Updated' }));
                expect(selectUser(getState(store))).toBeNull();
            });
        });

        describe('clearOtpState', () => {
            it('resets otpRequired and otpEmail', () => {
                const store = makeStore({ otpRequired: true, otpEmail: 'otp@test.com' });
                store.dispatch(clearOtpState());
                const state = getState(store);
                expect(selectOtpRequired(state)).toBe(false);
                expect(selectOtpEmail(state)).toBeNull();
            });
        });

        describe('updateActivity', () => {
            it('updates lastActivity to the current timestamp', () => {
                const before = Date.now();
                const store = makeStore({ lastActivity: 0 });
                store.dispatch(updateActivity());
                expect(getState(store).auth.lastActivity).toBeGreaterThanOrEqual(before);
            });
        });

        describe('setSessionTimeout', () => {
            it('updates sessionTimeout to the given value', () => {
                const store = makeStore();
                store.dispatch(setSessionTimeout(60_000));
                expect(getState(store).auth.sessionTimeout).toBe(60_000);
            });
        });

        describe('clearAlreadyLoggedIn', () => {
            it('sets isAlreadyLoggedIn to false', () => {
                const store = makeStore({ isAlreadyLoggedIn: true });
                store.dispatch(clearAlreadyLoggedIn());
                expect(selectIsAlreadyLoggedIn(getState(store))).toBe(false);
            });
        });

        describe('setAuthFromStorage', () => {
            it('sets token and isAuthenticated from storage data', () => {
                const store = makeStore({ isAuthenticated: false });
                store.dispatch(setAuthFromStorage({ token: 'stored-token', user: mockUser }));
                const state = getState(store);
                expect(selectToken(state)).toBe('stored-token');
                expect(selectIsAuthenticated(state)).toBe(true);
                expect(selectUser(state)).toEqual(mockUser);
            });

            it('sets isAuthenticated without user when user is omitted', () => {
                const store = makeStore({ isAuthenticated: false });
                store.dispatch(setAuthFromStorage({ token: 'tok' }));
                expect(selectIsAuthenticated(getState(store))).toBe(true);
                expect(selectUser(getState(store))).toBeNull();
            });
        });
    });

    // ── loginUser thunk ──────────────────────────────────────────────────────

    describe('loginUser thunk', () => {
        describe('pending', () => {
            it('sets isLoading to true', async () => {
                let resolve!: (v: unknown) => void;
                mockLoginApi.mockReturnValue(new Promise(r => (resolve = r)));
                const store = makeStore();
                const dispatch = store.dispatch(loginUser({ email: 'a@b.com', password: 'pass' }));
                expect(selectIsLoading(getState(store))).toBe(true);
                resolve(mockLoginResponse);
                await dispatch;
            });

            it('clears any previous error', async () => {
                mockLoginApi.mockResolvedValue({ ...mockLoginResponse, _email: 'a@b.com' });
                const store = makeStore({ error: { message: 'old error' } });
                await store.dispatch(loginUser({ email: 'a@b.com', password: 'pass' }));
                expect(selectAuthError(getState(store))).toBeNull();
            });
        });

        describe('fulfilled — OTP flow', () => {
            it('sets otpRequired when API returns OTP response', async () => {
                mockLoginApi.mockResolvedValue({ ...mockOtpResponse, _email: 'otp@test.com' });
                const store = makeStore();
                await store.dispatch(loginUser({ email: 'otp@test.com', password: 'pass' }));
                const state = getState(store);
                expect(selectOtpRequired(state)).toBe(true);
                expect(selectIsAuthenticated(state)).toBe(false);
            });

            it('stores the email for the OTP flow', async () => {
                mockLoginApi.mockResolvedValue({ ...mockOtpResponse, _email: 'otp@test.com' });
                const store = makeStore();
                await store.dispatch(loginUser({ email: 'otp@test.com', password: 'pass' }));
                expect(selectOtpEmail(getState(store))).toBe('otp@test.com');
            });
        });

        describe('fulfilled — direct login (access_token present)', () => {
            it('sets isAuthenticated to true', async () => {
                mockLoginApi.mockResolvedValue({ ...mockLoginResponse, _email: 'a@b.com' });
                const store = makeStore();
                await store.dispatch(loginUser({ email: 'a@b.com', password: 'pass' }));
                expect(selectIsAuthenticated(getState(store))).toBe(true);
            });

            it('stores user in state', async () => {
                mockLoginApi.mockResolvedValue({ ...mockLoginResponse, _email: 'a@b.com' });
                const store = makeStore();
                await store.dispatch(loginUser({ email: 'a@b.com', password: 'pass' }));
                expect(selectUser(getState(store))).toEqual(mockUser);
            });

            it('stores token in state', async () => {
                mockLoginApi.mockResolvedValue({ ...mockLoginResponse, _email: 'a@b.com' });
                const store = makeStore();
                await store.dispatch(loginUser({ email: 'a@b.com', password: 'pass' }));
                expect(selectToken(getState(store))).toBe('mock-access-token');
            });

            it('persists authToken to sessionStorage', async () => {
                mockLoginApi.mockResolvedValue({ ...mockLoginResponse, _email: 'a@b.com' });
                const store = makeStore();
                await store.dispatch(loginUser({ email: 'a@b.com', password: 'pass' }));
                expect(sessionStorage.getItem('authToken')).toBe('mock-access-token');
            });

            it('sets isLoading to false after success', async () => {
                mockLoginApi.mockResolvedValue({ ...mockLoginResponse, _email: 'a@b.com' });
                const store = makeStore();
                await store.dispatch(loginUser({ email: 'a@b.com', password: 'pass' }));
                expect(selectIsLoading(getState(store))).toBe(false);
            });

            it('clears otpRequired after direct login', async () => {
                mockLoginApi.mockResolvedValue({ ...mockLoginResponse, _email: 'a@b.com' });
                const store = makeStore({ otpRequired: true });
                await store.dispatch(loginUser({ email: 'a@b.com', password: 'pass' }));
                expect(selectOtpRequired(getState(store))).toBe(false);
            });
        });

        describe('fulfilled — already logged in', () => {
            it('sets isAlreadyLoggedIn to true', async () => {
                mockLoginApi.mockResolvedValue({ is_already_logged_in: true, error: 'Session active' });
                const store = makeStore();
                await store.dispatch(loginUser({ email: 'a@b.com', password: 'pass' }));
                expect(selectIsAlreadyLoggedIn(getState(store))).toBe(true);
                expect(selectIsAuthenticated(getState(store))).toBe(false);
            });
        });

        describe('rejected', () => {
            it('sets error message on failure', async () => {
                mockLoginApi.mockRejectedValue({
                    response: { data: { message: 'Invalid credentials' }, status: 401 },
                });
                const store = makeStore();
                await store.dispatch(loginUser({ email: 'a@b.com', password: 'wrong' }));
                expect(selectAuthError(getState(store))?.message).toBe('Invalid credentials');
            });

            it('sets isAuthenticated to false on failure', async () => {
                mockLoginApi.mockRejectedValue({ response: { data: { message: 'err' } } });
                const store = makeStore({ isAuthenticated: true });
                await store.dispatch(loginUser({ email: 'a@b.com', password: 'wrong' }));
                expect(selectIsAuthenticated(getState(store))).toBe(false);
            });

            it('sets isLoading to false on failure', async () => {
                mockLoginApi.mockRejectedValue({ response: { data: { message: 'err' } } });
                const store = makeStore();
                await store.dispatch(loginUser({ email: 'a@b.com', password: 'wrong' }));
                expect(selectIsLoading(getState(store))).toBe(false);
            });
        });
    });

    // ── verifyOtp thunk ──────────────────────────────────────────────────────

    describe('verifyOtp thunk', () => {
        describe('fulfilled', () => {
            it('sets isAuthenticated to true after OTP verification', async () => {
                mockVerifyOtpApi.mockResolvedValue(mockLoginResponse);
                const store = makeStore({ otpRequired: true, otpEmail: 'otp@test.com' });
                await store.dispatch(verifyOtp({ email: 'otp@test.com', otp: '123456' }));
                expect(selectIsAuthenticated(getState(store))).toBe(true);
            });

            it('clears otpRequired after successful verification', async () => {
                mockVerifyOtpApi.mockResolvedValue(mockLoginResponse);
                const store = makeStore({ otpRequired: true, otpEmail: 'otp@test.com' });
                await store.dispatch(verifyOtp({ email: 'otp@test.com', otp: '123456' }));
                expect(selectOtpRequired(getState(store))).toBe(false);
            });

            it('stores the user in state', async () => {
                mockVerifyOtpApi.mockResolvedValue(mockLoginResponse);
                const store = makeStore({ otpRequired: true });
                await store.dispatch(verifyOtp({ email: 'otp@test.com', otp: '123456' }));
                expect(selectUser(getState(store))).toEqual(mockUser);
            });

            it('persists authToken to sessionStorage', async () => {
                mockVerifyOtpApi.mockResolvedValue(mockLoginResponse);
                const store = makeStore();
                await store.dispatch(verifyOtp({ email: 'otp@test.com', otp: '123456' }));
                expect(sessionStorage.getItem('authToken')).toBe('mock-access-token');
            });
        });

        describe('rejected', () => {
            it('sets an error and keeps isAuthenticated false on OTP failure', async () => {
                mockVerifyOtpApi.mockRejectedValue({ response: { data: { message: 'Invalid OTP' } } });
                const store = makeStore({ otpRequired: true });
                await store.dispatch(verifyOtp({ email: 'otp@test.com', otp: 'wrong' }));
                const state = getState(store);
                expect(selectAuthError(state)?.message).toBe('Invalid OTP');
                expect(selectIsAuthenticated(state)).toBe(false);
            });
        });
    });

    // ── registerUser thunk ───────────────────────────────────────────────────

    describe('registerUser thunk', () => {
        it('sets isAuthenticated on successful registration', async () => {
            mockRegisterApi.mockResolvedValue(mockLoginResponse);
            const store = makeStore();
            await store.dispatch(registerUser({ username: 'newuser', email: 'new@test.com', password: 'pass' }));
            expect(selectIsAuthenticated(getState(store))).toBe(true);
        });

        it('stores user in state after registration', async () => {
            mockRegisterApi.mockResolvedValue(mockLoginResponse);
            const store = makeStore();
            await store.dispatch(registerUser({ username: 'newuser', email: 'new@test.com', password: 'pass' }));
            expect(selectUser(getState(store))).toEqual(mockUser);
        });

        it('sets error on registration failure', async () => {
            mockRegisterApi.mockRejectedValue({ response: { data: { message: 'Email taken' } } });
            const store = makeStore();
            await store.dispatch(registerUser({ username: 'x', email: 'x@x.com', password: 'p' }));
            expect(selectAuthError(getState(store))?.message).toBe('Email taken');
        });
    });

    // ── logoutUser thunk ─────────────────────────────────────────────────────

    describe('logoutUser thunk', () => {
        it('clears isAuthenticated after logout', async () => {
            mockLogoutApi.mockResolvedValue(undefined);
            const store = makeStore({ isAuthenticated: true, user: mockUser, token: 'abc' });
            await store.dispatch(logoutUser());
            expect(selectIsAuthenticated(getState(store))).toBe(false);
        });

        it('clears user from state', async () => {
            mockLogoutApi.mockResolvedValue(undefined);
            const store = makeStore({ isAuthenticated: true, user: mockUser });
            await store.dispatch(logoutUser());
            expect(selectUser(getState(store))).toBeNull();
        });

        it('clears sessionStorage', async () => {
            mockLogoutApi.mockResolvedValue(undefined);
            sessionStorage.setItem('authToken', 'abc');
            const store = makeStore({ isAuthenticated: true });
            await store.dispatch(logoutUser());
            expect(sessionStorage.getItem('authToken')).toBeNull();
        });

        it('completes logout even when the API call fails (best-effort)', async () => {
            mockLogoutApi.mockRejectedValue(new Error('Network error'));
            const store = makeStore({ isAuthenticated: true, user: mockUser });
            await store.dispatch(logoutUser());
            expect(selectIsAuthenticated(getState(store))).toBe(false);
        });

        it('resets otpRequired and sessionId', async () => {
            mockLogoutApi.mockResolvedValue(undefined);
            const store = makeStore({ isAuthenticated: true, otpRequired: true, sessionId: 'sess-1' });
            await store.dispatch(logoutUser());
            const state = getState(store);
            expect(selectOtpRequired(state)).toBe(false);
            expect(state.auth.sessionId).toBeNull();
        });
    });

    // ── validateSession thunk ────────────────────────────────────────────────

    describe('validateSession thunk', () => {
        it('returns true and does not change state when session is active', async () => {
            const store = makeStore({
                isAuthenticated: true,
                lastActivity: Date.now(),
                sessionTimeout: SESSION_TIMEOUT,
            });
            await store.dispatch(validateSession());
            expect(selectIsAuthenticated(getState(store))).toBe(true);
        });

        it('clears authentication when session has expired due to inactivity', async () => {
            const EXPIRED_ACTIVITY = Date.now() - SESSION_TIMEOUT - 1000;
            const store = makeStore({
                isAuthenticated: true,
                user: mockUser,
                lastActivity: EXPIRED_ACTIVITY,
                sessionTimeout: SESSION_TIMEOUT,
            });
            await store.dispatch(validateSession());
            expect(selectIsAuthenticated(getState(store))).toBe(false);
        });

        it('returns false immediately when not authenticated', async () => {
            const store = makeStore({ isAuthenticated: false });
            const result = await store.dispatch(validateSession());
            expect((result as any).payload).toBe(false);
            // State unchanged — already not authenticated
            expect(selectIsAuthenticated(getState(store))).toBe(false);
        });
    });

    // ── refreshActivity thunk ────────────────────────────────────────────────

    describe('refreshActivity thunk', () => {
        it('updates lastActivity in state', async () => {
            const before = Date.now();
            const store = makeStore({ lastActivity: 0 });
            await store.dispatch(refreshActivity());
            expect(getState(store).auth.lastActivity).toBeGreaterThanOrEqual(before);
        });

        it('persists lastActivity to sessionStorage', async () => {
            const store = makeStore();
            await store.dispatch(refreshActivity());
            expect(sessionStorage.getItem('lastActivity')).toBeTruthy();
        });
    });
});
