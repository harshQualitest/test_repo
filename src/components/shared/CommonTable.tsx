import React, { useMemo } from 'react';
import {
    DataGrid,
    GridActionsCellItem,
} from '@mui/x-data-grid';
import type {
    GridColDef,
    GridRowSelectionModel,
    GridSortModel,
    GridFilterModel,
    GridPaginationModel,
    GridRowParams,
    GridRowId,
    GridRenderCellParams,
    GridValidRowModel,
} from '@mui/x-data-grid';
import {
    Box,
    Typography,
    useTheme,
    alpha,
    Paper,
    Skeleton,
} from '@mui/material';
import {
    MoreVert as MoreVertIcon,
} from '@mui/icons-material';

/**
 * Builds the GridActionsCellItem elements for a single table row.
 * Extracted to module level to avoid exceeding 4 function-nesting levels inside CommonTable.
 *
 * @param actions - Row action definitions (label, icon, click handler, optional disabled predicate).
 * @param row - The data row these actions apply to.
 * @returns Array of GridActionsCellItem elements for the DataGrid actions column.
 */
const buildActionCells = <T extends GridValidRowModel>(
    actions: TableAction<T>[],
    row: T,
) =>
    actions.map((action) => (
        <GridActionsCellItem
            key={`action-${action.label}`}
            icon={(action.icon as React.ReactElement) ?? <MoreVertIcon />}
            label={action.label}
            onClick={() => action.onClick(row)}
            disabled={action.disabled ? action.disabled(row) : false}
        />
    ));

// Types and Interfaces

/**
 * Describes a single column in a `CommonTable`. This is a thin, DataGrid-agnostic
 * wrapper around `GridColDef` so callers don't need to import MUI X types directly.
 * `field` must be a key of the row type `T`; the component converts these into
 * `GridColDef` entries internally (see `gridColumns` below).
 */
export interface Column<T extends GridValidRowModel = GridValidRowModel> {
    field: keyof T;
    headerName: string;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    flex?: number;
    align?: 'left' | 'center' | 'right';
    headerAlign?: 'left' | 'center' | 'right';
    sortable?: boolean;
    filterable?: boolean;
    hideable?: boolean;
    resizable?: boolean;
    renderCell?: (params: GridRenderCellParams<T>) => React.ReactNode;
    valueGetter?: (params: { row: T }) => any;
    valueFormatter?: (params: { value: any }) => string;
    type?: 'string' | 'number' | 'date' | 'dateTime' | 'boolean' | 'singleSelect' | 'actions';
}

/**
 * Describes a single row-level action rendered in the auto-generated "actions"
 * column (only added when at least one action is supplied). `disabled` is
 * evaluated per-row so individual actions can be conditionally greyed out.
 */
export interface TableAction<T extends GridValidRowModel = GridValidRowModel> {
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T) => void;
    disabled?: (row: T) => boolean;
    color?: 'primary' | 'inherit' | 'default';
}

