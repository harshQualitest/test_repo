import React from 'react';
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import DescriptionIcon from '@mui/icons-material/Description';
import CategoryIcon from '@mui/icons-material/Category';
import SecurityIcon from '@mui/icons-material/Security';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import Input from '../shared/Input';
import { useToast } from '../../hooks/useToast';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
    createWorkspace,
    selectCreateLoading,
    clearError,
} from '../../redux/slices/workspaceSlice';
import { selectCurrentOrganization } from '../../redux/slices/organizationSlice';

interface WorkspaceCreateDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: (workspace: any) => void;
}

export interface WorkspaceFormData {
    name: string;
    description: string;
    type: string; // This will map to workspace_type in API
    visibility: string;
    colorScheme: string; // This will map to color_scheme in API
    org_id: string;
    workspace_size?: number;
}

const workspaceTypes = [
    // { value: 'enterprise_client', label: 'Enterprise Client' },
    // { value: 'media_partner', label: 'Media Partner' },
    { value: 'internal', label: 'Internal' },
];

const visibilityOptions = [
    { value: 'private', label: 'Private', description: 'Only invited members can access' },
    { value: 'public', label: 'Public', description: 'Anyone can view and access' },
    { value: 'sharable', label: 'Sharable', description: 'Can be shared via link' },
];

const colorSchemes = [
    { value: 'blue', label: 'Blue', color: '#1976d2' },
    { value: 'green', label: 'Green', color: '#388e3c' },
    { value: 'purple', label: 'Purple', color: '#7b1fa2' },
    { value: 'orange', label: 'Orange', color: '#f57c00' },
    { value: 'red', label: 'Red', color: '#d32f2f' },
    { value: 'teal', label: 'Teal', color: '#00796b' },
    { value: 'indigo', label: 'Indigo', color: '#303f9f' },
    { value: 'pink', label: 'Pink', color: '#c2185b' },
];

// Business rules: name/description/type/visibility/colorScheme are all
// required with length bounds where applicable; org_id and workspace_size are
// deliberately excluded here because they're derived automatically (current
// organization, and a fixed 0) rather than user input.
const validationSchema = Yup.object({
    name: Yup.string()
        .required('Workspace name is required')
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be less than 100 characters'),
    description: Yup.string()
        .required('Description is required')
        .min(10, 'Description must be at least 10 characters')
        .max(500, 'Description must be less than 500 characters'),
    type: Yup.string().required('Workspace type is required'),
    visibility: Yup.string().required('Visibility setting is required'),
    colorScheme: Yup.string().required('Color scheme is required'),
    // org_id will be automatically set from current organization
    // workspace_size will be automatically set to 0 in submission
});

