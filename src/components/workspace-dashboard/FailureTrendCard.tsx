import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Sample data for failure codes
// Note: static placeholder data — these counts are hardcoded here rather than fetched from an API.
const failureData = [
  { name: "Incorrect Label", count: 87 },
  { name: "Missing Context", count: 52 },
  { name: "Ambiguous Input", count: 38 },
  { name: "Quality Issues", count: 29 },
  { name: "Formatting Error", count: 24 },
  { name: "Other", count: 28 },
];

/**
 * Component: FailureTrendCard
 *
 * Purpose: Workspace dashboard card showing the top rejection/failure reasons
 * across all projects in the workspace, as a horizontal bar chart.
 *
 * Responsibilities:
 * - Render a card header (title + subtitle) and a Recharts horizontal `BarChart`.
 * - Theme-aware styling: chart colors (grid, axes, tooltip, bar fill) derive from MUI's `useTheme()`
 *   so the chart adapts to light/dark mode.
 *
 * State: none (chart data is currently static `failureData`; no component-local state).
 *
 * Data-to-visual mapping (Recharts):
 * - `layout="vertical"` flips the chart so bars grow horizontally and categories stack vertically.
 * - X axis (`type="number"`): the failure `count` (magnitude of each bar).
 * - Y axis (`dataKey="name"`, `type="category"`): the failure-code label for each bar; `width={145}`
 *   reserves room for the longest label so it isn't clipped.
 * - Single `Bar` series (`dataKey="count"`) filled with `theme.palette.error.main` (red) since these are failure counts.
 * - `CartesianGrid` and axis strokes use `theme.palette.divider` / `text.secondary` for theme parity.
 * - `Tooltip.formatter` relabels the raw value as "Count" for clarity on hover.
 *
 * Major child components rendered: MUI `Card`/`CardContent`/`Box`/`Typography`; Recharts
 * `ResponsiveContainer`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function FailureTrendCard() {
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
          Failure Codes Overview
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
          }}
        >
          Top rejection reasons workspace-wide
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
        }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={failureData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.palette.divider}
              horizontal
              vertical
            />
            <XAxis
              type="number"
              stroke={theme.palette.text.secondary}
              style={{ fontSize: "0.75rem" }}
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke={theme.palette.text.secondary}
              width={145}
              style={{ fontSize: "0.75rem" }}
              tick={{
                fill: theme.palette.text.primary,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 6,
                boxShadow: theme.shadows[2],
              }}
              labelStyle={{ color: theme.palette.text.primary }}
              formatter={(value) => [value, "Count"]}
            />
            <Bar
              dataKey="count"
              fill={theme.palette.error.main}
              radius={[0, 4, 4, 0]}
              isAnimationActive={true}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
