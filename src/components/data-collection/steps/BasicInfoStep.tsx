import { useEffect } from 'react';
import { Box, Chip, Grid, TextField, Typography, alpha } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import DateRangeIcon from '@mui/icons-material/DateRange';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import dayjs, { type Dayjs } from 'dayjs';
import type { FormikProps } from 'formik';
import type { IProjectFormState } from '../../../interfaces/api/dataCollection.interface';

const STEP_COLOR = '#1565c0';
const STEP_LIGHT = '#1976d2';

interface Props {
    formik: FormikProps<IProjectFormState>;
}

interface FieldGroupProps {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}

/**
 * Small presentational wrapper that groups related fields under an icon +
 * uppercase label with a left accent border, used to visually section the
 * step's form (Project Identity / Schedule & Target / Instructions).
 */
const FieldGroup = ({ icon, label, children }: FieldGroupProps) => (
    <Box sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Box
                sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1.5,
                    bgcolor: alpha(STEP_COLOR, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: STEP_COLOR,
                }}
            >
                {icon}
            </Box>
            <Typography variant="overline" fontWeight={700} sx={{ color: STEP_COLOR, letterSpacing: 1, lineHeight: 1 }}>
                {label}
            </Typography>
        </Box>
        <Box
            sx={{
                pl: 2,
                borderLeft: `3px solid ${alpha(STEP_COLOR, 0.15)}`,
                ml: 0.5,
            }}
        >
            {children}
        </Box>
    </Box>
);

