import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, LinearProgress, Paper, Typography, alpha, useTheme } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DatasetIcon from '@mui/icons-material/Dataset';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LayersIcon from '@mui/icons-material/Layers';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CheckIcon from '@mui/icons-material/Check';
import { useFormik } from 'formik';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
    fetchDataCollectionProjectById,
    updateDataCollectionProject,
    clearCurrentProject,
    clearUpdateState,
    selectDCCurrentProject,
    selectDCCurrentProjectLoading,
    selectDCCurrentProjectError,
    selectDCUpdateLoading,
    selectDCUpdateSuccess,
    selectDCUpdateError,
} from '../redux/slices/dataCollectionSlice';
import { withPageErrorBoundary } from '../utils/withPageErrorBoundary';
import { useToast } from '../hooks/useToast';
import type { IProjectFormState } from '../interfaces/api/dataCollection.interface';
import { DEFAULT_DEMOGRAPHIC_DATA } from '../interfaces/api/dataCollection.interface';
import { mapProjectToFormState } from '../utils/dataCollectionProjectMapper';
import BasicInfoStep from '../components/data-collection/steps/BasicInfoStep';
import PhaseConfigStep from '../components/data-collection/steps/PhaseConfigStep';
import DemographicStep from '../components/data-collection/steps/DemographicStep';
import UserAssignmentStep from '../components/data-collection/steps/UserAssignmentStep';
import ReviewStep from '../components/data-collection/steps/ReviewStep';
import { fullSchema } from '../components/data-collection/steps/schema';

interface WorkspaceRouteState {
    fromWorkspace?: boolean;
    workspaceId?: string;
    workspaceName?: string;
}

const STEPS = [
    { label: 'Basic Info', desc: 'Name, dates & target', Icon: InfoOutlinedIcon, color: '#1565c0' },
    { label: 'Phase Config', desc: 'View-only', Icon: LayersIcon, color: '#6a1b9a' },
    { label: 'Demographics', desc: 'Target demographics', Icon: GroupsIcon, color: '#2e7d32' },
    { label: 'Users', desc: 'Assign uploaders', Icon: PersonAddAlt1Icon, color: '#bf360c' },
    { label: 'Review', desc: 'Confirm & save', Icon: FactCheckIcon, color: '#00695c' },
];

const EMPTY_FORM_VALUES: IProjectFormState = {
    name: '',
    project_type: 'collection',
    description: '',
    target: '',
    startDate: '',
    endDate: '',
    instruction: '',
    users: ['All'],
    allUsers: true,
    phases: { phase_1: [] },
    phase_targets: {},
    demographic_data: DEFAULT_DEMOGRAPHIC_DATA,
    initial_scene: '',
    action_template: '',
};

