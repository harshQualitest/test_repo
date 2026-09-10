import {
    // Cell,
    Legend,
    // Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type {
    BreakdownChartData,
    // PieSlice
} from '../../types/detail-analysis-data';

interface BreakdownChartCardProps {
    data: BreakdownChartData;
}

/**
 * Component: BreakdownChartCard
 *
 * Purpose: Renders a titled card containing a pie/donut breakdown chart for the
 * detail-analysis dashboard (e.g. status or category distribution).
 *
 * Responsibilities:
 * - Display the chart's title inside a bordered Paper card.
 * - Host a Recharts `PieChart` with a legend and tooltip.
 *
 * Props:
 * - data (BreakdownChartData): title + slices (name/value/color) to visualize.
 *   NOTE: the actual `<Pie>` element and its `<Cell>` slices are currently
 *   commented out (see below), so today this renders an empty chart shell
 *   with only a `Tooltip` and `Legend` — `data.slices` is not yet consumed.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const BreakdownChartCard = ({ data }: BreakdownChartCardProps) => {
    return (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                {data.title}
            </Typography>
            <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        {/* <Pie data={data.slices} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
              {data.slices.map((slice: PieSlice, idx: number) => (
                <Cell key={idx} fill={slice.color} />
              ))}
            </Pie> */}
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
};
