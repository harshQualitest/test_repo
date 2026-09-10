import { Box, Card, CardContent, Typography } from "@mui/material";

// Static placeholder data: top annotators/reviewers ranked by task volume, with
// their acceptance percentage. Rendered in array order (assumed pre-sorted by rank).
// Not yet sourced from the API.
const performers = [
  { name: "Sarah Chen", tasks: 234, pct: 94 },
  { name: "Mike Johnson", tasks: 198, pct: 89 },
  { name: "Emma Wilson", tasks: 187, pct: 92 },
  { name: "David Kim", tasks: 165, pct: 87 },
  { name: "Lisa Anderson", tasks: 142, pct: 96 },
];

/**
 * Component: TopPerformers
 *
 * Purpose: Shows a ranked leaderboard of top-performing annotators/reviewers
 * by task volume and acceptance rate, on the project dashboard.
 *
 * Responsibilities:
 * - Render each performer's rank (#1, #2, ...), task count, acceptance
 *   percentage, and a progress bar sized by acceptance percentage.
 *
 * Note: `performers` is currently static placeholder data (see comment above);
 * this component does not yet fetch live performer metrics from an API.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function TopPerformers() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <Box sx={{ px: 3, pt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Top Performers</Typography>
      </Box>
      <CardContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {performers.map((p, i) => (
            <Box key={p.name} sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Typography sx={{ width: 24, color: "text.secondary", fontWeight: 700 }}>#{i + 1}</Typography>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 600 }}>{p.name}</Typography>
                  <Box sx={{ display: "flex", gap: 2, color: "text.secondary", fontSize: 12 }}>
                    <Typography>{p.tasks} tasks</Typography>
                    {/* Why: 90% acceptance is treated as the quality bar for "good standing";
                        performers at or above it are highlighted green, below it amber. */}
                    <Typography sx={{ color: p.pct >= 90 ? 'success.main' : 'warning.main' }}>{p.pct}% accepted</Typography>
                  </Box>
                </Box>
                <Box sx={{ width: "100%", height: 8, borderRadius: 9999, bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)") }}>
                  <Box sx={{ width: `${p.pct}%`, height: "100%", bgcolor: "#3B82F6", borderRadius: 9999 }} />
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
