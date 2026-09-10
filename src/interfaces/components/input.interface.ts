/**
 * Input Component Interfaces
 *
 * Type definitions for the custom Input component which extends
 * Material-UI's TextField with additional features.
 *
 * Purpose: Props contract for the shared Input wrapper around MUI TextField.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

import type { TextFieldProps } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * Props for the custom Input component
 * Extends Material-UI TextField props with custom features
 */
export interface InputProps extends Omit<TextFieldProps, 'variant'> {
    /** The input variant - outlined, filled, or standard */
    variant?: 'outlined' | 'filled' | 'standard';
    /** Whether this is a password field with toggle visibility */
    isPassword?: boolean;
    /** Icon to display at the start of the input */
    startIcon?: ReactNode;
    /** Icon to display at the end of the input */
    endIcon?: ReactNode;
    /** Custom placeholder text */
    placeholder?: string;
    /** Whether the input should have focus on mount */
    autoFocus?: boolean;
}
