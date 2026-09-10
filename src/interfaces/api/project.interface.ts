/**
 * Project API Interfaces
 *
 * Purpose: Request/response types for the annotation/LLM-grading Project API
 * (create, update, list, and manage project user membership).
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/** Request body for POST /projects — creates a new project within an org/workspace. */
export interface ICreateProject {
    org_id: string;
    workspace_id: string;
    name: string;
    description: string;
    template_type: 'llm_grading' | 'text_annotation';
    start_date: string; // ISO date string
    end_date: string; // ISO date string
}

// Update project interface
/** Request body for updating a project; all fields besides `project_id` are optional. */
export interface IUpdateProject {
    project_id: string;
    name?: string;
    description?: string;
    template_type?: 'llm_grading' | 'text_annotation';
    status?: 'active' | 'completed' | 'archive';
    start_date?: string;
    end_date?: string;
    // Per-task timeout in seconds/minutes for annotation tasks in this project.
    task_timeout?: number;
}

// API response interface for getAllProjects
/** Paginated response from the list-projects endpoint. */
export interface IGetProjectsResponse {
    data: any[]; // Array of project objects
    total: number;
    limit: number;
    offset: number;
    message: string;
}

/** Request to add or remove users from a project's member list. */
export interface IUpdateProjectUsers {
    project_id: string;
    action: string; // 'add' | 'remove'
    // Email template used when notifying newly-added users.
    email_template_id: string;
    project_users: Array<{ user_id: string; role: string }>;
}
