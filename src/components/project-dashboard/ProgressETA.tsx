import { Box, Card, CardContent, Typography } from "@mui/material";
import dayjs from "dayjs";

interface ProgressETAProps {
  overallCompletionPercentage?: number;
  currentThroughput?: number;
  acceptanceRatePercentage?: number;
  totalTasksCount?: number;
  completedTasksCount?: number;
  projectEndDate?: string;
}

/**
 * Component: ProgressETA
 *
 * Purpose: Displays a project's overall completion progress, estimated
 * completion date, current throughput, and acceptance rate on the project
 * dashboard.
 *
 * Responsibilities:
 * - Render a completion percentage bar and headline percentage.
 * - Format and display the estimated completion date, throughput, and
 *   acceptance rate (with a completed/total task count).
 * - Indicate whether the project currently has annotation activity ("Active"
 *   vs "No activity") based on throughput.
 *
 * Props:
 * - `overallCompletionPercentage` (optional) - 0-100 completion percentage; defaults to 0.
 * - `currentThroughput` (optional) - tasks completed per day; defaults to 0.
 * - `acceptanceRatePercentage` (optional) - 0-100 percentage of tasks accepted; defaults to 0.
 * - `totalTasksCount` (optional) - total number of tasks in the project; defaults to 0.
 * - `completedTasksCount` (optional) - number of tasks completed so far; defaults to 0.
 * - `projectEndDate` (optional) - ISO date string for the estimated/actual project end; defaults to "N/A".
 *
 * Business logic: throughput of 0 is treated as "No activity" (shown in muted text)
 * while any positive throughput is shown as "Active" in success color, giving a
 * quick at-a-glance signal of whether the project is currently being worked on.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function ProgressETA({
  overallCompletionPercentage = 0,
  currentThroughput = 0,
  acceptanceRatePercentage = 0,
  totalTasksCount = 0,
  completedTasksCount = 0,
  projectEndDate = "N/A"
}: ProgressETAProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <Box sx={{ px: 3, pt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Progress & ETA</Typography>
      </Box>
      <CardContent sx={{ px: 3, pb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="body2" color="text.secondary">Overall Completion</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{overallCompletionPercentage.toFixed(1)}%</Typography>
        </Box>

        <Box sx={{ width: "100%", height: 8, borderRadius: 9999, bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" ), overflow: "hidden" }}>
          <Box sx={{ width: `${overallCompletionPercentage}%`, height: "100%", bgcolor: "primary.main" }} />
        </Box>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" }, mt: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Estimated Completion</Typography>
            <Typography sx={{ fontWeight: 700 }}>{dayjs(projectEndDate).format("MMM D, YYYY")}</Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">Current Throughput</Typography>
            <Typography sx={{ fontWeight: 700 }}>{currentThroughput.toFixed(1)} tasks/day</Typography>
            {/* Why: any positive throughput signals the project is currently being
                worked on ("Active"); zero throughput flags it as dormant. */}
            <Typography variant="caption" sx={{ color: currentThroughput > 0 ? "success.main" : "text.secondary" }}>
              {currentThroughput > 0 ? "Active" : "No activity"}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">Acceptance Rate</Typography>
            <Typography sx={{ fontWeight: 700 }}>{acceptanceRatePercentage.toFixed(1)}%</Typography>
            <Typography variant="caption" color="text.secondary">
              {completedTasksCount} of {totalTasksCount} tasks
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
