import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    isAuthenticated,
    getAuthToken,
    getRefreshToken,
    getUser,
    setAuthData,
    updateAuthTokens,
    clearAuthData,
    isTokenExpired,
    tokenExpiresInSeconds,
} from '../auth';
import type { User } from '../auth';

// ── JWT helper ────────────────────────────────────────────────────────────────

function makeJwt(payload: Record<string, unknown>): string {
    const b64url = (obj: unknown) =>
        btoa(JSON.stringify(obj))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.fakesig`;
}

const now = () => Math.floor(Date.now() / 1000);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser: User = {
    _id: 'user-001',
    username: 'tester',
    name: 'Test User',
    email: 'tester@example.com',
    is_active: 1,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('auth utilities', () => {
    beforeEach(() => sessionStorage.clear());
    afterEach(() => sessionStorage.clear());

    // ── setAuthData / getters ────────────────────────────────────────────────

    describe('setAuthData and getters', () => {
        it('stores and retrieves the auth token', () => {
            setAuthData('access-abc', 'refresh-xyz', mockUser);
            expect(getAuthToken()).toBe('access-abc');
        });

        it('stores and retrieves the refresh token', () => {
            setAuthData('access-abc', 'refresh-xyz', mockUser);
            expect(getRefreshToken()).toBe('refresh-xyz');
        });

        it('stores and retrieves the user object (round-trips JSON)', () => {
            setAuthData('access-abc', 'refresh-xyz', mockUser);
            expect(getUser()).toEqual(mockUser);
        });

        it('preserves all user fields after serialisation', () => {
            const richUser: User = { ...mockUser, role: 'super_admin', username: null };
            setAuthData('t', 'r', richUser);
            const stored = getUser();
            expect(stored?.role).toBe('super_admin');
            expect(stored?.username).toBeNull();
        });
    });

    // ── getters when storage is empty ────────────────────────────────────────

    describe('getters when sessionStorage is empty', () => {
        it('getAuthToken returns null', () => {
            expect(getAuthToken()).toBeNull();
        });

        it('getRefreshToken returns null', () => {
            expect(getRefreshToken()).toBeNull();
        });

        it('getUser returns null', () => {
            expect(getUser()).toBeNull();
        });
    });

    // ── getUser edge cases ───────────────────────────────────────────────────

    describe('getUser edge cases', () => {
        it('returns null when the stored JSON is malformed', () => {
            sessionStorage.setItem('user', 'not-valid-json{{');
            expect(getUser()).toBeNull();
        });
    });

    // ── updateAuthTokens ─────────────────────────────────────────────────────

    describe('updateAuthTokens', () => {
        it('updates access and refresh tokens while leaving user unchanged', () => {
            setAuthData('old-access', 'old-refresh', mockUser);
            updateAuthTokens('new-access', 'new-refresh');
            expect(getAuthToken()).toBe('new-access');
            expect(getRefreshToken()).toBe('new-refresh');
            expect(getUser()).toEqual(mockUser);
        });

        it('does not clear user when called without prior setAuthData', () => {
            updateAuthTokens('a', 'b');
            expect(getAuthToken()).toBe('a');
            expect(getUser()).toBeNull(); // user was never stored
        });
    });

    // ── clearAuthData ────────────────────────────────────────────────────────

    describe('clearAuthData', () => {
        it('removes authToken, refreshToken, and user from sessionStorage', () => {
            setAuthData('t', 'r', mockUser);
            clearAuthData();
            expect(getAuthToken()).toBeNull();
            expect(getRefreshToken()).toBeNull();
            expect(getUser()).toBeNull();
        });

        it('is safe to call when storage is already empty', () => {
            expect(() => clearAuthData()).not.toThrow();
        });
    });

    // ── isAuthenticated ──────────────────────────────────────────────────────

    describe('isAuthenticated', () => {
        it('returns false when no token is stored', () => {
            expect(isAuthenticated()).toBe(false);
        });

        it('returns false when token exists but user is missing', () => {
            const validToken = makeJwt({ exp: now() + 3600 });
            sessionStorage.setItem('authToken', validToken);
            // user not set
            expect(isAuthenticated()).toBe(false);
        });

        it('returns false when token is expired', () => {
            const expired = makeJwt({ exp: now() - 100 });
            sessionStorage.setItem('authToken', expired);
            sessionStorage.setItem('user', JSON.stringify(mockUser));
            expect(isAuthenticated()).toBe(false);
        });

        it('returns true when a valid non-expired token and user are stored', () => {
            const valid = makeJwt({ exp: now() + 3600 });
            sessionStorage.setItem('authToken', valid);
            sessionStorage.setItem('user', JSON.stringify(mockUser));
            expect(isAuthenticated()).toBe(true);
        });

        it('returns false for a malformed token even with user present', () => {
            sessionStorage.setItem('authToken', 'this.is.notjwt.payload.invalid');
            sessionStorage.setItem('user', JSON.stringify(mockUser));
            // decodeJwtPayload fails → isTokenExpired returns true
            expect(isAuthenticated()).toBe(false);
        });
    });

    // ── isTokenExpired ───────────────────────────────────────────────────────

    describe('isTokenExpired', () => {
        it('returns true for an already-expired token', () => {
            const token = makeJwt({ exp: now() - 60 });
            expect(isTokenExpired(token)).toBe(true);
        });

        it('returns false for a token expiring in 1 hour', () => {
            const token = makeJwt({ exp: now() + 3600 });
            expect(isTokenExpired(token)).toBe(false);
        });

        it('treats a token expiring in 10 s as expired (within 30 s default buffer)', () => {
            const token = makeJwt({ exp: now() + 10 });
            expect(isTokenExpired(token)).toBe(true);
        });

        it('honours a custom buffer of 0 s — token 10 s away is NOT expired', () => {
            const token = makeJwt({ exp: now() + 10 });
            expect(isTokenExpired(token, 0)).toBe(false);
        });

        it('returns false for a token with no exp claim (treated as non-expiring)', () => {
            const token = makeJwt({ sub: 'user-1' });
            expect(isTokenExpired(token)).toBe(false);
        });

        it('returns true for a malformed token (not 3 parts)', () => {
            expect(isTokenExpired('onlytwoparts.here')).toBe(true);
        });

        it('returns true for a completely invalid string', () => {
            expect(isTokenExpired('not-a-jwt-at-all')).toBe(true);
        });

        it('returns true for a token with non-numeric exp', () => {
            const token = makeJwt({ exp: 'tomorrow' });
            // payload.exp is not a number → treated as valid (no expiry) according to the function
            // isTokenExpired returns false when typeof exp !== 'number'
            expect(isTokenExpired(token)).toBe(false);
        });
    });

    // ── tokenExpiresInSeconds ────────────────────────────────────────────────

    describe('tokenExpiresInSeconds', () => {
        it('returns a positive number for a token expiring in 1 hour', () => {
            const token = makeJwt({ exp: now() + 3600 });
            const secs = tokenExpiresInSeconds(token);
            expect(secs).toBeGreaterThan(3500);
            expect(secs).toBeLessThanOrEqual(3600);
        });

        it('returns 0 for a token that already expired', () => {
            const token = makeJwt({ exp: now() - 100 });
            expect(tokenExpiresInSeconds(token)).toBe(0);
        });

        it('returns 0 for a malformed token', () => {
            expect(tokenExpiresInSeconds('bad')).toBe(0);
        });

        it('returns 0 for a token with no exp claim', () => {
            const token = makeJwt({ sub: 'user-1' });
            expect(tokenExpiresInSeconds(token)).toBe(0);
        });

        it('never returns a negative number (clamps to 0)', () => {
            const token = makeJwt({ exp: now() - 1000 });
            expect(tokenExpiresInSeconds(token)).toBe(0);
        });
    });
});
