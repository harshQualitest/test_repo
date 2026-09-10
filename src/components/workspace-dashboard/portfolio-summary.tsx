
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  useTheme,
} from "@mui/material";

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PauseIcon from "@mui/icons-material/Pause";

// Mock projects data (was previously hardcoded in the JSX)
// Note: used as the default `projects` prop when the caller doesn't supply real data; each entry's
// `onClick` is a `console.log` stub standing in for real navigation/analytics wiring.
const MOCK_PROJECTS = [
  {
    id: 1,
    title: "Customer Support Classification",
    status: { label: "Active", variant: "active" },
    progressPercent: 73,
    progressColor: "#2563EB",
    eta: "2025-01-15",
    throughput: "24.3 /day",
    onClick: () => console.log("Customer Support Classification clicked"),
  },
  {
    id: 2,
    title: "Product Review Analysis",
    status: { label: "At Risk", variant: "atRisk" },
    progressPercent: 42,
    progressColor: "#DC2626",
    eta: "2025-02-05",
    throughput: "12.1 /day",
    onClick: () => console.log("Product Review Analysis clicked"),
  },
  {
    id: 3,
    title: "Email Sentiment Analysis",
    status: { label: "Paused", variant: "paused" },
    progressPercent: 34,
    progressColor: "#9CA3AF",
    eta: "TBD",
    throughput: "0 /day",
    onClick: () => console.log("Email Sentiment Analysis clicked"),
  },
];

/**
 * StatusChip maps Tailwind badge styles to MUI Chip + colors
 * variant: 'active' | 'atRisk' | 'paused'
 *
 * Purpose: Renders a project's status as a colored, iconed `Chip` (blue/check for
 * active, red/warning for at-risk, neutral/pause for paused).
 *
 * @param variant - Status variant driving color + icon; defaults to `"active"`. Unrecognized values fall back to the "paused" styling.
 * @param label - Text label displayed inside the chip.
 */
function StatusChip({ variant = "active", label }: { variant?: string; label: string }) {
  const theme = useTheme();
  /**
   * Resolves the `sx` color styling and icon for the current `variant`.
   * @param t - Optional theme override; falls back to the hook-provided `theme` when omitted.
   * @returns `{ sx, icon }` used to style and icon the `Chip`.
   */
  const getChipProps = (t?: any) => {
    switch (variant) {
      case "active":
        return {
          sx: {
            fontSize: "0.75rem",
            fontWeight: 600,
            bgcolor: (t || theme).palette.primary.main,
            color: (t || theme).palette.primary.contrastText,
            borderRadius: 1,
          },
          icon: <CheckCircleIcon sx={{ fontSize: 14, mr: 0.5 }} />,
        };
      case "atRisk":
        return {
          sx: {
            fontSize: "0.75rem",
            fontWeight: 600,
            bgcolor: (t || theme).palette.error.main,
            color: (t || theme).palette.common.white,
            borderRadius: 1,
          },
          icon: <WarningAmberIcon sx={{ fontSize: 14, mr: 0.5 }} />,
        };
      case "paused":
      default:
        return {
          sx: {
            fontSize: "0.75rem",
            fontWeight: 600,
            borderRadius: 1,
            bgcolor: (t || theme).palette.mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
            color: (t || theme).palette.text.primary,
          },
          icon: <PauseIcon sx={{ fontSize: 14, mr: 0.5 }} />,
        };
    }
  };

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Chip icon={getChipProps(theme).icon} label={label} size="small" sx={getChipProps(theme).sx} />
    </Box>
  );
}

/**
 * Simple progress bar to match Tailwind h-2 rounded-full, with custom color
 *
 * @param percent - Fill percentage; clamped to the [0, 100] range so an out-of-range value can't overflow/underflow the bar.
 * @param color - Fill color (hex or theme-resolvable color string); defaults to blue-600.
 */
