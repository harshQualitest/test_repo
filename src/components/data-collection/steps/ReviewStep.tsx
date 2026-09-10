import {
    Box, Card, Chip, Divider, Grid, Typography, alpha,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LayersIcon from '@mui/icons-material/Layers';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TargetIcon from '@mui/icons-material/GpsFixed';
import type { FormikProps } from 'formik';
import type { IProjectFormState, DemographicKey } from '../../../interfaces/api/dataCollection.interface';
import { DEMOGRAPHIC_KEYS, DEMOGRAPHIC_VALUES } from '../../../interfaces/api/dataCollection.interface';

const STEP_COLOR = '#00695c';
const STEP_LIGHT  = '#00897b';

const DATA_TYPE_STYLE: Record<string, { color: string; bg: string }> = {
    Image:  { color: '#1565c0', bg: alpha('#1565c0', 0.1) },
    Video:  { color: '#6a1b9a', bg: alpha('#6a1b9a', 0.1) },
    Audio:  { color: '#2e7d32', bg: alpha('#2e7d32', 0.1) },
    Text:   { color: '#e65100', bg: alpha('#e65100', 0.1) },
};

const SECTION_COLORS = {
    basic:       '#1565c0',
    phases:      '#6a1b9a',
    demo:        '#2e7d32',
    users:       '#bf360c',
};

interface Props {
    formik: FormikProps<IProjectFormState>;
    mode?: 'create' | 'edit';
}

interface SectionProps {
    icon: React.ReactNode;
    title: string;
    color: string;
    children: React.ReactNode;
}

/**
 * Small presentational wrapper that renders a titled, icon-badged section
 * (with a bottom border) grouping a chunk of the review summary — used for
 * the Basic Info / Phases / Demographics / Users sections below.
 */
const ReviewSection = ({ icon, title, color, children }: SectionProps) => (
    <Box mb={3.5}>
        <Box
            display="flex"
            alignItems="center"
            gap={1.25}
            mb={2}
            sx={{
                pb: 1.5,
                borderBottom: `2px solid ${alpha(color, 0.2)}`,
            }}
        >
            <Box
                sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${color}, ${alpha(color, 0.7)})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: `0 3px 8px ${alpha(color, 0.35)}`,
                }}
            >
                {icon}
            </Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color }}>
                {title}
            </Typography>
        </Box>
        {children}
    </Box>
);

