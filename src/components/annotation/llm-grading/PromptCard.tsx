import { Card, CardContent, Typography, alpha, useTheme } from '@mui/material';

interface PromptCardProps {
    prompt: string;
    isSticky?: boolean;
}

/**
 * Component: PromptCard
 *
 * Purpose: Displays the shared LLM prompt in a styled card so annotators can reference
 * it while rating either LLM response.
 *
 * Responsibilities:
 * - Render the prompt text with a distinct "PROMPT" label.
 * - Optionally render in a fixed-width "sticky" layout (stays pinned while scrolling)
 *   for side-by-side layouts where the prompt should stay visible alongside a response.
 *
 * Props:
 * - prompt (string): the prompt text shared with both LLMs being graded.
 * - isSticky (boolean, optional, default false): when true, constrains the card to a
 *   fixed 320px width and applies `position: sticky` so it stays in view during scroll;
 *   when false, the card spans full width and scrolls normally.
 *
 * State: none.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const PromptCard = ({ prompt, isSticky = false }: PromptCardProps) => {
    const theme = useTheme();

    return (
        <Card
            sx={{
                width: isSticky ? 320 : '100%',
                minWidth: isSticky ? 320 : undefined,
                maxWidth: isSticky ? 320 : undefined,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(
                    theme.palette.info.main,
                    0.02,
                )} 100%)`,
                boxShadow: `0 2px 8px ${alpha(theme.palette.info.main, 0.08)}`,
                transition: 'all 0.3s ease',
                ...(isSticky && {
                    position: 'sticky',
                    top: 16,
                    alignSelf: 'flex-start',
                }),
                '&:hover': {
                    boxShadow: `0 4px 16px ${alpha(theme.palette.info.main, 0.12)}`,
                },
                mb: isSticky ? 0 : 1.5,
            }}
        >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography
                    variant="caption"
                    sx={{
                        color: theme.palette.info.main,
                        fontWeight: 700,
                        letterSpacing: 1,
                        fontSize: '0.7rem',
                    }}
                >
                    📋 PROMPT
                </Typography>
                <Typography
                    variant="body2"
                    sx={{
                        mt: 0.5,
                        fontWeight: 500,
                        lineHeight: 1.5,
                    }}
                >
                    {prompt}
                </Typography>
            </CardContent>
        </Card>
    );
};

export default PromptCard;
