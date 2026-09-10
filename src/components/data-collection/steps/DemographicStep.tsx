import {
    Box, Card, Chip, Collapse,
    FormControlLabel, Grid, InputAdornment,
    Switch, TextField, Typography, alpha,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import WcIcon from '@mui/icons-material/Wc';
import ColorLensOutlinedIcon from '@mui/icons-material/ColorLensOutlined';
import PublicIcon from '@mui/icons-material/Public';
import type { FormikProps } from 'formik';
import type { IProjectFormState, DemographicKey } from '../../../interfaces/api/dataCollection.interface';
import { DEMOGRAPHIC_KEYS, DEMOGRAPHIC_VALUES } from '../../../interfaces/api/dataCollection.interface';

const STEP_COLOR = '#2e7d32';
const STEP_LIGHT = '#43a047';

const DEMOGRAPHIC_CONFIG: Record<DemographicKey, { label: string; Icon: React.ElementType; color: string }> = {
    age:       { label: 'Age Range', Icon: CakeOutlinedIcon,      color: '#1565c0' },
    gender:    { label: 'Gender',    Icon: WcIcon,                 color: '#6a1b9a' },
    skintone:  { label: 'Skin Tone', Icon: ColorLensOutlinedIcon,  color: '#e65100' },
    ethnicity: { label: 'Ethnicity', Icon: PublicIcon,             color: '#00695c' },
};

interface Props {
    formik: FormikProps<IProjectFormState>;
}

/**
 * Component: DemographicStep
 *
 * Purpose: Renders Step 3 ("Demographic Targets") of the data-collection
 * project wizard — lets admins optionally enable per-demographic (age,
 * gender, skin tone, ethnicity) upload quotas. This step has no dedicated
 * Yup slice in `steps/schema.ts`; it is optional and not blocked by the
 * wizard's step-gating (any combination of enabled/disabled demographics is
 * a valid submission).
 *
 * Responsibilities:
 * - Render one toggleable card per demographic category (from
 *   DEMOGRAPHIC_KEYS), each listing its possible values (from
 *   DEMOGRAPHIC_VALUES) with a numeric target input.
 * - Toggle a category's `enabled` flag and update its per-value `target`
 *   counts in `values.demographic_data` via Formik's `setFieldValue`.
 *
 * Props:
 * - formik (FormikProps<IProjectFormState>): the wizard's shared Formik bag.
 *
 * Business rules:
 * - A target of 0 means "unlimited" for that demographic value (enforced by
 *   the UI copy, not a hard validation rule).
 * - Per-value targets are clamped to the [0, 1000] range when set, to keep
 *   quotas within a sane bound.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const DemographicStep = ({ formik }: Props) => {
    const { values, setFieldValue } = formik;

    /** Looks up the current IDemographicTarget entry for a given demographic key, if configured. */
    const getDemographic = (key: DemographicKey) =>
        values.demographic_data.find((d) => key in d)?.[key];

    /**
     * Toggles a demographic category on/off without touching its existing target counts.
     * @param key - the demographic category to toggle ('age' | 'gender' | 'skintone' | 'ethnicity').
     * @param enabled - whether upload quotas for this category should be tracked.
     */
    const setEnabled = (key: DemographicKey, enabled: boolean) => {
        setFieldValue(
            'demographic_data',
            values.demographic_data.map((d) =>
                key in d ? { [key]: { ...d[key]!, enabled } } : d,
            ),
        );
    };

    /**
     * Updates a single value's upload target within a demographic category.
     * @param key - the demographic category (e.g. 'age').
     * @param valueKey - the specific value within that category (e.g. an age bracket).
     * @param target - the new upload cap for that value (0 = unlimited, clamped 0–1000 by the input).
     */
    const setTarget = (key: DemographicKey, valueKey: string, target: number) => {
        setFieldValue(
            'demographic_data',
            values.demographic_data.map((d) =>
                key in d
                    ? { [key]: { ...d[key]!, target: { ...d[key]!.target, [valueKey]: target } } }
                    : d,
            ),
        );
    };

    // Shown as a "N active" chip in the step header so admins can see at a
    // glance how many demographic categories are currently being tracked.
    const enabledCount = DEMOGRAPHIC_KEYS.filter((k) => getDemographic(k)?.enabled).length;

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
                    <GroupsIcon sx={{ color: 'white', fontSize: 17 }} />
                </Box>
                <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>Demographic Targets</Typography>
                        <Chip label="Step 3" size="small" sx={{ bgcolor: alpha(STEP_COLOR, 0.1), color: STEP_COLOR, fontWeight: 700, height: 18, fontSize: 10 }} />
                        {enabledCount > 0 && (
                            <Chip label={`${enabledCount} active`} size="small" sx={{ bgcolor: alpha(STEP_COLOR, 0.1), color: STEP_COLOR, fontWeight: 700, height: 18, fontSize: 10 }} />
                        )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" lineHeight={1.3}>
                        Enable categories to track and cap uploads by demographic value
                    </Typography>
                </Box>
            </Box>

            {/* Category cards */}
            <Grid container spacing={2.5}>
                {DEMOGRAPHIC_KEYS.map((key) => {
                    const demo = getDemographic(key);
                    if (!demo) return null;
                    const cfg = DEMOGRAPHIC_CONFIG[key];
                    const valueMap = DEMOGRAPHIC_VALUES[key];

                    return (
                        <Grid size={{ xs: 12, md: 6 }} key={key}>
                            <Card
                                elevation={0}
                                sx={{
                                    height: '100%',
                                    borderRadius: 3,
                                    border: `1.5px solid`,
                                    borderColor: demo.enabled ? alpha(cfg.color, 0.4) : 'divider',
                                    borderLeft: `5px solid ${demo.enabled ? cfg.color : '#e0e0e0'}`,
                                    bgcolor: demo.enabled ? alpha(cfg.color, 0.025) : 'background.paper',
                                    transition: 'all 0.3s ease',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Card header */}
                                <Box
                                    sx={{
                                        px: 2.5,
                                        py: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        borderBottom: demo.enabled ? `1px solid ${alpha(cfg.color, 0.12)}` : 'none',
                                        background: demo.enabled
                                            ? `linear-gradient(135deg, ${alpha(cfg.color, 0.07)}, transparent)`
                                            : 'transparent',
                                        transition: 'all 0.3s ease',
                                    }}
                                >
                                    <Box display="flex" alignItems="center" gap={1.5}>
                                        <Box
                                            sx={{
                                                width: 42,
                                                height: 42,
                                                borderRadius: 2,
                                                bgcolor: demo.enabled ? alpha(cfg.color, 0.12) : alpha('#000', 0.04),
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: demo.enabled ? cfg.color : 'text.disabled',
                                                transition: 'all 0.3s ease',
                                            }}
                                        >
                                            <cfg.Icon sx={{ fontSize: 22 }} />
                                        </Box>
                                        <Box>
                                            <Typography
                                                variant="subtitle1"
                                                fontWeight={700}
                                                lineHeight={1.2}
                                                sx={{ color: demo.enabled ? cfg.color : 'text.primary' }}
                                            >
                                                {cfg.label}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {Object.keys(valueMap).length} values to configure
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box display="flex" alignItems="center" gap={1}>
                                        {demo.enabled && (
                                            <Chip
                                                label="Active"
                                                size="small"
                                                sx={{
                                                    bgcolor: alpha(cfg.color, 0.12),
                                                    color: cfg.color,
                                                    fontWeight: 700,
                                                    height: 22,
                                                    fontSize: 11,
                                                }}
                                            />
                                        )}
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={demo.enabled}
                                                    onChange={(e) => setEnabled(key, e.target.checked)}
                                                    sx={{
                                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                                            color: cfg.color,
                                                            '& + .MuiSwitch-track': { bgcolor: cfg.color },
                                                        },
                                                    }}
                                                />
                                            }
                                            label=""
                                            sx={{ mr: 0, ml: 0 }}
                                        />
                                    </Box>
                                </Box>

                                {/* Target inputs */}
                                <Collapse in={demo.enabled}>
                                    <Box sx={{ p: 2 }}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1.5}>
                                            Set upload targets per value (0 = unlimited)
                                        </Typography>
                                        <Grid container spacing={1.5}>
                                            {Object.entries(valueMap).map(([vKey, vLabel]) => (
                                                <Grid size={{ xs: 12, sm: 6 }} key={vKey}>
                                                    <TextField
                                                        fullWidth size="small"
                                                        label={vLabel as string}
                                                        type="number"
                                                        value={demo.target[vKey] ?? 0}
                                                        onChange={(e) =>
                                                            setTarget(
                                                                key, vKey,
                                                                Math.min(1000, Math.max(0, Number(e.target.value))),
                                                            )
                                                        }
                                                        inputProps={{ min: 0, max: 1000 }}
                                                        slotProps={{
                                                            input: {
                                                                endAdornment: (
                                                                    <InputAdornment position="end">
                                                                        <Typography variant="caption" color="text.disabled">
                                                                            uploads
                                                                        </Typography>
                                                                    </InputAdornment>
                                                                ),
                                                            },
                                                        }}
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: cfg.color },
                                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: cfg.color },
                                                            },
                                                            '& .MuiInputLabel-root.Mui-focused': { color: cfg.color },
                                                        }}
                                                    />
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>
                                </Collapse>

                                {!demo.enabled && (
                                    <Box sx={{ px: 2.5, pb: 2, pt: 0 }}>
                                        <Typography variant="body2" color="text.disabled" fontStyle="italic">
                                            Toggle on to configure upload quotas by {cfg.label.toLowerCase()}.
                                        </Typography>
                                    </Box>
                                )}
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
};

export default DemographicStep;
