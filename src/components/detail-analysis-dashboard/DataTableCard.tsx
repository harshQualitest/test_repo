import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import type { TableRowData } from '../../types/detail-analysis-data';

interface DataTableCardProps {
  title: string;
  description?: string;
  rows: TableRowData[];
}

/**
 * Picks the trend arrow icon for a row's `trendDirection`.
 * @param direction - 'up' | 'down' | any other value (treated as flat)
 * @returns A MUI icon element representing the trend direction.
 */
const getTrendIcon = (direction: string) => {
  switch (direction) {
    case 'up':
      return <TrendingUpIcon fontSize="small" />;
    case 'down':
      return <TrendingDownIcon fontSize="small" />;
    default:
      return <RemoveIcon fontSize="small" />;
  }
};

/**
 * Maps a row's `trendDirection` to a theme color token for the trend text/icon.
 * @param direction - 'up' | 'down' | any other value (treated as flat)
 * @returns A MUI theme color path string (e.g. 'success.main').
 */
const getTrendColor = (direction: string) => {
  switch (direction) {
    case 'up':
      return 'success.main';
    case 'down':
      return 'error.main';
    default:
      return 'text.secondary';
  }
};

/**
 * Derives the Chip color/variant for a project's Active/Inactive status,
 * so Active rows read as visually emphasized and Inactive rows read as muted.
 * @param status - 'Active' | 'Inactive'
 * @returns Chip color and variant props.
 */
const getStatusChipProps = (status: 'Active' | 'Inactive') => {
  if (status === 'Active') {
    return { color: 'primary' as const, variant: 'filled' as const };
  }
  return { color: 'default' as const, variant: 'outlined' as const };
};

/**
 * Component: DataTableCard
 *
 * Purpose: Renders a titled, bordered card containing a per-row breakdown table
 * (project/user completion, average per day, trend, and active/inactive status)
 * for the detail-analysis dashboard.
 *
 * Responsibilities:
 * - Display an optional description under the title.
 * - Render one table row per entry in `rows`, with a trend icon/color and a
 *   status chip derived from each row's data.
 *
 * Props:
 * - title (string): card heading.
 * - description (string, optional): supporting text shown under the title.
 * - rows (TableRowData[]): the table's data rows.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const DataTableCard = ({ title, description, rows }: DataTableCardProps) => {
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Project</TableCell>
              <TableCell>User</TableCell>
              <TableCell align="right">Completed</TableCell>
              <TableCell align="right">Avg/Day</TableCell>
              <TableCell align="right">Trend</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.project}</TableCell>
                <TableCell>{row.user}</TableCell>
                <TableCell align="right">{row.completed}</TableCell>
                <TableCell align="right">{row.avgPerDay}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: getTrendColor(row.trendDirection) }}>
                    {getTrendIcon(row.trendDirection)}
                    <Typography variant="body2" component="span">
                      {row.trendPercent}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={row.status} size="small" {...getStatusChipProps(row.status)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
