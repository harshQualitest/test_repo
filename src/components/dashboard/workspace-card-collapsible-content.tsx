
import {
  Box,
  Typography,
  Chip,
  Paper,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import GroupIcon from "@mui/icons-material/Group";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
export interface CollapsibleContentProps {
  data?: {
    typeLabel?: string;
    typeChip?: string;
    projectName?: string;
    projectChip?: string;
    statusLabel?: string;
    teams?: string;
    assets?: string;
    teamChips?: string[];
  };
}

/**
 * Component: CollapsibleContent
 *
 * Purpose: Renders the expanded detail section of a workspace card — workspace
 * type, a summary of one representative project, and the teams associated with
 * that project. Intended to be shown inside a collapsible/expandable area of a
 * workspace widget card.
 *
 * Props:
 * - `data` (optional): workspace detail fields (`typeLabel`, `typeChip`, `projectName`,
 *   `projectChip`, `statusLabel`, `teams`, `assets`, `teamChips`). Every field has a
 *   hardcoded placeholder fallback so the component renders sensibly with no data.
 *
 * Note: all status/text values here are display fallbacks/placeholders (e.g. "On Track",
 * "Default Project") rather than live computed state — this component only formats
 * whatever `data` it's given.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function CollapsibleContent({ data }: CollapsibleContentProps) {
  return (
    <Box
      data-state="open"
      id="collapsible-content"
      sx={{
        mt: 2,
        pt: 2,
        borderTop: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      {/* Workspace Type */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          {data?.typeLabel ?? "Workspace Type"}
        </Typography>
        <Chip
          label={data?.typeChip ?? "Enterprise Client"}
          size="small"
          sx={{
            fontSize: "0.75rem",
            fontWeight: 500,
            bgcolor: "action.hover",
            color: "text.primary",
            borderRadius: 1,
          }}
        />
      </Box>

      {/* Project Info */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {/* Top Row: Project Name + Badge + Status */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="body2">{data?.projectName ?? "Default Project"}</Typography>
            <Chip
              label={data?.projectChip ?? "Annotation"}
              size="small"
              sx={{
                fontSize: "0.75rem",
                fontWeight: 500,
                borderRadius: 1,
              }}
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
            <Typography variant="caption" color="text.secondary">
              {data?.statusLabel ?? "On Track"}
            </Typography>
          </Box>
        </Box>

        {/* Teams and Assets */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <GroupIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">
              {data?.teams ?? "1 teams"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <FolderOpenIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">
              {data?.assets ?? "10 assets"}
            </Typography>
          </Box>
        </Box>

        {/* Teams Badges */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {(data?.teamChips ?? ["Team A"]).map((t) => (
            <Chip
              key={t}
              label={t}
              size="small"
              sx={{
                fontSize: "0.75rem",
                fontWeight: 500,
                bgcolor: "action.hover",
                color: "text.primary",
                borderRadius: 1,
              }}
            />
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
