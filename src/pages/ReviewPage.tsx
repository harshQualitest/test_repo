import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { REVIEW_TEMPLATE_MAP } from '../components/review/reviewTemplateMap';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Button,
    alpha,
    useTheme,
    Chip,
    Paper,
    Checkbox,
    FormControlLabel,
    MenuItem,
    Select,
    Rating,
    TextField,
    FormControl,
    InputLabel,
    Collapse,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import StarIcon from '@mui/icons-material/Star';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import type { AppDispatch } from '../redux/store';
import {
    fetchReviewerTasks,
    submitReviewerReview,
    selectUserAnnotationTasks,
    selectUserAnnotationLoading,
    selectUserAnnotationError,
    selectUserAnnotationSubmitting,
    selectNoTasksAvailable,
    clearTasks,
    setNoTasksAvailable,
    resetAnnotationState,
} from '../redux/slices/userAnnotationSlice';

// Rating categories - same as UserAnnotationScreen
const RATING_CATEGORIES = [
    { key: 'overall_quality', label: 'Overall Quality', description: 'Rate the overall quality of the response' },
    { key: 'writing_style', label: 'Writing Style', description: 'Clarity, coherence, and readability' },
    { key: 'verbosity', label: 'Verbosity', description: 'Appropriate length and detail level' },
    {
        key: 'instruction_following',
        label: 'Instruction Following',
        description: 'How well the response follows the prompt',
    },
    { key: 'accuracy', label: 'Accuracy', description: 'Factual correctness of the response' },
    { key: 'harmlessness', label: 'Harmlessness', description: 'Free from harmful or inappropriate content' },
    { key: 'intent_understanding', label: 'Intent Understanding', description: "Understanding of the user's intent" },
];

// Comparison options - same as UserAnnotationScreen
const COMPARISON_OPTIONS = [
    { value: 'llm1_significantly_better', label: 'LLM1 is significantly better than LLM 2' },
    { value: 'llm1_slightly_better', label: 'LLM1 is slightly better than LLM2' },
    { value: 'both_same', label: 'Both responses are about the same' },
    { value: 'llm2_significantly_better', label: 'LLM2 is significantly better than LLM 1' },
    { value: 'llm2_slightly_better', label: 'LLM2 is slightly better than LLM1' },
    { value: 'exactly_same', label: 'Responses are exactly the same' },
    { value: 'both_inadequate', label: 'Both responses are inadequate' },
];

interface AnnotationRatings {
    overall_quality?: number;
    writing_style?: number;
    verbosity?: number;
    instruction_following?: number;
    accuracy?: number;
    harmlessness?: number;
    intent_understanding?: number;
}

interface AnnotationData {
    round: number;
    annotator_id: string;
    llm1: AnnotationRatings;
    llm2: AnnotationRatings;
    comparison_selection: string;
    submitted_time: string;
    is_approved: number;
}

interface TaskData {
    _id: string;
    prompt: string;
    llm1: string;
    llm2: string;
    payload?: {
        prompt?: string;
        llm1?: string;
        llm2?: string;
    };
    stage: string;
    status: string;
    priority: string;
    cycle: number;
    assigned_annotator?: string;
    annotations?: AnnotationData[];
    task_id: string;
}

/** Maps a 1-5 star rating to a quality string. */
const ratingToQuality = (r: number): string => {
    if (r >= 5) return 'excellent';
    if (r >= 4) return 'great';
    if (r >= 3) return 'good';
    if (r >= 2) return 'fair';
    return 'poor';
};

/** Maps a 1-5 star rating to a writing-style quality string for the API. */
const writingStyleValue = (r: number): string => {
    if (r >= 4) return 'no_issue';
    if (r >= 3) return 'minor_issues';
    return 'major_issues';
};

/** Maps a 1-5 star rating to a verbosity quality string for the API. */
const verbosityValue = (r: number): string => {
    if (r >= 4) return 'appropriate';
    if (r >= 3) return 'slightly_verbose';
    if (r >= 2) return 'overly_verbose';
    return 'too_brief';
};

/** Maps a 1-5 star rating to an instruction-following quality string for the API. */
const instructionValue = (r: number): string => {
    if (r >= 4) return 'yes';
    if (r >= 3) return 'partially';
    return 'no';
};

