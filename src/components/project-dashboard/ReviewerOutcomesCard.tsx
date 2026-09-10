import { Box, Card, CardContent, Typography } from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

// Static placeholder data: review outcome breakdown (percentage `value` + raw `count`)
// used for the donut chart and legend. Not yet sourced from the API.
const outcomeData = [
  { name: "Accepted", value: 77, color: "#10B981", count: 687 },
  { name: "Rejected", value: 10, color: "#EF4444", count: 87 },
  { name: "Needs Revision", value: 13, color: "#F59E0B", count: 124 },
];

/**
 * Component: ReviewerOutcomesCard
 *
 * Purpose: Displays the breakdown of reviewer decisions (Accepted / Rejected /
 * Needs Revision) as a donut chart with a matching legend, on the project
 * dashboard.
 *
 * Responsibilities:
 * - Render `outcomeData` as a Recharts donut (`PieChart`/`Pie`) with per-slice colors.
 * - Render a 3-column legend below the chart showing each outcome's count and percentage.
 *
 * Note: `outcomeData` is currently static placeholder data (see comment above); this
 * component does not yet fetch live reviewer outcome metrics from an API.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function ReviewerOutcomesCard() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <Box sx={{ px: 3, pt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Reviewer Outcomes</Typography>
      </Box>
      <CardContent>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={outcomeData} innerRadius={60} outerRadius={100} dataKey="value">
                {outcomeData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, mt: 2 }}>
          {outcomeData.map((o) => (
            <Box key={o.name} sx={{ textAlign: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: o.color }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>{o.name}</Typography>
              </Box>
              <Typography sx={{ fontWeight: 700 }}>{o.count}</Typography>
              <Typography variant="caption" color="text.secondary">{o.value}%</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
