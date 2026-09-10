import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useAppSelector } from "../redux/hooks";
import { selectIsAuthenticated, selectUser } from "../redux/slices/loginSlice";
import { 
    getUserRole, 
    canAccessRoute, 
    getDefaultRouteForRole,
    hasEqualOrHigherPrivilege,
    type RoleType 
} from "../utils/roles";

interface ProtectedRouteProps {
    children: ReactNode;
    /** Specific roles allowed to access this route */
    allowedRoles?: string[];
    /** Minimum role required (uses role hierarchy) */
    minRole?: RoleType;
}

/**
 * Route-level authentication + RBAC gate.
 *
 * Wraps any route element (see usage in `routes/AppRouter.tsx`) and enforces,
 * in order, four independent checks — any one failing short-circuits to a
 * redirect instead of rendering `children`. This is the app's single
 * enforcement point for "is the user allowed to see this page at all";
 * per-widget/action permission checks still happen separately via
 * conditional rendering (see `src/utils/roles.ts` `hasPermission`).
 *
 * Checks, in order:
 *  1. Authenticated at all (`isAuthenticated` from the login slice). If not,
 *     redirect to `/login`, carrying `location` in router state so the login
 *     page can send the user back to where they were headed after signing in.
 *  2. Role-based route access (`canAccessRoute`) — does this role's allowed-
 *     route list (or wildcard) cover the current pathname. Failing this means
 *     the role exists but this particular path isn't in its allow-list.
 *  3. Explicit `allowedRoles` prop, when the caller wants to restrict a route
 *     to a hard-coded set of roles (e.g. reviewer-only review pages)
 *     regardless of the broader route table.
 *  4. `minRole` prop — hierarchical minimum privilege check, for routes that
 *     should be open to a role and everything above it rather than an exact
 *     role list.
 *
 * On any role/permission failure (checks 2-4) the user is redirected to
 * their own role's default landing route (`getDefaultRouteForRole`) rather
 * than `/login`, since they ARE authenticated — only unauthenticated users
 * get bounced to `/login`. All redirects use `replace` so the disallowed
 * route doesn't linger in browser history.
 *
 * @param children - The protected route's element tree, rendered only if
 *   every check above passes.
 * @param allowedRoles - Optional explicit role whitelist for this route.
 * @param minRole - Optional minimum role in the role hierarchy.
 * @returns Either `children` or a `<Navigate>` redirect element.
 */
const ProtectedRoute = ({ children, allowedRoles, minRole }: ProtectedRouteProps) => {
    const location = useLocation();
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const user = useAppSelector(selectUser);

    // Memoize role calculation for performance
    // Recomputed only when `user` changes — avoids re-deriving role/route on
    // every render (e.g. when unrelated slices of Redux state update).
    const userRole = useMemo(() => getUserRole(user), [user]);
    const defaultRoute = useMemo(() => getDefaultRouteForRole(userRole), [userRole]);

    if (!isAuthenticated) {
        // Redirect to login page with the current location
        // so we can redirect back after successful login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if user can access the current route based on their role
    const currentPath = location.pathname;
    const hasRouteAccess = canAccessRoute(userRole, currentPath);

    if (!hasRouteAccess) {
        // Redirect to their default allowed route
        return <Navigate to={defaultRoute} replace />;
    }

    // Check for specific allowed roles if provided
    // Case-insensitive comparison since role strings may come from different
    // sources (direct role field vs. organization role) with inconsistent casing.
    if (allowedRoles && allowedRoles.length > 0) {
        const isAllowed = allowedRoles.some(role => 
            role.toLowerCase() === userRole.toLowerCase()
        );
        if (!isAllowed) {
            return <Navigate to={defaultRoute} replace />;
        }
    }

    // Check minimum role requirement using hierarchy
    // Only enforced when the caller opts in via `minRole`; absent it, any
    // role that passed the route-access check above is sufficient.
    if (minRole && !hasEqualOrHigherPrivilege(userRole, minRole)) {
        return <Navigate to={defaultRoute} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;