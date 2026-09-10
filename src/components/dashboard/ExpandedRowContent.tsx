import { Box, Typography, Chip, IconButton } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExternalLinkIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom";

/** Raw project shape as returned by the workspace/projects API. */
interface WorkspaceProject {
  project_id: string;
  project_name: string;
  project_description: string;
  template_type: string;
  status: string;
}

/** Normalized, display-ready project shape used for rendering rows in this component. */
interface ProjectItem {
  readonly projectId?: string;
  readonly projectName?: string;
  readonly projectChip?: string;
  readonly statusLabel?: string;
  readonly description?: string;
  readonly teams?: string;
  readonly assets?: string;
}

interface ExpandedRowContentProps {
  readonly workspace?: {
    readonly projectCount?: number;
    readonly projects?: WorkspaceProject[];
    /** Legacy/fallback shape used before the API-driven `projects` field existed. */
    readonly collapsible?: {
      readonly typeLabel?: string;
      readonly typeChip?: string;
      readonly projectName?: string;
      readonly projectChip?: string;
      readonly statusLabel?: string;
      readonly teams?: string;
      readonly assets?: string;
      readonly teamChips?: string[];
      readonly projectId?: string;
      readonly projects?: ProjectItem[];
    };
  };
}

/**
 * Component: ExpandedRowContent
 *
 * Purpose: Renders the project list shown when a workspace row is expanded in
 * {@link ListView}'s table (the `ListView` dashboard view). Lets a user see and
 * navigate to every project that belongs to a workspace without leaving the list.
 *
 * Responsibilities:
 * - Normalize project data from one of three possible sources (API `projects`,
 *   legacy `collapsible.projects`, or a single legacy `collapsible` project) into
 *   a single `ProjectItem[]` shape for rendering.
 * - Render an empty state when the workspace has no projects.
 * - Navigate to a project's dashboard when its row is clicked.
 *
 * Props:
 * - `workspace` (optional): workspace data containing `projectCount`, the API
 *   `projects` array, and/or the legacy `collapsible` fallback fields.
 *
 * Custom hooks used: `useNavigate` (react-router-dom) for row-click navigation.
 *
 * Major child components rendered: MUI `Box`, `Typography`, `Chip`, `IconButton`.
 *
 * Business logic: project data source precedence is API `projects` > legacy
 * `collapsible.projects` list > legacy single `collapsible` project > empty list.
 * This keeps the component backward compatible with workspace payloads that
 * predate the dedicated `projects` API field.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function ExpandedRowContent({ workspace }: ExpandedRowContentProps) {
  const navigate = useNavigate();
  const collapsible = workspace?.collapsible;
  
  // Use projects from API response first, then fallback to collapsible data
  const apiProjects = workspace?.projects || [];
  const projectCount = workspace?.projectCount || apiProjects.length || 0;
  
  // Map API projects to display format
  // Why: the workspace payload can arrive in one of three historical shapes
  // (fresh API `projects`, a legacy `collapsible.projects` list, or a single
  // legacy `collapsible` project). Normalizing here keeps the render JSX simple
  // and shields it from having to branch on data source.
  let projects: ProjectItem[];
  if (apiProjects.length > 0) {
    projects = apiProjects.map(project => ({
      projectId: project.project_id,
      projectName: project.project_name,
      projectChip: project.template_type,
      statusLabel: project.status,
      description: project.project_description,
      teams: undefined,
      assets: undefined,
    }));
  } else if (collapsible?.projects && collapsible.projects.length > 0) {
    projects = collapsible.projects;
  } else if (collapsible?.projectName) {
    projects = [{
      projectId: collapsible?.projectId,
      projectName: collapsible?.projectName,
      projectChip: collapsible?.projectChip,
      statusLabel: collapsible?.statusLabel,
      teams: collapsible?.teams,
      assets: collapsible?.assets,
    }];
  } else {
    projects = [];
  }

  /**
   * Navigates to the clicked project's dashboard, stopping propagation so the
   * click doesn't also trigger the parent workspace row's own click handling.
   * @param projectId - id of the project row that was clicked (may be undefined for legacy rows without an id).
   * @returns A React mouse event handler bound to the given `projectId`.
   */
  const handleProjectClick = (projectId?: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (projectId) {
      navigate(`/project-dashboard/${projectId}`);
    }
  };

  return (
    <Box sx={{ pl: 7, pr: 1.25, py: 4 }}>
      <Box>
        <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
          Projects ({projectCount})
        </Typography>
        {projects.length === 0 ? (
          <Box sx={{ 
            p: 3, 
            textAlign: 'center',
            color: 'text.secondary',
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.02)",
            borderRadius: 1.5,
          }}>
            <Typography variant="body2">No projects in this workspace</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {projects.map((project, index) => (
              <Box
                key={project.projectId || index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  p: 3,
                  borderRadius: 1.5,
                  bgcolor: "background.paper",
                  transition: "background-color 150ms ease",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                  },
                }}
              >
                {/* Project details */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {project.projectName ?? "Default Project"}
                    </Typography>
                    <Chip
                      data-slot="badge"
                      label={project.projectChip ?? "Annotation"}
                      size="small"
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        height: "auto",
                        py: 0.5,
                        px: 2,
                        borderRadius: 1,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255,255,255,0.10)"
                            : "rgba(0,0,0,0.06)",
                        color: "text.primary",
                        textTransform: "capitalize",
                      }}
                    />
                  </Box>
                  {project.description && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                      {project.description}
                    </Typography>
                  )}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                      fontSize: "0.75rem",
                      color: "text.secondary",
                    }}
                  >
                    {project.teams && <Typography variant="caption">{project.teams}</Typography>}
                    {project.assets && <Typography variant="caption">{project.assets}</Typography>}
                  </Box>
                </Box>

                {/* Status indicator */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {/* Why: only an "active" project is considered healthy/on-track (green);
                        every other status (draft, paused, completed, etc.) is flagged amber
                        so at-risk or non-active projects stand out in the list. */}
                    <CheckCircleIcon
                      sx={{
                        fontSize: 14,
                        color: project.statusLabel?.toLowerCase() === 'active' ? "success.main" : "warning.main",
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontSize: "0.75rem", textTransform: "capitalize" }}
                    >
                      {project.statusLabel ?? "On Track"}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={handleProjectClick(project.projectId)}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      "&:hover": {
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(144,202,249,0.12)"
                            : "rgba(25,118,210,0.08)",
                      },
                    }}
                    aria-label="Open project dashboard"
                  >
                    <ExternalLinkIcon
                      sx={{
                        fontSize: 14,
                        color: "text.secondary",
                      }}
                    />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
