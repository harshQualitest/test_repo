/**
 * Authentication Hook Interfaces
 *
 * Type definitions for authentication-related hooks.
 *
 * Purpose: Return-type contract for the `useAuth` hook consumed by
 * `ProtectedRoute` and components needing auth/session state.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

import type { AuthUser } from '../utils/auth.interface';

/**
 * Return type for useAuth hook
 */
export interface UseAuthReturn {
    isAuthenticated: boolean;
    user: AuthUser | null;
    token: string | null;
    // Re-validates the current session (e.g. re-reads token/user from storage).
    checkAuth: () => void;
}
