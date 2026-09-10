import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Stepper,
    Step,
    StepLabel,
    StepButton,
    Rating,
    Chip,
    Alert,
    CircularProgress,
    Paper,
    alpha,
    useTheme,
    Divider,
    IconButton,
    Collapse,
    Fade,
    Tooltip,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { type AppDispatch } from '../redux/store';
import {
    fetchTaskPreview,
    selectTaskPreviewData,
    selectTaskPreviewLoading,
    selectTaskPreviewError,
    type AnnotationRating,
} from '../redux/slices/taskPreviewSlice';

interface TaskPreviewProps {
    taskId?: string;
    projectId?: string;
}

// Rating categories
const RATING_CATEGORIES = [
    { key: 'overall_quality', label: 'Overall Quality' },
    { key: 'writing_style', label: 'Writing Style' },
    { key: 'verbosity', label: 'Verbosity' },
    { key: 'instruction_following', label: 'Instruction Following' },
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'harmlessness', label: 'Harmlessness' },
    { key: 'intent_understanding', label: 'Intent Understanding' },
];

// Review rating categories (qualitative)
const REVIEW_RATING_LABELS: Record<string, Record<string, string>> = {
    overall_quality: {
        excellent: 'Excellent',
        great: 'Great',
        acceptable: 'Acceptable',
        poor: 'Poor',
        very_poor: 'Very Poor',
    },
    writing_style: {
        no_issue: 'No Issues',
        minor_issues: 'Minor Issues',
        major_issues: 'Major Issues',
    },
    verbosity: {
        concise: 'Concise',
        appropriate: 'Appropriate',
        slightly_verbose: 'Slightly Verbose',
        too_verbose: 'Too Verbose',
    },
    instruction_following: {
        yes: 'Yes',
        partially: 'Partially',
        no: 'No',
    },
    accuracy: {
        accurate: 'Accurate',
        mostly_accurate: 'Mostly Accurate',
        partially_accurate: 'Partially Accurate',
        inaccurate: 'Inaccurate',
    },
    harmlessness: {
        safe: 'Safe',
        mostly_safe: 'Mostly Safe',
        unsafe: 'Unsafe',
    },
    intent: {
        fully_address: 'Fully Addressed',
        partially_address: 'Partially Addressed',
        does_not_address: 'Does Not Address',
    },
};

// Comparison options labels
const COMPARISON_LABELS: Record<string, string> = {
    llm1_significantly_better: 'LLM1 is significantly better than LLM2',
    llm1_slightly_better: 'LLM1 is slightly better than LLM2',
    both_same: 'Both responses are about the same',
    llm2_significantly_better: 'LLM2 is significantly better than LLM1',
    llm2_slightly_better: 'LLM2 is slightly better than LLM1',
    exactly_same: 'Responses are exactly the same',
    both_inadequate: 'Both responses are inadequate',
};

const SECTION_PADDING = { xs: 1.5, md: 2 };
const SECTION_RADIUS = 2;
const SECTION_GAP = 2;

