import { Box, Button, Typography, ToggleButtonGroup, ToggleButton, alpha, useTheme } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import GroupAddIcon from '@mui/icons-material/GroupAdd';

interface ProjectsHeaderProps {
    workspaceName: string;
    viewMode: 'grid' | 'table';
    onViewModeChange: (mode: 'grid' | 'table') => void;
    onAddProject: () => void;
    onManageMembers: () => void;
    workspaceId: string | undefined;
    canManageMembers?: boolean;
}

/**
 * Component: ProjectsHeader
 *
 * Purpose: Page header for the projects list — workspace name/tagline, a
 * grid/table view toggle, an RBAC-gated "Manage Members" button, and the
 * "Create Project" call to action.
 *
 * Responsibilities:
 * - Renders the workspace name and a static description.
 * - Renders a grid/table `ToggleButtonGroup` bound to `viewMode`.
 * - Conditionally renders "Manage Members" based on `canManageMembers`
 *   (RBAC gating is decided by the parent, e.g. limited to super_admin and
 *   workspace_manager) and disables it if there is no `workspaceId` yet.
 * - Always renders "Create Project", delegating the create flow to the parent.
 *
 * Props:
 * - `workspaceName` (`string`): displayed as the page title.
 * - `viewMode` (`'grid' | 'table'`): controls which view toggle button is active.
 * - `onViewModeChange` (`(mode: 'grid' | 'table') => void`): called when the user switches views.
 * - `onAddProject` (`() => void`): opens the create-project flow.
 * - `onManageMembers` (`() => void`): opens the manage-members flow.
 * - `workspaceId` (`string | undefined`): disables "Manage Members" when not yet available.
 * - `canManageMembers` (`boolean`, default `false`): RBAC flag controlling visibility of "Manage Members".
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ProjectsHeader = ({
    workspaceName,
    viewMode,
    onViewModeChange,
    onAddProject,
    onManageMembers,
    workspaceId,
    canManageMembers = false,
}: ProjectsHeaderProps) => {
    const theme = useTheme();

    return (
        <Box sx={{ mb: 4 }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 2,
                    mb: 1,
                }}
            >
                <Box>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        {workspaceName}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage projects and collaborate with your team
                    </Typography>
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                    }}
                >
                    {/* View Toggle */}
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, newMode) => newMode && onViewModeChange(newMode)}
                        size="small"
                        sx={{
                            '& .MuiToggleButton-root': {
                                px: 2,
                                py: 0.75,
                            },
                        }}
                    >
                        <ToggleButton value="grid" aria-label="grid view">
                            <GridViewIcon sx={{ fontSize: 20 }} />
                        </ToggleButton>
                        <ToggleButton value="table" aria-label="table view">
                            <ViewListIcon sx={{ fontSize: 20 }} />
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {/* Manage Members Button — visible to super_admin and workspace_manager only */}
                    {canManageMembers && (
                        <Button
                            variant="outlined"
                            startIcon={<GroupAddIcon />}
                            onClick={onManageMembers}
                            disabled={!workspaceId}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 2.5,
                                py: 0.75,
                                borderRadius: 2,
                                borderColor: alpha(theme.palette.primary.main, 0.4),
                                color: theme.palette.primary.main,
                                '&:hover': {
                                    borderColor: theme.palette.primary.main,
                                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                },
                                '&.Mui-disabled': {
                                    borderColor: alpha(theme.palette.action.disabled, 0.6),
                                    color: theme.palette.action.disabled,
                                },
                            }}
                        >
                            Manage Members
                        </Button>
                    )}

                    {/* Create Project Button */}
                    <Button
                        variant="contained"
                        startIcon={<AddRoundedIcon />}
                        onClick={onAddProject}
                        sx={{
                            backgroundColor: theme.palette.common.black,
                            color: theme.palette.common.white,
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            py: 1,
                            borderRadius: 2,
                            boxShadow: `0 4px 14px ${alpha(theme.palette.common.black, 0.25)}`,
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.common.black, 0.85),
                                boxShadow: `0 6px 20px ${alpha(theme.palette.common.black, 0.35)}`,
                            },
                        }}
                    >
                        Create Project
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default ProjectsHeader;
