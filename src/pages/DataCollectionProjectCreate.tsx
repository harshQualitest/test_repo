import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, LinearProgress, Typography, alpha, useTheme } from '@mui/material';
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
    createDataCollectionProject,
    clearCreateState,
    selectDCCreateLoading,
    selectDCCreateSuccess,
    selectDCCreateError,
} from '../redux/slices/dataCollectionSlice';
import { selectUser } from '../redux/slices/loginSlice';
import { withPageErrorBoundary } from '../utils/withPageErrorBoundary';
import { useToast } from '../hooks/useToast';
import type { IProjectFormState } from '../interfaces/api/dataCollection.interface';
import { DEFAULT_DEMOGRAPHIC_DATA } from '../interfaces/api/dataCollection.interface';
import BasicInfoStep from '../components/data-collection/steps/BasicInfoStep';
import PhaseConfigStep from '../components/data-collection/steps/PhaseConfigStep';
import DemographicStep from '../components/data-collection/steps/DemographicStep';
import UserAssignmentStep from '../components/data-collection/steps/UserAssignmentStep';
import ReviewStep from '../components/data-collection/steps/ReviewStep';
import { fullSchema, validatePhaseConfig } from '../components/data-collection/steps/schema';

interface WorkspaceRouteState {
    fromWorkspace?: boolean;
    workspaceId?: string;
    workspaceName?: string;
}

const STEPS = [
    { label: 'Basic Info', desc: 'Name, dates & target', Icon: InfoOutlinedIcon, color: '#1565c0' },
    { label: 'Phase Config', desc: 'Slots & file formats', Icon: LayersIcon, color: '#6a1b9a' },
    { label: 'Demographics', desc: 'Target demographics', Icon: GroupsIcon, color: '#2e7d32' },
    { label: 'Users', desc: 'Assign uploaders', Icon: PersonAddAlt1Icon, color: '#bf360c' },
    { label: 'Review', desc: 'Confirm & create', Icon: FactCheckIcon, color: '#00695c' },
];

const initialValues: IProjectFormState = {
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
    phase_targets: { phase_1: 0 },
    demographic_data: DEFAULT_DEMOGRAPHIC_DATA,
    initial_scene: '',
    action_template: '',
};

