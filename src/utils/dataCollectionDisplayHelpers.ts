/**
 * Purpose: Small, presentation-only helpers shared by the Data Collection
 * review/tracking UI — a color lookup for quality-state indicator dots and
 * formatters for dates and file sizes. No side effects, no API calls.
 */
import type { DatasetQualityState } from '../interfaces/api/dataCollection.interface';

/** Maps each dataset quality state to the hex color used for its status dot in the UI. */
export const QUALITY_DOT: Record<DatasetQualityState, string> = {
    Pending: '#9E9E9E',
    Accepted: '#10B981',
    Rejected: '#EF4444',
    'Auto Accepted': '#10B981',
    'Auto Rejected': '#EF4444',
    'QA Rejected': '#EF4444',
    'Needs Manual Review': '#F59E0B',
};

/**
 * Formats an ISO date string for display.
 * @param iso - ISO 8601 date string, or undefined.
 * @returns A localized "MMM D, YYYY"-style string, or `'—'` when no date is provided.
 */
export const fmt = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Formats a byte count as a human-readable KB/MB string.
 * @param bytes - File size in bytes, or undefined/0.
 * @returns `'X.X KB'` for sizes under 1 MB, `'X.X MB'` otherwise, or `null` when no size is given.
 */
export const fmtSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
