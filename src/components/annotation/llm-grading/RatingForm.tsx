import { Card, CardContent, Box, Typography, Rating, TextField, alpha, useTheme } from '@mui/material';
import { RATING_CATEGORIES } from '../../../constants/staticThings';

interface RatingFormProps {
    ratings: Record<string, number>;
    comment: string;
    onRatingChange: (category: string, value: number | null) => void;
    onCommentChange: (value: string) => void;
    color: string;
    label: string;
}

/**
 * Component: RatingForm
 *
 * Purpose: Controlled rating input for a single LLM response — renders one 5-star MUI
 * `Rating` control per category in `RATING_CATEGORIES` (overall quality, writing style,
 * verbosity, instruction following, accuracy, harmlessness, intent understanding) plus
 * an optional free-text comment field.
 *
 * Responsibilities:
 * - Render a star-rating input for every entry in the shared `RATING_CATEGORIES` constant.
 * - Render an optional multiline comment field for additional feedback.
 * - Report every rating/comment change up to the parent via callbacks — this component
 *   holds no rating state of its own.
 *
 * Props:
 * - ratings (Record<string, number>): current rating value (0-5) per category key; 0/missing
 *   means "not yet rated".
 * - comment (string): current free-text comment value.
 * - onRatingChange (category: string, value: number | null) => void: fired when a star
 *   rating changes; `value` is `null` if the user clears the rating (MUI Rating behavior).
 * - onCommentChange (value: string) => void: fired on every keystroke in the comment field.
 * - color (string): accent color for this form's borders, stars, and headings — distinguishes
 *   the LLM1 form from the LLM2 form visually.
 * - label (string): display label for the response being rated (e.g. "LLM1").
 *
 * State: none — this is a fully controlled component; all rating/comment values and their
 * validity live in the parent (`UserAnnotationScreen.tsx`).
 *
 * Important business logic:
 * - This component does NOT itself enforce "all categories must be rated" — that gating
 *   (via `areAllRatingsFilled`) lives in the parent, which disables its own "Continue"
 *   button until every category in `ratings` is > 0. Ratings and comments are otherwise
 *   both optional at the field level (comment is explicitly labeled "Optional"); the
 *   all-categories-required rule is enforced only at the step-advance boundary upstream.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const RatingForm = ({ ratings, comment, onRatingChange, onCommentChange, color, label }: RatingFormProps) => {
    const theme = useTheme();

    return (
        <Card
            sx={{
                borderRadius: 2,
                border: `1px solid ${alpha(color, 0.2)}`,
                mb: 1.5,
                background: `linear-gradient(180deg, ${alpha(color, 0.04)} 0%, transparent 100%)`,
                boxShadow: `0 2px 10px ${alpha(color, 0.08)}`,
                transition: 'all 0.3s ease',
            }}
        >
            <CardContent sx={{ p: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color, mb: 1 }}>
                    📊 Rate {label} Response
                </Typography>

                {/* Rating Categories */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
                    {RATING_CATEGORIES.map((category) => (
                        <Box
                            key={category.key}
                            sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                backgroundColor: alpha(color, 0.05),
                                border: `1px solid ${alpha(color, 0.1)}`,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: alpha(color, 0.08),
                                    borderColor: alpha(color, 0.2),
                                },
                            }}
                        >
                            <Typography
                                variant="caption"
                                fontWeight={600}
                                sx={{
                                    color: 'text.primary',
                                    display: 'block',
                                    mb: 0.75,
                                    fontSize: '0.75rem',
                                }}
                            >
                                {category.label}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Rating
                                    name={category.key}
                                    value={ratings[category.key] || 0}
                                    onChange={(_, newValue) => onRatingChange(category.key, newValue)}
                                    size="small"
                                    sx={{
                                        '& .MuiRating-iconFilled': {
                                            color: color,
                                        },
                                        '& .MuiRating-iconHover': {
                                            color: alpha(color, 0.8),
                                        },
                                    }}
                                />
                                <Typography variant="caption" fontWeight={600} sx={{ color, minWidth: 30 }}>
                                    {ratings[category.key] || 0}/5
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Box>

                {/* Comment Section */}
                <TextField
                    label={`Additional Comments (Optional)`}
                    placeholder={`Share your thoughts about ${label}'s response...`}
                    multiline
                    rows={2}
                    value={comment}
                    onChange={(e) => onCommentChange(e.target.value)}
                    fullWidth
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: alpha(theme.palette.background.paper, 0.5),
                            '&:hover fieldset': {
                                borderColor: alpha(color, 0.5),
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: color,
                            },
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                            color: color,
                        },
                    }}
                />
            </CardContent>
        </Card>
    );
};

export default RatingForm;
