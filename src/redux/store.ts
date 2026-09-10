import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "./slices/counterSlice";
import authReducer from "./slices/loginSlice";
import organizationReducer from "./slices/organizationSlice";
import workspaceReducer from "./slices/workspaceSlice";
import userReducer from "./slices/userSlice";
import rolesReducer from "./slices/rolesSlice";
import emailTemplateReducer from "./slices/emailTemplateSlice";
import invitationReducer from "./slices/invitationSlice";
import projectReducer from "./slices/projectSlice";
import userAnnotationReducer from "./slices/userAnnotationSlice";
import workspaceDashboardReducer from "./slices/workspaceDashboardSlice";
import projectDashboardReducer from "./slices/dashboardSlice";
import taskDashboardReducer from "./slices/taskDashboardSlice";
import taskPreviewReducer from "./slices/taskPreviewSlice";
import dataCollectionReducer from "./slices/dataCollectionSlice";

/**
 * The application's single Redux store.
 *
 * Composition: `configureStore` registers one reducer per domain slice,
 * keyed by the name each slice is addressed by throughout the app (note
 * some keys intentionally differ from the slice's internal `name` field —
 * e.g. `loginSlice` is registered as `auth`, and `dashboardSlice` (whose
 * internal slice name is `projectDashboard`) is registered as
 * `projectDashboard` here for clarity alongside `workspaceDashboard` and
 * `taskDashboard`):
 * - `counter` — demo/example slice (`counterSlice`), not domain data.
 * - `auth` — authentication/session state (`loginSlice`).
 * - `organization` — organizations list/selection/dashboard metrics (`organizationSlice`).
 * - `workspace` — workspaces, membership, and per-workspace pagination (`workspaceSlice`).
 * - `user` — the org/workspace user directory (`userSlice`).
 * - `roles` — the RBAC role/permission catalog (`rolesSlice`).
 * - `emailTemplates` — email template CRUD (`emailTemplateSlice`).
 * - `invitation` — invite validation/acceptance/bulk-invite (`invitationSlice`).
 * - `project` — projects, their tasks, and members (`projectSlice`).
 * - `userAnnotation` — annotator/reviewer task queues and submissions (`userAnnotationSlice`).
 * - `workspaceDashboard` — workspace-level dashboard metrics (`workspaceDashboardSlice`).
 * - `projectDashboard` — project-level dashboard metrics (`dashboardSlice`).
 * - `taskDashboard` — single-task dashboard (transformed) data (`taskDashboardSlice`).
 * - `taskPreview` — single-task preview (raw) data (`taskPreviewSlice`).
 * - `dataCollection` — data-collection project workflow (`dataCollectionSlice`).
 *
 * Middleware: none configured explicitly — `configureStore` applies RTK's
 * default middleware (thunk + the dev-only serializable/immutable state
 * checks). No `serializableCheck` exceptions are currently needed because
 * this store does not keep non-serializable values (e.g. `File`/`FormData`
 * instances, which are only ever thunk *arguments*, not stored state) in
 * the Redux state tree itself.
 *
 * Any new domain slice must be registered here under its own key, or
 * `useAppSelector` will silently return `undefined` for it.
 */
export const store = configureStore({
  reducer: {
    counter: counterReducer,
    auth: authReducer,
    organization: organizationReducer,
    workspace: workspaceReducer,
    user: userReducer,
    roles: rolesReducer,
    emailTemplates: emailTemplateReducer,
    invitation: invitationReducer,
    project: projectReducer,
    userAnnotation: userAnnotationReducer,
    workspaceDashboard: workspaceDashboardReducer,
    projectDashboard: projectDashboardReducer,
    taskDashboard: taskDashboardReducer,
    taskPreview: taskPreviewReducer,
    dataCollection: dataCollectionReducer,
  },
});

/** The full Redux state tree shape, inferred from the store itself — use with `useAppSelector`. */
export type RootState = ReturnType<typeof store.getState>;
/** The store's dispatch type, including thunk support — use with `useAppDispatch`. */
export type AppDispatch = typeof store.dispatch;