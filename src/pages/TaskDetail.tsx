import { useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Button } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PreviewIcon from "@mui/icons-material/Preview";
import TaskPreview from "./TaskPreview";
import TaskDashboard from "./TaskDashboard";

/**
 * Component: TaskDetail
 *
 * Purpose: Route wrapper that toggles between two views of the same task —
 * `TaskPreview` (annotation/review content) and `TaskDashboard` (metrics) —
 * using the `projectId`/`taskId` route params.
 *
 * Responsibilities:
 * - Reads `projectId`/`taskId` from the route and passes them to whichever
 *   sub-view is active.
 * - Toggles between "preview" and "dashboard" view modes via a single button.
 *
 * Props: none (route component).
 *
 * State: `viewMode` - which sub-view ("preview" | "dashboard") is displayed.
 *
 * Major child components: `TaskPreview`, `TaskDashboard`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const TaskDetail = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const [viewMode, setViewMode] = useState<"preview" | "dashboard">("preview");

  console.log("Project ID:", projectId, "Task ID:", taskId);

  /** Flips between the "preview" and "dashboard" view modes. Triggered by the toggle button. */
  const toggleView = () => {
    setViewMode(prev => prev === "preview" ? "dashboard" : "preview");
  };

  return (
    <Box sx={{ height: "100%" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Button
          variant="outlined"
          startIcon={viewMode === "preview" ? <DashboardIcon /> : <PreviewIcon />}
          onClick={toggleView}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {viewMode === "preview" ? "View Dashboard" : "View Preview"}
        </Button>
      </Box>

      <Box sx={{ flex: 1 }}>
        {viewMode === "preview" ? (
          <TaskPreview taskId={taskId} projectId={projectId} />
        ) : (
          <TaskDashboard taskId={taskId} projectId={projectId} />
        )}
      </Box>
    </Box>
  );
};

export default TaskDetail;