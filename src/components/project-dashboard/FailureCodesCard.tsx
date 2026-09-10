import { Box, Card, CardContent, Typography, useTheme } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Static placeholder data: counts per failure/rejection reason. Not sourced from
// the API yet — intended to be replaced with real project failure-code metrics.
const failureData = [
  { name: "Incorrect Label", count: 87 },
  { name: "Missing Context", count: 52 },
  { name: "Ambiguous Input", count: 38 },
  { name: "Quality Issues", count: 29 },
  { name: "Formatting Error", count: 24 },
  { name: "Other", count: 28 },
];

/**
 * Component: FailureCodesCard
 *
 * Purpose: Displays a horizontal bar chart breaking down annotation/review
 * failure reasons ("failure codes") by frequency, on the project dashboard.
 *
 * Responsibilities:
 * - Render `failureData` as a horizontal Recharts `BarChart` themed to the
 *   current MUI palette (light/dark aware via `useTheme`).
 *
 * Note: `failureData` is currently static placeholder data (see comment above);
 * this component does not yet fetch failure codes from an API.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function FailureCodesCard() {
  const theme = useTheme();
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <Box sx={{ px: 3, pt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Failure Codes</Typography>
      </Box>
      <CardContent>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={failureData} layout="vertical" margin={{ left: 110, right: 20, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
              <XAxis type="number" stroke={theme.palette.text.secondary} style={{ fontSize: "0.75rem" }} />
              <YAxis type="category" dataKey="name" width={105} stroke={theme.palette.text.secondary} style={{ fontSize: "0.75rem" }} />
              <Tooltip formatter={(v) => [v, "count"]} />
              <Bar dataKey="count" fill={theme.palette.error.main} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