/** Maps a 1-5 star rating to an accuracy quality string for the API. */
const accuracyValue = (r: number): string => {
    if (r >= 4) return 'accurate';
    if (r >= 3) return 'mostly_accurate';
    return 'inaccurate';
};

/** Maps a 1-5 star rating to an intent-understanding quality string for the API. */
const intentValue = (r: number): string => {
    if (r >= 4) return 'fully_address';
    if (r >= 3) return 'partially_address';
    return 'does_not_address';
};

/** Lookup map from annotation key to its rating resolver function. */
const RATING_RESOLVERS: Record<string, (r: number) => string> = {
    overall_quality: ratingToQuality,
    writing_style: writingStyleValue,
    verbosity: verbosityValue,
    instruction_following: instructionValue,
    accuracy: accuracyValue,
    harmlessness: (r) => (r >= 3 ? 'safe' : 'unsafe'),
    intent_understanding: intentValue,
};

/** Maps a star rating to the domain-specific string value for a given annotation key. */
const getRatingValue = (key: string, rating: number): string =>
    (RATING_RESOLVERS[key] ?? ratingToQuality)(rating);

/**
 * Builds the LLM ratings payload for the review API.
 * Uses updated star ratings when isUpdated is true, otherwise falls back to the original annotation.
 */
const buildLlmRatingsPayload = (
    isUpdated: boolean,
    updatedRatings: Record<string, number>,
    originalRatings?: AnnotationRatings,
): Record<string, string> => {
    const data: Record<string, string> = {};
    if (isUpdated) {
        Object.entries(updatedRatings).forEach(([key, value]) => {
            if (value > 0) {
                const apiKey = key === 'intent_understanding' ? 'intent' : key;
                data[apiKey] = getRatingValue(key, value);
            }
        });
    } else if (originalRatings) {
        Object.entries(originalRatings).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                const apiKey = key === 'intent_understanding' ? 'intent' : key;
                data[apiKey] = getRatingValue(key, value as number);
            }
        });
    }
    return data;
};

/**
 * Resolves the rating-related fields to merge into the review payload.
 * Extracted from the component to reduce cognitive complexity.
 */
const resolveRatingFields = (
    isRatingUpdated: boolean,
    overallRatingMode: string,
    overallJustification: string,
    comparisonSelection: string | undefined,
): { rating?: string; rating_reason?: string } => {
    if (isRatingUpdated) {
        const fields: { rating: string; rating_reason?: string } = { rating: overallRatingMode };
        if (overallJustification) fields.rating_reason = overallJustification;
        return fields;
    }
    if (comparisonSelection) return { rating: comparisonSelection };
    return {};
};

/**
 * Pure function that determines whether the "Approve/Final Submit" button should be enabled.
 * Extracted from the component to reduce cognitive complexity.
 */
const checkCanSubmit = (
    noErrorsChecked: boolean,
    llm1GradingMode: string,
    llm1Ratings: Record<string, number>,
    llm2GradingMode: string,
    llm2Ratings: Record<string, number>,
    overallRatingMode: string,
    overallJustification: string,
): boolean => {
    if (noErrorsChecked) return true;
    if (overallRatingMode !== 'keep' && overallJustification.trim().length < 8) return false;
    const hasLlm1Updates = llm1GradingMode === 'update' && Object.keys(llm1Ratings).length > 0;
    const hasLlm2Updates = llm2GradingMode === 'update' && Object.keys(llm2Ratings).length > 0;
    const hasRatingUpdate = overallRatingMode !== 'keep' && overallJustification.trim().length >= 8;
    return hasLlm1Updates || hasLlm2Updates || hasRatingUpdate;
};

interface SubmitReviewParams {
    action: 'approve' | 'reject' | 'reassign';
    currentTask: TaskData | null;
    projectId: string | undefined;
    noErrorsChecked: boolean;
    llm1GradingMode: string;
    llm1Ratings: Record<string, number>;
    llm2GradingMode: string;
    llm2Ratings: Record<string, number>;
    overallRatingMode: string;
    overallJustification: string;
    currentAnnotation: AnnotationData | undefined;
    apiCalledRef: { current: boolean };
    dispatch: AppDispatch;
    onSuccess: () => void;
}

/**
 * Handles the review submission logic outside the component to reduce cognitive complexity.
 * All branching logic lives here instead of inside ReviewPage.
 */
