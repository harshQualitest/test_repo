import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { TrendChartData } from '../../types/detail-analysis-data';

interface TrendChartCardProps {
  data: TrendChartData;
}

/**
 * Component: TrendChartCard
 *
 * Purpose: Renders a titled card containing a "this week vs last week" area
 * chart for the detail-analysis dashboard.
 *
 * Responsibilities:
 * - Display the chart title inside a bordered Paper card.
 * - Render a Recharts `AreaChart` comparing two named series (`thisWeek` and
 *   `lastWeek`) over the same category axis, with a grid, tooltip, and legend.
 *
 * Props:
 * - data (TrendChartData): title, series points (name/thisWeek/lastWeek), and
 *   the stroke/fill colors for each series.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const TrendChartCard = ({ data }: TrendChartCardProps) => {
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        {data.title}
      </Typography>
      <Box sx={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d4d4d8" />
            <XAxis dataKey="name" stroke="#666" />
            <YAxis stroke="#666" />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="thisWeek"
              stroke={data.colors.thisWeek}
              fill={data.colors.thisWeek}
              fillOpacity={0.25}
              name="This Week"
            />
            <Area
              type="monotone"
              dataKey="lastWeek"
              stroke={data.colors.lastWeek}
              fill={data.colors.lastWeek}
              fillOpacity={0.25}
              name="Last Week"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};