/**
 * Component: DataCollectionProjectEdit
 *
 * Purpose: Multi-step wizard page for editing an existing data-collection
 * project (Basic Info → Phase Config [view-only] → Demographics → Users → Review).
 *
 * Responsibilities:
 * - Load the project by `projectId` and map it into Formik's initial values.
 * - Drive the same 5-step wizard shape as the create page, but with the Phase
 *   Config step rendered read-only (phases can't be restructured post-creation).
 * - Submit updates via `updateDataCollectionProject` and redirect on success.
 *
 * Props: none (reads `projectId` from the route and optional workspace nav state).
 *
 * State: `currentStep` — index (0-4) of the active wizard step.
 *
 * Redux (slice: dataCollectionSlice):
 * - Selectors: `selectDCCurrentProject`, `selectDCCurrentProjectLoading`,
 *   `selectDCCurrentProjectError`, `selectDCUpdateLoading`, `selectDCUpdateSuccess`, `selectDCUpdateError`.
 * - Thunks/actions dispatched: `fetchDataCollectionProjectById`, `updateDataCollectionProject`,
 *   `clearCurrentProject`, `clearUpdateState`.
 *
 * Custom hooks: `useToast` (`showSuccess`), `useFormik`.
 *
 * Major child components: `BasicInfoStep`, `PhaseConfigStep` (readOnly), `DemographicStep`,
 * `UserAssignmentStep`, `ReviewStep` (mode="edit").
 *
 * Side effects: see the two `useEffect` hooks below (project load + cleanup, success redirect).
 *
 * Business logic: Step 0's required fields must pass validation before `goNext`
 * allows advancing past Basic Info, mirroring the create wizard's manual gating.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const DataCollectionProjectEdit = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { showSuccess } = useToast();
    const theme = useTheme();

    const workspaceState = (location.state ?? {}) as WorkspaceRouteState;
    const backPath =
        workspaceState.fromWorkspace && workspaceState.workspaceId
            ? `/workspace/${workspaceState.workspaceId}`
            : '/data-collection/projects';
    const backLabel =
        workspaceState.fromWorkspace && workspaceState.workspaceName ? workspaceState.workspaceName : 'Projects';

    const currentProject = useAppSelector(selectDCCurrentProject);
    const currentProjectLoading = useAppSelector(selectDCCurrentProjectLoading);
    const currentProjectError = useAppSelector(selectDCCurrentProjectError);
    const updateLoading = useAppSelector(selectDCUpdateLoading);
    const updateSuccess = useAppSelector(selectDCUpdateSuccess);
    const updateError = useAppSelector(selectDCUpdateError);

    const [currentStep, setCurrentStep] = useState(0);

    // Loads the project to edit whenever `projectId` changes. The cleanup
    // function clears the current-project and update state on unmount so a
    // stale project or update result doesn't leak into the next visit to this page.
    useEffect(() => {
        if (projectId) {
            dispatch(fetchDataCollectionProjectById(projectId));
        }
        return () => {
            dispatch(clearCurrentProject());
            dispatch(clearUpdateState());
        };
    }, [dispatch, projectId]);

    const formik = useFormik<IProjectFormState>({
        initialValues: currentProject ? mapProjectToFormState(currentProject) : EMPTY_FORM_VALUES,
        validationSchema: fullSchema,
        enableReinitialize: true,
        validateOnChange: false,
        validateOnBlur: true,
        onSubmit: (vals) => {
            if (!projectId) return;
            dispatch(
                updateDataCollectionProject({
                    project_id: projectId,
                    name: vals.name,
                    description: vals.description || undefined,
                    target: Number(vals.target),
                    start_date: vals.startDate,
                    end_date: vals.endDate,
                    instruction: vals.instruction,
                    users: vals.allUsers ? ['All'] : vals.users,
                    phases: vals.phases,
                    demographic_data: vals.demographic_data,
                    initial_scene: vals.initial_scene || undefined,
                    action_template: vals.action_template || undefined,
                }),
            );
        },
    });

    // Fires once the update thunk reports success: notifies the user, clears
    // update state, and navigates back to the workspace/projects list.
    useEffect(() => {
        if (updateSuccess) {
            showSuccess('Project updated successfully!');
            dispatch(clearUpdateState());
            navigate(backPath);
        }
    }, [updateSuccess, dispatch, navigate, showSuccess, backPath]);

    /**
     * Advances the wizard to the next step; step 0 (Basic Info) must first pass
     * validation on its required fields before the wizard allows moving on,
     * since Formik doesn't gate step navigation on its own.
     * Triggered by the "Continue" button in the footer.
     */
    const goNext = async () => {
        if (currentStep === 0) {
            const errors = await formik.validateForm();
            const step1Fields = ['name', 'project_type', 'startDate', 'endDate', 'instruction'];
            const hasStep1Error = step1Fields.some((f) => errors[f as keyof IProjectFormState]);
            if (hasStep1Error) {
                formik.setTouched(step1Fields.reduce<Record<string, boolean>>((acc, f) => ({ ...acc, [f]: true }), {}));
                return;
            }
        }
        setCurrentStep((s) => s + 1);
    };

    /** Moves the wizard back one step; bound to the "Back" button. */
    const goBack = () => setCurrentStep((s) => s - 1);

    /** Returns the form component for the current wizard step index. */
    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return <BasicInfoStep formik={formik} />;
            case 1:
                return <PhaseConfigStep formik={formik} readOnly />;
            case 2:
                return <DemographicStep formik={formik} />;
            case 3:
                return <UserAssignmentStep formik={formik} />;
            case 4:
                return <ReviewStep formik={formik} mode="edit" />;
            default:
                return null;
        }
    };

    const progressPct = Math.round(((currentStep + 1) / STEPS.length) * 100);
    const activeColor = STEPS[currentStep].color;

    if (currentProjectLoading || (!currentProject && !currentProjectError)) {
        return (
            <Box maxWidth={640} mx="auto" py={8} display="flex" flexDirection="column" alignItems="center" gap={2}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                    Loading project…
                </Typography>
            </Box>
        );
    }

    if (currentProjectError) {
        return (
            <Box maxWidth={640} mx="auto" py={3} px={2}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(backPath)}
                    size="small"
                    sx={{ mb: 2 }}
                >
                    {backLabel}
                </Button>
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                    <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
                        {currentProjectError}
                    </Alert>
                    <Typography variant="body2" color="text.secondary">
                        Could not load this project for editing.
                    </Typography>
                </Paper>
            </Box>
        );
    }

    return (
        <Box maxWidth={1060} mx="auto" py={3} px={{ xs: 1.5, sm: 2 }}>
            {/* Back nav */}
            <Button
                startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
                onClick={() => navigate(backPath)}
                size="small"
                sx={{ mb: 2, color: 'text.secondary', textTransform: 'none', fontWeight: 500 }}
            >
                {backLabel}
            </Button>

            {/* Mobile progress strip */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="caption" color="text.secondary">
                        Step {currentStep + 1} of {STEPS.length}
                    </Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ color: activeColor }}>
                        {STEPS[currentStep].label}
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={progressPct}
                    sx={{
                        height: 5,
                        borderRadius: 3,
                        bgcolor: alpha(activeColor, 0.15),
                        '& .MuiLinearProgress-bar': { bgcolor: activeColor, borderRadius: 3 },
                    }}
                />
            </Box>

            {/* Two-panel card */}
            <Box
                sx={{
                    display: 'flex',
                    borderRadius: { xs: 3, md: 4 },
                    overflow: 'hidden',
                    boxShadow: '0 8px 48px rgba(0,0,0,0.14)',
                    border: `1px solid ${theme.palette.divider}`,
                }}
            >
                {/* ── Sidebar ── */}
                <Box
                    sx={{
                        width: 256,
                        flexShrink: 0,
                        display: { xs: 'none', md: 'flex' },
                        flexDirection: 'column',
                        background: 'linear-gradient(170deg, #1a237e 0%, #1565c0 100%)',
                        p: 3,
                    }}
                >
                    {/* Brand */}
                    <Box display="flex" alignItems="center" gap={1.5} mb={4}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 2,
                                bgcolor: 'rgba(255,255,255,0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backdropFilter: 'blur(4px)',
                            }}
                        >
                            <DatasetIcon sx={{ color: 'white', fontSize: 24 }} />
                        </Box>
                        <Box>
                            <Typography variant="subtitle2" fontWeight={800} color="white" lineHeight={1.2}>
                                Edit Project
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                                {currentProject?.name}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Step list */}
                    <Box flex={1}>
                        {STEPS.map(({ label, desc, Icon, color }, idx) => {
                            const isActive = currentStep === idx;
                            const isDone = currentStep > idx;
                            return (
                                <Box
                                    key={label}
                                    onClick={() => (isDone || isActive) && setCurrentStep(idx)}
                                    sx={{
                                        mb: 0.5,
                                        p: 1.5,
                                        borderRadius: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        cursor: 'pointer',
                                        bgcolor: isActive ? 'rgba(255,255,255,0.16)' : 'transparent',
                                        border: isActive ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                                        transition: 'all 0.2s ease',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                                    }}
                                >
                                    {/* Icon circle */}
                                    <Box
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.3s ease',
                                            bgcolor: isActive
                                                ? 'white'
                                                : isDone
                                                  ? 'rgba(255,255,255,0.85)'
                                                  : 'rgba(255,255,255,0.12)',
                                            boxShadow: isActive ? `0 4px 14px rgba(0,0,0,0.25)` : 'none',
                                        }}
                                    >
                                        {isDone ? (
                                            <CheckIcon sx={{ fontSize: 17, color: color }} />
                                        ) : (
                                            <Icon
                                                sx={{
                                                    fontSize: 17,
                                                    color: isActive ? color : 'rgba(255,255,255,0.4)',
                                                }}
                                            />
                                        )}
                                    </Box>

                                    {/* Text */}
                                    <Box flex={1} minWidth={0}>
                                        <Typography
                                            variant="body2"
                                            fontWeight={isActive ? 700 : isDone ? 500 : 400}
                                            sx={{
                                                color: 'white',
                                                opacity: !isActive && !isDone ? 0.45 : 1,
                                                lineHeight: 1.3,
                                            }}
                                        >
                                            {label}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: 'rgba(255,255,255,0.4)',
                                                display: 'block',
                                                lineHeight: 1.2,
                                                mt: 0.15,
                                            }}
                                        >
                                            {desc}
                                        </Typography>
                                    </Box>

                                    {/* Active dot */}
                                    {isActive && (
                                        <Box
                                            sx={{
                                                width: 7,
                                                height: 7,
                                                borderRadius: '50%',
                                                bgcolor: 'white',
                                                flexShrink: 0,
                                                animation: 'sidePulse 2s ease-in-out infinite',
                                                '@keyframes sidePulse': {
                                                    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                                                    '50%': { opacity: 0.5, transform: 'scale(0.75)' },
                                                },
                                            }}
                                        />
                                    )}
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Progress bar */}
                    <Box mt={3.5} pt={3} sx={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                                Overall progress
                            </Typography>
                            <Typography variant="caption" fontWeight={700} color="white">
                                {progressPct}%
                            </Typography>
                        </Box>
                        <Box sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                            <Box
                                sx={{
                                    height: '100%',
                                    borderRadius: 3,
                                    bgcolor: 'white',
                                    width: `${progressPct}%`,
                                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* ── Right Content ── */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                        bgcolor: 'background.paper',
                    }}
                >
                    {/* Content area */}
                    <Box sx={{ flex: 1, p: { xs: 2.5, sm: 4 } }}>
                        {updateError && (
                            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                                {updateError}
                            </Alert>
                        )}
                        <Box minHeight={400}>{renderStep()}</Box>
                    </Box>

                    {/* Footer */}
                    <Box
                        sx={{
                            px: { xs: 2.5, sm: 4 },
                            py: 2.5,
                            borderTop: `1px solid ${theme.palette.divider}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            bgcolor: alpha(theme.palette.grey[50], 0.7),
                        }}
                    >
                        <Button
                            variant="outlined"
                            onClick={currentStep === 0 ? () => navigate(backPath) : goBack}
                            disabled={updateLoading}
                            sx={{
                                borderRadius: 2.5,
                                px: 3,
                                textTransform: 'none',
                                fontWeight: 600,
                                borderColor: theme.palette.divider,
                                color: 'text.secondary',
                                '&:hover': { borderColor: 'text.secondary' },
                            }}
                        >
                            {currentStep === 0 ? 'Cancel' : '← Back'}
                        </Button>

                        {currentStep < STEPS.length - 1 ? (
                            <Button
                                variant="contained"
                                onClick={goNext}
                                sx={{
                                    borderRadius: 2.5,
                                    px: 3.5,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    background: `linear-gradient(135deg, ${activeColor}, ${alpha(activeColor, 0.75)})`,
                                    boxShadow: `0 4px 14px ${alpha(activeColor, 0.4)}`,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        background: `linear-gradient(135deg, ${activeColor}, ${activeColor})`,
                                        boxShadow: `0 6px 20px ${alpha(activeColor, 0.5)}`,
                                        transform: 'translateY(-1px)',
                                    },
                                    '&:active': { transform: 'translateY(0)' },
                                }}
                            >
                                Continue →
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={() => formik.handleSubmit()}
                                disabled={updateLoading}
                                startIcon={updateLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                                sx={{
                                    borderRadius: 2.5,
                                    px: 3.5,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #00695c, #00897b)',
                                    boxShadow: '0 4px 14px rgba(0, 105, 92, 0.45)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #004d40, #00695c)',
                                        boxShadow: '0 6px 20px rgba(0, 105, 92, 0.5)',
                                        transform: 'translateY(-1px)',
                                    },
                                    '&:disabled': { background: theme.palette.action.disabledBackground },
                                }}
                            >
                                {updateLoading ? 'Saving…' : 'Save Changes'}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default withPageErrorBoundary(DataCollectionProjectEdit, 'Edit Data Collection Project');
