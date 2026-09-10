import { Box, Stepper, Step, StepLabel, alpha, useTheme } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface AnnotationStepperProps {
    currentStep: number;
}

/**
 * Component: AnnotationStepper
 *
 * Purpose: Renders the visual 3-step progress indicator (LLM1 -> LLM2 -> LLM Ranking)
 * for the LLM-grading annotation flow. It is purely presentational — it does not gate
 * navigation itself; the actual step-advance gating (e.g. requiring every rating
 * category to be filled) lives in the parent page (`UserAnnotationScreen.tsx`), which
 * decides when `currentStep` changes and passes it down as a prop.
 *
 * Responsibilities:
 * - Map the parent's `currentStep` value (0, 1, or 3) onto the 3 visual step indices
 *   (0, 1, 2) expected by MUI's `Stepper`.
 * - Render a custom circular step icon (filled check when completed, dot when active/pending).
 * - Highlight the connector line and label color for completed/active steps.
 *
 * Props:
 * - currentStep (number): the caller's current step value. Domain values are 0 (rating LLM1),
 *   1 (rating LLM2), and 3 (final comparison/ranking screen) — note step "2" is never used by
 *   the parent flow, it exists only as the visual index for the "LLM Ranking" step below.
 *
 * State: none.
 *
 * Important business logic:
 * - `activeStep = currentStep === 3 ? 2 : currentStep` — this remaps the parent's step numbering
 *   (which jumps 0 -> 1 -> 3, skipping 2) onto the Stepper's required contiguous 0-2 index range,
 *   since the "LLM Ranking" screen is conceptually the 3rd step even though the parent labels it 3.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const AnnotationStepper = ({ currentStep }: AnnotationStepperProps) => {
    const theme = useTheme();
    // See note above: parent step values are 0, 1, 3 — remap 3 -> 2 so MUI's Stepper
    // (which expects a contiguous 0-based index across its 3 children) highlights correctly.
    const activeStep = currentStep === 3 ? 2 : currentStep;

    /** Renders a single step's circular icon: checkmark when completed, filled/empty dot otherwise. */
    const StepIcon = ({ step }: { step: number }) => {
        const isCompleted = activeStep > step;
        const isActive = activeStep === step;

        return (
            <Box
                sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isCompleted || isActive ? '#4caf50' : alpha(theme.palette.divider, 0.3),
                    border: isActive ? `2px solid ${alpha('#4caf50', 0.3)}` : 'none',
                    transition: 'all 0.3s ease',
                }}
            >
                {isCompleted ? (
                    <CheckCircleIcon sx={{ fontSize: 14, color: 'white' }} />
                ) : (
                    <Box
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: isActive ? 'white' : alpha(theme.palette.text.secondary, 0.3),
                        }}
                    />
                )}
            </Box>
        );
    };

    return (
        <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
            <Stepper activeStep={activeStep} sx={{ pt: 0, maxWidth: 400 }}>
                <Step
                    sx={{
                        '& .MuiStepConnector-root': {
                            marginX: 0.5,
                            top: 8,
                        },
                        '& .MuiStepConnector-line': {
                            borderColor: currentStep >= 1 ? '#4caf50' : alpha(theme.palette.divider, 0.5),
                            borderTopWidth: 2,
                            transition: 'border-color 0.3s ease',
                        },
                        '&.Mui-active .MuiStepIcon-root': {
                            color: '#4caf50 !important',
                            boxShadow: `0 0 0 4px ${alpha('#4caf50', 0.15)}`,
                        },
                        '&.Mui-completed .MuiStepIcon-root': {
                            color: '#4caf50 !important',
                        },
                    }}
                >
                    <StepLabel
                        StepIconComponent={() => <StepIcon step={0} />}
                        sx={{
                            '& .MuiStepLabel-label': {
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                marginTop: 0.5,
                                color: currentStep === 0 ? theme.palette.primary.main : theme.palette.text.secondary,
                            },
                        }}
                    >
                        LLM1
                    </StepLabel>
                </Step>
                <Step
                    sx={{
                        '& .MuiStepConnector-root': {
                            marginX: 0.5,
                            top: 8,
                        },
                        '& .MuiStepConnector-line': {
                            borderColor: currentStep >= 2 ? '#4caf50' : alpha(theme.palette.divider, 0.5),
                            borderTopWidth: 2,
                            transition: 'border-color 0.3s ease',
                        },
                        '&.Mui-active .MuiStepIcon-root': {
                            color: '#4caf50 !important',
                            boxShadow: `0 0 0 4px ${alpha('#4caf50', 0.15)}`,
                        },
                        '&.Mui-completed .MuiStepIcon-root': {
                            color: '#4caf50 !important',
                        },
                    }}
                >
                    <StepLabel
                        StepIconComponent={() => <StepIcon step={1} />}
                        sx={{
                            '& .MuiStepLabel-label': {
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                marginTop: 0.5,
                                color: currentStep === 1 ? theme.palette.primary.main : theme.palette.text.secondary,
                            },
                        }}
                    >
                        LLM2
                    </StepLabel>
                </Step>
                <Step
                    sx={{
                        '& .MuiStepConnector-root': {
                            marginX: 0.5,
                            top: 8,
                        },
                        '& .MuiStepConnector-line': {
                            borderColor: currentStep >= 3 ? '#4caf50' : alpha(theme.palette.divider, 0.5),
                            borderTopWidth: 2,
                            transition: 'border-color 0.3s ease',
                        },
                        '&.Mui-active .MuiStepIcon-root': {
                            color: '#4caf50 !important',
                            boxShadow: `0 0 0 4px ${alpha('#4caf50', 0.15)}`,
                        },
                        '&.Mui-completed .MuiStepIcon-root': {
                            color: '#4caf50 !important',
                        },
                    }}
                >
                    <StepLabel
                        StepIconComponent={() => <StepIcon step={2} />}
                        sx={{
                            '& .MuiStepLabel-label': {
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                marginTop: 0.5,
                                color: currentStep === 3 ? theme.palette.primary.main : theme.palette.text.secondary,
                            },
                        }}
                    >
                        LLM Ranking
                    </StepLabel>
                </Step>
            </Stepper>
        </Box>
    );
};

export default AnnotationStepper;
