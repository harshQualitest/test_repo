/**
 * Grid / Generic Table Interfaces
 *
 * Purpose: Type definitions for the legacy generic data-grid (GridView) component —
 * column config, filters, sorting, pagination, and row actions built on top of
 * MUI's `GridColDef`. Superseded by `components/commonTable.interface.ts` for newer
 * tables, but still consumed by older table implementations.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
import React from 'react';
import type { GridColDef } from '@mui/x-data-grid';

// Types for the generic table
/** Column definition for the generic GridView table, layered on MUI's GridColDef. */
export interface TableColumn extends Omit<GridColDef, 'field'> {
    field: string;
    headerName: string;
    width?: number;
    type?: 'string' | 'number' | 'date' | 'boolean' | 'actions' | 'custom';
    sortable?: boolean;
    filterable?: boolean;
    hideable?: boolean;
    renderCell?: (params: any) => React.ReactNode;
    valueGetter?: (params: any) => any;
}

/** A single active filter applied to the table's data. */
export interface TableFilter {
    field: string;
    // Comparison operator applied to `field`/`value`, e.g. 'contains', 'equals'.
    operator: string;
    value: any;
}

/** Current sort directive for a column. */
export interface TableSort {
    field: string;
    sort: 'asc' | 'desc';
}

/** Pagination state for the generic table. */
export interface TablePagination {
    page: number;
    pageSize: number;
    total: number;
}

/** Row-level action button (e.g. edit/delete) rendered per row in the actions column. */
export interface TableAction {
    icon: React.ReactElement;
    label: string;
    onClick: (row: any) => void;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    disabled?: (row: any) => boolean;
    hidden?: (row: any) => boolean;
}

/** Props for the generic GridView table component. */
export interface GridViewProps {
    // Data and columns
    data: any[];
    columns: TableColumn[];

    // Loading and error states
    loading?: boolean;
    error?: string | null;

    // Pagination
    pagination?: TablePagination;
    onPaginationChange?: (pagination: TablePagination) => void;

    // Sorting
    sortModel?: TableSort[];
    onSortChange?: (sort: TableSort[]) => void;

    // Filtering
    filters?: TableFilter[];
    onFiltersChange?: (filters: TableFilter[]) => void;

    // Search
    searchValue?: string;
    onSearchChange?: (search: string) => void;
    searchPlaceholder?: string;

    // Row actions
    actions?: TableAction[];
    onRowClick?: (row: any) => void;

    // Customization
    title?: string;
    height?: number | string;
    rowHeight?: number;
    hideSearch?: boolean;
    hidePagination?: boolean;
    disableColumnMenu?: boolean;
    disableRowSelectionOnClick?: boolean;

    // Callbacks
    onRefresh?: () => void;
    onRowDoubleClick?: (row: any) => void;

    // Custom components
    noRowsOverlay?: React.ComponentType;
    loadingOverlay?: React.ComponentType;
}
