/**
 * Preload utilities for lazy-loaded components
 * These functions allow components to be preloaded on hover or on mount
 * to improve perceived performance
 *
 * Purpose: Each export is a thin wrapper around a dynamic `import()` for a
 * route/dialog that `AppRouter.tsx` otherwise lazy-loads with `React.lazy`.
 * Calling one of these (e.g. `onMouseEnter={preloadUsers}` on a nav link)
 * kicks off the chunk fetch ahead of navigation/opening the dialog, so by the
 * time the user actually triggers the route change or dialog open, the code
 * is already in the module cache and renders without a loading flash.
 * @returns The dynamic `import()` promise for the corresponding module (usually
 * discarded by the caller — the side effect of warming the module cache is the point).
 */

// Preload functions for each lazy-loaded page
export const preloadHome = () => import('../pages/Home');
export const preloadLogin = () => import('../pages/Login');
export const preloadDashboard = () => import('../pages/Dashboard');
export const preloadAnalytics = () => import('../pages/Analytics');
export const preloadSettings = () => import('../pages/Settings');
export const preloadWorkspaceProjects = () => import('../pages/WorkspaceProjects');
export const preloadUsers = () => import('../pages/Users');
export const preloadProjectTemplates = () => import('../pages/ProjectTemplates');
export const preloadAcceptInvitation = () => import('../pages/AcceptInvitation');
export const preloadEmailTemplatesPage = () => import('../pages/EmailTemplatesPage');
export const preloadForgotPassword = () => import('../pages/ForgotPassword');

// Preload functions for heavy dialog components
export const preloadProjectCreationDialog = () => import('../components/common/ProjectCreationDialog');
export const preloadUserCreationDialog = () => import('../components/common/UserCreationDialog');
export const preloadEmailTemplateManagement = () => import('../components/common/EmailTemplateManagement');
