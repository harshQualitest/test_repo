import { Box, Button, Typography, useTheme } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

/**
 * Component: NotificationBanner
 *
 * Purpose: Displays a warning banner on the project dashboard alerting
 * annotators/reviewers that annotation guidelines have been updated and should
 * be reviewed.
 *
 * Responsibilities:
 * - Render a themed (light/dark aware) warning banner with "View Changes",
 *   "Mark as Reviewed", and "Close" actions.
 *
 * Note: the action buttons ("View Changes", "Mark as Reviewed", "Close") are not
 * currently wired to handlers — this component is presentational only; the
 * guideline version and message text are static/hardcoded, not sourced from an API.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function NotificationBanner() {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "flex-start",
        justifyContent: "space-between",
        p: 2,
        borderRadius: 2,
        border: `1px solid ${theme.palette.mode === "dark" ? "rgba(255,180,0,0.12)" : "#FDE68A"}`,
        bgcolor: theme.palette.mode === "dark" ? "rgba(245,158,11,0.08)" : "#FFFBEB",
      }}
    >
      <Box sx={{ display: "flex", gap: 2 }}>
        <WarningAmberIcon sx={{ color: "warning.dark", mt: 0.5 }} />
        <Box>
          <Typography sx={{ fontWeight: 600, color: "warning.dark" }}>Guideline Update Available</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>Version v2.3.1 includes updated classification criteria for technical content. Review changes before continuing annotation.</Typography>
          <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
            <Button size="small" variant="outlined">View Changes</Button>
            <Button size="small" variant="contained">Mark as Reviewed</Button>
          </Box>
        </Box>
      </Box>

      <Button size="small">Close</Button>
    </Box>
  );
}