/** Truncates text to `maxLength` characters, appending an ellipsis when cut. */
const truncateText = (text: string, maxLength = 500): string =>
    text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`;

// ── Sub-components extracted to reduce TaskPreview cognitive complexity ────────

interface LlmResponseStepProps {
    llmLabel: string;
    paletteKey: 'primary' | 'secondary';
    response: string;
    isAnnotated: boolean;
    ratings?: AnnotationRating;
    comment?: string;
    expandedResponse: boolean;
    expandedRatings: boolean;
    onToggleResponse: () => void;
    onToggleRatings: () => void;
}

/**
 * Sub-component: LlmResponseStep
 *
 * Renders one LLM's response text plus (if the task has been annotated) its
 * per-category star ratings and annotator comment. Used for the "LLM1
 * Response" and "LLM2 Response" steps of the `TaskPreview` stepper.
 * Expand/collapse state for the response text and ratings block is owned by
 * the parent (`TaskPreview`) and passed in as props.
 */
const LlmResponseStep = ({
    llmLabel, paletteKey, response, isAnnotated,
    ratings, comment, expandedResponse, expandedRatings,
    onToggleResponse, onToggleRatings,
}: LlmResponseStepProps) => {
    const theme = useTheme();
    const color = theme.palette[paletteKey].main;
    const lightColor = theme.palette[paletteKey].light;
    return (
        <Card sx={{ borderRadius: SECTION_RADIUS, border: `1px solid ${alpha(color, 0.35)}`, boxShadow: `0 8px 18px ${alpha(color, 0.1)}`, background: `linear-gradient(180deg, ${alpha(lightColor, 0.06)} 0%, ${alpha(theme.palette.background.paper, 0.94)} 100%)` }}>
            <CardContent sx={{ p: SECTION_PADDING }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Chip label={llmLabel} size="small" sx={{ backgroundColor: alpha(color, 0.15), color, fontWeight: 700, fontSize: '0.8rem', px: 1 }} />
                    {isAnnotated && (
                        <Tooltip title="Annotation Complete">
                            <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 24 }} />
                        </Tooltip>
                    )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Chip label="Response" size="small" variant="outlined" sx={{ fontWeight: 700, color, borderRadius: 1, px: 1, height: 26 }} />
                    <Tooltip title={expandedResponse ? 'Show Less' : 'Show More'}>
                        <IconButton size="small" onClick={onToggleResponse} sx={{ backgroundColor: alpha(color, 0.1), '&:hover': { backgroundColor: alpha(color, 0.2) } }}>
                            {expandedResponse ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    </Tooltip>
                </Box>
                <Paper elevation={0} sx={{ p: { xs: 1.25, md: 1.5 }, backgroundColor: alpha(color, 0.04), borderRadius: SECTION_RADIUS, mb: 2, border: `1px solid ${alpha(color, 0.12)}` }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.95rem' }}>
                        {expandedResponse ? response || 'No response available' : truncateText(response || 'No response available')}
                    </Typography>
                </Paper>
                <Divider sx={{ my: 2 }} />
                {isAnnotated ? (
                    <>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={700}>Annotation Ratings</Typography>
                            <Tooltip title={expandedRatings ? 'Collapse Ratings' : 'Expand Ratings'}>
                                <IconButton size="small" onClick={onToggleRatings} sx={{ backgroundColor: alpha(color, 0.1), '&:hover': { backgroundColor: alpha(color, 0.2) } }}>
                                    {expandedRatings ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                            </Tooltip>
                        </Box>
                        <Collapse in={expandedRatings}>
                            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                                {RATING_CATEGORIES.map((category) => (
                                    <Paper key={category.key} elevation={0} sx={{ p: 1.5, backgroundColor: alpha(color, 0.03), borderRadius: 1.5, border: `1px solid ${alpha(color, 0.12)}` }}>
                                        <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>{category.label}</Typography>
                                        <Rating value={(ratings?.[category.key as keyof AnnotationRating] as number) || 0} readOnly size="small" />
                                    </Paper>
                                ))}
                            </Box>
                            {comment && (
                                <Paper elevation={0} sx={{ p: SECTION_PADDING, mt: 2, backgroundColor: alpha(color, 0.04), borderRadius: SECTION_RADIUS, border: `1px solid ${alpha(color, 0.12)}` }}>
                                    <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>Annotator Comment</Typography>
                                    <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.7 }}>{comment}</Typography>
                                </Paper>
                            )}
                        </Collapse>
                    </>
                ) : (
                    <Alert severity="info" sx={{ borderRadius: 2, backgroundColor: alpha(theme.palette.info.main, 0.05) }}>
                        Annotation data not yet available for this task.
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

interface ComparisonStepProps {
    isAnnotated: boolean;
    comparisonSelection?: string;
}

/**
 * Sub-component: ComparisonStep
 *
 * Renders the annotator's overall LLM1-vs-LLM2 comparison selection (or an
 * "not yet available" notice when the task hasn't been annotated). Used for
 * the "Rating" step of the `TaskPreview` stepper.
 */
const ComparisonStep = ({ isAnnotated, comparisonSelection }: ComparisonStepProps) => {
    const theme = useTheme();
    return (
        <Card sx={{ borderRadius: SECTION_RADIUS, border: `1px solid ${alpha('#AD46FF', 0.35)}`, boxShadow: `0 8px 18px ${alpha('#AD46FF', 0.12)}`, background: `linear-gradient(180deg, ${alpha('#AD46FF', 0.04)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)` }}>
            <CardContent sx={{ p: SECTION_PADDING }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: alpha('#AD46FF', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CompareArrowsIcon sx={{ color: '#AD46FF', fontSize: 24 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700}>Overall Comparison</Typography>
                </Box>
                {isAnnotated ? (
                    <Box sx={{ mt: 1.5 }}>
                        <Paper elevation={0} sx={{ p: 2.25, backgroundColor: alpha('#AD46FF', 0.04), borderRadius: 2, border: `1px solid ${alpha('#AD46FF', 0.18)}` }}>
                            <Typography variant="subtitle2" fontWeight={700} gutterBottom color="#AD46FF">Comparison Selection</Typography>
                            <Chip
                                label={comparisonSelection ? COMPARISON_LABELS[comparisonSelection] || comparisonSelection : 'Not selected'}
                                sx={{ mt: 1, backgroundColor: alpha('#AD46FF', 0.15), color: '#AD46FF', fontWeight: 700, fontSize: '0.85rem', px: 1.5, py: 1.75 }}
                            />
                        </Paper>
                    </Box>
                ) : (
                    <Alert severity="info" sx={{ borderRadius: 2, mt: 2, backgroundColor: alpha(theme.palette.info.main, 0.05) }}>
                        Comparison data not yet available for this task.
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

const REVIEW_LLM_FIELDS = [
    'overall_quality', 'writing_style', 'verbosity',
    'instruction_following', 'accuracy', 'harmlessness',
] as const;

interface ReviewLlmSectionProps {
    llmLabel: string;
    paletteKey: 'primary' | 'secondary';
    isUpdated?: boolean;
    reviewRatings?: Record<string, string>;
    annotationRatings?: AnnotationRating;
    annotationComment?: string;
}

/**
 * Sub-component: ReviewLlmSection
 *
 * Renders one LLM's ratings as seen by the reviewer: if the reviewer updated
 * that LLM's grading (`isUpdated`), shows the reviewer's overridden
 * qualitative ratings (`reviewRatings`); otherwise falls back to the
 * annotator's original star ratings (`annotationRatings`). Used inside the
 * "Review" step for both LLM1 and LLM2.
 */
const ReviewLlmSection = ({
    llmLabel, paletteKey, isUpdated, reviewRatings, annotationRatings, annotationComment,
}: ReviewLlmSectionProps) => {
    const theme = useTheme();
    const color = theme.palette[paletteKey].main;
    return (
        <Card sx={{ mb: 2, borderRadius: SECTION_RADIUS, border: `1px solid ${alpha(color, 0.28)}`, boxShadow: `0 8px 18px ${alpha(color, 0.08)}`, background: alpha(theme.palette.background.paper, 0.95) }}>
            <CardContent sx={{ p: SECTION_PADDING }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Chip label={isUpdated ? `${llmLabel} Review` : `${llmLabel} Annotation`} size="small" color={paletteKey} sx={{ fontWeight: 700, fontSize: '0.8rem', px: 1 }} />
                    <Chip label={isUpdated ? 'Updated by Reviewer' : 'No Changes'} size="small" color={isUpdated ? 'warning' : 'default'} sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
                </Box>
                {isUpdated ? (
                    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                        {REVIEW_LLM_FIELDS.filter((key) => reviewRatings?.[key]).map((key) => (
                            <Paper key={key} elevation={0} sx={{ p: 1.5, backgroundColor: alpha(color, 0.03), borderRadius: 1.5, border: `1px solid ${alpha(color, 0.12)}` }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                                    {RATING_CATEGORIES.find((c) => c.key === key)?.label ?? key}
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {REVIEW_RATING_LABELS[key]?.[reviewRatings![key]] ?? reviewRatings![key]}
                                </Typography>
                            </Paper>
                        ))}
                    </Box>
                ) : (
                    <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                        {RATING_CATEGORIES.map((category) => (
                            <Paper key={category.key} elevation={0} sx={{ p: 1.5, backgroundColor: alpha(color, 0.03), borderRadius: 1.5, border: `1px solid ${alpha(color, 0.12)}` }}>
                                <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>{category.label}</Typography>
                                <Rating value={(annotationRatings?.[category.key as keyof AnnotationRating] as number) || 0} readOnly size="small" />
                            </Paper>
                        ))}
                    </Box>
                )}
                {(isUpdated ? reviewRatings?.comment : annotationComment) && (
                    <Paper elevation={0} sx={{ p: SECTION_PADDING, mt: 1.5, backgroundColor: alpha(color, 0.04), borderRadius: SECTION_RADIUS, border: `1px solid ${alpha(color, 0.12)}` }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                            {isUpdated ? 'Reviewer Comment' : 'Annotator Comment'}
                        </Typography>
                    </Paper>
                )}
            </CardContent>
        </Card>
    );
};

interface ReviewStepData {
    llm1?: Record<string, string>;
    llm2?: Record<string, string>;
    rating?: string;
    is_llm1_updated?: boolean;
    is_llm2_updated?: boolean;
    is_rating_updated?: boolean;
    reviewed_by?: string;
    reviewed_at?: string;
}

interface ReviewStepProps {
    isReviewed: boolean;
    isAnnotated: boolean;
    reviewData?: ReviewStepData;
    llm1Ratings?: AnnotationRating;
    llm2Ratings?: AnnotationRating;
    llm1Comment?: string;
    llm2Comment?: string;
    comparisonSelection?: string;
}

/**
 * Sub-component: ReviewStep
 *
 * Renders the reviewer's assessment: who reviewed the task and when, both
 * LLMs' final ratings (via `ReviewLlmSection`), and the final comparison
 * result. Falls back to "not yet reviewed" / "not yet annotated" notices
 * when those stages haven't happened. Used for the "Review" step of the
 * `TaskPreview` stepper.
 */
const ReviewStep = ({
    isReviewed, isAnnotated, reviewData,
    llm1Ratings, llm2Ratings, llm1Comment, llm2Comment, comparisonSelection,
}: ReviewStepProps) => {
    const theme = useTheme();
    // The reviewer's rating overrides the annotator's original comparison
    // selection only when the reviewer explicitly changed it.
    const isRatingUpdated = reviewData?.is_rating_updated;
    const activeRating = isRatingUpdated ? reviewData?.rating : comparisonSelection;
    const comparisonLabel = activeRating ? COMPARISON_LABELS[activeRating] || activeRating : 'Not selected';
    return (
        <Card sx={{ borderRadius: SECTION_RADIUS, border: `1px solid ${alpha(theme.palette.divider, 0.9)}`, boxShadow: `0 10px 26px ${alpha(theme.palette.grey[500], 0.12)}`, background: alpha(theme.palette.background.paper, 0.96) }}>
            <CardContent sx={{ p: SECTION_PADDING }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: alpha(isReviewed ? theme.palette.success.main : theme.palette.warning.main, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RateReviewIcon sx={{ color: isReviewed ? theme.palette.success.main : theme.palette.warning.main, fontSize: 24 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={700}>Review Information</Typography>
                </Box>
                {!isReviewed && isAnnotated && (
                    <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ borderRadius: 2, mt: 2, backgroundColor: alpha(theme.palette.warning.main, 0.05), border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
                        <Typography variant="body2" fontWeight={700} gutterBottom>Review Not Available</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.6 }}>
                            This task has been annotated but not yet reviewed. Review data will be available once a reviewer completes their assessment.
                        </Typography>
                    </Alert>
                )}
                {isReviewed && (
                    <Box sx={{ mt: 2 }}>
                        <Paper elevation={0} sx={{ p: 2.5, backgroundColor: alpha(theme.palette.success.main, 0.05), borderRadius: 2, border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`, mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 28 }} />
                                <Typography variant="h6" fontWeight={700} color="success.main">Review Completed</Typography>
                            </Box>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'grid', gap: 1.5 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>REVIEWED BY</Typography>
                                    <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>{reviewData?.reviewed_by || 'Unknown'}</Typography>
                                </Box>
                                {reviewData?.reviewed_at && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>REVIEWED AT</Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5 }}>{new Date(reviewData.reviewed_at).toLocaleString()}</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                        <ReviewLlmSection llmLabel="LLM1" paletteKey="primary" isUpdated={reviewData?.is_llm1_updated} reviewRatings={reviewData?.llm1} annotationRatings={llm1Ratings} annotationComment={llm1Comment} />
                        <ReviewLlmSection llmLabel="LLM2" paletteKey="secondary" isUpdated={reviewData?.is_llm2_updated} reviewRatings={reviewData?.llm2} annotationRatings={llm2Ratings} annotationComment={llm2Comment} />
                        <Card sx={{ borderRadius: SECTION_RADIUS, border: `1px solid ${alpha('#AD46FF', 0.35)}`, boxShadow: `0 8px 18px ${alpha('#AD46FF', 0.12)}`, background: `linear-gradient(180deg, ${alpha('#AD46FF', 0.04)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)` }}>
                            <CardContent sx={{ p: SECTION_PADDING }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                    <Box sx={{ width: 36, height: 36, borderRadius: 2, backgroundColor: alpha('#AD46FF', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CompareArrowsIcon sx={{ color: '#AD46FF', fontSize: 22 }} />
                                    </Box>
                                    <Typography variant="subtitle1" fontWeight={700}>{isRatingUpdated ? 'Final Review Rating' : 'Annotation Rating'}</Typography>
                                    <Chip label={isRatingUpdated ? 'Updated by Reviewer' : 'No Changes'} size="small" color={isRatingUpdated ? 'warning' : 'default'} sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
                                </Box>
                                <Paper elevation={0} sx={{ p: 2, backgroundColor: alpha('#AD46FF', 0.04), borderRadius: 2, border: `1px solid ${alpha('#AD46FF', 0.18)}` }}>
                                    <Typography variant="caption" fontWeight={700} gutterBottom color="#AD46FF">COMPARISON RESULT</Typography>
                                    <Chip label={comparisonLabel} sx={{ mt: 1, backgroundColor: alpha('#AD46FF', 0.15), color: '#AD46FF', fontWeight: 700, fontSize: '0.85rem', px: 1.5, py: 1.75 }} />
                                </Paper>
                            </CardContent>
                        </Card>
                    </Box>
                )}
                {!isAnnotated && (
                    <Alert severity="info" sx={{ borderRadius: 2, mt: 2, backgroundColor: alpha(theme.palette.info.main, 0.05), border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                        <Typography variant="body2" fontWeight={600} gutterBottom>Annotation Pending</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>This task has not been annotated yet. Review data will be available after annotation and review are complete.</Typography>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * Component: TaskPreview
 *
 * Purpose: Read-only, step-by-step preview of a single task's full
 * lifecycle — LLM1 response, LLM2 response, comparison rating, and review —
 * for inspection by managers/admins (as opposed to the interactive
 * annotation/review screens used by annotators/reviewers).
 *
 * Responsibilities:
 * - Fetches raw task preview data for the given project/task pair.
 * - Presents the prompt, both LLM responses, the annotator's ratings/comparison,
 *   and the reviewer's final assessment behind a 4-step, non-linear stepper.
 * - Lets sections (prompt, per-LLM response/ratings) be expanded/collapsed independently.
 *
 * Props:
 * - `taskId?: string` - the task to preview.
 * - `projectId?: string` - the owning project, required to fetch data.
 *
 * State:
 * - `activeStep` - which of the 4 stepper steps (0-3) is shown.
 * - `expandedSections` - independent expand/collapse flags for the prompt
 *   and each LLM's response/ratings blocks.
 *
 * Redux (taskPreviewSlice): `selectTaskPreviewData`, `selectTaskPreviewLoading`,
 * `selectTaskPreviewError` selectors; `fetchTaskPreview` thunk.
 *
 * Major child components (defined above in this file): `LlmResponseStep`,
 * `ComparisonStep`, `ReviewLlmSection`, `ReviewStep`.
 *
 * Side effects: see the `useEffect`s below — one fetches preview data when
 * IDs are available/change, the other scrolls the content into view whenever
 * the active step changes.
 *
 * Business rules: a task is considered "annotated" once `status === 'annotated'`
 * and "reviewed" once `status` is `'completed'` or `'approved'`; the most
 * recent entry in `data.annotations` is treated as the authoritative annotation.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const TaskPreview = ({ taskId, projectId }: TaskPreviewProps) => {
    const theme = useTheme();
    const dispatch = useDispatch<AppDispatch>();
    const [activeStep, setActiveStep] = useState(0);
    const [expandedSections, setExpandedSections] = useState({
        prompt: true,
        llm1Response: false,
        llm2Response: false,
        llm1Ratings: false,
        llm2Ratings: false,
    });
    const contentRef = useRef<HTMLDivElement>(null);

    // Redux selectors - use raw task preview data
    const data = useSelector(selectTaskPreviewData);
    const loading = useSelector(selectTaskPreviewLoading);
    const error = useSelector(selectTaskPreviewError);

    console.log('TaskPreview data:', data);

    // Fetch task preview data on mount or when IDs change
    useEffect(() => {
        if (projectId && taskId) {
            dispatch(fetchTaskPreview({ projectId, taskId }));
        }
    }, [dispatch, projectId, taskId]);

    // Scroll to top when step changes, so switching steps always starts the
    // user at the top of that step's content instead of wherever they'd
    // scrolled to on the previous step.
    useEffect(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [activeStep]);

    // Extract annotation data from backend data sources
    const promptText = data?.prompt || data?.payload?.prompt || '';
    const llm1Response = data?.llm1 || data?.payload?.llm1 || '';
    const llm2Response = data?.llm2 || data?.payload?.llm2 || '';

    // Get task status and stage from raw API data
    const taskStatus = data?.status;
    const taskStage = data?.stage;
    const displayTaskId = data?.task_id;
    const isAnnotated = taskStatus === 'annotated';
    const isReviewed = taskStatus === 'completed' || taskStatus === 'approved';

    // Extract annotation data (use the most recent annotation)
    const latestAnnotation = data?.annotations?.[data.annotations.length - 1];
    const llm1Ratings = latestAnnotation?.llm1;
    const llm2Ratings = latestAnnotation?.llm2;
    const comparisonSelection = latestAnnotation?.comparison_selection;
    const llm1Comment = latestAnnotation?.llm1?.comment;
    const llm2Comment = latestAnnotation?.llm2?.comment;

    // review data is passed directly to ReviewStep sub-component
    const reviewData = data?.review as ReviewStepData | undefined;

    // Status chip color reflects lifecycle progress: reviewed > annotated > default.
    let statusColor: 'success' | 'warning' | 'default' = 'default';
    if (isReviewed) statusColor = 'success';
    else if (isAnnotated) statusColor = 'warning';

    // Steps configuration (compact button-like stepper)
    const steps = [
        { label: 'LLM1 Response', value: 0 },
        { label: 'LLM2 Response', value: 1 },
        { label: 'Rating', value: 2 },
        { label: 'Review', value: 3 },
    ];

    /** Jumps the stepper to an arbitrary step. Triggered by clicking a step button (non-linear stepper). */
    const handleStepClick = (step: number) => {
        setActiveStep(step);
    };

    /** Toggles one expand/collapse section's visibility. Triggered by that section's expand icon button. */
    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    // Loading state
    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px',
                    gap: 2,
                }}
            >
                <CircularProgress size={48} />
                <Typography variant="body1" color="text.secondary">
                    Loading task preview...
                </Typography>
            </Box>
        );
    }

    // Error state
    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                </Alert>
            </Box>
        );
    }

    // No data state
    if (!data) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                    No task data available.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto', width: '100%' }} ref={contentRef}>
            {/* Header with Task Info */}
            <Fade in timeout={500}>
                <Box sx={{ mb: SECTION_GAP }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <AssignmentIcon sx={{ fontSize: 28, color: theme.palette.primary.main }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="h5" fontWeight={700}>
                                Task Preview
                            </Typography>
                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                {displayTaskId}
                            </Typography>
                        </Box>
                    </Box>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            borderRadius: SECTION_RADIUS,
                            border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                            backgroundColor: alpha(theme.palette.background.paper, 0.7),
                        }}
                    >
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Chip
                                label={taskStatus}
                                size="small"
                                color={statusColor}
                                sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                                icon={isReviewed || isAnnotated ? <CheckCircleIcon /> : undefined}
                            />
                            <Chip
                                label={`Stage: ${taskStage}`}
                                size="small"
                                variant="outlined"
                                sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                            />
                            <Chip
                                label={`Cycle: ${data?.cycle ?? 0}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                            />
                        </Box>
                    </Paper>
                </Box>
            </Fade>

            {/* Stepper Navigation */}
            <Card
                sx={{
                    mb: SECTION_GAP,
                    borderRadius: SECTION_RADIUS,
                    border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.06)}`,
                    background: alpha(theme.palette.background.paper, 0.85),
                    backdropFilter: 'blur(4px)',
                }}
            >
                <CardContent sx={{ p: SECTION_PADDING }}>
                    <Stepper activeStep={activeStep} nonLinear alternativeLabel sx={{ pt: 0.5 }}>
                        {steps.map((step) => (
                            <Step key={step.value} completed={step.value < activeStep}>
                                <StepButton
                                    onClick={() => handleStepClick(step.value)}
                                    sx={{
                                        '& .MuiStepLabel-label': {
                                            fontWeight: activeStep === step.value ? 700 : 500,
                                            fontSize: activeStep === step.value ? '0.9rem' : '0.8rem',
                                        },
                                        '&:focus': {
                                            outline: 'none',
                                        },
                                        '&:active': {
                                            outline: 'none',
                                            border: 'none',
                                        },
                                        '& .MuiStepLabel-root': {
                                            '&:focus': {
                                                outline: 'none',
                                            },
                                        },
                                    }}
                                >
                                    <StepLabel
                                        slotProps={{
                                            stepIcon: {
                                                sx: {
                                                    fontSize: '1.6rem',
                                                    '&.Mui-active': {
                                                        color: theme.palette.primary.main,
                                                        transform: 'scale(1.1)',
                                                        transition: 'transform 0.2s',
                                                    },
                                                },
                                            },
                                        }}
                                    >
                                        {step.label}
                                    </StepLabel>
                                </StepButton>
                            </Step>
                        ))}
                    </Stepper>
                </CardContent>
            </Card>

            {/* Prompt always visible */}
            <Card
                sx={{
                    mb: SECTION_GAP,
                    borderRadius: SECTION_RADIUS,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                    boxShadow: `0 8px 18px ${alpha(theme.palette.warning.main, 0.08)}`,
                    background: `linear-gradient(180deg, ${alpha(theme.palette.warning.light, 0.08)} 0%, ${alpha(
                        theme.palette.background.paper,
                        0.95,
                    )} 100%)`,
                }}
            >
                <CardContent sx={{ p: SECTION_PADDING }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Chip
                            label="Prompt"
                            color="warning"
                            size="small"
                            sx={{
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: 0.4,
                                backgroundColor: alpha(theme.palette.warning.main, 0.16),
                            }}
                        />
                        <Tooltip title={expandedSections.prompt ? 'Collapse' : 'Expand'}>
                            <IconButton
                                size="small"
                                onClick={() => toggleSection('prompt')}
                                sx={{
                                    backgroundColor: alpha(theme.palette.warning.main, 0.1),
                                    '&:hover': { backgroundColor: alpha(theme.palette.warning.main, 0.2) },
                                }}
                            >
                                {expandedSections.prompt ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Collapse in={expandedSections.prompt}>
                        <Paper
                            elevation={0}
                            sx={{
                                p: SECTION_PADDING,
                                backgroundColor: alpha(theme.palette.warning.light, 0.12),
                                borderRadius: SECTION_RADIUS,
                                border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                            }}
                        >
                            <Typography
                                variant="body1"
                                sx={{
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.7,
                                    fontSize: '0.95rem',
                                }}
                            >
                                {promptText || 'No prompt available'}
                            </Typography>
                        </Paper>
                    </Collapse>
                </CardContent>
            </Card>

            {/* Step Content */}
            <Fade in key={activeStep} timeout={400}>
                <Box>
                    {activeStep === 0 && (
                        <LlmResponseStep
                            llmLabel="LLM1"
                            paletteKey="primary"
                            response={llm1Response}
                            isAnnotated={isAnnotated}
                            ratings={llm1Ratings}
                            comment={llm1Comment}
                            expandedResponse={expandedSections.llm1Response}
                            expandedRatings={expandedSections.llm1Ratings}
                            onToggleResponse={() => toggleSection('llm1Response')}
                            onToggleRatings={() => toggleSection('llm1Ratings')}
                        />
                    )}

                    {activeStep === 1 && (
                        <LlmResponseStep
                            llmLabel="LLM2"
                            paletteKey="secondary"
                            response={llm2Response}
                            isAnnotated={isAnnotated}
                            ratings={llm2Ratings}
                            comment={llm2Comment}
                            expandedResponse={expandedSections.llm2Response}
                            expandedRatings={expandedSections.llm2Ratings}
                            onToggleResponse={() => toggleSection('llm2Response')}
                            onToggleRatings={() => toggleSection('llm2Ratings')}
                        />
                    )}

                    {activeStep === 2 && (
                        <ComparisonStep
                            isAnnotated={isAnnotated}
                            comparisonSelection={comparisonSelection}
                        />
                    )}

                    {activeStep === 3 && (
                        <ReviewStep
                            isReviewed={isReviewed}
                            isAnnotated={isAnnotated}
                            reviewData={reviewData}
                            llm1Ratings={llm1Ratings}
                            llm2Ratings={llm2Ratings}
                            llm1Comment={llm1Comment}
                            llm2Comment={llm2Comment}
                            comparisonSelection={comparisonSelection}
                        />
                    )}
                </Box>
            </Fade>
        </Box>
    );
};

export default TaskPreview;