const submitReview = async ({
    action,
    currentTask,
    projectId,
    noErrorsChecked,
    llm1GradingMode,
    llm1Ratings,
    llm2GradingMode,
    llm2Ratings,
    overallRatingMode,
    overallJustification,
    currentAnnotation,
    apiCalledRef,
    dispatch,
    onSuccess,
}: SubmitReviewParams): Promise<void> => {
    if (!currentTask || !projectId) return;

    const statusMap: Record<string, string> = { reject: 'rejected', reassign: 'queued', approve: 'completed' };
    const status = statusMap[action] ?? 'completed';

    const isLlm1Updated = !noErrorsChecked && llm1GradingMode === 'update' && Object.keys(llm1Ratings).length > 0;
    const isLlm2Updated = !noErrorsChecked && llm2GradingMode === 'update' && Object.keys(llm2Ratings).length > 0;
    const isRatingUpdated = !noErrorsChecked && overallRatingMode !== 'keep';

    const reviewData = {
        is_llm1_updated: isLlm1Updated,
        is_llm2_updated: isLlm2Updated,
        is_rating_updated: isRatingUpdated,
        status,
        llm1: buildLlmRatingsPayload(isLlm1Updated, llm1Ratings, currentAnnotation?.llm1),
        llm2: buildLlmRatingsPayload(isLlm2Updated, llm2Ratings, currentAnnotation?.llm2),
        ...resolveRatingFields(isRatingUpdated, overallRatingMode, overallJustification, currentAnnotation?.comparison_selection),
    };

    try {
        await dispatch(
            submitReviewerReview({ projectId, taskId: currentTask._id, data: reviewData }),
        ).unwrap();
        onSuccess();
        dispatch(clearTasks());
        apiCalledRef.current = false;
        dispatch(fetchReviewerTasks(projectId));
    } catch {
        // Errors propagate to Redux state via selectUserAnnotationError
    }
};

/**
 * Custom hook that encapsulates side-effect setup (data fetching, dialog handling) for ReviewPage.
 * Extracted to keep the ReviewPage component's cognitive complexity within limits.
 */
const useReviewPageSetup = (
    projectId: string | undefined,
    navigate: ReturnType<typeof useNavigate>,
) => {
    const dispatch = useAppDispatch();
    const noTasksAvailable = useAppSelector(selectNoTasksAvailable);
    const [showNoTasksDialog, setShowNoTasksDialog] = useState(false);
    const apiCalledRef = useRef(false);

    // Fetches the reviewer's queued tasks once projectId is known. `apiCalledRef`
    // guards against a duplicate fetch from React Strict Mode's double-invoke.
    // Cleanup resets the annotation slice and the guard ref so a re-mount
    // (e.g. navigating to a different project) starts fresh.
    useEffect(() => {
        if (projectId && !apiCalledRef.current) {
            apiCalledRef.current = true;
            dispatch(fetchReviewerTasks(projectId));
        }
        return () => {
            dispatch(resetAnnotationState());
            apiCalledRef.current = false;
        };
    }, [dispatch, projectId]);

    // Opens the "no tasks available" dialog whenever the slice reports the
    // reviewer's queue is empty.
    useEffect(() => {
        if (noTasksAvailable) {
            setShowNoTasksDialog(true);
        }
    }, [noTasksAvailable]);

    /** Closes the no-tasks dialog, clears the flag in Redux, and navigates back. */
    const handleNoTasksDialogClose = () => {
        setShowNoTasksDialog(false);
        dispatch(setNoTasksAvailable(false));
        navigate(-1);
    };

    return { dispatch, showNoTasksDialog, apiCalledRef, handleNoTasksDialogClose };
};

