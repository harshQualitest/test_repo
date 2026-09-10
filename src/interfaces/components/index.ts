/**
 * Component Interfaces Barrel Export
 *
 * Central export point for all component-related interfaces.
 *
 * Purpose: Aggregates prop/type definitions for shared UI components
 * (tables, inputs, toasts, dialogs) into one import surface.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

// Table component interfaces
export type { Column, TableAction, CommonTableProps } from './commonTable.interface';

// Input component interfaces
export type { InputProps } from './input.interface';

// Toast/Snackbar interfaces
export type { ToastOptions, ToastContextType } from './toast.interface';

// Dialog/Form interfaces
export type {
    WorkspaceFormData,
    UserFormData,
    OrganizationFormData,
    WorkspaceCreateDialogProps,
    UserCreationDialogProps,
    OrganizationDialogProps,
} from './dialog.interface';
