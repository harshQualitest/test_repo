import { useState } from 'react';
import {
    Box,
    TextField,
    InputAdornment,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Badge,
    Collapse,
    Paper,
    Stack,
    Typography,
    Divider,
    alpha,
    useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';

interface ProjectsFiltersProps {
    searchQuery: string;
    statusFilter: string;
    templateFilter: string;
    startDateFilter: string;
    endDateFilter: string;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onTemplateChange: (value: string) => void;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    onClearFilters: () => void;
    /** Hide the Project Type dropdown — used when a Data Collection tab already scopes the list. */
    showTemplateFilter?: boolean;
}

/**
 * Component: ProjectsFilters
 *
 * Purpose: Search box plus a collapsible filter panel (status, project
 * type, start/end date range) for the projects list, with an active-filter
 * count badge and a one-click "Clear" action.
 *
 * Responsibilities:
 * - Renders a search field always visible, and a "Filters" toggle button
 *   that expands/collapses a panel with Status, Project Type, and date
 *   range controls.
 * - Is a fully controlled component: every value and change is passed in
 *   and reported out via props; it holds no filter state of its own besides
 *   whether the panel is expanded.
 * - Computes and displays how many filters are currently active as a badge,
 *   and only shows the "Clear" shortcut when at least one filter or the
 *   search box is non-empty.
 * - Optionally hides the Project Type filter (`showTemplateFilter=false`)
 *   for contexts where the project type is already implied (e.g. a Data
 *   Collection tab).
 *
 * Props:
 * - `searchQuery`, `statusFilter`, `templateFilter`, `startDateFilter`, `endDateFilter` (`string`): current filter values.
 * - `onSearchChange`, `onStatusChange`, `onTemplateChange`, `onStartDateChange`, `onEndDateChange` (`(value: string) => void`): change handlers for each control.
 * - `onClearFilters` (`() => void`): resets all filters (parent-owned state).
 * - `showTemplateFilter` (`boolean`, default `true`): hides the Project Type dropdown when `false`.
 *
 * State:
 * - `filterPanelOpen` (`boolean`): whether the collapsible filter panel is expanded.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ProjectsFilters = ({
    searchQuery,
    statusFilter,
    templateFilter,
    startDateFilter,
    endDateFilter,
    onSearchChange,
    onStatusChange,
    onTemplateChange,
    onStartDateChange,
    onEndDateChange,
    onClearFilters,
    showTemplateFilter = true,
}: ProjectsFiltersProps) => {
    const theme = useTheme();
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);

    // Counts only the filters that are both active and currently relevant
    // (the template filter is excluded from the count when it's hidden),
    // so the badge reflects what the user can actually see/clear.
    const activeFilterCount = [
        statusFilter !== 'all',
        showTemplateFilter && templateFilter !== 'all',
        Boolean(startDateFilter),
        Boolean(endDateFilter),
    ].filter(Boolean).length;

    const hasActiveFilters = Boolean(searchQuery) || activeFilterCount > 0;

    /** Clears all filters via the parent callback and collapses the filter panel, in response to a "Clear"/"Reset all" click. */
    const handleClearFilters = () => {
        onClearFilters();
        setFilterPanelOpen(false);
    };

    return (
        <Box sx={{ mt: 3, mb: 2 }}>
            {/* Top bar: search + filter toggle */}
            <Stack direction="row" spacing={1.5} alignItems="center">
                <TextField
                    placeholder="Search projects..."
                    size="small"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    sx={{ flex: 1, minWidth: 220 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                <Badge badgeContent={activeFilterCount} color="primary" overlap="circular">
                    <Button
                        size="small"
                        variant={filterPanelOpen ? 'contained' : 'outlined'}
                        startIcon={<FilterListIcon sx={{ fontSize: 18 }} />}
                        onClick={() => setFilterPanelOpen((prev) => !prev)}
                        sx={{
                            textTransform: 'none',
                            borderRadius: 2,
                            px: 2,
                            minWidth: 100,
                            ...(filterPanelOpen && {
                                backgroundColor: theme.palette.common.black,
                                borderColor: theme.palette.common.black,
                                color: theme.palette.common.white,
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.common.black, 0.85),
                                },
                            }),
                        }}
                    >
                        Filters
                    </Button>
                </Badge>

                {hasActiveFilters && (
                    <Button
                        size="small"
                        startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
                        onClick={handleClearFilters}
                        sx={{ textTransform: 'none', color: 'text.secondary' }}
                    >
                        Clear
                    </Button>
                )}
            </Stack>

            {/* Collapsible filter panel */}
            <Collapse in={filterPanelOpen} timeout="auto" unmountOnExit>
                <Paper
                    variant="outlined"
                    sx={{
                        mt: 1.5,
                        p: 2.5,
                        borderRadius: 2,
                        borderColor: 'divider',
                        backgroundColor: alpha(theme.palette.grey[50], 0.8),
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                            Filter Projects
                        </Typography>
                        {activeFilterCount > 0 && (
                            <Button
                                size="small"
                                onClick={handleClearFilters}
                                sx={{ textTransform: 'none', color: 'text.secondary', p: 0, minWidth: 'auto' }}
                            >
                                Reset all
                            </Button>
                        )}
                    </Stack>

                    <Divider sx={{ mb: 2 }} />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
                        {/* Status Filter */}
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => onStatusChange(e.target.value)}
                            >
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="archive">Archived</MenuItem>
                                <MenuItem value="draft">Draft</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Project Type / Template Filter */}
                        {showTemplateFilter && (
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                                <InputLabel>Project Type</InputLabel>
                                <Select
                                    value={templateFilter}
                                    label="Project Type"
                                    onChange={(e) => onTemplateChange(e.target.value)}
                                >
                                    <MenuItem value="all">All Types</MenuItem>
                                    <MenuItem value="llm_grading">LLM Grading</MenuItem>
                                    <MenuItem value="text_annotation">Text Annotation</MenuItem>
                                    <MenuItem value="multi_modal">Multi-Modal</MenuItem>
                                </Select>
                            </FormControl>
                        )}

                        {/* Start Date Filter */}
                        <TextField
                            label="Start Date From"
                            type="date"
                            size="small"
                            value={startDateFilter}
                            onChange={(e) => onStartDateChange(e.target.value)}
                            sx={{ minWidth: 180 }}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />

                        {/* End Date Filter */}
                        <TextField
                            label="End Date To"
                            type="date"
                            size="small"
                            value={endDateFilter}
                            onChange={(e) => onEndDateChange(e.target.value)}
                            sx={{ minWidth: 180 }}
                            slotProps={{ inputLabel: { shrink: true } }}
                        />
                    </Stack>
                </Paper>
            </Collapse>
        </Box>
    );
};

export default ProjectsFilters;