/**
 * Component: ReviewPage
 *
 * Purpose: Reviewer-facing screen for approving, rejecting, or re-assigning
 * an annotated LLM-grading task. Lets the reviewer either confirm the
 * annotator's original ratings/comparison are correct, or override specific
 * LLM1/LLM2 ratings and the overall comparison before submitting.
 *
 * Responsibilities:
 * - Fetches the reviewer's queued tasks for the project and works the first one.
 * - Renders the original prompt/responses plus the annotator's original ratings.
 * - Lets the reviewer keep or update LLM1/LLM2 ratings and the overall ranking.
 * - Enforces that any rating override includes a written justification.
 * - Submits the review (approve/reject/reassign) and advances to the next task.
 * - Shows a "no tasks available" dialog when the queue is empty.
 * - Delegates to a template component (`REVIEW_TEMPLATE_MAP`) for non-LLM
 *   template types instead of rendering the LLM-grading UI.
 *
 * Props: none (route component).
 *
 * State (local, via `useReviewPageSetup` and directly in this component):
 * - `showNoTasksDialog` - whether the "no tasks available" dialog is open.
 * - `noErrorsChecked` - reviewer confirms no changes are needed.
 * - `llm1Expanded` / `llm2Expanded` - whether each LLM response text is expanded.
 * - `llm1GradingMode` / `llm2GradingMode` - 'keep' original vs. 'update' ratings, per LLM.
 * - `llm1Ratings` / `llm2Ratings` - reviewer's overridden star ratings, per LLM.
 * - `overallRatingMode` - 'keep' vs. a new comparison selection for the overall ranking.
 * - `overallJustification` - required free-text reason when the overall rating changes.
 *
 * Redux (userAnnotationSlice): `selectUserAnnotationTasks`, `selectUserAnnotationLoading`,
 * `selectUserAnnotationError`, `selectUserAnnotationSubmitting`, `selectNoTasksAvailable`
 * selectors; `fetchReviewerTasks`, `submitReviewerReview` thunks; `clearTasks`,
 * `setNoTasksAvailable`, `resetAnnotationState` actions.
 *
 * Major child components: `REVIEW_TEMPLATE_MAP[templateType]` (non-LLM templates).
 *
 * Side effects: see `useReviewPageSetup` above — fetches reviewer tasks on mount
 * (guarded against Strict Mode double-invocation via `apiCalledRef`), resets
 * annotation state on unmount, and opens the no-tasks dialog when the slice
 * reports the queue is empty.
 *
 * Business rules: the "Approve/Final Submit" action is only enabled once the
 * reviewer either checks "no errors detected" or makes at least one rating
 * change plus (when the overall rating changed) an 8+ character justification
 * — see `checkCanSubmit`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ReviewPage = () => {
    const theme = useTheme();
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as { template_type?: string; instructions?: { url?: string } } | null;

    const { dispatch, showNoTasksDialog, apiCalledRef, handleNoTasksDialogClose } =
        useReviewPageSetup(projectId, navigate);

    // Redux selectors
    const tasks = useAppSelector(selectUserAnnotationTasks);
    const loading = useAppSelector(selectUserAnnotationLoading);
    const error = useAppSelector(selectUserAnnotationError);
    const submitting = useAppSelector(selectUserAnnotationSubmitting);

    // Local state
    const [noErrorsChecked, setNoErrorsChecked] = useState(false);

    // LLM1 states
    const [llm1Expanded, setLlm1Expanded] = useState(false);
    const [llm1GradingMode, setLlm1GradingMode] = useState('keep');
    const [llm1Ratings, setLlm1Ratings] = useState<Record<string, number>>({});

    // LLM2 states
    const [llm2Expanded, setLlm2Expanded] = useState(false);
    const [llm2GradingMode, setLlm2GradingMode] = useState('keep');
    const [llm2Ratings, setLlm2Ratings] = useState<Record<string, number>>({});

    // Overall comparison states
    const [overallRatingMode, setOverallRatingMode] = useState('keep');
    const [overallJustification, setOverallJustification] = useState('');

    // Get current task
    const currentTask = tasks.length > 0 ? (tasks[0] as TaskData) : null;
    const currentAnnotation = currentTask?.annotations?.[currentTask.annotations.length - 1];

    /** Resets all review form state back to defaults after a successful submission. */
    const resetReviewStates = () => {
        setNoErrorsChecked(false);
        setLlm1GradingMode('keep');
        setLlm2GradingMode('keep');
        setOverallRatingMode('keep');
        setOverallJustification('');
        setLlm1Ratings({});
        setLlm2Ratings({});
        setLlm1Expanded(false);
        setLlm2Expanded(false);
    };

    /**
     * Triggered by the Approve/Reject/Re-assign action buttons. Delegates to
     * the module-level `submitReview` helper with all current form state.
     * @param action - Which review outcome the reviewer chose.
     */
    const handleSubmitReview = (action: 'approve' | 'reject' | 'reassign') => {
        void submitReview({
            action,
            currentTask,
            projectId,
            noErrorsChecked,
            llm1GradingMode,
            llm1Ratings,
            llm2GradingMode,
            llm2Ratings,
            overallRatingMode,
            overallJustification,
            currentAnnotation,
            apiCalledRef,
            dispatch,
            onSuccess: resetReviewStates,
        });
    };

    /** Updates a single LLM1 rating category. Triggered by that category's star Rating control. */
    const handleLlm1RatingChange = (category: string, value: number | null) => {
        setLlm1Ratings({ ...llm1Ratings, [category]: value ?? 0 });
    };

    /** Updates a single LLM2 rating category. Triggered by that category's star Rating control. */
    const handleLlm2RatingChange = (category: string, value: number | null) => {
        setLlm2Ratings({ ...llm2Ratings, [category]: value ?? 0 });
    };

    // Check if submit is enabled - allow when "No error detected" is checked OR when reviewer made updates
    const canSubmit = checkCanSubmit(
        noErrorsChecked,
        llm1GradingMode,
        llm1Ratings,
        llm2GradingMode,
        llm2Ratings,
        overallRatingMode,
        overallJustification,
    );

    const templateType = locationState?.template_type;
    const MappedTemplate = templateType ? REVIEW_TEMPLATE_MAP[templateType] : null;

    // Loading state
    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '80vh',
                    gap: 2,
                }}
            >
                <CircularProgress size={48} />
                <Typography variant="body1" color="text.secondary">
                    Loading review tasks...
                </Typography>
            </Box>
        );
    }

    // Error state
    if (error) {
        return (
            <Box sx={{ py: 4, px: { xs: 2, md: 4 } }}>
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                </Alert>
                <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
                    Go Back
                </Button>
            </Box>
        );
    }

    // No task available
    if (!currentTask && !loading) {
        return (
            <>
                <Box sx={{ py: 4, px: { xs: 2, md: 4 } }}>
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                        No tasks available for review at the moment.
                    </Alert>
                    <Button onClick={() => navigate(-1)} sx={{ mt: 2 }}>
                        Go Back
                    </Button>
                </Box>
                <Dialog open={showNoTasksDialog} onClose={handleNoTasksDialogClose}>
                    <DialogTitle>No Tasks Available</DialogTitle>
                    <DialogContent>
                        <Typography>
                            There are no tasks available for review in this project at the moment. Please check back
                            later.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleNoTasksDialogClose} variant="contained">
                            Go Back
                        </Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }

    // Non-LLM templates: render their component once task list is loaded
    if (MappedTemplate && currentTask) {
        return <MappedTemplate instructionsUrl={locationState?.instructions?.url} task={currentTask} />;
    }

    return (
        <Box sx={{ py: 2, px: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Typography
                variant="h5"
                fontWeight={700}
                sx={{
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 2,
                }}
            >
                Review Annotation | {currentTask?.task_id}
            </Typography>

            {/* Section 1: No Errors Checkbox */}
            <Card
                sx={{
                    mb: 2,
                    borderRadius: 2,
                    border: noErrorsChecked
                        ? `1px solid ${theme.palette.success.main}`
                        : `1px solid ${theme.palette.divider}`,
                    backgroundColor: noErrorsChecked ? alpha(theme.palette.success.main, 0.05) : 'background.paper',
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={noErrorsChecked}
                                onChange={(e) => setNoErrorsChecked(e.target.checked)}
                                sx={{
                                    color: theme.palette.success.main,
                                    '&.Mui-checked': {
                                        color: theme.palette.success.main,
                                    },
                                }}
                            />
                        }
                        label={
                            <Box>
                                <Typography variant="subtitle1" fontWeight={600} color="success.main">
                                    ✓ No error detected - All Items look good
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Check this checkbox if no changes are needed. This will deactivate mandatory review
                                    fields.
                                </Typography>
                            </Box>
                        }
                    />
                </CardContent>
            </Card>

            {/* Section 2: Original Prompt */}
            <Card sx={{ mb: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Original Prompt
                    </Typography>
                    <Paper
                        elevation={0}
                        sx={{
                            p: 1.5,
                            backgroundColor: '#FEF9C2',
                            borderRadius: 1.5,
                            mt: 1,
                        }}
                    >
                        <Typography variant="body2" sx={{ lineHeight: 1.5, color: 'text.primary' }}>
                            {currentTask?.payload?.prompt || currentTask?.prompt}
                        </Typography>
                    </Paper>
                </CardContent>
            </Card>

            {/* Section 3: LLM Responses Side by Side */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
                {/* LLM1 Response */}
                <Card
                    sx={{
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                    }}
                >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Chip
                            label="LLM1 Response"
                            size="small"
                            sx={{
                                mb: 1.5,
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                fontWeight: 600,
                                height: 24,
                            }}
                        />

                        {/* LLM1 Response Text */}
                        <Box sx={{ mb: 1.5 }}>
                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                {llm1Expanded
                                    ? currentTask?.payload?.llm1 || currentTask?.llm1
                                    : `${(currentTask?.payload?.llm1 || currentTask?.llm1 || '').substring(0, 200)}...`}
                            </Typography>
                            {(currentTask?.payload?.llm1 || currentTask?.llm1 || '').length > 200 && (
                                <Button
                                    size="small"
                                    onClick={() => setLlm1Expanded(!llm1Expanded)}
                                    endIcon={
                                        llm1Expanded ? (
                                            <ExpandLessIcon sx={{ fontSize: 18 }} />
                                        ) : (
                                            <ExpandMoreIcon sx={{ fontSize: 18 }} />
                                        )
                                    }
                                    sx={{ mt: 0.5, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                                >
                                    {llm1Expanded ? 'Show Less' : 'Show More'}
                                </Button>
                            )}
                        </Box>

                        {/* Original Annotation Stars */}
                        {currentAnnotation?.llm1 && (
                            <Box
                                sx={{
                                    mb: 1.5,
                                    p: 1.5,
                                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                    borderRadius: 1.5,
                                }}
                            >
                                <Typography variant="caption" fontWeight={700} gutterBottom sx={{ display: 'block' }}>
                                    Original Annotations
                                </Typography>
                                {RATING_CATEGORIES.map((cat) => (
                                    <Box
                                        key={cat.key}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            mb: 0.5,
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary">
                                            {cat.label}
                                        </Typography>
                                        <Rating
                                            value={currentAnnotation.llm1[cat.key as keyof AnnotationRatings] || 0}
                                            readOnly
                                            size="small"
                                            icon={<StarIcon sx={{ color: theme.palette.primary.main, fontSize: 16 }} />}
                                            emptyIcon={<StarIcon sx={{ opacity: 0.25, fontSize: 16 }} />}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        )}

                        {/* Grading Update Dropdown */}
                        <FormControl fullWidth size="small" sx={{ mb: 1.5 }} disabled={noErrorsChecked}>
                            <InputLabel>Grading</InputLabel>
                            <Select
                                value={llm1GradingMode}
                                onChange={(e) => setLlm1GradingMode(e.target.value)}
                                label="Grading"
                            >
                                <MenuItem value="keep">Keep original</MenuItem>
                                <MenuItem value="update">Update grading</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Update Grading Fields */}
                        <Collapse in={llm1GradingMode === 'update' && !noErrorsChecked}>
                            <Box
                                sx={{
                                    p: 1.5,
                                    backgroundColor: alpha(theme.palette.info.main, 0.05),
                                    borderRadius: 1.5,
                                }}
                            >
                                <Typography variant="caption" fontWeight={700} gutterBottom sx={{ display: 'block' }}>
                                    Update Ratings
                                </Typography>
                                {RATING_CATEGORIES.map((cat) => (
                                    <Box key={cat.key} sx={{ mb: 1 }}>
                                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                                            {cat.label}
                                        </Typography>
                                        <Rating
                                            value={llm1Ratings[cat.key] || 0}
                                            onChange={(_, value) => handleLlm1RatingChange(cat.key, value)}
                                            size="small"
                                            icon={<StarIcon sx={{ fontSize: 20 }} />}
                                            emptyIcon={<StarIcon sx={{ opacity: 0.25, fontSize: 20 }} />}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </Collapse>
                    </CardContent>
                </Card>

                {/* LLM2 Response */}
                <Card
                    sx={{
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                    }}
                >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Chip
                            label="LLM2 Response"
                            size="small"
                            sx={{
                                mb: 1.5,
                                backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                                color: theme.palette.secondary.main,
                                fontWeight: 600,
                                height: 24,
                            }}
                        />

                        {/* LLM2 Response Text */}
                        <Box sx={{ mb: 1.5 }}>
                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                                {llm2Expanded
                                    ? currentTask?.payload?.llm2 || currentTask?.llm2
                                    : `${(currentTask?.payload?.llm2 || currentTask?.llm2 || '').substring(0, 200)}...`}
                            </Typography>
                            {(currentTask?.payload?.llm2 || currentTask?.llm2 || '').length > 200 && (
                                <Button
                                    size="small"
                                    onClick={() => setLlm2Expanded(!llm2Expanded)}
                                    endIcon={
                                        llm2Expanded ? (
                                            <ExpandLessIcon sx={{ fontSize: 18 }} />
                                        ) : (
                                            <ExpandMoreIcon sx={{ fontSize: 18 }} />
                                        )
                                    }
                                    sx={{ mt: 0.5, textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                                >
                                    {llm2Expanded ? 'Show Less' : 'Show More'}
                                </Button>
                            )}
                        </Box>

                        {/* Original Annotation Stars */}
                        {currentAnnotation?.llm2 && (
                            <Box
                                sx={{
                                    mb: 1.5,
                                    p: 1.5,
                                    backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                                    borderRadius: 1.5,
                                }}
                            >
                                <Typography variant="caption" fontWeight={700} gutterBottom sx={{ display: 'block' }}>
                                    Original Annotations
                                </Typography>
                                {RATING_CATEGORIES.map((cat) => (
                                    <Box
                                        key={cat.key}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            mb: 0.5,
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary">
                                            {cat.label}
                                        </Typography>
                                        <Rating
                                            value={currentAnnotation.llm2[cat.key as keyof AnnotationRatings] || 0}
                                            readOnly
                                            size="small"
                                            icon={
                                                <StarIcon sx={{ color: theme.palette.secondary.main, fontSize: 16 }} />
                                            }
                                            emptyIcon={<StarIcon sx={{ opacity: 0.25, fontSize: 16 }} />}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        )}

                        {/* Grading Update Dropdown */}
                        <FormControl fullWidth size="small" sx={{ mb: 1.5 }} disabled={noErrorsChecked}>
                            <InputLabel>Grading</InputLabel>
                            <Select
                                value={llm2GradingMode}
                                onChange={(e) => setLlm2GradingMode(e.target.value)}
                                label="Grading"
                            >
                                <MenuItem value="keep">Keep original</MenuItem>
                                <MenuItem value="update">Update grading</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Update Grading Fields */}
                        <Collapse in={llm2GradingMode === 'update' && !noErrorsChecked}>
                            <Box
                                sx={{
                                    p: 1.5,
                                    backgroundColor: alpha(theme.palette.info.main, 0.05),
                                    borderRadius: 1.5,
                                }}
                            >
                                <Typography variant="caption" fontWeight={700} gutterBottom sx={{ display: 'block' }}>
                                    Update Ratings
                                </Typography>
                                {RATING_CATEGORIES.map((cat) => (
                                    <Box key={cat.key} sx={{ mb: 1 }}>
                                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                                            {cat.label}
                                        </Typography>
                                        <Rating
                                            value={llm2Ratings[cat.key] || 0}
                                            onChange={(_, value) => handleLlm2RatingChange(cat.key, value)}
                                            size="small"
                                            icon={<StarIcon sx={{ fontSize: 20 }} />}
                                            emptyIcon={<StarIcon sx={{ opacity: 0.25, fontSize: 20 }} />}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </Collapse>
                    </CardContent>
                </Card>
            </Box>

            {/* Section 4: Overall Ranking */}
            <Card
                sx={{
                    mb: 2,
                    borderRadius: 2,
                    border: `1px solid ${alpha('#AD46FF', 0.3)}`,
                    background: `linear-gradient(180deg, ${alpha('#AD46FF', 0.08)} 0%, ${alpha('#AD46FF', 0.02)} 100%)`,
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#AD46FF', mb: 1.5 }}>
                        Overall Ranking
                    </Typography>

                    {/* Original Comparison Selection */}
                    {currentAnnotation && (
                        <Box sx={{ mb: 1.5, p: 1.5, backgroundColor: alpha('#AD46FF', 0.1), borderRadius: 1.5 }}>
                            <Typography variant="caption" fontWeight={700} gutterBottom sx={{ display: 'block' }}>
                                Original Selection
                            </Typography>
                            <Typography variant="body2" fontWeight={600} color="#AD46FF">
                                {COMPARISON_OPTIONS.find((opt) => opt.value === currentAnnotation.comparison_selection)
                                    ?.label || currentAnnotation.comparison_selection}
                            </Typography>
                        </Box>
                    )}

                    {/* Overall Ranking Dropdown */}
                    <FormControl fullWidth size="small" sx={{ mb: 1.5 }} disabled={noErrorsChecked}>
                        <InputLabel>Overall Ranking</InputLabel>
                        <Select
                            value={overallRatingMode}
                            onChange={(e) => setOverallRatingMode(e.target.value)}
                            label="Overall Ranking"
                        >
                            <MenuItem value="keep">Keep original ranking</MenuItem>
                            {COMPARISON_OPTIONS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Justification (mandatory if rating changed) */}
                    <Collapse in={overallRatingMode !== 'keep' && !noErrorsChecked}>
                        <TextField
                            label="Justification *"
                            placeholder="Provide justification for changing the rating..."
                            multiline
                            rows={2}
                            size="small"
                            value={overallJustification}
                            onChange={(e) => setOverallJustification(e.target.value)}
                            fullWidth
                            required
                            helperText={
                                overallJustification.trim().length < 8
                                    ? `Minimum 8 characters required (currently ${overallJustification.trim().length})`
                                    : `${overallJustification.trim().length} characters`
                            }
                            error={overallJustification.length > 0 && overallJustification.trim().length < 8}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '&:hover fieldset': {
                                        borderColor: (overallJustification.length > 0 && overallJustification.trim().length < 8) ? theme.palette.error.main : '#AD46FF',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: (overallJustification.length > 0 && overallJustification.trim().length < 8) ? theme.palette.error.main : '#AD46FF',
                                    },
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                    color: (overallJustification.length > 0 && overallJustification.trim().length < 8) ? theme.palette.error.main : '#AD46FF',
                                },
                            }}
                        />
                    </Collapse>
                </CardContent>
            </Card>

            {/* Submit Button */}
            <Card
                sx={{
                    mb: 2,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                        Review Actions
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            size="medium"
                            onClick={() => handleSubmitReview('reject')}
                            disabled={submitting}
                            sx={{
                                px: 3,
                                py: 1,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                backgroundColor: '#D4183D',
                                color: '#fff',
                                '&:hover': {
                                    backgroundColor: '#B01533',
                                },
                                '&.Mui-disabled': {
                                    backgroundColor: alpha('#D4183D', 0.5),
                                    color: '#fff',
                                },
                            }}
                        >
                            Reject & Remove from Queue
                        </Button>
                        <Button
                            variant="contained"
                            size="medium"
                            onClick={() => handleSubmitReview('reassign')}
                            disabled={submitting}
                            sx={{
                                px: 3,
                                py: 1,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                backgroundColor: '#FF6900',
                                color: '#fff',
                                '&:hover': {
                                    backgroundColor: '#E05E00',
                                },
                                '&.Mui-disabled': {
                                    backgroundColor: alpha('#FF6900', 0.5),
                                    color: '#fff',
                                },
                            }}
                        >
                            Re-assign to Previous Step
                        </Button>
                        <Button
                            variant="contained"
                            size="medium"
                            onClick={() => handleSubmitReview('approve')}
                            disabled={!canSubmit || submitting}
                            endIcon={
                                submitting ? (
                                    <CircularProgress size={18} color="inherit" />
                                ) : (
                                    <SendIcon sx={{ fontSize: 18 }} />
                                )
                            }
                            sx={{
                                px: 3,
                                py: 1,
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                backgroundColor: '#00A63E',
                                color: '#fff',
                                '&:hover': {
                                    backgroundColor: '#008C34',
                                },
                                '&.Mui-disabled': {
                                    backgroundColor: alpha('#00A63E', 0.5),
                                    color: '#fff',
                                },
                            }}
                        >
                            {submitting ? 'Submitting...' : 'Final Submit'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* No Tasks Dialog */}
            <Dialog open={showNoTasksDialog} onClose={handleNoTasksDialogClose}>
                <DialogTitle>No Tasks Available</DialogTitle>
                <DialogContent>
                    <Typography>
                        There are no tasks available for review in this project at the moment. Please check back later.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleNoTasksDialogClose} variant="contained">
                        Go Back
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ReviewPage;
