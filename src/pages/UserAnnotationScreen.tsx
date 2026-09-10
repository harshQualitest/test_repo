import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Button,
    Rating,
    alpha,
    useTheme,
    Chip,
    Paper,
    Fade,
    TextField,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import TaskTimer from '../components/common/TaskTimer';
import { TaskExpiryWarningDialog, TaskExpiredDialog } from '../components/common/TaskTimeoutDialogs';
import AnnotationStepper from '../components/annotation/llm-grading/AnnotationStepper';
import InstructionsBanner from '../components/annotation/llm-grading/InstructionsBanner';
import NoTasksDialog from '../components/annotation/llm-grading/NoTasksDialog';
import ComparisonScreen from '../components/annotation/llm-grading/ComparisonScreen';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
    fetchProjectTaskUsers,
    submitAnnotation,
    selectUserAnnotationTasks,
    selectUserAnnotationLoading,
    selectUserAnnotationError,
    selectUserAnnotationSubmitting,
    selectNoTasksAvailable,
    clearTasks,
    setNoTasksAvailable,
    resetAnnotationState,
} from '../redux/slices/userAnnotationSlice';
import { RATING_CATEGORIES } from '../constants/staticThings';
import { ANNOTATION_TEMPLATE_MAP } from '../components/annotation/annotationTemplateMap';
import type { AppDispatch } from '../redux/store';

/** Fetches tasks on mount if not already fetched (side-effect extracted for testability). */
const setupTaskFetch = (
    projectId: string | undefined,
    hasFetched: MutableRefObject<boolean>,
    dispatch: AppDispatch,
): void => {
    if (projectId && !hasFetched.current) {
        hasFetched.current = true;
        dispatch(fetchProjectTaskUsers(projectId));
    }
};

/** Shows no-tasks dialog when the slice signals no tasks remain. */
const handleNoTasksChange = (
    noTasksAvailable: boolean,
    setShowNoTasksDialog: (v: boolean) => void,
): void => {
    if (noTasksAvailable) setShowNoTasksDialog(true);
};

/** Initialises the task timer on first task load. */
const handleTasksChange = (
    tasks: unknown,
    taskId: string | undefined,
    taskStartTime: number | null,
    setTaskStartTime: (v: number | null) => void,
    warningShown: MutableRefObject<boolean>,
): void => {
    if (!tasks) return;
    if (taskId && !taskStartTime) {
        setTaskStartTime(Date.now());
        warningShown.current = false;
    }
};

/** Shows timer-expiry warning once, guarded by refs to prevent double-trigger. */
const triggerTimerWarning = (
    showExpiredDialog: boolean,
    warningShown: MutableRefObject<boolean>,
    setShowExpiryWarningDialog: (v: boolean) => void,
): void => {
    if (!showExpiredDialog && !warningShown.current) {
        warningShown.current = true;
        setShowExpiryWarningDialog(true);
    }
};

/** Moves to the next annotation step after the slide-out animation. */
const advanceAnnotationStep = (
    currentStep: number,
    setCurrentStep: (s: number) => void,
    setIsResponseExpanded: (v: boolean) => void,
    setSlideIn: (v: boolean) => void,
): void => {
    setCurrentStep(currentStep === 0 ? 1 : 3);
    if (currentStep === 0) setIsResponseExpanded(false);
    setSlideIn(true);
};

/** Submits annotation, resets form, then fetches the next task. */
const performAnnotationSubmit = async (
    projectId: string,
    taskId: string,
    annotationData: ReturnType<typeof buildAnnotationPayload>,
    dispatch: AppDispatch,
    resetFn: () => void,
    hasFetchedRef: MutableRefObject<boolean>,
): Promise<void> => {
    try {
        await dispatch(submitAnnotation({ projectId, taskId, data: annotationData })).unwrap();
        resetFn();
        hasFetchedRef.current = false;
        dispatch(setNoTasksAvailable(false));
        await dispatch(fetchProjectTaskUsers(projectId)).unwrap().catch((e) => {
            console.error('No more tasks available:', e);
        });
    } catch (e) {
        console.error('Failed to submit annotation:', e);
    }
};

