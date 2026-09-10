import { useState } from 'react';
import {
    Box,
    Typography,
    Card,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    useTheme,
} from '@mui/material';

interface Props {
    onSubmit?: (decision: string, notes: string) => void;
    onSkip?: () => void;
}

/**
 * Component: ReviewDecisionCard
 *
 * Purpose: Shared reviewer decision widget used at the bottom of the multi-modal and
 * video-labeling review screens — lets a reviewer pick a disposition for the annotated
 * task (accept, accept-with-changes, re-assign, or reject) and add optional notes, then
 * submit or skip.
 *
 * Responsibilities:
 * - Present the 4 review-decision options as a select dropdown.
 * - Collect optional free-text review notes for the annotator.
 * - Gate both "Skip" and "Submit Review" actions behind a decision being selected.
 * - Delegate the actual submit/skip behavior to the parent via callback props (this
 *   component does not call any API or dispatch any Redux action itself).
 *
 * Props:
 * - onSubmit ((decision: string, notes: string) => void, optional): called with the
 *   selected decision value and notes when "Submit Review" is clicked.
 * - onSkip (() => void, optional): called when "Skip" is clicked.
 *
 * State:
 * - decision (string): the selected decision value — one of 'approve', 'approve_with_changes',
 *   'reject', 'escalate', or '' (unselected).
 * - reviewNotes (string): optional free-text feedback for the annotator.
 *
 * Important business logic:
 * - `canSubmit = decision !== ''` — both "Skip" and "Submit Review" are disabled until a
 *   decision is chosen. Note "Skip" being gated on the same condition as "Submit" means a
 *   reviewer must still pick a decision value before skipping; this mirrors the current
 *   implementation as written, not a documentation assumption.
 * - The four decision values map to distinct reviewer outcomes: `approve` (annotations are
 *   correct as-is), `approve_with_changes` (accept but minor errors noted), `reject`
 *   (re-assign to the previous step for re-annotation), and `escalate` (reject outright and
 *   remove from the queue) — see the `MenuItem` labels for the exact reviewer-facing wording.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ReviewDecisionCard = ({ onSubmit, onSkip }: Props) => {
    const theme = useTheme();
    const [decision, setDecision]       = useState('');
    const [reviewNotes, setReviewNotes] = useState('');

    // Why: a decision must be explicitly chosen before any action (submit or skip) is
    // allowed, so a reviewer can never dismiss a task without registering an outcome.
    const canSubmit = decision !== '';

    return (
        <>
            <Card
                variant="outlined"
                sx={{
                    mt: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    borderRadius: 'calc(0.625rem + 4px)',
                    border: '2px solid #e9d5ff',
                    bgcolor: 'color-mix(in oklab, #fdf4ff 30%, transparent)',
                }}
            >
                {/* Card header */}
                <Box sx={{ px: 3, pt: 3, pb: 0 }}>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 500 }}>Review Decision</Typography>
                </Box>

                {/* Card content */}
                <Box sx={{ px: 3, pb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

                    {/* Decision field */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1 }}>Decision</Typography>
                            <Typography component="span" sx={{ fontSize: '0.875rem', color: '#d4183d', lineHeight: 1 }}>*</Typography>
                        </Box>
                        <FormControl fullWidth>
                            <Select
                                value={decision}
                                onChange={(e) => setDecision(e.target.value)}
                                displayEmpty
                                sx={{
                                    fontSize: '0.875rem',
                                    height: 36,
                                    bgcolor: '#f3f3f5',
                                    borderRadius: 1.5,
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#0000001a' },
                                    '& .MuiSelect-select': { py: '7px' },
                                }}
                            >
                                <MenuItem value="" disabled sx={{ color: '#717182', fontStyle: 'italic' }}>
                                    Select review decision...
                                </MenuItem>
                                <MenuItem value="approve">Accept - Annotations are correct</MenuItem>
                                <MenuItem value="approve_with_changes">Accept with minor errors to correct</MenuItem>
                                <MenuItem value="reject">Re-Assign to previous step - Needs re-annotation</MenuItem>
                                <MenuItem value="escalate">Reject - Remove from Queue</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Review Notes field */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, lineHeight: 1 }}>Review Notes</Typography>
                            <Typography component="span" sx={{ fontSize: '0.75rem', color: '#717182' }}>(Optional)</Typography>
                        </Box>
                        <TextField
                            multiline
                            minRows={4}
                            fullWidth
                            placeholder="Add any additional feedback for the annotator..."
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            sx={{
                                '& .MuiInputBase-input': { fontSize: '0.875rem' },
                                '& .MuiInputBase-root': { bgcolor: '#f3f3f5', borderRadius: 1.5, resize: 'none', minHeight: 100 },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#0000001a' },
                            }}
                        />
                    </Box>
                </Box>
            </Card>

            {/* Footer */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    pt: 2,
                    mt: 2,
                    borderTop: `1px solid ${theme.palette.divider}`,
                }}
            >
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        size="medium"
                        disabled={!canSubmit}
                        onClick={onSkip}
                        sx={{ textTransform: 'none' }}
                    >
                        Skip
                    </Button>
                    <Button
                        variant="contained"
                        size="medium"
                        disabled={!canSubmit}
                        onClick={() => onSubmit?.(decision, reviewNotes)}
                        sx={{
                            textTransform: 'none',
                            bgcolor: '#030213',
                            '&:hover': { bgcolor: '#161616' },
                            '&.Mui-disabled': { bgcolor: '#e2e8f0', color: '#94a3b8' },
                        }}
                    >
                        Submit Review
                    </Button>
                </Box>
            </Box>
        </>
    );
};

export default ReviewDecisionCard;
