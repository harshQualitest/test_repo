import { Box, Typography, Button, alpha, useTheme } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface InstructionsBannerProps {
    instructionsUrl?: string;
}

/**
 * Component: InstructionsBanner
 *
 * Purpose: Displays a prominent call-to-action banner prompting the annotator to review
 * project guidelines before starting annotation, when an instructions document is configured.
 *
 * Responsibilities:
 * - Render nothing if no instructions URL is provided for the project/task.
 * - Open the instructions document in a new tab when "View Instructions" is clicked.
 *
 * Props:
 * - instructionsUrl (string, optional): URL of the project's instructions document. When
 *   falsy, the component renders nothing (see early return below).
 *
 * State: none.
 *
 * Important business logic:
 * - Early `return null` when `instructionsUrl` is absent — the banner is opt-in per project;
 *   annotators are only nudged toward guidelines when a project manager has actually set one.
 * - The link opens via `window.open(..., '_blank', 'noopener,noreferrer')` to avoid exposing
 *   `window.opener` to the target page (security best practice for external links).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const InstructionsBanner = ({ instructionsUrl }: InstructionsBannerProps) => {
    const theme = useTheme();

    // Why: the instructions banner is optional per project; skip rendering entirely
    // rather than showing an empty/broken banner when no URL was configured.
    if (!instructionsUrl) return null;

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                mb: 1.5,
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.12)} 0%, ${alpha(
                    theme.palette.info.main,
                    0.04,
                )} 100%)`,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.info.main, 0.25)}`,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.info.main, 0.15),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <InfoOutlinedIcon sx={{ fontSize: 20, color: theme.palette.info.main }} />
                </Box>
                <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                        Project Guidelines Available
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Review the instructions before starting annotation
                    </Typography>
                </Box>
            </Box>
            <Button
                variant="contained"
                size="small"
                onClick={() => window.open(instructionsUrl, '_blank', 'noopener,noreferrer')}
                sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    px: 2,
                    py: 0.75,
                    borderRadius: 1.5,
                    backgroundColor: theme.palette.info.main,
                    color: '#fff',
                    boxShadow: `0 2px 8px ${alpha(theme.palette.info.main, 0.3)}`,
                    '&:hover': {
                        backgroundColor: theme.palette.info.dark,
                        boxShadow: `0 4px 12px ${alpha(theme.palette.info.main, 0.4)}`,
                    },
                }}
            >
                View Instructions
            </Button>
        </Box>
    );
};

export default InstructionsBanner;
