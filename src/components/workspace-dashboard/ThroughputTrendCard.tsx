import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
} from "@mui/material";
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Sample data for the chart
// Note: static placeholder data — dates/items are hardcoded here rather than fetched from an API.
const chartData = [
  { date: "Dec 3", items: 45 },
  { date: "Dec 6", items: 60 },
  { date: "Dec 9", items: 55 },
  { date: "Dec 13", items: 75 },
  { date: "Dec 17", items: 65 },
  { date: "Dec 21", items: 85 },
  { date: "Dec 25", items: 90 },
  { date: "Dec 30", items: 70 },
];

/**
 * Component: ThroughputTrendCard
 *
 * Purpose: Workspace dashboard card visualizing daily completed-item throughput
 * across all projects as an area/line trend chart.
 *
 * Responsibilities:
 * - Render a card header (title + subtitle) and a Recharts `ComposedChart` with a gradient-filled `Area`.
 * - Theme-aware styling: chart colors (grid, axes, tooltip, area stroke/fill) derive from MUI's `useTheme()`.
 *
 * State: none (chart data is currently static `chartData`; no component-local state).
 *
 * Data-to-visual mapping (Recharts):
 * - X axis (`dataKey="date"`): calendar date labels for each data point.
 * - Y axis: implicit numeric scale for `items` (completed item count), auto-scaled by Recharts.
 * - `Area` series (`dataKey="items"`, `type="monotone"`) plots throughput over time, filled using
 *   the `colorItems` linear gradient (fading from `primary.main` at 30% opacity to fully transparent)
 *   to give the classic "area under the line" look without overpowering the chart.
 * - `CartesianGrid` and axis strokes use `theme.palette.divider` / `text.secondary` for theme parity.
 *
 * Major child components rendered: MUI `Card`/`CardContent`/`Box`/`Typography`; Recharts
 * `ResponsiveContainer`, `ComposedChart`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function ThroughputTrendCard() {
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "background.paper",
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        boxShadow: "none",
      }}
    >
      {/* Card Header */}
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 0,
          display: "grid",
          gridAutoRows: "min-content",
          gap: 1.5,
          alignItems: "start",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          Throughput Trend
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
          }}
        >
          Completed items per day across all projects
        </Typography>
      </Box>

      {/* Card Content with Chart */}
      <CardContent
        sx={{
          flex: 1,
          px: 3,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "& canvas": {
            maxWidth: "100%",
          },
        }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorItems" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={theme.palette.primary.main}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={theme.palette.primary.main}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.palette.divider}
              horizontal
              vertical
            />
            <XAxis
              dataKey="date"
              stroke={theme.palette.text.secondary}
              style={{ fontSize: "0.75rem" }}
            />
            <YAxis
              stroke={theme.palette.text.secondary}
              style={{ fontSize: "0.75rem" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 6,
                boxShadow: theme.shadows[2],
              }}
              labelStyle={{ color: theme.palette.text.primary }}
            />
            <Area
              type="monotone"
              dataKey="items"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              fill="url(#colorItems)"
              dot={false}
              isAnimationActive={true}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
