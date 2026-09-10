import { Box, Typography, alpha, useTheme } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

interface EmptyProjectsStateProps {
    hasProjects: boolean;
}

/**
 * Component: EmptyProjectsState
 *
 * Purpose: Placeholder shown in place of the projects grid/table when there
 * is nothing to display, with copy that differs depending on whether the
 * emptiness is due to filtering or because no projects exist yet.
 *
 * Responsibilities:
 * - Renders an icon plus contextual heading/body text.
 * - Chooses between "no projects match filters" and "no projects yet" copy
 *   based on `hasProjects`.
 *
 * Props:
 * - `hasProjects` (`boolean`): true when the workspace has projects but the
 *   current filters/search excluded all of them; false when the workspace
 *   truly has zero projects.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const EmptyProjectsState = ({ hasProjects }: EmptyProjectsStateProps) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 400,
                textAlign: 'center',
                gap: 2,
            }}
        >
            <Box
                sx={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <FolderOpenIcon
                    sx={{
                        fontSize: 60,
                        color: theme.palette.primary.main,
                    }}
                />
            </Box>
            <Typography variant="h6" fontWeight={600}>
                {hasProjects ? 'No Projects Found' : 'No Projects Yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
                {hasProjects
                    ? 'No projects match your current filters. Try adjusting your search criteria.'
                    : 'Get started by creating your first project. Click the "Add New Project" card to begin.'}
            </Typography>
        </Box>
    );
};

export default EmptyProjectsState;
