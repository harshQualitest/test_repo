
import {
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import HubIcon from "@mui/icons-material/Hub";
import LockIcon from "@mui/icons-material/Lock";
import PublicIcon from "@mui/icons-material/Public";
import ShareIcon from "@mui/icons-material/Share";

/**
 * Reusable row component representing a workspace with a projects bar across months
 *
 * Props:
 * - `color` - accent color for the workspace icon square and the timeline bar.
 * - `name` - workspace display name.
 * - `projectsLabel` - human-readable project count label shown next to the name and inside the bar.
 * - `barStart` - 1-based starting month column (1 = Jan) for the timeline bar.
 * - `barSpan` - number of month columns the timeline bar covers.
 * - `visibility` - workspace visibility (`private` | `public` | `shareable`), used to pick the icon.
 */
type WorkspaceRowProps = {
  color?: string;
  name: string;
  projectsLabel?: string;
  barStart?: number;
  barSpan?: number;
  visibility?: string;
};

function WorkspaceRow({
  color = "#3B82F6",
  name,
  projectsLabel = "1 projects",
  barStart = 1,
  barSpan = 4,
  visibility = "private",
}: WorkspaceRowProps) {
  // clamp values to [1..12]
  // Why: barStart/barSpan come from workspace data that may be missing or out
  // of range; clamping keeps the CSS grid column math (12-month grid) valid
  // and prevents the bar from rendering outside the Jan-Dec header.
  const start = Math.max(1, Math.min(12, barStart));
  const span = Math.max(1, Math.min(12 - start + 1, barSpan));

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2, // ~16px
        py: 1,  // ~8px
        borderRadius: 2, // rounded-lg feel
        transition: "background-color 150ms ease",
        "&:hover": {
          backgroundColor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.06)" // muted/50 approx
              : "rgba(0,0,0,0.04)",
        },
      }}
    >
      {/* Left chevron button (w-12 flex justify-center) */}
      <Box sx={{ width: 48, display: "flex", justifyContent: "center" }}>
        <IconButton
          size="small"
          sx={{
            width: 32,
            height: 32, // h-8 w-8
            borderRadius: 1, // rounded-md
            "& .MuiSvgIcon-root": { fontSize: 16, pointerEvents: "none", flexShrink: 0 },
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(144,202,249,0.12)"
                  : "rgba(25,118,210,0.08)", // hover:bg-accent
            },
            "&:focusVisible": {
              boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}80`,
              outline: "none",
            },
          }}
          aria-label={`Open ${name}`}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* Workspace column (w-64) */}
      <Box sx={{ width: 256, cursor: "pointer" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            transition: "color 150ms ease",
            "&:hover .workspaceTitle": { color: "primary.main" }, // hover:text-primary
          }}
        >
          {/* small colored square with icon (h-6 w-6 rounded bg-*) */}
          <Box
            sx={{
              height: 24,
              width: 24,
              borderRadius: 1, // rounded
              bgcolor: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-hidden="true"
          >
            {/* Maps workspace visibility to a representative icon; unrecognized/empty
                visibility falls back to the generic "hub" icon. */}
            {(function selectIcon() {
              const v = (visibility || "").toString().toLowerCase();
              if (v === "private") return <LockIcon sx={{ fontSize: 14, color: "#fff" }} />;
              if (v === "public") return <PublicIcon sx={{ fontSize: 14, color: "#fff" }} />;
              if (v === "shareable") return <ShareIcon sx={{ fontSize: 14, color: "#fff" }} />;
              return <HubIcon sx={{ fontSize: 14, color: "#fff" }} />;
            })()}
          </Box>
          <Typography className="workspaceTitle" variant="body2">
            {name}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", ml: 3 }}>
          {projectsLabel}
        </Typography>
      </Box>

      {/* Middle month bar grid (flex-1 relative h-8) */}
      <Box sx={{ position: "relative", height: 32, flex: 1 }}>
        {/* 12-column grid (grid grid-cols-12 gap-1 h-full) */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 0.5, // ~4px (Tailwind gap-1)
            height: "100%",
          }}
        >
          {/* Project bar (col-start-X col-span-Y bg-* opacity-20 rounded ...) */}
          <Box
            sx={{
              gridColumn: `${start} / span ${span}`,
              bgcolor: color,
              opacity: 0.2,
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "opacity 150ms ease",
              "&:hover": { opacity: 0.3 },
            }}
          >
            <Typography
              variant="caption"
              sx={{ px: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {projectsLabel}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Right arrow button (w-20 flex justify-end) */}
      <Box sx={{ width: 80, display: "flex", justifyContent: "flex-end" }}>
        <IconButton
          size="small"
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            "& .MuiSvgIcon-root": { fontSize: 16, pointerEvents: "none", flexShrink: 0 },
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(144,202,249,0.12)"
                  : "rgba(25,118,210,0.08)",
            },
            "&:focusVisible": {
              boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}80`,
              outline: "none",
            },
          }}
          aria-label={`Go to ${name}`}
        >
          <ArrowForwardIcon />
        </IconButton>
      </Box>
    </Box>
  );
}

