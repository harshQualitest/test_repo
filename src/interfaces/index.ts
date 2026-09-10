/**
 * Interfaces Main Barrel Export
 *
 * Central export point for all application interfaces.
 * Import from specific subfolders for better tree-shaking and clarity.
 *
 * Purpose: Aggregates every interface subfolder (components, redux, api, utils,
 * hooks) plus legacy top-level interface files into one import surface.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

// Component interfaces
export * from './components';

// Redux interfaces
export * from './redux';

// API interfaces
export * from './api';

// Utility interfaces
export * from './utils';

// Hook interfaces
export * from './hooks';

// Legacy exports (for backward compatibility - will be removed in future)
export type {
    TableColumn,
    TableFilter,
    TableSort,
    TablePagination,
    TableAction as GridTableAction,
    GridViewProps,
} from './GridInterface';

export type {
    EmailTemplate,
    CreateEmailTemplate,
    UpdateEmailTemplate,
    EmailTemplateVariable,
    EmailPreviewData,
} from './emailTemplateInterface';
