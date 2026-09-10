import { useEffect, useState } from 'react';
import {
    Box, Button, Chip, Collapse, Divider,
    FormControlLabel, Grid, IconButton,
    MenuItem, Switch, TextField, Tooltip,
    Typography, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LayersIcon from '@mui/icons-material/Layers';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import type { FormikProps } from 'formik';
import { nanoid } from 'nanoid';
import type {
    IProjectFormState,
    IPhaseItem,
    DataType,
} from '../../../interfaces/api/dataCollection.interface';
import { DATA_TYPES, FILE_FORMATS, DIMENSION_MATCH_OPTIONS } from '../../../interfaces/api/dataCollection.interface';

const STEP_COLOR = '#6a1b9a';
const STEP_LIGHT = '#9c27b0';

const FILE_FORMAT_BY_TYPE: Record<DataType, string[]> = {
    Image: ['JPEG', 'PNG', 'HEIC', 'LivePhoto'],
    Video: ['MP4', 'MOV'],
    Audio: ['MP3', 'WAV', 'M4A'],
    Text: [],
};

const DATA_TYPE_STYLE: Record<DataType, { color: string; bg: string }> = {
    Image:  { color: '#1565c0', bg: alpha('#1565c0', 0.1) },
    Video:  { color: '#6a1b9a', bg: alpha('#6a1b9a', 0.1) },
    Audio:  { color: '#2e7d32', bg: alpha('#2e7d32', 0.1) },
    Text:   { color: '#e65100', bg: alpha('#e65100', 0.1) },
};

const PHASE_PALETTE = ['#1565c0', '#6a1b9a', '#2e7d32', '#bf360c', '#00695c', '#f57f17'];

interface Props {
    formik: FormikProps<IProjectFormState>;
    /** When true, renders phases/slots as a locked read-only summary (used by the edit flow). */
    readOnly?: boolean;
    /** When true, highlights any unfilled required fields (set after a blocked "Continue" attempt). */
    showErrors?: boolean;
}

/**
 * Component: PhaseConfigStep
 *
 * Purpose: Renders Step 2 ("Phase Configuration") of the data-collection
 * project wizard — lets admins define one or more collection phases, each
 * containing dataset "slots" that describe what to upload (data type, file
 * format, size/dimension constraints, per-user upload cap). This step's
 * structural rules are validated by `validatePhaseConfig` in
 * `steps/schema.ts` rather than a Yup slice, since the shape is a dynamic
 * keyed map of phases -> slots.
 *
 * Responsibilities:
 * - Add/remove phases and slots, keeping phase keys (`phase_1`, `phase_2`, …)
 *   and `phase_targets` renumbered/in sync after a removal.
 * - Edit individual slot fields, including nested `dimension.*` fields and a
 *   data_type change that resets `file_format` to a valid default for the
 *   new type.
 * - Track expand/collapse UI state per phase and per slot.
 * - Support a read-only summary mode (locked after project creation) and a
 *   "show errors" mode that expands everything so a blocked "Continue"
 *   attempt doesn't hide the fields that need fixing.
 * - Compute and display a live running total of upload targets.
 *
 * Props:
 * - formik (FormikProps<IProjectFormState>): the wizard's shared Formik bag.
 * - readOnly (boolean, default false): renders phases/slots as a locked
 *   read-only summary (used by the edit flow, where phase config can't change).
 * - showErrors (boolean, default false): highlights unfilled required fields,
 *   set by the hosting page after a blocked "Continue" attempt.
 *
 * State:
 * - expandedPhases (Record<string, boolean>): which phase cards are expanded
 *   (phase_1 starts expanded by default).
 * - expandedSlots (Record<string, boolean>): which slot cards are expanded.
 *
 * Side effects:
 * - useEffect (on `showErrors` change): when a blocked "Continue" sets
 *   showErrors to true, force-expands every phase and every slot so the
 *   validation errors highlighted below are actually visible to the user.
 *
 * Business rules:
 * - Project total upload target = Σ phase_targets when phase_targets data is
 *   available, else falls back to the stored `values.target` (needed because
 *   the edit flow's fetch endpoint doesn't return `phase_targets`).
 * - A phase can only be removed if more than one phase exists (enforced by
 *   only rendering the delete control when `phaseKeys.length > 1`).
 * - Changing a slot's data_type resets its file_format to the first valid
 *   format for that type, since formats are type-specific (e.g. Video can't
 *   use a JPEG file_format).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const PhaseConfigStep = ({ formik, readOnly = false, showErrors = false }: Props) => {
    const { values, setFieldValue } = formik;
    const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({ phase_1: true });
    const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});

    // project total = Σ phase_targets, falling back to the stored project target when
    // phase_targets isn't available (the edit flow's fetch endpoint doesn't return it)
    const hasPhaseTargetData = Object.keys(values.phase_targets ?? {}).length > 0;
    const totalTarget = hasPhaseTargetData
        ? Object.values(values.phase_targets ?? {}).reduce((sum, t) => sum + t, 0)
        : Number(values.target) || 0;

    const phaseKeys = Object.keys(values.phases).sort();

    /**
     * Force-expands every phase and slot when the hosting page flips
     * `showErrors` to true (after a blocked "Continue" click), so validation
     * errors highlighted below are never hidden inside a collapsed card.
     * Depends only on `showErrors`; the exhaustive-deps rule is intentionally
     * disabled since re-running on every `phaseKeys`/`values.phases` change
     * would re-expand phases the user just manually collapsed.
     */
    // Expand everything so a blocked "Continue" attempt doesn't hide the fields that need fixing.
    useEffect(() => {
        if (!showErrors) return;
        setExpandedPhases((prev) => {
            const next = { ...prev };
            phaseKeys.forEach((key) => { next[key] = true; });
            return next;
        });
        setExpandedSlots((prev) => {
            const next = { ...prev };
            phaseKeys.forEach((key) => {
                values.phases[key].forEach((slot) => { next[slot.id] = true; });
            });
            return next;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showErrors]);

    /**
     * Appends a new empty phase (no slots yet, target 0) and auto-expands it
     * so the admin can immediately start adding slots.
     */
    const addPhase = () => {
        const nextNum = phaseKeys.length + 1;
        const key = `phase_${nextNum}`;
        setFieldValue('phases', { ...values.phases, [key]: [] });
        setFieldValue('phase_targets', { ...(values.phase_targets ?? {}), [key]: 0 });
        setExpandedPhases((prev) => ({ ...prev, [key]: true }));
    };

    /**
     * Removes a phase and renumbers the remaining phases/targets to close the
     * gap (e.g. removing phase_2 out of 3 turns phase_3 into phase_2), since
     * phase keys are positional (`phase_N`) and must stay contiguous.
     * @param phaseKey - the phase key to remove (e.g. 'phase_2').
     */
    const removePhase = (phaseKey: string) => {
        const updated = { ...values.phases };
        delete updated[phaseKey];
        const renumbered: typeof updated = {};
        Object.values(updated).forEach((items, idx) => {
            renumbered[`phase_${idx + 1}`] = items;
        });
        setFieldValue('phases', renumbered);

        // Renumber phase_targets to stay in sync
        const updatedTargets = { ...(values.phase_targets ?? {}) };
        delete updatedTargets[phaseKey];
        const renumberedTargets: Record<string, number> = {};
        Object.values(updatedTargets).forEach((t, idx) => {
            renumberedTargets[`phase_${idx + 1}`] = t;
        });
        setFieldValue('phase_targets', renumberedTargets);
    };

    /**
     * Appends a new dataset slot with sensible defaults (Image/JPEG, 10 MB
     * max, both validations on) to the given phase, and auto-expands it.
     * @param phaseKey - the phase to add the slot to.
     */
    const addSlot = (phaseKey: string) => {
        const slotId = `${phaseKey}_${nanoid(8)}`;
        const newSlot: IPhaseItem = {
            id: slotId,
            name: '',
            device: '',
            data_type: 'Image',
            file_format: 'JPEG',
            iPhone_11_or_Newer: false,
            video_time_limit: 0,
            file_size: 10,
            dimension: { width: '', height: '', dimension_match: '' },
            user_validation: true,
            admin_validation: true,
            phaseCount: 1,
        };
        setFieldValue(`phases.${phaseKey}`, [...values.phases[phaseKey], newSlot]);
        setExpandedSlots((prev) => ({ ...prev, [slotId]: true }));
    };

    /**
     * Removes one slot from a phase by index.
     * @param phaseKey - the phase containing the slot.
     * @param idx - index of the slot to remove within that phase's slot array.
     */
    const removeSlot = (phaseKey: string, idx: number) => {
        const updated = [...values.phases[phaseKey]];
        updated.splice(idx, 1);
        setFieldValue(`phases.${phaseKey}`, updated);
    };

    /**
     * Updates a single field on a slot, including nested `dimension.*` fields
     * (dot-path addressed). Also keeps `file_format` valid when `data_type`
     * changes, since each data type only supports a specific set of formats
     * (e.g. switching from Image to Video must not leave file_format as JPEG).
     * @param phaseKey - the phase containing the slot.
     * @param idx - index of the slot within that phase's slot array.
     * @param field - the field name to update, or a `dimension.<subfield>` dot-path.
     * @param value - the new value for that field.
     */
    const updateSlotField = (phaseKey: string, idx: number, field: string, value: unknown) => {
        const updated = [...values.phases[phaseKey]];
        if (field.startsWith('dimension.')) {
            const dimField = field.split('.')[1];
            updated[idx] = { ...updated[idx], dimension: { ...updated[idx].dimension, [dimField]: value } };
        } else {
            updated[idx] = { ...updated[idx], [field]: value };
            if (field === 'data_type') {
                // Reset to the first valid format for the new type so slots never
                // end up with a data_type/file_format combination that can't exist
                // (e.g. Video with file_format still set to JPEG).
                const formats = FILE_FORMAT_BY_TYPE[value as DataType];
                updated[idx].file_format = (formats[0] as IPhaseItem['file_format']) ?? 'JPEG';
            }
        }
        setFieldValue(`phases.${phaseKey}`, updated);
    };

    /** Toggles a single phase card's expanded/collapsed UI state. */
    const togglePhase = (key: string) => setExpandedPhases((prev) => ({ ...prev, [key]: !prev[key] }));
    /** Toggles a single slot card's expanded/collapsed UI state. */
    const toggleSlot = (id: string) => setExpandedSlots((prev) => ({ ...prev, [id]: !prev[id] }));

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
                    <LayersIcon sx={{ color: 'white', fontSize: 17 }} />
                </Box>
                <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>Phase Configuration</Typography>
                        <Chip label="Step 2" size="small" sx={{ bgcolor: alpha(STEP_COLOR, 0.1), color: STEP_COLOR, fontWeight: 700, height: 18, fontSize: 10 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" lineHeight={1.3}>
                        {readOnly
                            ? 'Phase configuration is locked after project creation'
                            : 'Define collection phases and dataset slot requirements'}
                    </Typography>
                </Box>
                {!readOnly && (
                    <Button
                        startIcon={<AddIcon />}
                        variant="contained"
                        size="small"
                        onClick={addPhase}
                        sx={{
                            borderRadius: 2, textTransform: 'none', fontWeight: 700, flexShrink: 0,
                            bgcolor: STEP_COLOR, boxShadow: `0 3px 8px ${alpha(STEP_COLOR, 0.35)}`,
                            '&:hover': { bgcolor: STEP_LIGHT },
                        }}
                    >
                        Add Phase
                    </Button>
                )}
            </Box>

            {/* Live upload target summary */}
            <Box
                sx={{
                    mb: 2.5,
                    px: 2, py: 1.25,
                    borderRadius: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1,
                    bgcolor: totalTarget > 0 ? alpha(STEP_COLOR, 0.06) : alpha('#000', 0.03),
                    border: `1.5px solid ${totalTarget > 0 ? alpha(STEP_COLOR, 0.3) : alpha('#000', 0.1)}`,
                    transition: 'all 0.25s ease',
                }}
            >
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 600 }}>
                    Total upload target (sum of all slot upload counts)
                </Typography>
                <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: totalTarget > 0 ? STEP_COLOR : 'text.disabled' }}>
                    {totalTarget > 0 ? totalTarget.toLocaleString() : '—'}
                    {totalTarget > 0 && (
                        <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 500, color: alpha(STEP_COLOR, 0.7), ml: 0.75 }}>
                            uploads
                        </Typography>
                    )}
                </Typography>
            </Box>

            {phaseKeys.length === 0 && (
                <Box
                    sx={{
                        textAlign: 'center',
                        py: 7,
                        borderRadius: 3,
                        border: `2px dashed ${alpha(STEP_COLOR, 0.25)}`,
                        bgcolor: alpha(STEP_COLOR, 0.02),
                    }}
                >
                    <LayersIcon sx={{ fontSize: 48, color: alpha(STEP_COLOR, 0.3), mb: 1.5 }} />
                    <Typography fontWeight={600} color="text.secondary">No phases yet</Typography>
                    <Typography variant="body2" color="text.disabled" mt={0.5}>
                        Click "Add Phase" above to start building your data collection structure.
                    </Typography>
                </Box>
            )}

            {phaseKeys.map((phaseKey, phaseIdx) => {
                const phaseColor = PHASE_PALETTE[phaseIdx % PHASE_PALETTE.length];
                const slots = values.phases[phaseKey];
                const phaseTarget = values.phase_targets?.[phaseKey] ?? 0;
                return (
                    <Box
                        key={phaseKey}
                        sx={{
                            mb: 3,
                            borderRadius: 3,
                            overflow: 'hidden',
                            border: `1.5px solid ${alpha(phaseColor, 0.25)}`,
                            boxShadow: `0 2px 12px ${alpha(phaseColor, 0.08)}`,
                            transition: 'box-shadow 0.2s',
                            '&:hover': { boxShadow: `0 4px 20px ${alpha(phaseColor, 0.15)}` },
                        }}
                    >
                        {/* Phase header */}
                        <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{
                                px: 2.5,
                                py: 1.75,
                                background: `linear-gradient(135deg, ${alpha(phaseColor, 0.12)}, ${alpha(phaseColor, 0.04)})`,
                                borderBottom: expandedPhases[phaseKey]
                                    ? `1px solid ${alpha(phaseColor, 0.15)}`
                                    : 'none',
                                cursor: 'pointer',
                            }}
                            onClick={() => togglePhase(phaseKey)}
                        >
                            <Box display="flex" alignItems="center" gap={1.5}>
                                <Box
                                    sx={{
                                        width: 36, height: 36,
                                        borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${phaseColor}, ${alpha(phaseColor, 0.75)})`,
                                        color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 800, fontSize: 15,
                                        flexShrink: 0,
                                        boxShadow: `0 3px 8px ${alpha(phaseColor, 0.4)}`,
                                    }}
                                >
                                    {phaseIdx + 1}
                                </Box>
                                <Box>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography fontWeight={700} lineHeight={1.2} sx={{ color: phaseColor }}>
                                            Phase {phaseIdx + 1}
                                        </Typography>
                                        <Chip
                                            label={`${phaseTarget.toLocaleString()} uploads`}
                                            size="small"
                                            sx={{
                                                height: 20, fontSize: 11, fontWeight: 700,
                                                bgcolor: alpha(phaseColor, 0.12),
                                                color: phaseColor,
                                                border: `1px solid ${alpha(phaseColor, 0.25)}`,
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {slots.length} slot{slots.length !== 1 ? 's' : ''}
                                        {slots.length > 0 && ` · ${slots.map((s) => s.data_type).join(', ')}`}
                                    </Typography>
                                </Box>
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); togglePhase(phaseKey); }}
                                    sx={{ color: phaseColor }}
                                >
                                    {expandedPhases[phaseKey] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                </IconButton>
                                {!readOnly && phaseKeys.length > 1 && (
                                    <Tooltip title="Remove phase">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={(e) => { e.stopPropagation(); removePhase(phaseKey); }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>
                        </Box>

                        <Collapse in={expandedPhases[phaseKey] ?? true}>
                            <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                                {/* Phase-level pool ceiling — hidden in read-only mode when not available */}
                                {(!readOnly || hasPhaseTargetData) && (
                                    <Box
                                        sx={{
                                            mb: 2, p: 1.75, borderRadius: 2,
                                            bgcolor: alpha(phaseColor, 0.04),
                                            border: `1.5px solid ${alpha(phaseColor, 0.25)}`,
                                            display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                                        }}
                                    >
                                        <Box flex={1} minWidth={200}>
                                            <Typography variant="caption" fontWeight={700} sx={{ color: phaseColor, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.5 }}>
                                                Phase Upload Target (all users combined)
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Hard ceiling — total uploads accepted into this phase across every user
                                            </Typography>
                                        </Box>
                                        <TextField
                                            size="small"
                                            type="number"
                                            required={!readOnly}
                                            disabled={readOnly}
                                            label="Phase target"
                                            value={phaseTarget || ''}
                                            onChange={(e) =>
                                                setFieldValue('phase_targets', {
                                                    ...(values.phase_targets ?? {}),
                                                    [phaseKey]: Math.max(0, Number(e.target.value)),
                                                })
                                            }
                                            error={!readOnly && showErrors && phaseTarget <= 0}
                                            helperText={!readOnly && showErrors && phaseTarget <= 0 ? 'Required' : undefined}
                                            inputProps={{ min: 0 }}
                                            sx={{
                                                width: 160,
                                                '& .MuiOutlinedInput-root': {
                                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: phaseColor },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: phaseColor },
                                                },
                                                '& .MuiInputLabel-root.Mui-focused': { color: phaseColor },
                                            }}
                                        />
                                    </Box>
                                )}

                                {slots.map((slot, slotIdx) => {
                                    const typeStyle = DATA_TYPE_STYLE[slot.data_type] ?? DATA_TYPE_STYLE.Image;
                                    return (
                                        <Box
                                            key={slot.id}
                                            sx={{
                                                mb: 2,
                                                borderRadius: 2,
                                                border: `1px solid`,
                                                borderColor: expandedSlots[slot.id] !== false
                                                    ? alpha(typeStyle.color, 0.3)
                                                    : 'divider',
                                                overflow: 'hidden',
                                                transition: 'border-color 0.2s',
                                            }}
                                        >
                                            {/* Slot header */}
                                            <Box
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="space-between"
                                                sx={{
                                                    px: 2,
                                                    py: 1.25,
                                                    bgcolor: expandedSlots[slot.id] !== false
                                                        ? alpha(typeStyle.color, 0.05)
                                                        : alpha('#000', 0.02),
                                                    borderBottom: expandedSlots[slot.id] !== false
                                                        ? `1px solid ${alpha(typeStyle.color, 0.15)}`
                                                        : 'none',
                                                    cursor: 'pointer',
                                                }}
                                                onClick={() => toggleSlot(slot.id)}
                                            >
                                                <Box display="flex" alignItems="center" gap={1.25}>
                                                    <Box
                                                        sx={{
                                                            width: 24, height: 24,
                                                            borderRadius: '50%',
                                                            border: `2px solid ${alpha(typeStyle.color, 0.4)}`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 11, fontWeight: 700, color: typeStyle.color,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {slotIdx + 1}
                                                    </Box>
                                                    <Typography variant="subtitle2" fontWeight={700}>
                                                        {slot.name || `Dataset Slot ${slotIdx + 1}`}
                                                    </Typography>
                                                    <Chip
                                                        label={slot.data_type}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: typeStyle.bg,
                                                            color: typeStyle.color,
                                                            fontWeight: 700,
                                                            height: 20,
                                                            fontSize: 11,
                                                        }}
                                                    />
                                                    {slot.file_format && slot.data_type !== 'Text' && (
                                                        <Chip
                                                            label={slot.file_format}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ height: 20, fontSize: 11 }}
                                                        />
                                                    )}
                                                </Box>
                                                <Box display="flex" alignItems="center">
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => { e.stopPropagation(); toggleSlot(slot.id); }}
                                                    >
                                                        {expandedSlots[slot.id] !== false
                                                            ? <ExpandLessIcon fontSize="small" />
                                                            : <ExpandMoreIcon fontSize="small" />}
                                                    </IconButton>
                                                    {!readOnly && (
                                                        <Tooltip title="Remove slot">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={(e) => { e.stopPropagation(); removeSlot(phaseKey, slotIdx); }}
                                                            >
                                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </Box>

                                            <Collapse in={expandedSlots[slot.id] !== false}>
                                                <Box sx={{ p: 2 }}>
                                                    <Grid container spacing={2} sx={readOnly ? { opacity: 0.75 } : undefined}>
                                                        <Grid size={{ xs: 12, sm: 6 }}>
                                                            <TextField fullWidth required label="Slot Name" size="small"
                                                                disabled={readOnly}
                                                                value={slot.name}
                                                                onChange={(e) => updateSlotField(phaseKey, slotIdx, 'name', e.target.value)}
                                                                placeholder="e.g. Front Face Shot"
                                                                error={!readOnly && showErrors && !slot.name.trim()}
                                                                helperText={!readOnly && showErrors && !slot.name.trim() ? 'Required' : undefined}
                                                                sx={{ '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: typeStyle.color }, '& .MuiInputLabel-root.Mui-focused': { color: typeStyle.color } }}
                                                            />
                                                        </Grid>
                                                        <Grid size={{ xs: 12, sm: 6 }}>
                                                            <TextField
                                                                select fullWidth label="Device" size="small"
                                                                disabled={readOnly}
                                                                value={slot.device}
                                                                onChange={(e) => updateSlotField(phaseKey, slotIdx, 'device', e.target.value)}
                                                                sx={{ '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: typeStyle.color }, '& .MuiInputLabel-root.Mui-focused': { color: typeStyle.color } }}
                                                            >
                                                                <MenuItem value="">Any Device</MenuItem>
                                                                <MenuItem value="Android">Android</MenuItem>
                                                                <MenuItem value="iPhone">iPhone</MenuItem>
                                                            </TextField>
                                                        </Grid>
                                                        <Grid size={{ xs: 12, sm: 4 }}>
                                                            <TextField select fullWidth label="Data Type" size="small"
                                                                disabled={readOnly}
                                                                value={slot.data_type}
                                                                onChange={(e) => updateSlotField(phaseKey, slotIdx, 'data_type', e.target.value)}
                                                            >
                                                                {DATA_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                                            </TextField>
                                                        </Grid>
                                                        <Grid size={{ xs: 12, sm: 4 }}>
                                                            {slot.data_type !== 'Text' && (
                                                                <TextField select fullWidth label="File Format" size="small"
                                                                    disabled={readOnly}
                                                                    value={slot.file_format}
                                                                    onChange={(e) => updateSlotField(phaseKey, slotIdx, 'file_format', e.target.value)}
                                                                >
                                                                    {(FILE_FORMAT_BY_TYPE[slot.data_type] || FILE_FORMATS).map((f) => (
                                                                        <MenuItem key={f} value={f}>{f}</MenuItem>
                                                                    ))}
                                                                </TextField>
                                                            )}
                                                        </Grid>
                                                        <Grid size={{ xs: 12, sm: 4 }}>
                                                            <TextField fullWidth label="Max File Size (MB)" size="small"
                                                                type="number"
                                                                disabled={readOnly}
                                                                value={slot.file_size}
                                                                onChange={(e) => updateSlotField(phaseKey, slotIdx, 'file_size', Number(e.target.value))}
                                                                inputProps={{ min: 1 }}
                                                            />
                                                        </Grid>
                                                        {slot.data_type === 'Video' && (
                                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                                <TextField fullWidth label="Video Time Limit (seconds, 0 = none)" size="small"
                                                                    type="number"
                                                                    disabled={readOnly}
                                                                    value={slot.video_time_limit}
                                                                    onChange={(e) => updateSlotField(phaseKey, slotIdx, 'video_time_limit', Number(e.target.value))}
                                                                    inputProps={{ min: 0 }}
                                                                />
                                                            </Grid>
                                                        )}
                                                        <Grid size={{ xs: 12, sm: 6 }}>
                                                            <TextField fullWidth required label="Uploads per User (per-user cap)" size="small"
                                                                type="number"
                                                                disabled={readOnly}
                                                                value={slot.phaseCount}
                                                                onChange={(e) => updateSlotField(phaseKey, slotIdx, 'phaseCount', Number(e.target.value))}
                                                                error={!readOnly && showErrors && (!slot.phaseCount || slot.phaseCount < 1)}
                                                                helperText={!readOnly && showErrors && (!slot.phaseCount || slot.phaseCount < 1) ? 'Required' : undefined}
                                                                inputProps={{ min: 1 }}
                                                            />
                                                        </Grid>

                                                        {(slot.data_type === 'Image' || slot.data_type === 'Video') && (
                                                            <>
                                                                <Grid size={{ xs: 12 }}>
                                                                    <Divider>
                                                                        <Chip label="Dimension Constraints (optional)" size="small" variant="outlined" sx={{ fontSize: 11 }} />
                                                                    </Divider>
                                                                </Grid>
                                                                <Grid size={{ xs: 12, sm: 4 }}>
                                                                    <TextField fullWidth label="Min Width (px)" size="small"
                                                                        disabled={readOnly}
                                                                        value={slot.dimension.width}
                                                                        onChange={(e) => updateSlotField(phaseKey, slotIdx, 'dimension.width', e.target.value)}
                                                                    />
                                                                </Grid>
                                                                <Grid size={{ xs: 12, sm: 4 }}>
                                                                    <TextField fullWidth label="Min Height (px)" size="small"
                                                                        disabled={readOnly}
                                                                        value={slot.dimension.height}
                                                                        onChange={(e) => updateSlotField(phaseKey, slotIdx, 'dimension.height', e.target.value)}
                                                                    />
                                                                </Grid>
                                                                <Grid size={{ xs: 12, sm: 4 }}>
                                                                    <TextField select fullWidth label="Dimension Match" size="small"
                                                                        disabled={readOnly}
                                                                        value={slot.dimension.dimension_match}
                                                                        onChange={(e) => updateSlotField(phaseKey, slotIdx, 'dimension.dimension_match', e.target.value)}
                                                                    >
                                                                        {DIMENSION_MATCH_OPTIONS.map((o) => (
                                                                            <MenuItem key={o} value={o}>
                                                                                {o === '' ? 'None' : o === '10' ? '±10%' : o}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </TextField>
                                                                </Grid>
                                                            </>
                                                        )}

                                                        <Grid size={{ xs: 12 }}>
                                                            <Divider>
                                                                <Chip label="Validation & Device" size="small" variant="outlined" sx={{ fontSize: 11 }} />
                                                            </Divider>
                                                        </Grid>
                                                        <Grid size={{ xs: 12, sm: 4 }}>
                                                            <FormControlLabel
                                                                control={<Switch size="small" disabled={readOnly} checked={slot.user_validation} onChange={(e) => updateSlotField(phaseKey, slotIdx, 'user_validation', e.target.checked)} />}
                                                                label={<Typography variant="body2">User Validation</Typography>}
                                                            />
                                                        </Grid>
                                                        <Grid size={{ xs: 12, sm: 4 }}>
                                                            <FormControlLabel
                                                                control={<Switch size="small" disabled={readOnly} checked={slot.admin_validation} onChange={(e) => updateSlotField(phaseKey, slotIdx, 'admin_validation', e.target.checked)} />}
                                                                label={<Typography variant="body2">Admin Validation</Typography>}
                                                            />
                                                        </Grid>
                                                        <Grid size={{ xs: 12, sm: 4 }}>
                                                            <FormControlLabel
                                                                control={<Switch size="small" disabled={readOnly} checked={slot.iPhone_11_or_Newer} onChange={(e) => updateSlotField(phaseKey, slotIdx, 'iPhone_11_or_Newer', e.target.checked)} />}
                                                                label={<Typography variant="body2">iPhone 11+</Typography>}
                                                            />
                                                        </Grid>
                                                    </Grid>
                                                </Box>
                                            </Collapse>
                                        </Box>
                                    );
                                })}

                                {!readOnly && (
                                    <Button
                                        startIcon={<ViewColumnIcon />}
                                        fullWidth
                                        onClick={() => addSlot(phaseKey)}
                                        sx={{
                                            py: 1.25,
                                            borderRadius: 2,
                                            border: `1.5px dashed ${alpha(phaseColor, 0.4)}`,
                                            color: phaseColor,
                                            textTransform: 'none',
                                            fontWeight: 600,
                                            bgcolor: alpha(phaseColor, 0.02),
                                            '&:hover': {
                                                bgcolor: alpha(phaseColor, 0.06),
                                                borderColor: phaseColor,
                                            },
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        + Add Dataset Slot to Phase {phaseIdx + 1}
                                    </Button>
                                )}
                            </Box>
                        </Collapse>
                    </Box>
                );
            })}
        </Box>
    );
};

export default PhaseConfigStep;