/**
 * Main component replicating the container, header (months), and rows
 *
 * Component: GanttView
 *
 * Purpose: Renders a monthly timeline (Gantt-style) view of workspaces, one row
 * per workspace, showing a colored bar spanning the months its projects run
 * across. Replicates the container, header (month labels), and rows.
 *
 * Responsibilities:
 * - Map raw `workspaces` data into per-row display fields (name, color, project
 *   label, bar position/span, visibility) with sensible fallbacks.
 * - Render the Jan-Dec month header and one `WorkspaceRow` per workspace.
 *
 * Props:
 * - `workspaces` - optional array of workspace objects (loosely typed as `any[]`
 *   since this view accepts multiple legacy/API shapes).
 *
 * Major child components rendered: `WorkspaceRow` (local, per-row bar renderer).
 *
 * Business logic: when a workspace doesn't specify explicit `ganttStart`/`ganttSpan`,
 * the row's starting month is derived from its index (`idx % 12 + 1`) purely so
 * that rows visually spread across the timeline instead of stacking on month 1;
 * this is a display fallback, not derived from real project scheduling data.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function GanttView({ workspaces = [] }: { workspaces?: any[] }) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Normalize each workspace into the fields WorkspaceRow needs, falling back
  // to placeholder values when the workspace has no explicit Gantt metadata.
  const rows = (workspaces ?? []).map((w: any, idx: number) => ({
    name: w.title ?? `workspace-${idx}`,
    color: w.color ?? "#3B82F6",
    projectsLabel: typeof w.projects === 'number' ? `${w.projects} projects` : (w.projects ?? "1 projects"),
    barStart: w.ganttStart ?? ((idx % 12) + 1),
    barSpan: w.ganttSpan ?? 4,
    visibility: w.badgeLabel ?? "",
  }));

  return (
    <Box
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 2, // rounded-lg
        p: 3, // p-6
      }}
    >
      {/* Header row */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, pb: 2, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ width: 48 }} /> {/* w-12 */}
        <Box sx={{ width: 256 }}>
          <Typography variant="body2">Workspace</Typography>
        </Box>
        {/* Months grid: flex-1 grid grid-cols-12 gap-1 text-xs text-muted-foreground text-center */}
        <Box sx={{ flex: 1 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gap: 0.5,
              textAlign: "center",
              "& > *": {
                fontSize: "0.75rem", // text-xs
                color: "text.secondary",
              },
            }}
          >
            {months.map((m) => (
              <Box key={m}>{m}</Box>
            ))}
          </Box>
        </Box>
        <Box sx={{ width: 80 }} /> {/* w-20 */}
      </Box>

      {/* Rows */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 /* space-y-2 */ }}>
        {rows.map((r, i) => (
          <WorkspaceRow
            key={r.name + i}
            color={r.color}
            name={r.name}
            projectsLabel={r.projectsLabel}
            barStart={r.barStart}
            barSpan={r.barSpan}
            visibility={r.visibility}
          />
        ))}
      </Box>
    </Box>
  );
}