/**
 * Component: BasicInfoStep
 *
 * Purpose: Renders Step 1 ("Basic Information") of the data-collection
 * project creation/edit wizard — project identity, schedule, and uploader
 * instructions. Corresponds to the `step1Schema` validation slice in
 * `steps/schema.ts`.
 *
 * Responsibilities:
 * - Render and bind Formik fields for name, description, startDate, endDate,
 *   and instruction; project_type is fixed/read-only for this wizard.
 * - Constrain the date pickers so start/end dates stay chronologically valid
 *   (see minStartDate/minEndDate below) and clear an end date that would
 *   fall before a newly-picked start date.
 * - Show a live-computed "Total Upload Target" derived from `values.target`
 *   (itself computed from Step 2's phase/slot configuration), or a hint that
 *   it's computed later when not yet set.
 *
 * Props:
 * - formik (FormikProps<IProjectFormState>): the wizard's shared Formik bag
 *   (values/touched/errors/handlers), owned by the hosting page.
 *
 * Side effects:
 * - useEffect (mount-only): forces `project_type` to 'collection' if it ever
 *   arrives as something else, since this wizard only supports the
 *   collection project type.
 *
 * Business rules:
 * - Start date cannot be picked before today, EXCEPT the value the form
 *   already holds is preserved as a valid minimum even if it's in the past —
 *   this lets an in-progress project (whose collection window already
 *   started) be edited without Formik flagging its own start date as invalid.
 * - End date's minimum is the selected start date (or today if none yet),
 *   and picking a start date later than the current end date clears the end
 *   date so the two can never end up inverted.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const BasicInfoStep = ({ formik }: Props) => {
    const { values, touched, errors, handleChange, handleBlur, setFieldValue } = formik;

    // Mount-only guard: this wizard only ever creates 'collection' projects,
    // so correct any other incoming project_type value once on load.
    useEffect(() => {
        if (values.project_type !== 'collection') {
            setFieldValue('project_type', 'collection');
        }
    }, []);

    const today = dayjs().startOf('day');
    const startDateValue: Dayjs | null = values.startDate ? dayjs(values.startDate) : null;
    const endDateValue: Dayjs | null = values.endDate ? dayjs(values.endDate) : null;
    // Allow the currently-set start date to remain valid even if it's in the past
    // (e.g. editing a project whose collection window already began).
    const minStartDate: Dayjs = startDateValue && startDateValue.isBefore(today) ? startDateValue : today;
    const minEndDate: Dayjs = values.startDate ? dayjs(values.startDate) : today;

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                    <InfoOutlinedIcon sx={{ color: 'white', fontSize: 17 }} />
                </Box>
                <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={0.75}>
                        <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>Basic Information</Typography>
                        <Chip label="Step 1" size="small" sx={{ bgcolor: alpha(STEP_COLOR, 0.1), color: STEP_COLOR, fontWeight: 700, height: 18, fontSize: 10 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" lineHeight={1.3}>
                        Set the core details, schedule, and instructions for your project
                    </Typography>
                </Box>
            </Box>

            {/* Project Identity */}
            <FieldGroup icon={<FingerprintIcon sx={{ fontSize: 15 }} />} label="Project Identity">
                <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <TextField
                            fullWidth
                            required
                            label="Project Name"
                            name="name"
                            value={values.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={touched.name && Boolean(errors.name)}
                            helperText={
                                (touched.name && errors.name) ||
                                `${values.name.length}/50 characters`
                            }
                            inputProps={{ maxLength: 50 }}
                            placeholder="e.g. Portrait Dataset Q3 2026"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: STEP_COLOR },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: STEP_COLOR },
                                },
                                '& .MuiInputLabel-root.Mui-focused': { color: STEP_COLOR },
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Project Type"
                            value="Data Collection"
                            disabled
                            sx={{
                                '& .MuiInputBase-root': {
                                    bgcolor: alpha(STEP_COLOR, 0.04),
                                },
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            label="Description (optional)"
                            name="description"
                            value={values.description}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={touched.description && Boolean(errors.description)}
                            helperText={
                                (touched.description && errors.description) ||
                                `${values.description.length}/200 characters`
                            }
                            inputProps={{ maxLength: 200 }}
                            placeholder="Brief description of the project's goal or context"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: STEP_COLOR },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: STEP_COLOR },
                                },
                                '& .MuiInputLabel-root.Mui-focused': { color: STEP_COLOR },
                            }}
                        />
                    </Grid>
                </Grid>
            </FieldGroup>

            {/* Schedule & Target */}
            <FieldGroup icon={<DateRangeIcon sx={{ fontSize: 15 }} />} label="Schedule & Target">
                <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box
                            sx={{
                                px: 1.75, py: 1.5,
                                borderRadius: '10px',
                                border: `1.5px solid ${alpha(STEP_COLOR, 0.25)}`,
                                bgcolor: alpha(STEP_COLOR, 0.04),
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                            }}
                        >
                            <Typography sx={{ fontSize: '0.7rem', color: STEP_COLOR, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.5 }}>
                                Total Upload Target
                            </Typography>
                            {values.target ? (
                                <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: STEP_COLOR, lineHeight: 1.2 }}>
                                    {Number(values.target).toLocaleString()}
                                    <Typography component="span" sx={{ fontSize: '0.78rem', fontWeight: 500, color: alpha(STEP_COLOR, 0.7), ml: 0.75 }}>
                                        uploads
                                    </Typography>
                                </Typography>
                            ) : (
                                <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled', fontStyle: 'italic' }}>
                                    Computed from phases in Step 2
                                </Typography>
                            )}
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <DatePicker
                            label="Start Date"
                            value={startDateValue}
                            minDate={minStartDate}
                            onChange={(date: Dayjs | null) => {
                                setFieldValue('startDate', date ? date.format('YYYY-MM-DD') : '');
                                if (values.endDate && date && date.isAfter(dayjs(values.endDate))) {
                                    setFieldValue('endDate', '');
                                }
                            }}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    required: true,
                                    onBlur: () => formik.setFieldTouched('startDate', true),
                                    error: touched.startDate && Boolean(errors.startDate),
                                    helperText: touched.startDate && errors.startDate,
                                    sx: {
                                        '& .MuiOutlinedInput-root': {
                                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: STEP_COLOR },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: STEP_COLOR },
                                        },
                                        '& .MuiInputLabel-root.Mui-focused': { color: STEP_COLOR },
                                    },
                                },
                            }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <DatePicker
                            label="End Date"
                            value={endDateValue}
                            minDate={minEndDate}
                            onChange={(date: Dayjs | null) => {
                                setFieldValue('endDate', date ? date.format('YYYY-MM-DD') : '');
                            }}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    required: true,
                                    onBlur: () => formik.setFieldTouched('endDate', true),
                                    error: touched.endDate && Boolean(errors.endDate),
                                    helperText: touched.endDate && errors.endDate,
                                    sx: {
                                        '& .MuiOutlinedInput-root': {
                                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: STEP_COLOR },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: STEP_COLOR },
                                        },
                                        '& .MuiInputLabel-root.Mui-focused': { color: STEP_COLOR },
                                    },
                                },
                            }}
                        />
                    </Grid>
                </Grid>
            </FieldGroup>

            {/* Instructions */}
            <FieldGroup icon={<StickyNote2OutlinedIcon sx={{ fontSize: 15 }} />} label="Instructions">
                <TextField
                    fullWidth
                    required
                    multiline
                    rows={4}
                    label="Instructions shown to uploaders"
                    name="instruction"
                    value={values.instruction}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.instruction && Boolean(errors.instruction)}
                    helperText={
                        (touched.instruction && errors.instruction) ||
                        `${values.instruction.length}/350 characters`
                    }
                    inputProps={{ maxLength: 350 }}
                    placeholder="Describe what uploaders should capture — requirements, lighting conditions, environment, etc."
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: STEP_COLOR },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: STEP_COLOR },
                        },
                        '& .MuiInputLabel-root.Mui-focused': { color: STEP_COLOR },
                    }}
                />
            </FieldGroup>
        </LocalizationProvider>
    );
};

export default BasicInfoStep;
