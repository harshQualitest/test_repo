import { Box, Card, CardContent, Typography } from "@mui/material";

interface MetricsCardsProps {
  avgCompletionTimeMinutes?: number;
  currentThroughput?: number;
}

/**
 * Component: SmallCard
 *
 * Purpose: Small presentational stat tile used by `MetricsCards` to show a
 * single metric's title, headline value, and subtitle.
 *
 * Props:
 * - `title` - metric label.
 * - `value` - pre-formatted headline value to display.
 * - `subtitle` - short supporting text under the value.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
function SmallCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, cursor: "pointer", transition: "box-shadow 150ms", '&:hover': { boxShadow: 4 } }}>
      <CardContent sx={{ px: 2, py: 2 }}>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </CardContent>
    </Card>
  );
}

/**
 * Component: MetricsCards
 *
 * Purpose: Renders the two headline throughput metrics on the project
 * dashboard â€” average time per completed task and current daily throughput.
 *
 * Responsibilities:
 * - Format `avgCompletionTimeMinutes` and `currentThroughput` into display strings.
 * - Render one `SmallCard` per metric in a responsive 2-column grid.
 *
 * Props:
 * - `avgCompletionTimeMinutes` (optional) - average minutes per completed task; defaults to 0.
 * - `currentThroughput` (optional) - tasks completed per day; defaults to 0.
 *
 * Major child components rendered: `SmallCard`.
 *
 * Business logic: `avgCompletionTimeMinutes` displays "N/A" when it is 0 (i.e. not yet
 * meaningful/no completed tasks) rather than showing "0.0 min", to avoid implying a
 * measured zero-time average; `currentThroughput` has no such guard and always shows
 * a numeric rate.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function MetricsCards({ 
  avgCompletionTimeMinutes = 0,
  currentThroughput = 0 
}: MetricsCardsProps) {
  const cards = [
    { 
      title: "Avg Time/Task", 
      value: avgCompletionTimeMinutes > 0 ? `${avgCompletionTimeMinutes.toFixed(1)} min` : "N/A", 
      subtitle: "Per completed task" 
    },
    { 
      title: "Current Throughput", 
      value: `${currentThroughput.toFixed(1)}/day`, 
      subtitle: "Tasks per day" 
    },
  ];

  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" } }}>
      {cards.map((c) => (
        <SmallCard key={c.title} {...c} />
      ))}
    </Box>
  );
}
