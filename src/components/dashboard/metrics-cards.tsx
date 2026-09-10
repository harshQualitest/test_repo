
import { Box, Card, CardContent, Typography, Chip } from "@mui/material";
import { MetricCardSkeleton } from '../skeletons/DashboardSkeleton';
// Note: icons are provided via props (Icon component) from the caller

/**
 * Reusable StatsCard component
 */
/** Optional per-status project counts shown as chips under a metric's main value. */
type ProjectBreakdown = {
  readonly active?: number;
  readonly archived?: number;
  readonly draft?: number;
};

/** Describes a single metric tile: its label, icon, headline value, and optional extras. */
type MetricItem = {
  title: string;
  Icon: any;
  iconSx?: Record<string, any>;
  value: string | number;
  subtitle?: string;
  hoverable?: boolean;
  dataSlot?: string;
  projectBreakdown?: ProjectBreakdown;
};

/**
 * Component: MetricsCard
 *
 * Purpose: Renders a single dashboard stat tile — title, icon, headline value,
 * optional subtitle, and an optional active/archived/draft project breakdown.
 *
 * Props: see {@link MetricItem} - `title`, `Icon`, `iconSx`, `value`, `subtitle`,
 * `hoverable`, `dataSlot`, `projectBreakdown`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
function MetricsCard({
  title,
  Icon,
  iconSx,
  value,
  subtitle,
  hoverable = false,
  dataSlot = "card",
  projectBreakdown,
}: Readonly<MetricItem>) {
  return (
    <Card
      data-slot={dataSlot}
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3, // ~24px
        borderRadius: 3, // rounded-xl feel
        borderColor: "divider",
        bgcolor: "background.paper",
        color: "text.primary",
        height: "100%",
        ...(hoverable && {
          // cursor: "pointer",
          transition: "border-color 150ms ease",
          // "&:hover": {
          //   borderColor: (theme) => `${theme.palette.primary.main}80`, // ~primary/50
          // },
        }),
      }}
    >
      {/* Header */}
      <Box
        data-slot="card-header"
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          px: 3,     // 24px
          pt: 3,     // 24px
          pb: 1,     // 8px (matches tailwind pb-2-ish)
        }}
      >
        <Typography
          data-slot="card-title"
          variant="body2" // ~text-sm
          sx={{ color: "text.secondary" }}
        >
          {title}
        </Typography>

        {/* Right-side icon */}
        <Icon sx={{ fontSize: 16, ...iconSx }} aria-hidden="true" />
      </Box>

      {/* Content */}
      <CardContent sx={{ px: 3, pb: 3 }}>
        <Typography variant="h5">{value}</Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
        {projectBreakdown && (
          <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Chip
              size="small"
              label={`Active: ${projectBreakdown.active ?? 0}`}
              sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}
            />
            <Chip
              size="small"
              label={`Archived: ${projectBreakdown.archived ?? 0}`}
              sx={{ bgcolor: 'text.secondary', color: 'common.white' }}
            />
            <Chip
              size="small"
              label={`Draft: ${projectBreakdown.draft ?? 0}`}
              sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Main Grid component
 *
 * Component: MetricsGrid (default export)
 *
 * Purpose: Lays out a row of `MetricsCard` stat tiles in a responsive CSS grid,
 * or skeleton placeholders while data is loading.
 *
 * Responsibilities:
 * - Compute a sensible column count (defaults to one column per metric) and
 *   apply responsive breakpoints (1 col on xs, up to 2 on sm, full `cols` on md+).
 * - Render `MetricsCard` per metric, or `MetricCardSkeleton` placeholders while loading.
 *
 * Props:
 * - `metrics` - array of `MetricItem` describing each tile to render.
 * - `columns` - optional explicit column count; defaults to `metrics.length`.
 * - `loading` - whether to render skeleton placeholders instead of real metric cards.
 *
 * Major child components rendered: `MetricsCard`, `MetricCardSkeleton`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function MetricsGrid({ metrics, columns, loading }: Readonly<{ metrics: MetricItem[]; columns?: number; loading?: boolean }>) {
  const cols = columns ?? metrics.length;
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateRows: "auto",
        gridAutoRows: "1fr",
        gridTemplateColumns: {
          xs: "1fr",
          sm: `repeat(${Math.min(cols, 2)}, 1fr)`,
          md: `repeat(${cols}, 1fr)`,
        },
      }}
    >
      {loading
        ? Array.from({ length: cols }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))
        : metrics.map((m, idx) => (
            <Box key={m.title + idx} sx={{ height: '100%' }}>
              <MetricsCard
                title={m.title}
                Icon={m.Icon}
                iconSx={m.iconSx}
                value={m.value}
                subtitle={m.subtitle}
                hoverable={m.hoverable}
                dataSlot={m.dataSlot}
                projectBreakdown={m.projectBreakdown}
              />
            </Box>
          ))}
    </Box>
  );
}
