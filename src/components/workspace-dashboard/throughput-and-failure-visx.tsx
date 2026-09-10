import { Box } from "@mui/material";
import ThroughputTrendCard from "./ThroughputTrendCard";
import FailureTrendCard from "./FailureTrendCard";

/**
 * Component: ThrouputAndFailureVisualizations
 *
 * Purpose: Layout wrapper that places the Throughput Trend and Failure Codes
 * charts side by side (or stacked on small screens) within the workspace dashboard.
 *
 * Note: despite the filename, this component does not use the `visx` charting
 * library directly — it is a pure layout composition. The actual charts are
 * rendered by {@link ThroughputTrendCard} and {@link FailureTrendCard}, both of
 * which are built with Recharts (see those files for scale/axis/series mapping).
 *
 * Responsibilities:
 * - Arrange `ThroughputTrendCard` and `FailureTrendCard` in a responsive CSS grid:
 *   1 column on `xs` screens, 2 columns side-by-side from `md` up.
 *
 * Major child components rendered: `ThroughputTrendCard`, `FailureTrendCard`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function ThrouputAndFailureVisualizations() {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2, // Tailwind gap-4 ≈ 16px
        gridTemplateColumns: {
          xs: "1fr",       // default: 1 column
          md: "repeat(2, 1fr)", // md:grid-cols-2 for side-by-side
        },
      }}
    >
      <ThroughputTrendCard />
      <FailureTrendCard />
    </Box>
  );
}
