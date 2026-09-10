import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Mock auth utilities ───────────────────────────────────────────────────────

vi.mock('../../utils/auth', () => ({
    isAuthenticated: vi.fn(),
    getUser: vi.fn(),
    getAuthToken: vi.fn(),
}));

import { isAuthenticated, getUser, getAuthToken } from '../../utils/auth';
import { useAuth } from '../useAuth';

const mockIsAuthenticated = vi.mocked(isAuthenticated);
const mockGetUser = vi.mocked(getUser);
const mockGetAuthToken = vi.mocked(getAuthToken);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsAuthenticated.mockReturnValue(false);
        mockGetUser.mockReturnValue(null);
        mockGetAuthToken.mockReturnValue(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── Initial state (unauthenticated) ───────────────────────────────────────

    describe('initial state — unauthenticated', () => {
        it('returns isAuthenticated=false when auth utilities return false/null', () => {
            const { result } = renderHook(() => useAuth());
            expect(result.current.isAuthenticated).toBe(false);
        });

        it('returns user=null when getUser returns null', () => {
            const { result } = renderHook(() => useAuth());
            expect(result.current.user).toBeNull();
        });

        it('returns token=null when getAuthToken returns null', () => {
            const { result } = renderHook(() => useAuth());
            expect(result.current.token).toBeNull();
        });
    });

    // ── Initial state (authenticated) ─────────────────────────────────────────

    describe('initial state — authenticated', () => {
        const fakeUser = { _id: 'u1', name: 'Alice', email: 'alice@example.com' } as any;
        const fakeToken = 'header.payload.sig';

        beforeEach(() => {
            mockIsAuthenticated.mockReturnValue(true);
            mockGetUser.mockReturnValue(fakeUser);
            mockGetAuthToken.mockReturnValue(fakeToken);
        });

        it('returns isAuthenticated=true', () => {
            const { result } = renderHook(() => useAuth());
            expect(result.current.isAuthenticated).toBe(true);
        });

        it('returns the user object from getUser', () => {
            const { result } = renderHook(() => useAuth());
            expect(result.current.user).toEqual(fakeUser);
        });

        it('returns the token from getAuthToken', () => {
            const { result } = renderHook(() => useAuth());
            expect(result.current.token).toBe(fakeToken);
        });
    });

    // ── checkAuth function ────────────────────────────────────────────────────

    describe('checkAuth', () => {
        it('is exposed as a function', () => {
            const { result } = renderHook(() => useAuth());
            expect(typeof result.current.checkAuth).toBe('function');
        });

        it('updates state when called after auth changes', () => {
            mockIsAuthenticated.mockReturnValue(false);
            mockGetUser.mockReturnValue(null);
            mockGetAuthToken.mockReturnValue(null);

            const { result } = renderHook(() => useAuth());
            expect(result.current.isAuthenticated).toBe(false);

            // Simulate login
            const fakeUser = { _id: 'u1', name: 'Alice', email: 'alice@example.com' } as any;
            mockIsAuthenticated.mockReturnValue(true);
            mockGetUser.mockReturnValue(fakeUser);
            mockGetAuthToken.mockReturnValue('new-token');

            act(() => {
                result.current.checkAuth();
            });

            expect(result.current.isAuthenticated).toBe(true);
            expect(result.current.user).toEqual(fakeUser);
            expect(result.current.token).toBe('new-token');
        });

        it('clears state when called after logout', () => {
            const fakeUser = { _id: 'u1', name: 'Alice', email: 'alice@example.com' } as any;
            mockIsAuthenticated.mockReturnValue(true);
            mockGetUser.mockReturnValue(fakeUser);
            mockGetAuthToken.mockReturnValue('token');

            const { result } = renderHook(() => useAuth());
            expect(result.current.isAuthenticated).toBe(true);

            // Simulate logout
            mockIsAuthenticated.mockReturnValue(false);
            mockGetUser.mockReturnValue(null);
            mockGetAuthToken.mockReturnValue(null);

            act(() => {
                result.current.checkAuth();
            });

            expect(result.current.isAuthenticated).toBe(false);
            expect(result.current.user).toBeNull();
            expect(result.current.token).toBeNull();
        });
    });

    // ── Storage event listener ────────────────────────────────────────────────

    describe('storage event listener', () => {
        it('re-checks auth when a relevant storage event fires (authToken key)', () => {
            mockIsAuthenticated.mockReturnValue(false);
            mockGetUser.mockReturnValue(null);
            mockGetAuthToken.mockReturnValue(null);

            const { result } = renderHook(() => useAuth());
            expect(result.current.isAuthenticated).toBe(false);

            // Simulate login in another tab
            mockIsAuthenticated.mockReturnValue(true);
            mockGetUser.mockReturnValue({ _id: 'u1' } as any);
            mockGetAuthToken.mockReturnValue('tok');

            act(() => {
                globalThis.dispatchEvent(new StorageEvent('storage', { key: 'authToken' }));
            });

            expect(result.current.isAuthenticated).toBe(true);
        });

        it('does NOT re-check auth for unrelated storage keys', () => {
            mockIsAuthenticated.mockReturnValue(false);
            renderHook(() => useAuth());

            // isAuthenticated should not be called again for unrelated keys
            const callsBefore = mockIsAuthenticated.mock.calls.length;

            act(() => {
                globalThis.dispatchEvent(new StorageEvent('storage', { key: 'someOtherKey' }));
            });

            expect(mockIsAuthenticated.mock.calls.length).toBe(callsBefore);
        });

        it('removes the storage event listener on unmount', () => {
            const removeEventListenerSpy = vi.spyOn(globalThis, 'removeEventListener');
            const { unmount } = renderHook(() => useAuth());

            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
        });
    });
});