/** Resets form state then fetches next task after the current task expires. */
const fetchNextAfterExpiry = async (
    projectId: string,
    dispatch: AppDispatch,
    resetFn: () => void,
    hasFetchedRef: MutableRefObject<boolean>,
    setShowNoTasksDialog: (v: boolean) => void,
): Promise<void> => {
    resetFn();
    hasFetchedRef.current = false;
    dispatch(setNoTasksAvailable(false));
    await dispatch(fetchProjectTaskUsers(projectId)).unwrap().catch((e) => {
        console.error('No more tasks available:', e);
        setShowNoTasksDialog(true);
    });
};

/** Formats seconds into a MM:SS display string. */
const formatTimeoutDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/** Returns true when every rating value is greater than zero. */
const areAllRatingsFilled = (ratings: Record<string, number>): boolean =>
    Object.values(ratings).every((r) => r > 0);

/** Computes remaining seconds, accounting for time elapsed since the task started. */
const getRemainingTime = (
    taskTimeout: number | undefined,
    taskStartTime: number | null,
): number | undefined => {
    if (typeof taskTimeout !== 'number' || taskTimeout <= 0 || !taskStartTime) return taskTimeout;
    const elapsedSeconds = Math.floor((Date.now() - taskStartTime) / 1000);
    const remaining = taskTimeout - elapsedSeconds;
    return remaining > 0 ? remaining : 0;
};

/** Builds the annotation data payload for submission. */
const buildAnnotationPayload = (
    llm1Ratings: Record<string, number>,
    llm2Ratings: Record<string, number>,
    llm1Comment: string,
    llm2Comment: string,
    curateComments: string,
    comparisonSelection: string,
    rankingJustification: string,
) => ({
    status: 'annotated' as const,
    llm1: { ...llm1Ratings, comment: llm1Comment || undefined },
    llm2: { ...llm2Ratings, comment: llm2Comment || undefined },
    curateComments: curateComments || undefined,
    comparisonSelection: comparisonSelection || undefined,
    rankingJustification: rankingJustification || undefined,
});

// Initial ratings state
const getInitialRatings = () => {
    return RATING_CATEGORIES.reduce((acc, cat) => {
        acc[cat.key] = 0;
        return acc;
    }, {} as Record<string, number>);
};

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
    task_id: string;
}

// Interface for location state
interface LocationState {
    task_timeout?: number;
    instructions?: { url?: string };
    template_type?: string;
}

