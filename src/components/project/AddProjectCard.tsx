import { Box, Card, CardContent, Typography, alpha, useTheme } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';

interface AddProjectCardProps {
    onAddProject: () => void;
}

/**
 * Component: AddProjectCard
 *
 * Purpose: Renders a dashed, clickable "call to action" card used inside the
 * projects grid to let the user open the create-project flow.
 *
 * Responsibilities:
 * - Displays a plus icon and "Add New Project" label styled as a card tile.
 * - Delegates the actual creation flow to the parent via `onAddProject`.
 *
 * Props:
 * - `onAddProject` (`() => void`): callback invoked when the card is clicked;
 *   the parent is expected to open the project-creation dialog/page.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const AddProjectCard = ({ onAddProject }: AddProjectCardProps) => {
    const theme = useTheme();

    return (
        <Card
            sx={{
                borderRadius: 3,
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                minHeight: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                '&:hover': {
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.06),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                },
            }}
            onClick={onAddProject}
        >
            <CardContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    p: 3,
                }}
            >
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        transition: 'all 0.3s ease',
                    }}
                >
                    <AddRoundedIcon
                        sx={{
                            fontSize: 32,
                            color: theme.palette.primary.main,
                        }}
                    />
                </Box>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        color: theme.palette.primary.main,
                        mb: 1,
                    }}
                >
                    Add New Project
                </Typography>
            </CardContent>
        </Card>
    );
};

export default AddProjectCard;
