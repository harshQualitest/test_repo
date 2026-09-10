import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface HeaderProps {
    projectName?: string;
}

/**
 * Component: Header
 *
 * Purpose: Top header bar for the project dashboard page — shows a back
 * button and the project's name/title.
 *
 * Responsibilities:
 * - Navigate back to the previous page when "Back" is clicked.
 * - Display the project name (falls back to a generic "Project Dashboard" title).
 *
 * Props:
 * - `projectName` (optional) - name of the project to display; defaults to "Project Dashboard".
 *
 * Custom hooks used: `useNavigate` (react-router-dom), used for the back button.
 *
 * Note: an owner/guidelines info row and a date-range filter button are present
 * in the JSX but commented out (not yet wired up / not part of the current design).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function Header({ projectName = 'Project Dashboard' }: HeaderProps) {
    const navigate = useNavigate();

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Button startIcon={<ArrowBackIcon />} size="small" onClick={() => navigate(-1)}>
                        Back
                    </Button>
                    <Typography variant="h5">{projectName}</Typography>
                </Box>
                {/* <Box sx={{ display: 'flex', gap: 4, color: 'text.secondary', fontSize: 14 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography>Owner: Sarah Chen</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography>Guidelines: v2.3.1</Typography>
                    </Box>
                </Box> */}
            </Box>

            {/* <Button variant="outlined" size="small">
                Last 14 Days
            </Button> */}
        </Box>
    );
}
