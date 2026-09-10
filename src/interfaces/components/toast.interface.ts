/**
 * Toast/Snackbar Component Interfaces
 *
 * Type definitions for the Toast notification system.
 *
 * Purpose: Types backing the `useToast()` hook/context used for user-visible
 * success/error/warning/info notifications app-wide.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

import type { AlertColor } from '@mui/material';

/**
 * Configuration options for displaying a toast notification
 */
export interface ToastOptions {
    message: string;
    severity?: AlertColor;
    duration?: number;
    position?: {
        vertical: 'top' | 'bottom';
        horizontal: 'left' | 'center' | 'right';
    };
}

/**
 * Context type for the Toast provider
 * Provides methods to show different types of toast notifications
 */
export interface ToastContextType {
    showToast: (options: ToastOptions) => void;
    showSuccess: (message: string, duration?: number) => void;
    showError: (message: string, duration?: number) => void;
    showWarning: (message: string, duration?: number) => void;
    showInfo: (message: string, duration?: number) => void;
}
