import React, { useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
    Stack,
    MenuItem,
    useTheme,
    alpha,
    Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import CodeIcon from '@mui/icons-material/Code';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import Input from '../shared/Input';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
    createOrganization,
    selectCreateLoading,
    selectCreateError,
    clearCreateError,
} from '../../redux/slices/organizationSlice';
import { selectCurrentUser } from '../../redux/slices/userSlice';
import type { CreateOrganization } from '../../interfaces/api/organization.interface';

interface OrganisationDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const organizationTypes = [
    { value: 'corporate', label: 'Corporate' },
    { value: 'government', label: 'Government' },
    { value: 'nonprofit', label: 'Non-Profit' },
    { value: 'educational', label: 'Educational' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'other', label: 'Other' },
];

export interface OrganizationFormData {
    name: string;
    type: string;
    description: string;
    code: string;
    org_admin: string;
}

// Business rules: name/description/code/org_admin are all mandatory with length
// bounds; code is additionally restricted to an uppercase slug-like format so it
// can be safely used as a short identifier/key elsewhere in the system.
const validationSchema = Yup.object({
    name: Yup.string()
        .required('Organization name is required')
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be less than 100 characters'),
    type: Yup.string().required('Organization type is required'),
    description: Yup.string()
        .required('Description is required')
        .min(10, 'Description must be at least 10 characters')
        .max(500, 'Description must be less than 500 characters'),
    code: Yup.string()
        .required('Organization code is required')
        .min(2, 'Code must be at least 2 characters')
        .max(20, 'Code must be less than 20 characters')
        .matches(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores'),
    org_admin: Yup.string()
        .required('Organization admin is required')
        .min(2, 'Admin name must be at least 2 characters')
        .max(100, 'Admin name must be less than 100 characters'),
});

/**
 * Component: OrganisationDialog
 *
 * Purpose: Formik-driven dialog for creating a new organization, pre-filled
 * with the current logged-in user as the organization admin.
 *
 * Responsibilities:
 * - Collects organization name, code, type, description, and admin.
 * - Validates input against `validationSchema` before allowing submit.
 * - Dispatches the create thunk and reports success/failure.
 *
 * Props:
 * - open (boolean): whether the dialog is visible.
 * - onClose (() => void): called to dismiss the dialog.
 * - onSuccess (() => void, optional): called after a successful creation.
 *
 * Redux: reads `selectCreateLoading`, `selectCreateError` (organizationSlice)
 * and `selectCurrentUser` (userSlice); dispatches `createOrganization` and
 * `clearCreateError`.
 *
 * Side effects: clears any stale create-error whenever the dialog opens.
 *
 * Business logic: the `code` field is auto-uppercased as the user types (see
 * inline `onChange` override below) to match the required uppercase format
 * enforced by `validationSchema`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const OrganisationDialog: React.FC<OrganisationDialogProps> = ({ open, onClose, onSuccess }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();

    // Redux state
    const loading = useAppSelector(selectCreateLoading);
    const error = useAppSelector(selectCreateError);
    const currentUser = useAppSelector(selectCurrentUser);

    /** Builds Formik's initial values, defaulting `org_admin` to the logged-in user's id. */
    // Get initial values with current user ID
    const getInitialValues = (): OrganizationFormData => ({
        name: '',
        type: '',
        description: '',
        code: '',
        org_admin: currentUser?.id || '',
    });

    // Clear error when dialog opens
    // Runs whenever `open` toggles true so a previous failed attempt's error
    // banner doesn't linger when the dialog is reopened.
    useEffect(() => {
        if (open) {
            dispatch(clearCreateError());
        }
    }, [open, dispatch]);

    /**
     * Maps the Formik form shape to the `CreateOrganization` API payload shape.
     * @param values - current form values.
     * @returns The payload expected by the `createOrganization` thunk.
     */
    // Transform form data to API payload
    const transformFormData = (values: OrganizationFormData): CreateOrganization => {
        return {
            name: values.name,
            description: values.description,
            code: values.code,
            type: values.type,
            org_admin: values.org_admin,
        };
    };

    /**
     * Formik submit handler: dispatches `createOrganization`, then notifies the
     * caller and closes the dialog on success. Errors are surfaced via Redux's
     * `error` state (rendered as an Alert) rather than thrown further.
     * @param values - validated form values.
     */
    const handleSubmit = async (values: OrganizationFormData) => {
        try {
            const apiPayload = transformFormData(values);
            await dispatch(createOrganization(apiPayload)).unwrap();

            // Success callback
            if (onSuccess) {
                onSuccess();
            }

            // Close dialog on success
            onClose();
        } catch (err) {
            // Error is handled by Redux state
            console.error('Failed to create organization:', err);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 3,
                        boxShadow:
                            theme.palette.mode === 'dark'
                                ? '0 24px 48px rgba(0,0,0,0.6)'
                                : '0 24px 48px rgba(0,0,0,0.15)',
                    },
                },
            }}
        >
            <DialogTitle
                sx={{
                    pb: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(
                        theme.palette.background.paper,
                        1,
                    )} 100%)`,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: theme.palette.primary.main,
                        }}
                    >
                        <BusinessIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Create New Organization
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Set up your organization profile and details
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Formik initialValues={getInitialValues()} validationSchema={validationSchema} onSubmit={handleSubmit} enableReinitialize>
                {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
                    <Form>
                        <DialogContent sx={{ px: 3, py: 2 }}>
                            <Stack spacing={3}>
                                {/* Error Alert */}
                                {error && (
                                    <Alert
                                        severity="error"
                                        sx={{ borderRadius: 2 }}
                                        onClose={() => dispatch(clearCreateError())}
                                    >
                                        {error}
                                    </Alert>
                                )}

                                {/* Basic Information Section */}
                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                        Organization Information
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Input
                                            name="name"
                                            label="Organization Name"
                                            placeholder="Enter organization name"
                                            value={values.name}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.name && Boolean(errors.name)}
                                            helperText={touched.name ? errors.name : undefined}
                                            required
                                            startIcon={<BusinessIcon />}
                                            maxLength={100}
                                            showCharCount
                                        />

                                        <Input
                                            name="code"
                                            label="Organization Code"
                                            placeholder="Enter organization code (e.g., ORG-001)"
                                            value={values.code}
                                            onChange={(e) => {
                                                // Convert to uppercase automatically so the value always
                                                // satisfies the validationSchema's uppercase code format.
                                                const upperValue = e.target.value.toUpperCase();
                                                handleChange({ ...e, target: { ...e.target, value: upperValue, name: 'code' } });
                                            }}
                                            onBlur={handleBlur}
                                            error={touched.code && Boolean(errors.code)}
                                            helperText={touched.code ? errors.code : 'Use uppercase letters, numbers, hyphens, and underscores'}
                                            required
                                            startIcon={<CodeIcon />}
                                            maxLength={20}
                                            showCharCount
                                        />

                                        <Input
                                            name="type"
                                            label="Organization Type"
                                            placeholder="Select organization type"
                                            value={values.type}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.type && Boolean(errors.type)}
                                            helperText={touched.type ? errors.type : undefined}
                                            required
                                            select
                                        >
                                            {organizationTypes.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Input>

                                        <Input
                                            name="description"
                                            label="Description"
                                            placeholder="Describe your organization"
                                            value={values.description}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.description && Boolean(errors.description)}
                                            helperText={touched.description ? errors.description : undefined}
                                            required
                                            startIcon={<DescriptionIcon />}
                                            multiline
                                            rows={3}
                                            maxLength={500}
                                            showCharCount
                                        />

                                        <Input
                                            name="org_admin"
                                            label="Organization Admin"
                                            placeholder="Enter admin name or ID"
                                            value={values.org_admin}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.org_admin && Boolean(errors.org_admin)}
                                            helperText={
                                                currentUser
                                                    ? `Logged in as: ${currentUser.username} (${currentUser.email})`
                                                    : 'No user logged in'
                                            }
                                            required
                                            startIcon={<PersonIcon />}
                                            maxLength={100}
                                            // disabled
                                        />
                                    </Stack>
                                </Box>
                            </Stack>
                        </DialogContent>

                        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                            <Button
                                onClick={onClose}
                                variant="outlined"
                                disabled={loading || isSubmitting}
                                sx={{ borderRadius: 2 }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={loading || isSubmitting}
                                sx={{
                                    borderRadius: 2,
                                    px: 3,
                                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                }}
                            >
                                {loading || isSubmitting ? 'Creating...' : 'Create Organization'}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
};

export default OrganisationDialog;