/**
 * Full prop contract for `CommonTable`, the shared generic/paginated data table
 * used across the app wherever tabular data needs to be displayed (built on
 * top of MUI X `DataGrid`). Grouped by concern below:
 * - Data: `data` (rows) and `columns` (column defs) driving what's rendered.
 * - Configuration: `title`, `loading`, `error` control header/loading/error states.
 * - Selection: checkbox row selection, controlled via `rowSelectionModel`.
 * - Pagination: controlled pagination model; supports both client-side and
 *   server-side (`paginationMode`) pagination — when server-side, `rowCount`
 *   should reflect the total row count from the API, not `data.length`.
 * - Sorting: `sortModel`/`onSortModelChange`/`sortingMode` are accepted for API
 *   compatibility but sorting is currently disabled in the render (see
 *   `gridColumns` below) so these props are effectively inert.
 * - Filtering: controlled filter model; supports client/server filtering.
 * - Actions: optional row actions rendered as an extra "actions" column.
 * - Styling: height/density/striped/bordered control visual presentation.
 * - Events: row click/double-click callbacks.
 * - Empty state: message shown when there are no rows.
 * - Row ID: optional custom row-id getter for rows without an `id` field.
 * - Advanced features: toggles for column filter/menu/selector/density UI and
 *   footer/pagination visibility.
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
    maxHeight?: number | string;
    density?: 'compact' | 'standard' | 'comfortable';
    striped?: boolean;
    bordered?: boolean;
    
    // Events
    onRowClick?: (params: GridRowParams<T>) => void;
    onRowDoubleClick?: (params: GridRowParams<T>) => void;
    
    // Empty state
    emptyStateMessage?: string;
    
    // Row ID
    getRowId?: (row: T) => GridRowId;
    
    // Advanced features
    disableColumnFilter?: boolean;
    disableColumnMenu?: boolean;
    disableColumnSelector?: boolean;
    disableDensitySelector?: boolean;
    hideFooter?: boolean;
    hideFooterPagination?: boolean;
    disableRowSelectionOnClick?: boolean;
}

/**
 * Component: CommonTable
 *
 * Purpose: Generic, reusable paginated data table shared across the app.
 * Wraps MUI X `DataGrid` behind a simplified, project-specific prop contract
 * (`Column`/`TableAction`) so feature pages don't need to depend on MUI X
 * types or reimplement loading/error/empty states.
 *
 * Responsibilities:
 * - Render tabular data with configurable columns, row selection, and an
 *   optional per-row "actions" menu column.
 * - Show a skeleton placeholder while `loading` is true, and an error panel
 *   when `error` is set, instead of the grid.
 * - Support both client-side and server-side pagination/filtering via the
 *   `paginationMode`/`filterMode` props (sorting is currently disabled, see
 *   inline notes below).
 * - Apply consistent styling (row hover/stripe, dark column header theme)
 *   regardless of the consuming page.
 *
 * Props: see `CommonTableProps<T>` above for the full, documented contract
 * (data/columns, pagination, sorting, filtering, actions, styling, events).
 *
 * State: none (component is fully controlled by its props); `gridColumns`
 * below is derived/memoized data, not component state.
 *
 * Major child components rendered: MUI `DataGrid` (data path), MUI `Paper`/
 * `Skeleton` (loading path), MUI `Paper`/`Typography` (error path).
 *
 * Business rules enforced:
 * - Column sorting is force-disabled (`sortable: false`) regardless of the
 *   `sortable` flag passed per-column, and the DataGrid's own sort props are
 *   commented out — this was an intentional product decision to remove hover
 *   interactions on column headers (see inline comments below).
 * - `disableColumnMenu` defaults to `true` for the same reason: hides the
 *   3-dot column header menu.
 * - The "actions" column is only added when `actions.length > 0`, keeping
 *   the grid clean for read-only tables.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const CommonTable = <T extends GridValidRowModel>({
    // Data
    data = [],
    columns = [],
    
    // Configuration
    title,
    loading = false,
    error,
    
    // Selection
    checkboxSelection = false,
    rowSelectionModel,
    onRowSelectionModelChange,
    
    // Pagination
    paginationModel = { page: 0, pageSize: 10 },
    onPaginationModelChange,
    pageSizeOptions = [5, 10, 25, 50, 100],
    rowCount,
    paginationMode = 'client',
    
    // Sorting
    sortModel: _sortModel = [],
    onSortModelChange: _onSortModelChange,
    sortingMode: _sortingMode = 'client',
    
    // Filtering
    filterModel,
    onFilterModelChange,
    filterMode = 'client',
    
    // Actions
    actions = [],
    
    // Styling
    height = 600,
    maxHeight,
    density = 'standard',
    striped = false,
    bordered = true,
    
    // Events
    onRowClick,
    onRowDoubleClick,
    
    // Empty state
    emptyStateMessage = 'No data available',
    
    // Row ID
    getRowId,
    
    // Advanced features
    disableColumnFilter = false,
    disableColumnMenu = true, // Changed from false: Disabled to hide 3-dot menu on column headers
    disableColumnSelector = false,
    disableDensitySelector = false,
    hideFooter = false,
    hideFooterPagination = false,
    disableRowSelectionOnClick = false,
}: CommonTableProps<T>) => {
    const theme = useTheme();

    // Convert our Column interface to GridColDef
    // Memoized because it derives a new array on every render otherwise, which
    // would cause DataGrid to think columns changed and re-render unnecessarily.
    // Recomputes only when the caller's `columns` or `actions` props change.
    const gridColumns: GridColDef<T>[] = useMemo(() => {
        const cols: GridColDef<T>[] = columns.map((col) => ({
            field: String(col.field),
            headerName: col.headerName,
            width: col.width,
            minWidth: col.minWidth || 100,
            maxWidth: col.maxWidth,
            flex: col.flex,
            align: col.align || 'left',
            headerAlign: col.headerAlign || col.align || 'left',
            // sortable: col.sortable !== false,
            sortable: false, // Disabled: No hover interactions on column headers
            filterable: col.filterable !== false,
            hideable: col.hideable !== false,
            resizable: col.resizable !== false,
            renderCell: col.renderCell,
            valueGetter: col.valueGetter,
            valueFormatter: col.valueFormatter,
            type: col.type || 'string',
        }));

        // Add actions column if actions are provided
        if (actions.length > 0) {
            cols.push({
                field: 'actions',
                type: 'actions',
                headerName: 'Actions',
                width: 100,
                cellClassName: 'actions',
                getActions: (params: GridRowParams<T>) => buildActionCells(actions, params.row),
            });
        }

        return cols;
    }, [columns, actions]);

    // Loading state: render a static skeleton shaped like the eventual grid
    // (header + 8 alternating rows) instead of DataGrid's own spinner, to
    // avoid layout shift when real data arrives.
    if (loading) {
        return (
            <Paper sx={{ height, overflow: 'hidden', borderRadius: 2 }}>
                {/* Header row */}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 2,
                        px: 2,
                        py: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                >
                    <Skeleton variant="rounded" width={18} height={18} sx={{ borderRadius: 0.5 }} />
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} variant="text" width={i === 0 ? 160 : 120} height={18} />
                    ))}
                </Box>
                {/* Skeleton rows */}
                {Array.from({ length: 8 }).map((_, i) => (
                    <Box
                        key={i}
                        sx={{
                            display: 'flex',
                            gap: 2,
                            px: 2,
                            py: 1.75,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            alignItems: 'center',
                            bgcolor: i % 2 === 0 ? 'transparent' : 'action.hover',
                        }}
                    >
                        <Skeleton variant="rounded" width={18} height={18} sx={{ borderRadius: 0.5 }} />
                        <Skeleton variant="text" width="30%" height={20} />
                        <Skeleton variant="text" width="25%" height={20} />
                        <Skeleton variant="text" width="20%" height={20} />
                        <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 4 }} />
                    </Box>
                ))}
            </Paper>
        );
    }

    // Error state: short-circuit the grid entirely and surface the message,
    // so callers can pass a fetch/thunk-rejection error straight through.
    if (error) {
        return (
            <Paper sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography color="error">{error}</Typography>
                </Box>
            </Paper>
        );
    }

    return (
        <Paper 
            sx={{ 
                height: maxHeight ? 'auto' : height, 
                maxHeight,
                width: '100%',
                border: bordered ? 1 : 0,
                borderColor: 'divider',
                borderRadius: 2,
                overflow: 'hidden',
            }}
        >
            {title && (
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" component="div">
                        {title}
                    </Typography>
                </Box>
            )}
            
            <DataGrid<T>
                rows={data}
                columns={gridColumns}
                loading={loading}
                getRowHeight={() => 'auto'}
                
                // Selection
                checkboxSelection={checkboxSelection}
                rowSelectionModel={rowSelectionModel}
                onRowSelectionModelChange={onRowSelectionModelChange}
                disableRowSelectionOnClick={disableRowSelectionOnClick}
                
                // Pagination
                pagination
                paginationModel={paginationModel}
                onPaginationModelChange={onPaginationModelChange}
                pageSizeOptions={pageSizeOptions}
                rowCount={rowCount || data.length}
                paginationMode={paginationMode}
                
                // Sorting - Disabled: No hover interactions on column headers
                // sortingOrder={['asc', 'desc']}
                // sortModel={sortModel}
                // onSortModelChange={onSortModelChange}
                // sortingMode={sortingMode}
                
                // Filtering
                filterModel={filterModel}
                onFilterModelChange={onFilterModelChange}
                filterMode={filterMode}
                
                // Styling
                density={density}
                sx={{
                    border: 0,
                    '& .MuiDataGrid-columnHeaders': {
                        backgroundColor: '#000000',
                        borderBottom: `2px solid ${theme.palette.divider}`,
                    },
                    '& .MuiDataGrid-columnHeader': {
                        backgroundColor: '#000000',
                        '& .MuiDataGrid-columnHeaderTitleContainer': {
                            justifyContent: 'flex-start',
                        },
                    },
                    '& .MuiDataGrid-columnHeaderTitle': {
                        fontWeight: 700,
                        color: '#ffffff',
                    },
                    '& .MuiDataGrid-iconSeparator': {
                        color: '#ffffff',
                    },
                    '& .MuiDataGrid-menuIcon': {
                        color: '#ffffff',
                    },
                    '& .MuiDataGrid-cell': {
                        display: 'flex',
                        alignItems: 'center',
                        py: 1,
                        lineHeight: 'unset !important',
                        maxHeight: 'none !important',
                        whiteSpace: 'normal',
                    },
                    '& .MuiDataGrid-row': {
                        cursor: 'pointer',
                    },
                    '& .MuiDataGrid-row:nth-of-type(even)': striped ? {
                        backgroundColor: alpha(theme.palette.action.hover, 0.04),
                    } : {},
                    '& .MuiDataGrid-row:hover': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.08),
                    },
                }}
                
                // Events
                onRowClick={onRowClick}
                onRowDoubleClick={onRowDoubleClick}
                
                // Row identification
                getRowId={getRowId}
                
                // Features
                disableColumnFilter={disableColumnFilter}
                disableColumnMenu={disableColumnMenu}
                disableColumnSelector={disableColumnSelector}
                disableDensitySelector={disableDensitySelector}
                hideFooter={hideFooter}
                hideFooterPagination={hideFooterPagination}
                
                // Toolbar
                slots={{
                    toolbar: () => null, // Remove deprecated toolbar for now
                }}
                
                // Localization
                localeText={{
                    noRowsLabel: emptyStateMessage,
                }}
            />
        </Paper>
    );
};

export default CommonTable;