import { useState } from 'react';
import { Card, CardContent, Box, Typography, Chip, Button, alpha, useTheme } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

interface LLMResponseCardProps {
    label: 'LLM1' | 'LLM2';
    response: string;
    color: string;
    ratings: Record<string, number>;
    comment: string;
    isExpanded?: boolean;
}

/**
 * Component: LLMResponseCard
 *
 * Purpose: Read-only summary card used on the final comparison screen to show one LLM's
 * response text, truncated with a show-more toggle, alongside its previously-submitted
 * per-category star ratings and optional comment.
 *
 * Responsibilities:
 * - Truncate long responses to a preview length and let the user expand/collapse them.
 * - Render a 5-star rating row (filled vs. outlined stars) for each rating category.
 * - Display the optional free-text comment left for this response, if any.
 *
 * Props:
 * - label ('LLM1' | 'LLM2'): which response this card represents.
 * - response (string): the full LLM response text.
 * - color (string): accent color used for the label chip, top border stripe, and "show more" link.
 * - ratings (Record<string, number>): per-category star ratings (0-5) already collected earlier in the flow.
 * - comment (string): optional free-text comment for this response.
 * - isExpanded (boolean, optional, default false): initial expanded/collapsed state.
 *
 * State:
 * - expanded (boolean): whether the full (untruncated) response text is currently shown;
 *   initialized from the `isExpanded` prop and toggled by the "Show More"/"Show Less" button.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const LLMResponseCard = ({ label, response, color, ratings, comment, isExpanded = false }: LLMResponseCardProps) => {
    const theme = useTheme();
    const [expanded, setExpanded] = useState(isExpanded);

    const previewLength = 300;
    const shouldTruncate = response.length > previewLength;
    const displayText = expanded || !shouldTruncate ? response : `${response.substring(0, previewLength)}...`;

    /**
     * Renders a fixed row of 5 star icons for a given rating value, filling
     * `Math.floor(rating)` of them and leaving the rest as outlined stars.
     * @param rating - the numeric rating (0-5) to visualize.
     * @returns an array of star icon elements.
     */
    const renderStars = (rating: number) => {
        const stars = [];
        const fullStars = Math.floor(rating);
        const maxStars = 5;

        for (let i = 0; i < maxStars; i++) {
            stars.push(
                i < fullStars ? (
                    <StarIcon key={i} sx={{ fontSize: '0.9rem', color: '#FFB400' }} />
                ) : (
                    <StarBorderIcon key={i} sx={{ fontSize: '0.9rem', color: theme.palette.text.disabled }} />
                )
            );
        }
        return stars;
    };

    return (
        <Card
            sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                overflow: 'hidden',
                backgroundColor: alpha(color, 0.02),
            }}
        >
            <Box sx={{ height: 3, backgroundColor: color }} />
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip
                        label={label}
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            backgroundColor: alpha(color, 0.1),
                            color: color,
                            fontWeight: 600,
                        }}
                    />
                </Box>
                <Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {displayText}
                    </Typography>
                    {shouldTruncate && (
                        <Button
                            size="small"
                            onClick={() => setExpanded(!expanded)}
                            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                mt: 0.5,
                                color: color,
                                fontWeight: 600,
                            }}
                        >
                            {expanded ? 'Show Less' : 'Show More'}
                        </Button>
                    )}
                </Box>
                <Box sx={{ pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Ratings Summary
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {Object.entries(ratings).map(([key, value]) => (
                            <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        color: 'text.secondary',
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    {key.replace(/_/g, ' ')}:
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                    {renderStars(value)}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                    {comment && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" fontWeight={600} color="text.secondary">
                                Comment:
                            </Typography>
                            <Typography variant="body2" sx={{ fontSize: '0.75rem', mt: 0.25, fontStyle: 'italic' }}>
                                {comment}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default LLMResponseCard;