/**
 * Component: WorkspaceCreateDialog
 *
 * Purpose: Formik-driven dialog for creating a new workspace under the
 * currently selected organization, with type/visibility/color-scheme pickers.
 *
 * Responsibilities:
 * - Collects workspace name, description, type, visibility, and color scheme.
 * - Maps the Formik field names to the API's expected snake_case field names
 *   (`workspace_type`, `color_scheme`) on submit.
 * - Reports success/failure via toast and auto-closes shortly after success.
 *
 * Props:
 * - open (boolean): whether the dialog is visible.
 * - onClose (() => void): called to dismiss the dialog.
 * - onSuccess ((workspace: any) => void, optional): called with the created workspace.
 *
 * Redux: reads `selectCreateLoading` (workspaceSlice) and
 * `selectCurrentOrganization` (organizationSlice); dispatches `createWorkspace`
 * and `clearError`.
 *
 * Custom hooks: `useToast` for success/error notifications.
 *
 * Business logic: `org_id` is always taken from the current organization and
 * `workspace_size` is always submitted as 0 — neither is user-editable, so
 * they're intentionally omitted from `validationSchema`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const WorkspaceCreateDialog: React.FC<WorkspaceCreateDialogProps> = ({ open, onClose, onSuccess }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const createLoading = useAppSelector(selectCreateLoading);
    const currentOrganization = useAppSelector(selectCurrentOrganization);

    /** Builds Formik's initial values, seeding `org_id` from the current organization. */
    // Dynamic initial values that include current organization ID
    const getInitialValues = (): WorkspaceFormData => {
        return {
            name: '',
            description: '',
            type: '',
            visibility: 'private',
            colorScheme: 'blue',
            org_id: currentOrganization?._id || '',
            // workspace_size will be added automatically during submission
        };
    };

    /**
     * Formik submit handler: maps form values to the API payload shape and
     * dispatches `createWorkspace`. Bails out early with a toast if there is no
     * current organization to attach the workspace to.
     * @param values - validated form values.
     * @param formikHelpers.resetForm - Formik helper used to clear the form after success.
     */
    const handleSubmit = async (values: WorkspaceFormData, { resetForm }: any) => {
        // Check if we have a current organization
        if (!currentOrganization?._id) {
            console.error('No current organization available');
            toast.showError('No organization selected. Please select an organization first.');
            return;
        }

        try {
            // Map form values to API schema
            const workspaceData = {
                org_id: currentOrganization._id,
                name: values.name,
                description: values.description,
                workspace_size: 0, // Always set to 0 as requested
                workspace_type: values.type, // API expects 'workspace_type' not 'type'
                visibility: values.visibility,
                color_scheme: values.colorScheme, // API expects 'color_scheme' not 'colorScheme'
            };

            const result = await dispatch(createWorkspace(workspaceData)).unwrap();

            // Show success toast
            toast.showSuccess(`Workspace "${values.name}" created successfully!`, 3000);

            // Reset form
            resetForm();

            // Call success callback if provided
            onSuccess?.(result);

            // Close dialog after a short delay
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            console.error('Failed to create workspace:', error);

            // Show error toast with specific error message if available
            const errorMessage = error?.message || 'Failed to create workspace. Please try again.';
            toast.showError(errorMessage, 5000);
        }
    };

    /** Closes the dialog and clears any workspace error, but only when no create request is in flight. */
    const handleDialogClose = () => {
        if (!createLoading) {
            onClose();
            dispatch(clearError());
        }
    };

    /**
     * Maps a visibility option to its representative accent color, used for the
     * colored dot shown next to each option in the visibility dropdown.
     * @param visibility - one of 'private' | 'public' | 'sharable'.
     * @returns A theme palette color matching the visibility's semantic meaning.
     */
    const getVisibilityColor = (visibility: string) => {
        switch (visibility) {
            case 'private':
                return theme.palette.error.main;
            case 'public':
                return theme.palette.success.main;
            case 'sharable':
                return theme.palette.info.main;
            default:
                return theme.palette.text.secondary;
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleDialogClose}
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
                    background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.05)} 0%, ${alpha(
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
                            backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: theme.palette.secondary.main,
                        }}
                    >
                        <WorkspacesIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Create New Workspace
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Set up a collaborative workspace for your team
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={handleDialogClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Formik initialValues={getInitialValues()} validationSchema={validationSchema} onSubmit={handleSubmit}>
                {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
                    <Form>
                        <DialogContent sx={{ px: 3, py: 2 }}>
                            <Stack spacing={3}>
                                {/* Basic Information Section */}
                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                        Workspace Information
                                    </Typography>

                                    {/* Organization Display */}
                                    {currentOrganization && (
                                        <Box
                                            sx={{
                                                p: 2,
                                                mb: 2,
                                                borderRadius: 2,
                                                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                                                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                                                Creating workspace under:
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                {currentOrganization.name}
                                            </Typography>
                                        </Box>
                                    )}

                                    <Stack spacing={2}>
                                        <Input
                                            name="name"
                                            label="Workspace Name"
                                            placeholder="Enter workspace name"
                                            value={values.name}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.name && Boolean(errors.name)}
                                            helperText={touched.name ? errors.name : undefined}
                                            required
                                            startIcon={<WorkspacesIcon />}
                                            maxLength={100}
                                            showCharCount
                                        />

                                        <Input
                                            name="description"
                                            label="Description"
                                            placeholder="Describe the purpose and goals of this workspace"
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
                                            name="type"
                                            label="Workspace Type"
                                            placeholder="Select workspace type"
                                            value={values.type}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.type && Boolean(errors.type)}
                                            helperText={touched.type ? errors.type : undefined}
                                            required
                                            startIcon={<CategoryIcon />}
                                            select
                                        >
                                            {workspaceTypes.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Input>

                                        <Input
                                            name="visibility"
                                            label="Visibility"
                                            placeholder="Select visibility"
                                            value={values.visibility}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            error={touched.visibility && Boolean(errors.visibility)}
                                            helperText={touched.visibility ? errors.visibility : undefined}
                                            required
                                            startIcon={<SecurityIcon />}
                                            select
                                        >
                                            {visibilityOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    <Stack>
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <Box
                                                                sx={{
                                                                    width: 8,
                                                                    height: 8,
                                                                    borderRadius: '50%',
                                                                    backgroundColor: getVisibilityColor(option.value),
                                                                }}
                                                            />
                                                            <Typography variant="body2">{option.label}</Typography>
                                                        </Stack>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {option.description}
                                                        </Typography>
                                                    </Stack>
                                                </MenuItem>
                                            ))}
                                        </Input>

                                        {/* Color Scheme Selection */}
                                        <Box>
                                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                                                Color Scheme *
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ mb: 2, display: 'block' }}
                                            >
                                                Choose a color scheme for your workspace
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                {colorSchemes.map((scheme) => (
                                                    <Box
                                                        key={scheme.value}
                                                        onClick={() => setFieldValue('colorScheme', scheme.value)}
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1,
                                                            p: 1.5,
                                                            borderRadius: 2,
                                                            border: '2px solid',
                                                            borderColor:
                                                                values.colorScheme === scheme.value
                                                                    ? scheme.color
                                                                    : 'divider',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            backgroundColor:
                                                                values.colorScheme === scheme.value
                                                                    ? alpha(scheme.color, 0.1)
                                                                    : 'transparent',
                                                            '&:hover': {
                                                                borderColor: scheme.color,
                                                                backgroundColor: alpha(scheme.color, 0.05),
                                                            },
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 20,
                                                                height: 20,
                                                                borderRadius: '50%',
                                                                backgroundColor: scheme.color,
                                                            }}
                                                        />
                                                        <Typography variant="body2">{scheme.label}</Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Box>
                                    </Stack>
                                </Box>
                            </Stack>
                        </DialogContent>

                        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                            <Button
                                onClick={handleDialogClose}
                                variant="outlined"
                                disabled={createLoading || isSubmitting}
                                sx={{ borderRadius: 2 }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={createLoading || isSubmitting}
                                sx={{
                                    borderRadius: 2,
                                    px: 3,
                                    boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.3)}`,
                                }}
                            >
                                {createLoading || isSubmitting ? 'Creating...' : 'Create Workspace'}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
};

export default WorkspaceCreateDialog;