/**
 * Component: DataCollectionProjectCreate
 *
 * Purpose: Multi-step wizard page for creating a new data-collection project
 * (Basic Info → Phase Config → Demographics → Users → Review).
 *
 * Responsibilities:
 * - Drive a 5-step Formik wizard with per-step validation gating via `goNext`.
 * - Submit the assembled project payload via `createDataCollectionProject`.
 * - Keep `target` in sync with the sum of per-phase targets.
 * - Redirect back to the originating workspace (or the projects list) on success.
 *
 * Props: none (reads optional `fromWorkspace`/`workspaceId`/`workspaceName` from router state).
 *
 * State:
 * - `currentStep` — index (0-4) of the active wizard step.
 * - `phaseConfigTouched` — whether the Phase Config step's validation errors should be shown.
 *
 * Redux (slice: dataCollectionSlice):
 * - Selectors: `selectDCCreateLoading`, `selectDCCreateSuccess`, `selectDCCreateError`.
 * - Thunk/action dispatched: `createDataCollectionProject`, `clearCreateState`.
 * - Also reads `selectUser` (loginSlice) to resolve the organization id for the payload.
 *
 * Custom hooks: `useToast` (`showSuccess`/`showError`), `useFormik` (Formik wizard state).
 *
 * Major child components: `BasicInfoStep`, `PhaseConfigStep`, `DemographicStep`,
 * `UserAssignmentStep`, `ReviewStep` (one per wizard step).
 *
 * Side effects: see the two `useEffect` hooks below (success redirect, target sync).
 *
 * Business logic:
 * - Step 0 (Basic Info) and step 1 (Phase Config) block advancing via `goNext`
 *   until their required fields / phase config pass validation (Formik has no
 *   built-in per-step gating, so this is enforced manually here).
 * - `target` is derived, not user-editable: it always equals the sum of each
 *   phase's `phase_targets` entry.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const DataCollectionProjectCreate = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { showSuccess, showError } = useToast();
    const theme = useTheme();

    const workspaceState = (location.state ?? {}) as WorkspaceRouteState;
    const backPath =
        workspaceState.fromWorkspace && workspaceState.workspaceId
            ? `/workspace/${workspaceState.workspaceId}`
            : '/data-collection/projects';
    const backLabel =
        workspaceState.fromWorkspace && workspaceState.workspaceName ? workspaceState.workspaceName : 'Projects';

    const createLoading = useAppSelector(selectDCCreateLoading);
    const createSuccess = useAppSelector(selectDCCreateSuccess);
    const createError = useAppSelector(selectDCCreateError);
    const authUser = useAppSelector(selectUser);

    const [currentStep, setCurrentStep] = useState(0);
    const [phaseConfigTouched, setPhaseConfigTouched] = useState(false);

    const formik = useFormik<IProjectFormState>({
        initialValues,
        validationSchema: fullSchema,
        validateOnChange: false,
        validateOnBlur: true,
        onSubmit: (vals) => {
            dispatch(
                createDataCollectionProject({
                    name: vals.name,
                    project_type: vals.project_type,
                    description: vals.description || undefined,
                    target: Number(vals.target),
                    startDate: vals.startDate,
                    endDate: vals.endDate,
                    instruction: vals.instruction,
                    users: vals.allUsers ? ['All'] : vals.users,
                    phases: vals.phases,
                    phase_targets: vals.phase_targets,
                    demographic_data: vals.demographic_data,
                    initial_scene: vals.initial_scene || undefined,
                    action_template: vals.action_template || undefined,
                    organization_id:
                        authUser?.organization?.organization_id ||
                        authUser?.assignments?.find((a) => a.entity === 'organization')?.entity_id ||
                        undefined,
                    workspace_id: workspaceState.workspaceId || undefined,
                }),
            );
        },
    });

    // Fires once the create thunk reports success: notifies the user, resets
    // create state (so revisiting this page doesn't re-trigger this effect),
    // and navigates back to the workspace/projects list.
    useEffect(() => {
        if (createSuccess) {
            showSuccess('Project created successfully!');
            dispatch(clearCreateState());
            navigate(backPath);
        }
    }, [createSuccess, dispatch, navigate, showSuccess, backPath]);

    // project.target = Σ phase_targets (each phase's manually-set pool ceiling)
    // Keeps the overall target in lockstep with per-phase targets whenever they change,
    // since `target` is a derived value rather than something the user edits directly.
    useEffect(() => {
        const computed = Object.values(formik.values.phase_targets ?? {}).reduce((sum, t) => sum + t, 0);
        if (computed !== formik.values.target) {
            formik.setFieldValue('target', computed);
        }
    }, [formik.values.phase_targets]);

    /**
     * Advances the wizard to the next step, but first enforces per-step
     * validation gating (Formik has no built-in "block navigation on incomplete
     * step" behavior): step 0 requires its core fields to pass validation, and
     * step 1 requires the phase configuration to be internally consistent.
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
        if (currentStep === 1) {
            const phaseErrors = validatePhaseConfig(formik.values);
            if (phaseErrors.length > 0) {
                setPhaseConfigTouched(true);
                showError(phaseErrors[0]);
                return;
            }
            setPhaseConfigTouched(false);
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
                return <PhaseConfigStep formik={formik} showErrors={phaseConfigTouched} />;
            case 2:
                return <DemographicStep formik={formik} />;
            case 3:
                return <UserAssignmentStep formik={formik} />;
            case 4:
                return <ReviewStep formik={formik} />;
            default:
                return null;
        }
    };

    const progressPct = Math.round(((currentStep + 1) / STEPS.length) * 100);
    const activeColor = STEPS[currentStep].color;

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
                                New Project
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                                Data Collection
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
                                    onClick={() => isDone && setCurrentStep(idx)}
                                    sx={{
                                        mb: 0.5,
                                        p: 1.5,
                                        borderRadius: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        cursor: isDone ? 'pointer' : 'default',
                                        bgcolor: isActive ? 'rgba(255,255,255,0.16)' : 'transparent',
                                        border: isActive ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                                        transition: 'all 0.2s ease',
                                        '&:hover': isDone ? { bgcolor: 'rgba(255,255,255,0.1)' } : {},
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
                        {createError && (
                            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                                {createError}
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
                            disabled={createLoading}
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
                                disabled={createLoading}
                                startIcon={createLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
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
                                {createLoading ? 'Creating…' : 'Create Project'}
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default withPageErrorBoundary(DataCollectionProjectCreate, 'Create Data Collection Project');
