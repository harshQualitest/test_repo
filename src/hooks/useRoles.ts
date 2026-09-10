/**
 * Purpose: React hook facade over `redux/slices/rolesSlice` — the roles/
 * permissions data fetched from `services/api/rolesApi.ts`. Automatically
 * (re)fetches when the cached data is missing or stale, and exposes lookup
 * helpers (`getRoleById`, `hasPermission`, etc.) so components don't need to
 * duplicate role-lookup logic against the raw Redux state. Prefer this hook
 * over dispatching `fetchRoles`/reading `rolesSlice` selectors directly.
 */
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
    fetchRoles,
    selectRoles,
    selectPermissions,
    selectRolesLoading,
    selectRolesError,
    selectLastFetch,
} from '../redux/slices/rolesSlice';

/**
 * Custom hook for managing roles and permissions data
 * Automatically fetches data if not already loaded or if stale
 * 
 * @param autoFetch - Whether to automatically fetch data on mount (default: true)
 * @param refetchInterval - Time in minutes after which data is considered stale (default: 30)
 * @returns Object containing roles data (`roles`, `permissions`, `loading`, `error`,
 * `lastFetch`), status helpers (`hasData`, `isStale`), an imperative `refetch`, and
 * per-role lookup helpers (`getRoleById`, `getRoleByRoleId`, `hasPermission`, `getRolePermissions`).
 */
export const useRoles = (autoFetch = true, refetchInterval = 30) => {
    const dispatch = useAppDispatch();
    
    const roles = useAppSelector(selectRoles);
    const permissions = useAppSelector(selectPermissions);
    const loading = useAppSelector(selectRolesLoading);
    const error = useAppSelector(selectRolesError);
    const lastFetch = useAppSelector(selectLastFetch);

    // Check if data is stale — compares the cached fetch timestamp against
    // `refetchInterval` so long-lived sessions don't keep serving roles data
    // that may have changed server-side.
    const isDataStale = () => {
        if (!lastFetch) return true;
        const lastFetchTime = new Date(lastFetch);
        const now = new Date();
        const diffInMinutes = (now.getTime() - lastFetchTime.getTime()) / (1000 * 60);
        return diffInMinutes > refetchInterval;
    };

    // Fetch data if needed: runs on mount and whenever `autoFetch`/`roles.length`
    // changes, dispatching `fetchRoles` only when the cache is empty or stale —
    // avoids redundant network calls on every re-render.
    useEffect(() => {
        if (autoFetch && (roles.length === 0 || isDataStale())) {
            dispatch(fetchRoles());
        }
    }, [autoFetch, dispatch, roles.length]);

    // Helper functions
    /** Forces a re-fetch of roles/permissions regardless of staleness. */
    const refetch = () => {
        dispatch(fetchRoles());
    };

    /** Looks up a role by its Mongo-style `_id`. */
    const getRoleById = (roleId: string) => {
        return roles.find(role => role._id === roleId);
    };

    /** Looks up a role by its business-level `role_id` (e.g. 'annotator'). */
    const getRoleByRoleId = (roleId: string) => {
        return roles.find(role => role.role_id === roleId);
    };

    /** Checks whether the role identified by `roleId` has a specific `permissionId`. */
    const hasPermission = (roleId: string, permissionId: string) => {
        const role = getRoleByRoleId(roleId);
        return role?.permissions.some(p => p.permission_id === permissionId) || false;
    };

    /** Returns all permissions for the role identified by `roleId` (empty array if not found). */
    const getRolePermissions = (roleId: string) => {
        const role = getRoleByRoleId(roleId);
        return role?.permissions || [];
    };

    return {
        // Data
        roles,
        permissions,
        loading,
        error,
        lastFetch,
        
        // Status helpers
        hasData: roles.length > 0,
        isStale: isDataStale(),
        
        // Actions
        refetch,
        
        // Helper functions
        getRoleById,
        getRoleByRoleId,
        hasPermission,
        getRolePermissions,
    };
};

export default useRoles;