
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

/**
 * Renders a horizontal filled bar used to visualize queue-depth "share" per stage.
 *
 * @param percent - Fill percentage; clamped to [0, 100] so an out-of-range value can't overflow/underflow the bar.
 * @param color - Fill color (hex string); defaults to blue-600.
 */
function ProgressBar({ percent = 0, color = "#2563EB" /* default blue-600 */ }) {
  // Why: guards against a percent outside 0-100 rendering a bar wider than its container.
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <Box
      sx={{
        width: "100%",
        height: 12, // h-3
        borderRadius: 9999, // rounded-full
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.10)" // muted in dark
            : "rgba(0,0,0,0.08)",     // bg-muted
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: `${clamped}%`,
          height: "100%",
          borderRadius: 9999,
          bgcolor: color,
        }}
      />
    </Box>
  );
}

/**
 * Renders one workflow-stage row: stage name, an "items waiting" badge, average/P90
 * wait-time stats, and a colored {@link ProgressBar} showing this stage's relative queue depth.
 *
 * @param name - Stage display name (e.g. "Annotation", "Review", "QA").
 * @param itemsLabel - Display string for the number of items waiting at this stage.
 * @param avgLabel - Display string for the average wait time at this stage.
 * @param p90Label - Display string for the 90th-percentile wait time at this stage.
 * @param barColor - Fill color for this stage's progress bar.
 * @param barPercent - Bar fill percentage (0-100); represents this stage's item count relative to the largest stage, not an absolute completion percentage.
 */
function StageRow({
  name,
  itemsLabel,
  avgLabel,
  p90Label,
  barColor,
  barPercent,
}: {
  name: string;
  itemsLabel: string;
  avgLabel: string;
  p90Label: string;
  barColor: string;
  barPercent: number;
}) {
  return (
    <Box sx={{ display: "grid", rowGap: 1 /* space-y-2 */ }}>
      {/* Top line: name + items badge ... and stats */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: name + items badge */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, minWidth: 100 }}
          >
            {name}
          </Typography>

          <Chip
            label={itemsLabel}
            size="small"
            sx={{
              fontSize: "0.75rem",
              borderRadius: 1,
              fontWeight: 400,
            }}
          />
        </Box>

        {/* Right: avg + p90 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            "& *": { fontSize: "0.875rem" },
            color: "text.secondary",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 14 }} />
            <span>{avgLabel}</span>
          </Box>
          <Box>{p90Label}</Box>
        </Box>
      </Box>

      {/* Progress bar */}
      <ProgressBar percent={barPercent} color={barColor} />
    </Box>
  );
}

/**
 * Component: QueueDepthByStageCard
 *
 * Purpose: Workspace dashboard card showing how many items are waiting at each
 * workflow stage (Annotation, Review, QA), plus average and P90 wait times per stage.
 *
 * Responsibilities:
 * - Render a card header (title + subtitle).
 * - Render one {@link StageRow} per workflow stage with its item count, wait-time stats, and a relative progress bar.
 *
 * State: none (stage data is currently static/hardcoded; no component-local state).
 *
 * Important business logic:
 * - `barPercent` per stage is currently hardcoded as that stage's item count relative to the
 *   largest stage (Annotation, 234 items = 100%): Review 156/234 ≈ 66.67%, QA 89/234 ≈ 38.03%.
 *   This normalizes bar widths so the busiest stage always fills the bar, making relative
 *   queue depth easy to compare at a glance.
 *
 * Major child components rendered: MUI `Card`/`CardContent`/`Box`/`Typography`, local `StageRow` (which renders `Chip` and `ProgressBar`), `AccessTimeIcon`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function QueueDepthByStageCard() {
  return (
    <Card
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3, // ~24px
        borderRadius: 3, // rounded-xl
      }}
      data-slot="card"
    >
      {/* Card Header */}
      <Box
        data-slot="card-header"
        sx={{
          display: "grid",
          gridAutoRows: "min-content",
          gridTemplateRows: "auto auto",
          alignItems: "start",
          rowGap: 1.5,
          px: 3,
          pt: 3,
          pb: 3,
        }}
      >
        <Typography
          data-slot="card-title"
          variant="h6"
          sx={{ lineHeight: 1, fontWeight: 700 }}
        >
          Queue Depth by Stage
        </Typography>
        <Typography
          data-slot="card-description"
          variant="body2"
          sx={{ color: "text.secondary" }}
        >
          Items waiting at each workflow stage with average wait times
        </Typography>
      </Box>

      {/* Card Content */}
      <CardContent
        data-slot="card-content"
        sx={{
          px: 3,
          pb: 3,
        }}
      >
        {/* Outer vertical spacing (space-y-4) */}
        <Box sx={{ display: "grid", rowGap: 2 }}>
          {/* Stage: Annotation */}
          <StageRow
            name="Annotation"
            itemsLabel="234 items"
            avgLabel="Avg: 4.2h"
            p90Label="P90: 8.5h"
            barColor="#2563EB"   // Tailwind blue-600
            barPercent={100}     // full width
          />

          {/* Stage: Review (barPercent = 156 items / 234 max-stage items, i.e. relative to Annotation) */}
          <StageRow
            name="Review"
            itemsLabel="156 items"
            avgLabel="Avg: 6.8h"
            p90Label="P90: 12.3h"
            barColor="#9333EA"   // Tailwind purple-600
            barPercent={66.6667}
          />

          {/* Stage: QA (barPercent = 89 items / 234 max-stage items, i.e. relative to Annotation) */}
          <StageRow
            name="QA"
            itemsLabel="89 items"
            avgLabel="Avg: 3.1h"
            p90Label="P90: 5.7h"
            barColor="#16A34A"   // Tailwind green-600
            barPercent={38.0342}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
