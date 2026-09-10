/**
 * Project Redux Slice Interfaces
 *
 * Type definitions for the project management Redux slice.
 *
 * Purpose: Project entity and slice state for the general project-management
 * Redux slice (distinct from the data-collection project types in
 * `api/dataCollection.interface.ts`).
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/**
 * Project model representing a project entity
 */
export interface IProject {
    id: string;
    org_id: string;
    workspace_id: string;
    name: string;
    description: string;
    template_type: 'agile' | 'waterfall' | 'kanban' | 'custom' | 'basic';
    start_date: string;
    end_date: string;
    created_at?: string;
    updated_at?: string;
    status?: 'active' | 'completed' | 'archived';
    progress?: number;
}

/**
 * Redux state for project management
 */
export interface ProjectState {
    projects: IProject[];
    currentProject: IProject | null;
    loading: boolean;
    error: string | null;
    createLoading: boolean;
    createError: string | null;
    createSuccess: boolean;
}