/**
 * Component: ReviewStep
 *
 * Purpose: Renders Step 5 ("Review & Submit") of the data-collection project
 * wizard — a read-only summary of everything configured in the previous
 * steps (Basic Info, Phases, Demographics, Users), shown just before the
 * user confirms creation or saves an edit. This step has no Yup validation
 * slice of its own; it only re-displays already-validated data from the
 * earlier steps (`fullSchema` / `validatePhaseConfig` in `steps/schema.ts`).
 *
 * Responsibilities:
 * - Render a top summary stat bar (name, computed upload target, duration,
 *   phase/slot/demographic counts).
 * - Render four detail sections: Basic Information, Phases (with a
 *   project -> phase -> slot target breakdown), Demographic Targets, and
 *   User Assignment.
 * - Adjust copy for create vs. edit mode (e.g. "creating" vs. "saving").
 *
 * Props:
 * - formik (FormikProps<IProjectFormState>): the wizard's shared Formik bag
 *   (read-only consumption here — no fields are edited on this step).
 * - mode ('create' | 'edit', default 'create'): controls minor copy
 *   differences between the create and edit flows.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ReviewStep = ({ formik, mode = 'create' }: Props) => {
    const { values } = formik;
    const phaseKeys = Object.keys(values.phases).sort();
    const totalSlots = phaseKeys.reduce((sum, k) => sum + values.phases[k].length, 0);

    // phase targets are manually set by admin (pool ceilings); project = Σ phase targets,
    // falling back to the stored project target when phase_targets isn't available
    // (the edit flow's fetch endpoint doesn't return it)
    const phaseTargets = values.phase_targets ?? {};
    const hasPhaseTargetData = Object.keys(phaseTargets).length > 0;
    const computedTarget = hasPhaseTargetData
        ? Object.values(phaseTargets).reduce((s, v) => s + v, 0)
        : Number(values.target) || 0;
    /** Looks up the configured IDemographicTarget entry for a given demographic key, if any. */
    const getDemographic = (key: DemographicKey) =>
        values.demographic_data.find((d) => key in d)?.[key];
    // Only demographics the admin explicitly enabled in Step 3 are worth
    // summarizing here — disabled ones would just be noise.
    const activeDemoKeys = DEMOGRAPHIC_KEYS.filter((k) => getDemographic(k)?.enabled);

    return (
        <Box>
            {/* Step header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5, pb: 2, borderBottom: `1.5px solid ${alpha(STEP_COLOR, 0.15)}` }}>
                <Box
                    sx={{
                        width: 34, height: 34, borderRadius: 1.5, flexShrink: 0,
                        background: `linear-gradient(135deg, ${STEP_COLOR}, ${STEP_LIGHT})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 3px 8px ${alpha(STEP_COLOR, 0.3)}`,
                    }}
                >
                    <FactCheckIcon sx={{ color: 'white', fontSize: 17 }} />
                </Box>
                <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>Review & Submit</Typography>
                        <Chip label="Step 5" size="small" sx={{ bgcolor: alpha(STEP_COLOR, 0.1), color: STEP_COLOR, fontWeight: 700, height: 18, fontSize: 10 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" lineHeight={1.3}>
                        {mode === 'edit'
                            ? 'Confirm your changes before saving them'
                            : 'Confirm your project configuration before creating it'}
                    </Typography>
                </Box>
            </Box>

            {/* Summary stat bar */}
            <Box
                sx={{
                    mb: 4,
                    p: 2.5,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha(STEP_COLOR, 0.07)}, ${alpha(STEP_COLOR, 0.02)})`,
                    border: `1.5px solid ${alpha(STEP_COLOR, 0.2)}`,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 3,
                    alignItems: 'center',
                }}
            >
                <Box flex={1} minWidth={140}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
                        Project Name
                    </Typography>
                    <Typography variant="h6" fontWeight={800} sx={{ color: STEP_COLOR, lineHeight: 1.2, mt: 0.25 }}>
                        {values.name || '—'}
                    </Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                <Box display="flex" alignItems="center" gap={1}>
                    <TargetIcon sx={{ fontSize: 18, color: STEP_COLOR }} />
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Upload Target</Typography>
                        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                            {computedTarget > 0 ? `${computedTarget.toLocaleString()} uploads` : '—'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: alpha(STEP_COLOR, 0.7) }}>
                            computed from phases
                        </Typography>
                    </Box>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
                <Box display="flex" alignItems="center" gap={1}>
                    <CalendarTodayIcon sx={{ fontSize: 16, color: STEP_COLOR }} />
                    <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Duration</Typography>
                        <Typography variant="subtitle2" fontWeight={600} lineHeight={1.3}>
                            {values.startDate || '—'} → {values.endDate || '—'}
                        </Typography>
                    </Box>
                </Box>
                <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip label={`${phaseKeys.length} phase${phaseKeys.length !== 1 ? 's' : ''}`} size="small" sx={{ bgcolor: alpha(STEP_COLOR, 0.1), color: STEP_COLOR, fontWeight: 700 }} />
                    <Chip label={`${totalSlots} slot${totalSlots !== 1 ? 's' : ''}`} size="small" sx={{ bgcolor: alpha(STEP_COLOR, 0.1), color: STEP_COLOR, fontWeight: 700 }} />
                    {activeDemoKeys.length > 0 && (
                        <Chip label={`${activeDemoKeys.length} demographic${activeDemoKeys.length !== 1 ? 's' : ''}`} size="small" sx={{ bgcolor: alpha('#2e7d32', 0.1), color: '#2e7d32', fontWeight: 700 }} />
                    )}
                </Box>
            </Box>

            {/* Section 1: Basic Info */}
            <ReviewSection icon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />} title="Basic Information" color={SECTION_COLORS.basic}>
                <Grid container spacing={2.5}>
                    {[
                        ['Project Name', values.name],
                        ['Project Type', 'Data Collection'],
                        ['Total Target', values.target ? `${values.target} uploads` : '—'],
                        ['Start Date', values.startDate],
                        ['End Date', values.endDate],
                    ].map(([label, val]) => (
                        <Grid size={{ xs: 6, sm: 4, md: 3 }} key={label}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(SECTION_COLORS.basic, 0.03), border: `1px solid ${alpha(SECTION_COLORS.basic, 0.08)}` }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" letterSpacing={0.4} textTransform="uppercase">
                                    {label}
                                </Typography>
                                <Typography variant="body2" fontWeight={600} mt={0.5}>
                                    {val || '—'}
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                    {values.description && (
                        <Grid size={{ xs: 12 }}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(SECTION_COLORS.basic, 0.03), border: `1px solid ${alpha(SECTION_COLORS.basic, 0.08)}` }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" letterSpacing={0.4} textTransform="uppercase" mb={0.5}>
                                    Description
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                    {values.description}
                                </Typography>
                            </Box>
                        </Grid>
                    )}
                    <Grid size={{ xs: 12 }}>
                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(SECTION_COLORS.basic, 0.03), border: `1px solid ${alpha(SECTION_COLORS.basic, 0.08)}` }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" letterSpacing={0.4} textTransform="uppercase" mb={0.5}>
                                Instructions
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                {values.instruction || '—'}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </ReviewSection>

            {/* Section 2: Phases */}
            <ReviewSection
                icon={<LayersIcon sx={{ fontSize: 18 }} />}
                title={`Phases — ${phaseKeys.length} phase${phaseKeys.length !== 1 ? 's' : ''}, ${totalSlots} slot${totalSlots !== 1 ? 's' : ''}, ${computedTarget.toLocaleString()} total uploads`}
                color={SECTION_COLORS.phases}
            >
                {/* Three-tier target breakdown */}
                <Box
                    sx={{
                        mb: 2.5, p: 2,
                        borderRadius: 2.5,
                        bgcolor: alpha(SECTION_COLORS.phases, 0.04),
                        border: `1.5px solid ${alpha(SECTION_COLORS.phases, 0.2)}`,
                    }}
                >
                    {/* Project row */}
                    <Box display="flex" alignItems="center" gap={1} mb={1.25}>
                        <TargetIcon sx={{ fontSize: 15, color: SECTION_COLORS.phases, flexShrink: 0 }} />
                        <Typography variant="body2" fontWeight={800} sx={{ color: SECTION_COLORS.phases, flex: 1 }}>
                            Project ceiling
                        </Typography>
                        <Typography variant="body2" fontWeight={800} sx={{ color: SECTION_COLORS.phases }}>
                            {computedTarget.toLocaleString()} uploads
                        </Typography>
                    </Box>

                    {/* Per-phase rows */}
                    {phaseKeys.map((phaseKey, idx) => (
                        <Box key={phaseKey} sx={{ pl: 2.5, borderLeft: `2px solid ${alpha(SECTION_COLORS.phases, 0.2)}`, mb: 0.75 }}>
                            <Box display="flex" alignItems="flex-start" gap={1}>
                                <Typography variant="caption" color="text.secondary" sx={{ flex: 1, pt: 0.2 }}>
                                    Phase {idx + 1} ceiling
                                </Typography>
                                <Typography variant="caption" fontWeight={700} sx={{ color: SECTION_COLORS.phases }}>
                                    {hasPhaseTargetData ? `${(phaseTargets[phaseKey] ?? 0).toLocaleString()} uploads` : '—'}
                                </Typography>
                            </Box>

                            {/* Per-slot rows — values are POOL contributions (plain phaseCount), not per-user × count */}
                            {values.phases[phaseKey].map((slot, si) => (
                                <Box key={slot.id} display="flex" alignItems="center" gap={1} sx={{ pl: 2, mt: 0.4 }}>
                                    <Typography variant="caption" color="text.disabled" sx={{ flex: 1 }}>
                                        {slot.name || `Slot ${si + 1}`}
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={0.75}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                            {(slot.phaseCount || 0).toLocaleString()}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.62rem' }}>
                                            (per-user cap)
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Box>

                {phaseKeys.map((phaseKey, idx) => {
                    const phaseSubtotal = phaseTargets[phaseKey] ?? 0;
                    return (
                        <Card
                            key={phaseKey}
                            elevation={0}
                            sx={{
                                mb: 1.5,
                                borderRadius: 2.5,
                                border: `1.5px solid ${alpha(SECTION_COLORS.phases, 0.2)}`,
                                borderLeft: `5px solid ${SECTION_COLORS.phases}`,
                                overflow: 'hidden',
                            }}
                        >
                            <Box
                                sx={{
                                    px: 2, py: 1.25,
                                    bgcolor: alpha(SECTION_COLORS.phases, 0.04),
                                    borderBottom: `1px solid ${alpha(SECTION_COLORS.phases, 0.12)}`,
                                    display: 'flex', alignItems: 'center', gap: 1,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 26, height: 26, borderRadius: '50%',
                                        bgcolor: SECTION_COLORS.phases, color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 800, fontSize: 12, flexShrink: 0,
                                    }}
                                >
                                    {idx + 1}
                                </Box>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: SECTION_COLORS.phases, flex: 1 }}>
                                    Phase {idx + 1}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                    {values.phases[phaseKey].length} slot{values.phases[phaseKey].length !== 1 ? 's' : ''}
                                </Typography>
                                {hasPhaseTargetData && (
                                    <Chip
                                        label={`${phaseSubtotal.toLocaleString()} uploads`}
                                        size="small"
                                        sx={{ bgcolor: alpha(SECTION_COLORS.phases, 0.12), color: SECTION_COLORS.phases, fontWeight: 700, height: 20, fontSize: 11 }}
                                    />
                                )}
                            </Box>
                            <Box sx={{ px: 2, py: 1.5 }}>
                                {values.phases[phaseKey].length === 0 ? (
                                    <Typography variant="caption" color="text.disabled" fontStyle="italic">
                                        No slots configured in this phase
                                    </Typography>
                                ) : (
                                    <Box display="flex" flexDirection="column" gap={1}>
                                        {values.phases[phaseKey].map((slot, si) => {
                                            const ts = DATA_TYPE_STYLE[slot.data_type] ?? DATA_TYPE_STYLE.Image;
                                            return (
                                                <Box key={slot.id} display="flex" alignItems="center" flexWrap="wrap" gap={0.75}>
                                                    <Typography variant="body2" fontWeight={700} minWidth={90}>
                                                        {slot.name || `Slot ${si + 1}`}
                                                    </Typography>
                                                    <Chip label={slot.data_type} size="small" sx={{ bgcolor: ts.bg, color: ts.color, fontWeight: 700, height: 20, fontSize: 11 }} />
                                                    {slot.data_type !== 'Text' && <Chip label={slot.file_format} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
                                                    <Chip label={`${slot.file_size} MB max`} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                                                    {slot.device && <Chip label={slot.device} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
                                                    <Chip
                                                        label={`${slot.phaseCount.toLocaleString()} uploads`}
                                                        size="small"
                                                        sx={{ bgcolor: alpha(ts.color, 0.1), color: ts.color, fontWeight: 700, height: 20, fontSize: 11 }}
                                                    />
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}
                            </Box>
                        </Card>
                    );
                })}
            </ReviewSection>

            {/* Section 3: Demographics */}
            <ReviewSection icon={<GroupsIcon sx={{ fontSize: 18 }} />} title="Demographic Targets" color={SECTION_COLORS.demo}>
                {activeDemoKeys.length === 0 ? (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(SECTION_COLORS.demo, 0.03), border: `1px solid ${alpha(SECTION_COLORS.demo, 0.1)}` }}>
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            No demographic targeting configured.
                        </Typography>
                    </Box>
                ) : (
                    <Grid container spacing={1.5}>
                        {activeDemoKeys.map((key) => {
                            const demo = getDemographic(key);
                            if (!demo) return null;
                            return (
                                <Grid size={{ xs: 12, sm: 6 }} key={key}>
                                    <Box
                                        sx={{
                                            p: 1.75,
                                            borderRadius: 2,
                                            bgcolor: alpha(SECTION_COLORS.demo, 0.03),
                                            border: `1px solid ${alpha(SECTION_COLORS.demo, 0.15)}`,
                                            borderLeft: `4px solid ${SECTION_COLORS.demo}`,
                                        }}
                                    >
                                        <Typography variant="caption" fontWeight={800} textTransform="uppercase" letterSpacing={0.8} sx={{ color: SECTION_COLORS.demo, display: 'block', mb: 1 }}>
                                            {key}
                                        </Typography>
                                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                                            {Object.entries(demo.target).map(([vKey, count]) => (
                                                <Chip
                                                    key={vKey}
                                                    label={`${DEMOGRAPHIC_VALUES[key][vKey] || vKey}: ${count || '∞'}`}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: count > 0 ? alpha(SECTION_COLORS.demo, 0.1) : alpha('#000', 0.04),
                                                        color: count > 0 ? SECTION_COLORS.demo : 'text.secondary',
                                                        fontWeight: 600,
                                                        height: 22,
                                                        fontSize: 11,
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </ReviewSection>

            {/* Section 4: Users */}
            <ReviewSection icon={<PersonAddAlt1Icon sx={{ fontSize: 18 }} />} title="User Assignment" color={SECTION_COLORS.users}>
                {values.allUsers ? (
                    <Box
                        display="flex"
                        alignItems="center"
                        gap={1.5}
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: alpha(SECTION_COLORS.users, 0.03),
                            border: `1px solid ${alpha(SECTION_COLORS.users, 0.12)}`,
                        }}
                    >
                        <CheckCircleIcon sx={{ fontSize: 22, color: '#2e7d32' }} />
                        <Typography variant="body2" fontWeight={500}>
                            All users with the uploader role will have automatic access to this project.
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(SECTION_COLORS.users, 0.03), border: `1px solid ${alpha(SECTION_COLORS.users, 0.12)}` }}>
                        {values.users.length > 0 ? (
                            <>
                                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1.25} textTransform="uppercase" letterSpacing={0.6}>
                                    {values.users.length} user{values.users.length !== 1 ? 's' : ''} assigned
                                </Typography>
                                <Box display="flex" flexWrap="wrap" gap={0.75}>
                                    {values.users.map((email) => (
                                        <Chip
                                            key={email}
                                            label={email}
                                            size="small"
                                            sx={{ fontWeight: 500, bgcolor: alpha(SECTION_COLORS.users, 0.08), color: SECTION_COLORS.users }}
                                        />
                                    ))}
                                </Box>
                            </>
                        ) : (
                            <Typography variant="body2" color="error.main" fontWeight={600}>
                                No users selected — go back to assign at least one user.
                            </Typography>
                        )}
                    </Box>
                )}
            </ReviewSection>
        </Box>
    );
};

export default ReviewStep;
