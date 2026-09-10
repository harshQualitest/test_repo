import {
    Box,
    Stack,
    Button
} from '@mui/material';

import AppsIcon from "@mui/icons-material/Apps";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
// import TimelineIcon from "@mui/icons-material/Timeline";
// import ViewKanbanIcon from "@mui/icons-material/ViewKanban";

/** The set of dashboard view modes a workspace list can be rendered in. Gantt and Kanban
 * are defined here and supported by the toggle's type, but their buttons are currently
 * commented out below (not exposed in the UI yet). */
type ViewType = 'widget' | 'list' | 'gantt' | 'kanban';

/**
 * Component: WorkSpaceViewTypes
 *
 * Purpose: Renders the segmented button group used to switch the workspace
 * dashboard between its available view modes (Widget / List, with Gantt and
 * Kanban present in code but currently commented out of the UI).
 *
 * Responsibilities:
 * - Highlight the currently selected view (`contained` variant) vs. inactive
 *   views (`text` variant).
 * - Notify the parent via `onViewChange` when a different view is selected.
 *
 * Props:
 * - `selectedView` - the currently active `ViewType`; defaults to `'widget'`.
 * - `onViewChange` - optional callback invoked with the newly selected `ViewType`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const WorkSpaceViewTypes = ({
    selectedView = 'widget',
    onViewChange,
}: {
    selectedView?: ViewType;
    onViewChange?: (view: ViewType) => void;
} = {}) => {
    return (
        <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            sx={{ mt: 2 }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1, // theme.spacing(1) -> 8px by default
                    p: 1,
                    mb: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2, // 16px -> rounded-lg feel
                    bgcolor: "background.paper",
                }}
            >
                {/* Widget button */}
                <Button
                    variant={selectedView === 'widget' ? 'contained' : 'text'}
                    color="primary"
                    startIcon={<AppsIcon sx={{ fontSize: 16 }} />}
                    onClick={() => onViewChange?.('widget')}
                    sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        height: 32,
                        borderRadius: 1,
                        px: 1.5,
                        "& .MuiSvgIcon-root": {
                            fontSize: 16,
                            pointerEvents: "none",
                            flexShrink: 0,
                        },
                        "&:hover": selectedView !== 'widget' ? {
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(144,202,249,0.12)"
                                    : "rgba(25,118,210,0.08)",
                        } : undefined,
                        "&:focusVisible": {
                            boxShadow: (theme) =>
                                `0 0 0 3px ${theme.palette.primary.main}66`,
                        },
                    }}
                >
                    Widget
                </Button>

                {/* List button */}
                <Button
                    variant={selectedView === 'list' ? 'contained' : 'text'}
                    color={selectedView === 'list' ? 'primary' : 'inherit'}
                    startIcon={<FormatListBulletedIcon sx={{ fontSize: 16 }} />}
                    onClick={() => onViewChange?.('list')}
                    sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        height: 32,
                        borderRadius: 1,
                        px: 1.5,
                        gap: 1,
                        "& .MuiSvgIcon-root": {
                            fontSize: 16,
                            pointerEvents: "none",
                            flexShrink: 0,
                        },
                        "&:hover": selectedView !== 'list' ? {
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(144,202,249,0.12)"
                                    : "rgba(25,118,210,0.08)",
                        } : undefined,
                        "&:focusVisible": {
                            boxShadow: (theme) =>
                                `0 0 0 3px ${theme.palette.mode === "dark"
                                    ? "rgba(144,202,249,0.4)"
                                    : "rgba(25,118,210,0.5)"
                                }`,
                        },
                    }}
                >
                    List
                </Button>

                {/* <Button
                    variant={selectedView === 'gantt' ? 'contained' : 'text'}
                    color={selectedView === 'gantt' ? 'primary' : 'inherit'}
                    startIcon={<TimelineIcon sx={{ fontSize: 16 }} />}
                    onClick={() => onViewChange?.('gantt')}
                    sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        height: 32,
                        borderRadius: 1,
                        px: 1.5,
                        gap: 1,
                        "& .MuiSvgIcon-root": {
                            fontSize: 16,
                            pointerEvents: "none",
                            flexShrink: 0,
                        },
                        "&:hover": selectedView !== 'gantt' ? {
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(144,202,249,0.12)"
                                    : "rgba(25,118,210,0.08)",
                        } : undefined,
                        "&:focusVisible": {
                            boxShadow: (theme) =>
                                `0 0 0 3px ${theme.palette.mode === "dark"
                                    ? "rgba(144,202,249,0.4)"
                                    : "rgba(25,118,210,0.5)"
                                }`,
                        },
                    }}
                >
                    Gantt
                </Button>

                <Button
                    variant={selectedView === 'kanban' ? 'contained' : 'text'}
                    color={selectedView === 'kanban' ? 'primary' : 'inherit'}
                    startIcon={<ViewKanbanIcon sx={{ fontSize: 16 }} />}
                    onClick={() => onViewChange?.('kanban')}
                    sx={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        height: 32,
                        borderRadius: 1,
                        px: 1.5,
                        gap: 1,
                        "& .MuiSvgIcon-root": {
                            fontSize: 16,
                            pointerEvents: "none",
                            flexShrink: 0,
                        },
                        "&:hover": selectedView !== 'kanban' ? {
                            bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                    ? "rgba(144,202,249,0.12)"
                                    : "rgba(25,118,210,0.08)",
                        } : undefined,
                        "&:focusVisible": {
                            boxShadow: (theme) =>
                                `0 0 0 3px ${theme.palette.mode === "dark"
                                    ? "rgba(144,202,249,0.4)"
                                    : "rgba(25,118,210,0.5)"
                                }`,
                        },
                    }}
                >
                    Kanban
                </Button> */}
            </Box>
        </Stack>
    );
}