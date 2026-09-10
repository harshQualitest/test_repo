/**
 * CommonTable Component Interfaces
 *
 * Type definitions for the CommonTable component which provides
 * a reusable data grid with sorting, filtering, and pagination.
 *
 * Purpose: Generic (type-parameterized) table types built on MUI X Data Grid
 * primitives — the modern replacement for the legacy GridInterface types.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

import type {
    GridRenderCellParams,
    GridValidRowModel,
    GridRowSelectionModel,
    GridPaginationModel,
    GridSortModel,
    GridFilterModel,
} from '@mui/x-data-grid';
import type { ReactNode } from 'react';

/**
 * Column configuration for the table
 */
export interface Column<T extends GridValidRowModel = GridValidRowModel> {
    field: keyof T;
    headerName: string;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    flex?: number;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    filterable?: boolean;
    hideable?: boolean;
    resizable?: boolean;
    renderCell?: (params: GridRenderCellParams<T>) => ReactNode;
    valueGetter?: (params: { row: T }) => any;
    valueFormatter?: (params: { value: any }) => string;
    type?: 'string' | 'number' | 'date' | 'dateTime' | 'boolean' | 'singleSelect' | 'actions';
}

/**
 * Action button configuration for table rows
 */
export interface TableAction<T extends GridValidRowModel = GridValidRowModel> {
    label: string;
    icon?: ReactNode;
    onClick: (row: T) => void;
    disabled?: (row: T) => boolean;
    color?: 'primary' | 'inherit' | 'default';
}

/**
 * Props for the CommonTable component
 */
export interface CommonTableProps<T extends GridValidRowModel = GridValidRowModel> {
    // Data
    data: T[];
    columns: Column<T>[];

    // Configuration
    title?: string;
    loading?: boolean;
    error?: string;

    // Selection
    checkboxSelection?: boolean;
    rowSelectionModel?: GridRowSelectionModel;
    onRowSelectionModelChange?: (model: GridRowSelectionModel) => void;

    // Pagination
    paginationModel?: GridPaginationModel;
    onPaginationModelChange?: (model: GridPaginationModel) => void;
    pageSizeOptions?: number[];
    // Total row count across all pages; required when paginationMode is 'server'.
    rowCount?: number;
    paginationMode?: 'client' | 'server';

    // Sorting
    sortModel?: GridSortModel;
    onSortModelChange?: (model: GridSortModel) => void;
    sortingMode?: 'client' | 'server';

    // Filtering
    filterModel?: GridFilterModel;
    onFilterModelChange?: (model: GridFilterModel) => void;
    filterMode?: 'client' | 'server';

    // Actions
    actions?: TableAction<T>[];

    // Styling
    height?: number | string;
    density?: 'compact' | 'standard' | 'comfortable';
    disableColumnMenu?: boolean;
    disableColumnFilter?: boolean;
    disableColumnSelector?: boolean;
    disableDensitySelector?: boolean;

    // Row Events
    onRowClick?: (params: any) => void;
    onRowDoubleClick?: (params: any) => void;

    // Other
    autoHeight?: boolean;
    getRowId?: (row: T) => string | number;
}
