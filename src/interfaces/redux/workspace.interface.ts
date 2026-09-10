/**
 * Workspace Redux Slice Interfaces
 *
 * Type definitions for the workspace management Redux slice.
 *
 * Purpose: Workspace entity (extending the API's CreateWorkspace shape) and
 * slice state for the workspace management screens.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

import type { CreateWorkspace } from '../api/workspace.interface';

/**
 * Workspace model representing a workspace entity
 * Extends CreateWorkspace with additional fields
 */
export interface Workspace extends CreateWorkspace {
    _id: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    memberCount?: number;
    status?: 'active' | 'inactive' | 'archived';
}

/**
 * Redux state for workspace management
 */
export interface WorkspaceState {
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    loading: boolean;
    error: string | null;
    createLoading: boolean;
    updateLoading: boolean;
    deleteLoading: boolean;
}
