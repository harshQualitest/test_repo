import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    RadioGroup,
    FormControlLabel,
    Radio,
    Button,
    CircularProgress,
    alpha,
    useTheme,
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { COMPARISON_OPTIONS } from '../../../constants/staticThings';
import PromptCard from './PromptCard';
import LLMResponseCard from './LLMResponseCard';

interface ComparisonScreenProps {
    prompt: string;
    llm1Response: string;
    llm2Response: string;
    llm1Ratings: Record<string, number>;
    llm2Ratings: Record<string, number>;
    llm1Comment: string;
    llm2Comment: string;
    comparisonSelection: string;
    rankingJustification: string;
    onComparisonChange: (value: string) => void;
    onJustificationChange: (value: string) => void;
    onBack: () => void;
    onSubmit: () => void;
    submitting: boolean;
}

/**
 * Component: ComparisonScreen
 *
 * Purpose: Final step of the LLM-grading annotation flow (visual step 3, "LLM Ranking") —
 * shows the prompt and both LLM responses side by side (with their per-category ratings)
 * and collects the annotator's head-to-head comparison verdict plus a written justification.
 *
 * Responsibilities:
 * - Display the shared prompt and both graded responses for side-by-side comparison.
 * - Let the annotator pick one of `COMPARISON_OPTIONS` (e.g. "LLM1 significantly better").
 * - Collect a free-text ranking justification.
 * - Gate the final submit action until both the selection and justification are present.
 *
 * Props (all controlled by the parent page, `UserAnnotationScreen.tsx`):
 * - prompt (string): the shared prompt shown to both LLMs.
 * - llm1Response / llm2Response (string): the two LLM outputs being compared.
 * - llm1Ratings / llm2Ratings (Record<string, number>): per-category star ratings from the earlier steps.
 * - llm1Comment / llm2Comment (string): free-text comments captured on the earlier per-response steps.
 * - comparisonSelection (string): the currently selected `COMPARISON_OPTIONS` value.
 * - rankingJustification (string): free-text justification for the ranking choice.
 * - onComparisonChange (value: string) => void: notifies parent when the radio selection changes.
 * - onJustificationChange (value: string) => void: notifies parent when the justification text changes.
 * - onBack () => void: returns to the previous step.
 * - onSubmit () => void: submits the full annotation.
 * - submitting (boolean): disables actions and shows a spinner while the submit request is in flight.
 *
 * Major child components: PromptCard, LLMResponseCard (x2).
 *
 * Important business logic:
 * - `isFormValid` requires BOTH a non-empty comparison selection AND a non-blank (trimmed)
 *   justification before the Submit button is enabled — this is the final gate before an
 *   annotation can be submitted, ensuring every submission carries a ranked verdict and rationale.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ComparisonScreen = ({
    prompt,
    llm1Response,
    llm2Response,
    llm1Ratings,
    llm2Ratings,
    llm1Comment,
    llm2Comment,
    comparisonSelection,
    rankingJustification,
    onComparisonChange,
    onJustificationChange,
    onBack,
    onSubmit,
    submitting,
}: ComparisonScreenProps) => {
    const theme = useTheme();

    // Why: submission must carry both a definitive ranking choice and a written rationale;
    // whitespace-only justification is rejected via trim() so blank text can't slip through.
    const isFormValid = comparisonSelection && rankingJustification.trim().length > 0;

    return (
        <>
            {/* Prompt Section */}
            <PromptCard prompt={prompt} />

            {/* Side by Side Responses */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
                <LLMResponseCard
                    label="LLM1"
                    response={llm1Response}
                    color={theme.palette.primary.main}
                    ratings={llm1Ratings}
                    comment={llm1Comment}
                />
                <LLMResponseCard
                    label="LLM2"
                    response={llm2Response}
                    color={theme.palette.secondary.main}
                    ratings={llm2Ratings}
                    comment={llm2Comment}
                />
            </Box>

            {/* LLM Rating Options */}
            <Card
                sx={{
                    borderRadius: 2,
                    border: `1px solid ${alpha('#64748B', 0.3)}`,
                    mb: 1.5,
                    background: `linear-gradient(180deg, ${alpha('#64748B', 0.08)} 0%, ${alpha('#64748B', 0.02)} 100%)`,
                    boxShadow: `0 2px 10px ${alpha('#64748B', 0.12)}`,
                }}
            >
                <CardContent sx={{ p: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#64748B', mb: 0.5 }}>
                        Which response is better?
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                        Select the option that best describes the ranking
                    </Typography>

                    {/* Radio Options Block */}
                    <Box
                        sx={{
                            backgroundColor: '#64748B',
                            borderRadius: 2,
                            p: 2,
                            mb: 2,
                            width: '100%',
                        }}
                    >
                        <RadioGroup value={comparisonSelection} onChange={(e) => onComparisonChange(e.target.value)} sx={{ gap: 0.5 }}>
                            {COMPARISON_OPTIONS.map((option) => (
                                <FormControlLabel
                                    key={option.value}
                                    value={option.value}
                                    control={
                                        <Radio
                                            size="small"
                                            sx={{
                                                color: 'white',
                                                '&.Mui-checked': {
                                                    color: 'white',
                                                },
                                            }}
                                        />
                                    }
                                    label={
                                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'white' }}>
                                            {option.label}
                                        </Typography>
                                    }
                                    sx={{
                                        m: 0,
                                        py: 0.5,
                                        px: 1,
                                        borderRadius: 1,
                                        transition: 'all 0.2s ease',
                                        backgroundColor: comparisonSelection === option.value ? alpha('#FFFFFF', 0.2) : 'transparent',
                                        '&:hover': {
                                            backgroundColor: alpha('#FFFFFF', 0.1),
                                        },
                                    }}
                                />
                            ))}
                        </RadioGroup>
                    </Box>

                    {/* Ranking Justification Input */}
                    <TextField
                        label="Ranking Justification *"
                        placeholder="Provide justification for your ranking choice..."
                        required
                        multiline
                        rows={3}
                        value={rankingJustification}
                        onChange={(e) => onJustificationChange(e.target.value)}
                        fullWidth
                        sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                '&:hover fieldset': {
                                    borderColor: '#64748B',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: '#64748B',
                                },
                            },
                            '& .MuiInputLabel-root.Mui-focused': {
                                color: '#64748B',
                            },
                        }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            onClick={onBack}
                            disabled={submitting}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                px: 2.5,
                                py: 0.75,
                                borderRadius: 2,
                                borderColor: alpha(theme.palette.text.secondary, 0.3),
                                color: theme.palette.text.secondary,
                                '&:hover': {
                                    borderColor: theme.palette.text.primary,
                                    backgroundColor: alpha(theme.palette.text.secondary, 0.05),
                                },
                            }}
                        >
                            Back
                        </Button>
                        <Button
                            variant="contained"
                            endIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <NavigateNextIcon />}
                            onClick={onSubmit}
                            disabled={!isFormValid || submitting}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                px: 3,
                                py: 0.75,
                                borderRadius: 2,
                                background: `linear-gradient(135deg, #64748B 0%, ${alpha('#64748B', 0.85)} 100%)`,
                                boxShadow: `0 4px 12px ${alpha('#64748B', 0.3)}`,
                                '&:hover': {
                                    background: `linear-gradient(135deg, #64748B 0%, #64748B 100%)`,
                                    boxShadow: `0 6px 16px ${alpha('#64748B', 0.4)}`,
                                    transform: 'translateY(-1px)',
                                },
                                '&:disabled': {
                                    opacity: 0.5,
                                    boxShadow: 'none',
                                },
                            }}
                        >
                            {submitting ? 'Submitting...' : 'Submit & Continue'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </>
    );
};

export default ComparisonScreen;