function ProgressBar({ percent = 0, color = "#2563EB" /* blue-600 */ }) {
  // Why: guards against callers passing a percent outside 0-100, which would otherwise
  // render a bar wider than its container or with a negative width.
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <Box
      sx={{
        width: "100%",
        height: 8, // h-2
        borderRadius: 9999, // rounded-full
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(255,255,255,0.10)"
            : "rgba(0,0,0,0.08)", // bg-muted
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
 * ProjectCard replicates the inner “card” blocks with title, status badge, progress, and meta
 *
 * @param title - Project name/title (clamped to 2 lines visually).
 * @param status - `{ label, variant }` passed through to {@link StatusChip}.
 * @param progressPercent - Completion percentage shown both as text and in the {@link ProgressBar}.
 * @param progressColor - Fill color for the progress bar (hex or theme color).
 * @param eta - Display string for the project's estimated completion date.
 * @param throughput - Display string for the project's current throughput rate.
 * @param onClick - Handler invoked when the card is clicked.
 */
function ProjectCard({
  title,
  status, // { label: string; variant: 'active' | 'atRisk' | 'paused' }
  progressPercent,
  progressColor, // hex or theme color
  eta,
  throughput,
  onClick,}: {
  title: string;
  status: { label: string; variant: string };
  progressPercent: number;
  progressColor: string;
  eta: string;
  throughput: string;
  onClick: () => void;}) {
  // text clamp to 2 lines (Tailwind line-clamp-2)
  const clampTwoLines = {
    display: "-webkit-box",
    WebkitLineClamp: "2",
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3, // 24px
        borderRadius: 3, // rounded-xl
        cursor: "pointer",
        transition: "box-shadow 150ms ease",
        "&:hover": { boxShadow: 4 }, // hover:shadow-md
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "grid",
          gridAutoRows: "min-content",
          gridTemplateRows: "auto auto",
          alignItems: "start",
          gap: 1.5,
          px: 3,
          pt: 3,
          pb: 1.5, // pb-3
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography
            variant="body2" // text-sm
            sx={{ ...clampTwoLines, fontWeight: 600 }}
          >
            {title}
          </Typography>
          <StatusChip variant={status.variant} label={status.label} />
        </Box>
      </Box>

      {/* Content */}
      <CardContent sx={{ px: 3, pb: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {/* Progress */}
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 0.5,
              }}
            >
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Progress
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {`${progressPercent}%`}
              </Typography>
            </Box>
            <ProgressBar percent={progressPercent} color={progressColor} />
          </Box>

          {/* Meta grid */}
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: {
                xs: "1fr 1fr",
              },
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                ETA
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
                {eta}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Throughput
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
                {throughput}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * Purpose: Shape of a single project entry rendered in the Portfolio Summary grid.
 *
 * @property id - Unique project identifier; used as the React list key and passed to `onProjectClick`.
 * @property title - Project display name.
 * @property status - `{ label, variant }` — variant drives {@link StatusChip} color/icon ('active' | 'atRisk' | 'paused').
 * @property progressPercent - Completion percentage (0-100) shown as text and progress bar fill.
 * @property progressColor - Fill color for the project's progress bar.
 * @property eta - Display string for estimated completion date.
 * @property throughput - Display string for the project's current throughput rate.
 */
export interface Project {
  id: string | number;
  title: string;
  status: { label: string; variant: string };
  progressPercent: number;
  progressColor: string;
  eta: string;
  throughput: string;
}

/**
 * Main Portfolio Summary card with grid of three projects
 *
 * Component: PortfolioSummary
 *
 * Purpose: Workspace dashboard card that summarizes active projects (status,
 * progress, ETA, throughput) as a responsive grid of {@link ProjectCard}s.
 *
 * Responsibilities:
 * - Render a card header (title + subtitle).
 * - Render one `ProjectCard` per entry in `projects`, forwarding `onProjectClick(p.id)` as each card's click handler.
 * - Fall back to `MOCK_PROJECTS` sample data when no `projects` prop is supplied.
 *
 * Props:
 * - onProjectClick: (project: any) => void - called with a project's `id` when its card is clicked.
 * - projects?: Project[] - projects to render; defaults to `MOCK_PROJECTS`.
 *
 * Major child components rendered: MUI `Card`/`CardContent`/`Box`/`Typography`, local `ProjectCard` (which itself renders `StatusChip` and `ProgressBar`).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function PortfolioSummary({ 
  onProjectClick,
  projects = MOCK_PROJECTS 
}: { 
  onProjectClick: (project: any) => void;
  projects?: Project[];
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        borderRadius: 3, // rounded-xl
      }}
    >
      {/* Parent card header */}
      <Box
        sx={{
          display: "grid",
          gridAutoRows: "min-content",
          gridTemplateRows: "auto auto",
          alignItems: "start",
          gap: 1.5,
          px: 3,
          pt: 3,
          pb: 3,
        }}
      >
        <Typography
          variant="h6"
          sx={{ lineHeight: 1 /* leading-none */, fontWeight: 700 }}
        >
          Portfolio Summary
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Active projects in this workspace
        </Typography>
      </Box>

      {/* Parent card content */}
      <CardContent sx={{ px: 3, pb: 3 }}>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
          }}
        >
            {projects.map((p) => (
              <Box key={p.id}>
                <ProjectCard
                  title={p.title}
                  status={p.status}
                  progressPercent={p.progressPercent}
                  progressColor={p.progressColor}
                  eta={p.eta}
                  throughput={p.throughput}
                  onClick={() => onProjectClick(p.id)}
                />
              </Box>
            ))}
        </Box>
      </CardContent>
    </Card>
  );
}