/**
 * Component: UserAnnotationScreen
 *
 * Purpose: Interactive annotation screen where an annotator rates LLM1 and
 * LLM2 responses to a prompt, then compares the two responses, and submits
 * the resulting annotation. Includes a per-task countdown timer with
 * warning/expiry dialogs, and gracefully handles the "no tasks left" case.
 *
 * Responsibilities:
 * - Fetches the next available task for the project on mount.
 * - Walks the annotator through 4 steps: rate LLM1, rate LLM2, comparison
 *   screen, and a completion screen, via `currentStep`.
 * - Tracks elapsed time against an optional `task_timeout` (passed via
 *   navigation state) and shows warning/expired dialogs as it runs down.
 * - Submits the annotation payload and fetches the next task afterward.
 * - Delegates to a template component (`ANNOTATION_TEMPLATE_MAP`) for
 *   non-LLM template types instead of rendering the LLM-grading UI.
 *
 * Props: none (route component).
 *
 * State: see the inline comments below for each `useState` — step/slide
 * animation state, per-LLM ratings/comments, comparison selection and
 * justification, dialog visibility flags, and task-timer bookkeeping.
 *
 * Redux (userAnnotationSlice): `selectUserAnnotationTasks`, `selectUserAnnotationLoading`,
 * `selectUserAnnotationError`, `selectUserAnnotationSubmitting`, `selectNoTasksAvailable`
 * selectors; `fetchProjectTaskUsers`, `submitAnnotation` thunks; `clearTasks`,
 * `setNoTasksAvailable`, `resetAnnotationState` actions.
 *
 * Major child components: `TaskTimer`, `TaskExpiryWarningDialog`, `TaskExpiredDialog`,
 * `AnnotationStepper`, `InstructionsBanner`, `NoTasksDialog`, `ComparisonScreen`,
 * `ANNOTATION_TEMPLATE_MAP[templateType]` (non-LLM templates).
 *
 * Side effects: see the `useEffect`s below — fetching tasks on mount (with
 * cleanup to reset annotation state), showing the no-tasks dialog, and
 * initializing the task timer's start time.
 *
 * Business rules: submission is only enabled once every rating category has
 * a value greater than 0 (`areAllRatingsFilled`); the remaining timer value
 * accounts for time already elapsed since the task was first shown
 * (`getRemainingTime`) so it survives step navigation.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const UserAnnotationScreen = () => {
    const theme = useTheme();
    const { projectId } = useParams<{ projectId: string }>();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    // Get task_timeout and instructions from navigation state
    const locationState = location.state as LocationState | null;
    // Parse task_timeout as number, fallback to undefined if not valid
    const rawTimeout = locationState?.task_timeout;
    const taskTimeout =
        rawTimeout !== undefined && rawTimeout !== null && !Number.isNaN(Number(rawTimeout)) ? Number(rawTimeout) : undefined;
        
    // Debug: Log location state to verify task_timeout is being received
    useEffect(() => {}, [locationState, rawTimeout, taskTimeout]);

    // Ref to track if API has been called (prevents double call in Strict Mode)
    const hasFetched = useRef(false);
    
    // Ref to track if warning has been shown (prevents multiple triggers)
    const warningShown = useRef(false);

    // Current step: 0 = Response A, 1 = Response B, 2 = Complete
    const [currentStep, setCurrentStep] = useState(0);

    // Slide direction for animation
    const [slideIn, setSlideIn] = useState(true);

    // Rating states for both LLMs
    const [llm1Ratings, setLlm1Ratings] = useState<Record<string, number>>(getInitialRatings());
    const [llm2Ratings, setLlm2Ratings] = useState<Record<string, number>>(getInitialRatings());

    // Single comment state for each LLM response
    const [llm1Comment, setLlm1Comment] = useState<string>('');
    const [llm2Comment, setLlm2Comment] = useState<string>('');

    // Curate/comments state
    const [curateComments, setCurateComments] = useState('');

    // Comparison selection state
    const [comparisonSelection, setComparisonSelection] = useState('');

    // Ranking Justification for LLM rating
    const [rankingJustification, setRankingJustification] = useState('');

    // Dialog state for no tasks available
    const [showNoTasksDialog, setShowNoTasksDialog] = useState(false);

    // Timer warning and expiry dialog states
    const [showExpiryWarningDialog, setShowExpiryWarningDialog] = useState(false);
    const [showExpiredDialog, setShowExpiredDialog] = useState(false);

    // State for expanded response text
    const [isResponseExpanded, setIsResponseExpanded] = useState(false);

    // Track task start time to calculate remaining time across steps
    const [taskStartTime, setTaskStartTime] = useState<number | null>(null);

    // Selectors
    const tasks = useAppSelector(selectUserAnnotationTasks);
    const loading = useAppSelector(selectUserAnnotationLoading);
    const error = useAppSelector(selectUserAnnotationError);
    const submitting = useAppSelector(selectUserAnnotationSubmitting);
    const noTasksAvailable = useAppSelector(selectNoTasksAvailable);

    // Get the current task data
    const currentTask: TaskData | null = tasks && tasks.length > 0 ? tasks[0] : (tasks as unknown as TaskData);
    console.log('Current Task:', currentTask);

    // Get current LLM data based on step
    const currentResponse = currentStep === 0 ? currentTask?.llm1 : currentTask?.llm2;
    const currentRatings = currentStep === 0 ? llm1Ratings : llm2Ratings;
    const currentComment = currentStep === 0 ? llm1Comment : llm2Comment;
    const setCurrentComment = currentStep === 0 ? setLlm1Comment : setLlm2Comment;
    const currentLabel = currentStep === 0 ? 'LLM1' : 'LLM2';
    const currentColor = currentStep === 0 ? theme.palette.primary.main : theme.palette.secondary.main;

    // Fetch tasks on mount - only once
    useEffect(() => {
        setupTaskFetch(projectId, hasFetched, dispatch);
        return () => {
            dispatch(clearTasks());
            dispatch(resetAnnotationState());
        };
    }, [dispatch, projectId]);

    // Handle no tasks available - show dialog instead of navigating back
    useEffect(() => {
        handleNoTasksChange(noTasksAvailable, setShowNoTasksDialog);
    }, [noTasksAvailable]);

    // Set start time when new task arrives
    useEffect(() => {
        handleTasksChange(tasks, currentTask?._id, taskStartTime, setTaskStartTime, warningShown);
    }, [tasks, currentTask?._id]);

    /**
     * Updates a single rating category for whichever LLM is currently active
     * (LLM1 on step 0, LLM2 on step 1). Triggered by that category's star Rating control.
     */
    const handleRatingChange = (category: string, value: number | null) => {
        const setter = currentStep === 0 ? setLlm1Ratings : setLlm2Ratings;
        setter((prev) => ({ ...prev, [category]: value || 0 }));
    };

    /**
     * Triggered by the "Continue"/"Proceed" button. Plays the slide-out
     * animation, then advances the step (LLM1 -> LLM2 -> comparison) once
     * the animation has had time to finish.
     */
    const handleSubmit = () => {
        setSlideIn(false);
        setTimeout(() => advanceAnnotationStep(currentStep, setCurrentStep, setIsResponseExpanded, setSlideIn), 300);
    };

    // Shared reset helper — clears all form state between tasks
    const resetTaskFormState = () => {
        setLlm1Ratings(getInitialRatings());
        setLlm2Ratings(getInitialRatings());
        setLlm1Comment('');
        setLlm2Comment('');
        setCurateComments('');
        setComparisonSelection('');
        setRankingJustification('');
        setCurrentStep(0);
        setSlideIn(true);
        setIsResponseExpanded(false);
        setTaskStartTime(null);
        warningShown.current = false;
    };

    /**
     * Triggered by the "Submit & Continue" button on the completion screen.
     * Builds the annotation payload from all collected ratings/comments and
     * submits it via `performAnnotationSubmit`, which also resets the form
     * and fetches the next task.
     */
    const handleComplete = async () => {
        if (!projectId || !currentTask?._id) { console.error('Missing projectId or taskId'); return; }
        const annotationData = buildAnnotationPayload(
            llm1Ratings, llm2Ratings, llm1Comment, llm2Comment,
            curateComments, comparisonSelection, rankingJustification,
        );
        await performAnnotationSubmit(projectId, currentTask._id, annotationData, dispatch, resetTaskFormState, hasFetched);
    };

    /** Closes the no-tasks dialog, clears the flag in Redux, and navigates back. */
    const handleNoTasksDialogClose = () => {
        setShowNoTasksDialog(false);
        dispatch(setNoTasksAvailable(false));
        navigate(-1);
    };

    /** Fired by `TaskTimer` when 2 minutes remain; shows the warning dialog once per task. */
    const handleTimerWarning = () => triggerTimerWarning(showExpiredDialog, warningShown, setShowExpiryWarningDialog);

    /** Dismisses the expiry-warning dialog without affecting the timer. */
    const handleWarningDialogClose = () => setShowExpiryWarningDialog(false);

    /** Fired by `TaskTimer` when the countdown reaches zero; swaps the warning dialog for the expired dialog. */
    const handleTimerExpiry = () => {
        setShowExpiryWarningDialog(false);
        setShowExpiredDialog(true);
        warningShown.current = false;
    };

    /**
     * Triggered by the "Continue" action on the expired-task dialog. Resets
     * the form and fetches the next task (showing the no-tasks dialog if
     * none remain).
     */
    const handleExpiredContinue = async () => {
        setShowExpiredDialog(false);
        setShowExpiryWarningDialog(false);
        await fetchNextAfterExpiry(projectId!, dispatch, resetTaskFormState, hasFetched, setShowNoTasksDialog);
    };



    const templateType = locationState?.template_type;
    const MappedTemplate = templateType ? ANNOTATION_TEMPLATE_MAP[templateType] : null;

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
                    {submitting ? 'Submitting annotation...' : 'Loading task...'}
                </Typography>
            </Box>
        );
    }

    // Error state
    const isNonCriticalError = error && !error.includes('404') && !noTasksAvailable;
    if (isNonCriticalError) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <Alert severity="error" sx={{ maxWidth: 600 }}>
                    {error}
                </Alert>
            </Box>
        );
    }

    // Non-LLM templates: render their component once task data is loaded
    if (MappedTemplate && currentTask) {
        return <MappedTemplate instructionsUrl={locationState?.instructions?.url} task={currentTask} />;
    }

    // No task prompt: either show "no data" or the no-tasks dialog
    if (!currentTask?.prompt) {
        return noTasksAvailable ? (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 'auto',
                    gap: 2,
                    px: 2,
                    py: 2,
                }}
            >
                <NoTasksDialog open={showNoTasksDialog} onClose={handleNoTasksDialogClose} />
            </Box>
        ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <Alert severity="info" sx={{ maxWidth: 600 }}>
                    No task data available.
                </Alert>
            </Box>
        );
    }

    // Comparison screen
    if (currentStep === 3) {
        return (
            <Box
                sx={{
                    width: '100%',
                    minHeight: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    py: 2,
                    px: 2,
                    backgroundColor: alpha(theme.palette.background.default, 0.5),
                }}
            >
                <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
                    {/* Title */}
                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography
                            variant="h5"
                            fontWeight={800}
                            sx={{
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                letterSpacing: '-0.5px',
                            }}
                        >
                            LLM Annotation | {currentTask?.task_id}
                        </Typography>
                        {typeof taskTimeout === 'number' && taskTimeout > 0 && taskStartTime && (
                            <TaskTimer
                                key={currentTask?._id}
                                timeoutSeconds={getRemainingTime(taskTimeout, taskStartTime) ?? taskTimeout}
                                onTimeout={handleTimerExpiry}
                                onWarning={handleTimerWarning}
                                warningThreshold={120}
                                size="medium"
                                variant="chip"
                            />
                        )}
                    </Box>

                    <InstructionsBanner instructionsUrl={locationState?.instructions?.url} />
                    <AnnotationStepper currentStep={currentStep} />

                    <ComparisonScreen
                        prompt={currentTask?.prompt || ''}
                        llm1Response={currentTask?.llm1 || ''}
                        llm2Response={currentTask?.llm2 || ''}
                        llm1Ratings={llm1Ratings}
                        llm2Ratings={llm2Ratings}
                        llm1Comment={llm1Comment}
                        llm2Comment={llm2Comment}
                        comparisonSelection={comparisonSelection}
                        rankingJustification={rankingJustification}
                        onComparisonChange={setComparisonSelection}
                        onJustificationChange={setRankingJustification}
                        onBack={() => setCurrentStep(1)}
                        onSubmit={handleComplete}
                        submitting={submitting}
                    />
                </Box>

                {/* Timer Warning Dialog - 2 minutes remaining */}
                <TaskExpiryWarningDialog
                    open={showExpiryWarningDialog}
                    onClose={handleWarningDialogClose}
                    remainingMinutes={2}
                />

                {/* Timer Expired Dialog */}
                <TaskExpiredDialog
                    open={showExpiredDialog}
                    onContinue={handleExpiredContinue}
                    timeoutDuration={taskTimeout ? formatTimeoutDuration(taskTimeout) : '10:00'}
                />
            </Box>
        );
    }

    // Completion screen
    if (currentStep === 2) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 'auto',
                    gap: 2,
                    px: 2,
                    py: 2,
                }}
            >
                <Box
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        backgroundColor: alpha(theme.palette.success.main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <CheckCircleIcon sx={{ fontSize: 48, color: theme.palette.success.main }} />
                </Box>
                <Typography variant="h5" fontWeight={700} textAlign="center">
                    Annotation Complete!
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={350}>
                    You have successfully rated both responses. Click below to submit and continue to the next task.
                </Typography>
                <Button
                    variant="contained"
                    color="success"
                    size="medium"
                    endIcon={
                        submitting ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : (
                            <NavigateNextIcon sx={{ fontWeight: 700 }} />
                        )
                    }
                    onClick={handleComplete}
                    disabled={submitting}
                    sx={{
                        px: 6,
                        py: 1.5,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: 'white',
                        background: `linear-gradient(135deg, ${theme.palette.success.main}, ${alpha(
                            theme.palette.success.main,
                            0.85,
                        )})`,
                        boxShadow: `0 6px 24px ${alpha(theme.palette.success.main, 0.3)}`,
                        transition: 'all 0.3s ease',
                        mt: 2,
                        '&:hover': {
                            color: 'white',
                            background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.main})`,
                            boxShadow: `0 8px 32px ${alpha(theme.palette.success.main, 0.4)}`,
                            transform: 'translateY(-2px)',
                        },
                        '&:active': {
                            transform: 'translateY(0px)',
                            boxShadow: `0 4px 16px ${alpha(theme.palette.success.main, 0.3)}`,
                        },
                        '&:disabled': {
                            opacity: 0.5,
                            boxShadow: 'none',
                        },
                    }}
                >
                    {submitting ? 'Submitting...' : 'Submit & Continue'}
                </Button>

                <NoTasksDialog open={showNoTasksDialog} onClose={handleNoTasksDialogClose} isCompletion />
            </Box>
        );
    }

    // At this point, currentTask is guaranteed to have a prompt
    // TypeScript guard
    if (!currentTask) {
        return null;
    }

    return (
        <Box
            sx={{
                width: '100%',
                minHeight: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                py: 2,
                px: 2,
                backgroundColor: alpha(theme.palette.background.default, 0.5),
            }}
        >
            {/* Container */}
            <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
                {/* Title - LLM Grading */}
                <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography
                            variant="h5"
                            fontWeight={800}
                            sx={{
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                letterSpacing: '-0.5px',
                            }}
                        >
                            LLM Annotation | {currentTask?.task_id} 
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Rate and compare AI-generated responses
                        </Typography>
                    </Box>
                    {typeof taskTimeout === 'number' && taskTimeout > 0 && taskStartTime && (
                        <TaskTimer
                            key={currentTask?._id}
                            timeoutSeconds={getRemainingTime(taskTimeout, taskStartTime) ?? taskTimeout}
                            onTimeout={handleTimerExpiry}
                            onWarning={handleTimerWarning}
                            warningThreshold={120}
                            size="medium"
                            variant="chip"
                        />
                    )}
                </Box>

                <InstructionsBanner instructionsUrl={locationState?.instructions?.url} />

                <AnnotationStepper currentStep={currentStep} />

                {/* Animated Content Container */}
                <Fade in={slideIn} timeout={300}>
                    <Box>
                        {/* Prompt and LLM Response Side by Side */}
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'flex-start' }}>
                            {/* Prompt Section - Sticky */}
                            <Card
                                sx={{
                                    width: 320,
                                    minWidth: 320,
                                    maxWidth: 320,
                                    borderRadius: 2,
                                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                                    background: `linear-gradient(135deg, ${alpha(
                                        theme.palette.info.main,
                                        0.08,
                                    )} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
                                    boxShadow: `0 2px 8px ${alpha(theme.palette.info.main, 0.08)}`,
                                    transition: 'all 0.3s ease',
                                    position: 'sticky',
                                    top: 16,
                                    alignSelf: 'flex-start',
                                    '&:hover': {
                                        boxShadow: `0 4px 16px ${alpha(theme.palette.info.main, 0.12)}`,
                                    },
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
                                            mt: 0.75,
                                            fontWeight: 500,
                                            lineHeight: 1.6,
                                            color: theme.palette.text.primary,
                                        }}
                                    >
                                        {currentTask.prompt}
                                    </Typography>
                                </CardContent>
                            </Card>

                            {/* LLM Response Block */}
                            <Card
                                sx={{
                                    flex: 1,
                                    borderRadius: 2,
                                    border: `1px solid ${alpha(currentColor, 0.2)}`,
                                    overflow: 'hidden',
                                    background: `linear-gradient(135deg, ${alpha(currentColor, 0.06)} 0%, ${alpha(
                                        currentColor,
                                        0.01,
                                    )} 100%)`,
                                    boxShadow: `0 2px 12px ${alpha(currentColor, 0.1)}`,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        boxShadow: `0 4px 20px ${alpha(currentColor, 0.15)}`,
                                    },
                                }}
                            >
                                <Box
                                    sx={{
                                        height: 3,
                                        background: `linear-gradient(90deg, ${currentColor} 0%, ${alpha(
                                            currentColor,
                                            0.6,
                                        )} 100%)`,
                                    }}
                                />
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                                        <Chip
                                            label={currentLabel}
                                            size="small"
                                            sx={{
                                                height: 20,
                                                backgroundColor: alpha(currentColor, 0.15),
                                                color: currentColor,
                                                fontWeight: 700,
                                                fontSize: '0.65rem',
                                                borderRadius: 1.5,
                                            }}
                                        />
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ fontWeight: 500, fontSize: '0.65rem' }}
                                        >
                                            ✨ AI Generated
                                        </Typography>
                                    </Box>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 1.5,
                                            backgroundColor: alpha(currentColor, 0.03),
                                            borderRadius: 1.5,
                                            border: `1px solid ${alpha(currentColor, 0.1)}`,
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                lineHeight: 1.6,
                                                color: theme.palette.text.primary,
                                                fontWeight: 400,
                                            }}
                                        >
                                            {currentResponse && currentResponse.length > 200 && !isResponseExpanded
                                                ? `${currentResponse.substring(0, 200)}...`
                                                : currentResponse}
                                        </Typography>
                                        {currentResponse && currentResponse.length > 200 && (
                                            <Button
                                                size="small"
                                                onClick={() => setIsResponseExpanded(!isResponseExpanded)}
                                                endIcon={
                                                    isResponseExpanded ? (
                                                        <ExpandLessIcon sx={{ fontSize: 16 }} />
                                                    ) : (
                                                        <ExpandMoreIcon sx={{ fontSize: 16 }} />
                                                    )
                                                }
                                                sx={{
                                                    mt: 1,
                                                    p: 0,
                                                    minWidth: 'auto',
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    fontSize: '0.75rem',
                                                    color: currentColor,
                                                    '&:hover': {
                                                        backgroundColor: 'transparent',
                                                        textDecoration: 'underline',
                                                    },
                                                }}
                                            >
                                                {isResponseExpanded ? 'Show Less' : 'Show More'}
                                            </Button>
                                        )}
                                    </Paper>
                                </CardContent>
                            </Card>
                        </Box>

                        {/* Annotation / Grading Block */}
                        <Card
                            sx={{
                                borderRadius: 2,
                                border: `1px solid ${alpha(currentColor, 0.2)}`,
                                mb: 1.5,
                                background: `linear-gradient(180deg, ${alpha(
                                    currentColor,
                                    0.04,
                                )} 0%, transparent 100%)`,
                                boxShadow: `0 2px 10px ${alpha(currentColor, 0.08)}`,
                                transition: 'all 0.3s ease',
                            }}
                        >
                            <CardContent sx={{ p: 1.5 }}>
                                {/* Grading Header */}
                                <Box sx={{ textAlign: 'left', mb: 1 }}>
                                    <Chip
                                        label="Rate Each Category"
                                        size="small"
                                        sx={{
                                            height: 22,
                                            backgroundColor: alpha(currentColor, 0.15),
                                            color: currentColor,
                                            fontWeight: 700,
                                            fontSize: '0.7rem',
                                            borderRadius: 1.5,
                                            mb: 0.5,
                                        }}
                                    />
                                    {/* <Typography variant="caption" color="text.secondary">
                                        Provide feedback on 1-5 scale
                                    </Typography> */}
                                </Box>

                                {/* Rating Categories - 2 Column Grid */}
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: 1,
                                    }}
                                >
                                    {RATING_CATEGORIES.map((category) => (
                                        <Box
                                            key={category.key}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                p: 1,
                                                borderRadius: 1.5,
                                                backgroundColor: alpha(currentColor, 0.02),
                                                border: `1px solid ${alpha(currentColor, 0.1)}`,
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    borderColor: currentColor,
                                                    backgroundColor: alpha(currentColor, 0.05),
                                                },
                                            }}
                                        >
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography
                                                    variant="caption"
                                                    fontWeight={600}
                                                    sx={{
                                                        color: theme.palette.text.primary,
                                                        display: 'block',
                                                        mb: -0.75,
                                                    }}
                                                >
                                                    {category.label}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}
                                                >
                                                    {category.description}
                                                </Typography>
                                            </Box>
                                            <Rating
                                                value={currentRatings[category.key]}
                                                onChange={(_, value) => handleRatingChange(category.key, value)}
                                                size="small"
                                                icon={
                                                    <StarIcon
                                                        sx={{ color: currentColor, fontSize: 18 }}
                                                        fontSize="inherit"
                                                    />
                                                }
                                                emptyIcon={
                                                    <StarIcon
                                                        sx={{ opacity: 0.2, color: currentColor, fontSize: 18 }}
                                                        fontSize="inherit"
                                                    />
                                                }
                                            />
                                        </Box>
                                    ))}
                                </Box>

                                {/* Single Comment Field */}
                                <Box sx={{ mt: 1.5 }}>
                                    <Typography
                                        variant="caption"
                                        fontWeight={600}
                                        sx={{ mb: 0.5, display: 'block', color: theme.palette.text.primary }}
                                    >
                                        Additional Comments (Optional)
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={2}
                                        size="small"
                                        placeholder={`Add any additional comments for ${currentLabel}...`}
                                        value={currentComment}
                                        onChange={(e) => setCurrentComment(e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                fontSize: '0.8rem',
                                                backgroundColor: alpha(theme.palette.background.paper, 0.8),
                                                '& fieldset': {
                                                    borderColor: alpha(currentColor, 0.2),
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: alpha(currentColor, 0.4),
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: currentColor,
                                                },
                                            },
                                        }}
                                    />
                                </Box>
                            </CardContent>
                        </Card>

                        {/* Continue Button - Only on Response A */}
                        {currentStep === 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                                <Button
                                    variant="contained"
                                    size="medium"
                                    endIcon={<NavigateNextIcon />}
                                    onClick={handleSubmit}
                                    disabled={!areAllRatingsFilled(currentRatings)}
                                    sx={{
                                        px: 3,
                                        py: 1,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        color: '#ffffff',
                                        background: `linear-gradient(135deg, ${currentColor}, ${alpha(
                                            currentColor,
                                            0.85,
                                        )})`,
                                        boxShadow: `0 4px 16px ${alpha(currentColor, 0.3)}`,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            background: `linear-gradient(135deg, ${currentColor}, ${currentColor})`,
                                            boxShadow: `0 6px 20px ${alpha(currentColor, 0.4)}`,
                                            transform: 'translateY(-1px)',
                                            color: '#ffffff',
                                        },
                                        '&:active': {
                                            transform: 'translateY(0px)',
                                            boxShadow: `0 2px 10px ${alpha(currentColor, 0.25)}`,
                                        },
                                        '&.Mui-disabled': {
                                            opacity: 0.5,
                                            boxShadow: 'none',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                            background: alpha(currentColor, 0.5),
                                        },
                                    }}
                                >
                                    Continue to LLM2 Response
                                </Button>
                            </Box>
                        )}

                        {/* Proceed to Rating Button - Only on Response B */}
                        {currentStep === 1 && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                                <Button
                                    variant="contained"
                                    size="medium"
                                    endIcon={<NavigateNextIcon />}
                                    onClick={handleSubmit}
                                    disabled={!areAllRatingsFilled(currentRatings)}
                                    sx={{
                                        px: 3,
                                        py: 1,
                                        borderRadius: 2,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        color: '#ffffff',
                                        background: `linear-gradient(135deg, ${currentColor}, ${alpha(
                                            currentColor,
                                            0.85,
                                        )})`,
                                        boxShadow: `0 4px 16px ${alpha(currentColor, 0.3)}`,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            background: `linear-gradient(135deg, ${currentColor}, ${currentColor})`,
                                            boxShadow: `0 6px 20px ${alpha(currentColor, 0.4)}`,
                                            transform: 'translateY(-1px)',
                                            color: '#ffffff',
                                        },
                                        '&:active': {
                                            transform: 'translateY(0px)',
                                            boxShadow: `0 2px 10px ${alpha(currentColor, 0.25)}`,
                                        },
                                        '&.Mui-disabled': {
                                            opacity: 0.5,
                                            boxShadow: 'none',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                            background: alpha(currentColor, 0.5),
                                        },
                                    }}
                                >
                                    Proceed to Ranking
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Fade>
            </Box>

            <NoTasksDialog open={showNoTasksDialog} onClose={handleNoTasksDialogClose} />

            {/* Timer Warning Dialog - 2 minutes remaining */}
            <TaskExpiryWarningDialog
                open={showExpiryWarningDialog}
                onClose={handleWarningDialogClose}
                remainingMinutes={2}
            />

            {/* Timer Expired Dialog */}
            <TaskExpiredDialog
                open={showExpiredDialog}
                onContinue={handleExpiredContinue}
                timeoutDuration={taskTimeout ? formatTimeoutDuration(taskTimeout) : '10:00'}
            />
        </Box>
    );
};

export default UserAnnotationScreen;
