/**
 * Barrel file for `src/pages/`. Re-exports each listed route-level page
 * component as a named export so callers can
 * `import { Login, Settings, ... } from '../pages'` instead of reaching into
 * individual page files. Not every file under `src/pages/` is re-exported
 * here (e.g. `UserWorkspaceProjects` and `WorkspaceProjectsRouter` are
 * imported directly by their consumers instead).
 */
export { default as Home } from './Home';
export { default as Login } from './Login';
export { default as Dashboard } from './Dashboard';
export { default as Analytics } from './Analytics';
export { default as Settings } from './Settings';
export { default as Users } from './Users';
export { default as WorkspaceProjects } from './WorkspaceProjects';
export { default as ProjectTemplates } from './ProjectTemplates';
export { default as AcceptInvitation } from './AcceptInvitation';
export { default as Support } from './Support';
export { default as EmailTemplatesPage } from './EmailTemplatesPage';
export { default as ForgotPassword } from './ForgotPassword';
export { default as UserAnnotationScreen } from './UserAnnotationScreen';
export {default as ProjectDetails} from './ProjectDetails'; 
export {default as WorkspaceDashboard} from './WorkspaceDashboard';
export {default as ProjectDashboard} from './ProjectDashboard';
export {default as TaskDashboard} from './TaskDashboard';
export {default as DetailAnalysisDashboard} from './DetailAnalysisDashboard';
export {default as ReviewPage} from './ReviewPage';
export {default as TaskDetail} from './TaskDetail';
export {default as PageNotFound} from './PageNotFound';