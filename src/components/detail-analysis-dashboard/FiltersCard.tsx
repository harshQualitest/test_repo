import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import FunnelIcon from '@mui/icons-material/FilterList';
import type { FiltersData, FilterOption } from '../../types/detail-analysis-data';

export interface FiltersState {
  dateRange: string;
  project: string;
  user: string;
  status: string;
  search: string;
}

interface FiltersCardProps {
  data: FiltersData;
  onChange?: (state: FiltersState) => void;
}

/**
 * Builds the initial filter selections by defaulting each dropdown to its
 * first available option, so the filter bar never renders in an empty state.
 * @param data - the dashboard's filter option lists (date ranges, projects, users, statuses).
 * @returns A fully-populated FiltersState (search starts blank).
 */
const getDefaultState = (data: FiltersData): FiltersState => ({
  dateRange: data.dateRanges[0]?.value ?? '',
  project: data.projects[0]?.value ?? '',
  user: data.users[0]?.value ?? '',
  status: data.statuses[0]?.value ?? '',
  search: '',
});

/**
 * Component: FiltersCard
 *
 * Purpose: Renders the detail-analysis dashboard's filter bar — date range,
 * project, user, and status dropdown selects plus a free-text search field —
 * and reports the combined filter state back to the parent on every change.
 *
 * Responsibilities:
 * - Own the local filter selection state, seeded from `data`'s option lists.
 * - Notify the parent (via `onChange`) with the full merged filter state
 *   whenever any individual filter or the search box changes.
 *
 * Props:
 * - data (FiltersData): available options for each filter dropdown, plus the
 *   search field's placeholder text.
 * - onChange (function, optional): callback invoked with the new FiltersState
 *   after any filter/search update.
 *
 * State:
 * - state (FiltersState): the currently selected dateRange/project/user/status
 *   plus the free-text search value.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const FiltersCard = ({ data, onChange }: FiltersCardProps) => {
  const [state, setState] = useState<FiltersState>(() => getDefaultState(data));

  /**
   * Merges a partial filter change into state and notifies the parent.
   * @param partial - the changed filter field(s) to merge into current state.
   */
  const handleUpdate = (partial: Partial<FiltersState>) => {
    const next = { ...state, ...partial };
    setState(next);
    onChange?.(next);
  };

  // Reshape state + data into a uniform array so the dropdowns can be rendered
  // via a single .map() below instead of four near-identical <Select> blocks.
  // Memoized so this array is only rebuilt when the underlying options or
  // selected values actually change.
  const filters = useMemo(
    () => [
      { label: 'Date Range', value: state.dateRange, options: data.dateRanges, key: 'dateRange' as const },
      { label: 'Project', value: state.project, options: data.projects, key: 'project' as const },
      { label: 'User', value: state.user, options: data.users, key: 'user' as const },
      { label: 'Project Status', value: state.status, options: data.statuses, key: 'status' as const },
    ],
    [data.dateRanges, data.projects, data.statuses, data.users, state.dateRange, state.project, state.status, state.user],
  );

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <FunnelIcon sx={{ width: 18, height: 18 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Filters
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(6, 1fr)' } }}>
        {filters.map((filter) => (
          <Box key={filter.key} sx={{ minWidth: 0 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{filter.label}</InputLabel>
              <Select
                label={filter.label}
                value={filter.value}
                onChange={(e) => handleUpdate({ [filter.key]: e.target.value } as Partial<FiltersState>)}
              >
                {filter.options.map((option: FilterOption) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        ))}

        <Box sx={{ minWidth: 0 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={data.searchPlaceholder}
            value={state.search}
            onChange={(e) => handleUpdate({ search: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>
    </Paper>
  );
};
