
import { Box, Typography, Chip, Card, CardContent, IconButton } from "@mui/material";

// MUI Icons (closest matches)
import LockIcon from "@mui/icons-material/Lock";
import PublicIcon from "@mui/icons-material/Public";
import ShareIcon from "@mui/icons-material/Share";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HubIcon from "@mui/icons-material/Hub";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import GroupIcon from "@mui/icons-material/Group";

/**
 * Component: KanbanView
 *
 * Purpose: Renders workspaces as a 3-column Kanban board, bucketed by
 * visibility (Private / Public / Shareable), so users can scan workspaces
 * grouped by who can access them.
 *
 * Responsibilities:
 * - Bucket the incoming `workspaces` list into private/public/shareable columns
 *   based on each workspace's `badgeLabel`.
 * - Render a summary card per workspace with title, description, type chip,
 *   project count, and member count.
 *
 * Props:
 * - `workspaces` - optional array of workspace objects (loosely typed as `any[]`).
 *
 * Business logic: workspaces are grouped strictly by `badgeLabel` (case-insensitive
 * match against "private"/"public"/"shareable"); a workspace whose `badgeLabel`
 * doesn't match any of the three values is silently excluded from all columns
 * rather than defaulting to a bucket, since visibility is expected to always be
 * one of the three known values.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function KanbanView({ workspaces = [] }: { workspaces?: any[] }) {
  /**
   * Filters the workspace list down to those whose `badgeLabel` (visibility)
   * matches the given type, case-insensitively.
   * @param type - visibility bucket to match ("private" | "public" | "shareable").
   * @returns Workspaces belonging to that visibility bucket.
   */
  const byType = (type: string) =>
    workspaces.filter((w: any) => (w.badgeLabel || "").toString().toLowerCase() === type.toLowerCase());

  const privateList = byType("private");
  const publicList = byType("public");
  const shareableList = byType("shareable");

  /**
   * Renders a single workspace summary card for the Kanban board.
   * @param w - workspace object (title, desc, color, projects/members counts, badge info).
   * @returns The MUI `Card` element for this workspace.
   */
  const renderCard = (w: any) => {
    // Project/member counts can arrive as numbers or numeric strings depending
    // on the data source; normalize to a number where parseable, else keep the
    // original string as a display fallback.
    const projectsCount = typeof w.projects === 'string' ? parseInt(w.projects, 10) || w.projects : w.projects;
    const membersCount = typeof w.members === 'string' ? parseInt(w.members, 10) || w.members : w.members;

    return (
      <Card
        key={w.title}
        variant="outlined"
        sx={{
          borderRadius: 3,
          transition: "border-color 150ms ease",
          "&:hover": { borderColor: (theme) => `${theme.palette.primary.main}80` },
        }}
      >
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, px: 3, pt: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, cursor: "pointer" }}>
              <Box
                sx={{
                  height: 32,
                  width: 32,
                  borderRadius: 1.5,
                  bgcolor: w.color || "#3B82F6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <HubIcon sx={{ fontSize: 16, color: "#fff" }} />
              </Box>
              <Typography
                variant="body2"
                sx={{ transition: "color 150ms ease", "&:hover": { color: "primary.main" } }}
              >
                {w.title}
              </Typography>
            </Box>
            <IconButton
              size="small"
              sx={{
                width: 24,
                height: 24,
                borderRadius: 1,
                "& .MuiSvgIcon-root": { fontSize: 14 },
                "&:hover": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(144,202,249,0.12)"
                      : "rgba(25,118,210,0.08)",
                },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>

          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {w.desc}
          </Typography>

          <Chip
            label={w.badgeLabel || w.collapsible?.typeChip || ""}
            size="small"
            sx={{
              fontSize: "0.75rem",
              fontWeight: 500,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)"),
              width: "fit-content",
            }}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "text.secondary" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <FolderOpenIcon sx={{ fontSize: 12 }} /> <span>{projectsCount}</span>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <GroupIcon sx={{ fontSize: 12 }} /> <span>{membersCount}</span>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
      {/* Private Section */}
      <Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LockIcon sx={{ fontSize: 14 }} /> Private
            </Typography>
            <Chip
              label={String(privateList.length)}
              size="small"
              sx={{
                fontSize: "0.75rem",
                fontWeight: 500,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)"),
              }}
            />
          </Box>

          {privateList.map((w: any) => renderCard(w))}
        </Box>
      </Box>

      {/* Public Section */}
      <Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <PublicIcon sx={{ fontSize: 14 }} /> Public
            </Typography>
            <Chip
              label={String(publicList.length)}
              size="small"
              sx={{
                fontSize: "0.75rem",
                fontWeight: 500,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)"),
              }}
            />
          </Box>

          {publicList.map((w: any) => renderCard(w))}
        </Box>
      </Box>

      {/* Shareable Section */}
      <Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ShareIcon sx={{ fontSize: 14 }} /> Shareable
            </Typography>
            <Chip
              label={String(shareableList.length)}
              size="small"
              sx={{
                fontSize: "0.75rem",
                fontWeight: 500,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)"),
              }}
            />
          </Box>

          {shareableList.map((w: any) => renderCard(w))}
        </Box>
      </Box>
    </Box>
  );
}
