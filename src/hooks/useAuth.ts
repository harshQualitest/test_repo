/**
 * Purpose: React-friendly wrapper around the plain `utils/auth.ts` helpers,
 * exposing authentication state (`isAuthenticated`, `user`, `token`) as React
 * state that re-renders components when it changes — instead of components
 * having to call `isAuthenticated()`/`getUser()` imperatively and manage their
 * own re-render triggers.
 *
 * Use this hook (rather than calling `utils/auth` functions directly in a
 * component body) whenever a component needs to reactively read/display the
 * current auth state, including staying in sync when auth changes in another
 * browser tab (e.g. logout there should reflect here).
 */
import { useState, useEffect } from 'react';
import { isAuthenticated, getUser, getAuthToken } from '../utils/auth';
import type { User } from '../utils/auth';

export interface UseAuthReturn {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    checkAuth: () => void;
}

/**
 * Custom hook for authentication state management
 * @returns `{ isAuthenticated, user, token, checkAuth }` — the current auth state read from
 * `utils/auth` (backed by sessionStorage), plus `checkAuth()` to force an immediate re-read
 * (e.g. right after a login/logout action in this same tab).
 */
export const useAuth = (): UseAuthReturn => {
    const [authenticated, setAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Re-reads all three pieces of auth state from sessionStorage (via
    // utils/auth) into React state, so components re-render with fresh values.
    const checkAuth = () => {
        const authStatus = isAuthenticated();
        const userData = getUser();
        const authToken = getAuthToken();

        setAuthenticated(authStatus);
        setUser(userData);
        setToken(authToken);
    };

    // Runs once on mount: does the initial auth read, then subscribes to the
    // browser's `storage` event so auth changes made elsewhere (e.g. another
    // window/tab sharing this session) are picked up without a page reload.
    // Cleanup removes the listener on unmount to avoid updating state on an
    // unmounted component.
    useEffect(() => {
        checkAuth();

        // Listen for storage changes (e.g., when user logs in/out in another tab)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'authToken' || e.key === 'refreshToken' || e.key === 'user') {
                checkAuth();
            }
        };

        globalThis.addEventListener('storage', handleStorageChange);

        return () => {
            globalThis.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return {
        isAuthenticated: authenticated,
        user,
        token,
        checkAuth,
    };
};