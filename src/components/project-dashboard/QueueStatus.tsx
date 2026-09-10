import { Box, Card, CardContent, Typography } from "@mui/material";

// Static placeholder data describing each pipeline queue (annotation -> review -> QA),
// its item count, its share of total volume (`pct`, used for the progress bar width),
// and an average/percentile processing time. Not yet sourced from the API.
const queues = [
  { name: "Annotation Queue", items: 156, pct: 52, avg: "4.2h", color: "#2563EB" },
  { name: "Review Queue", items: 89, pct: 29.66, avg: "P90: 8.5h", color: "#9333EA" },
  { name: "QA Queue", items: 34, pct: 11.33, avg: "2.1h", color: "#16A34A" },
];

/**
 * Component: QueueStatus
 *
 * Purpose: Shows the current state of the annotation pipeline's queues
 * (Annotation, Review, QA) — item counts and relative volume — on the project
 * dashboard.
 *
 * Responsibilities:
 * - Render one row per queue with its item count, average/percentile processing
 *   time, and a progress bar sized by `pct` (share of total queue volume).
 *
 * Note: `queues` is currently static placeholder data (see comment above); this
 * component does not yet fetch live queue metrics from an API.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function QueueStatus() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <Box sx={{ px: 3, pt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Queue Status</Typography>
      </Box>
      <CardContent>
        <Box sx={{ display: "grid", gap: 2 }}>
          {queues.map((q) => (
            <Box key={q.name}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Typography sx={{ fontWeight: 600 }}>{q.name}</Typography>
                  <Typography variant="caption">{q.items} items</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">{q.avg}</Typography>
              </Box>
              <Box sx={{ width: "100%", height: 8, borderRadius: 9999, bgcolor: (t) => (t.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)") }}>
                <Box sx={{ width: `${q.pct}%`, height: "100%", bgcolor: q.color, borderRadius: 9999 }} />
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
