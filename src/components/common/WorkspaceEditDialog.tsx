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
    updateWorkspace,
    selectUpdateLoading,
    clearError,
} from '../../redux/slices/workspaceSlice';
import { selectCurrentOrganization } from '../../redux/slices/organizationSlice';
import type { Workspace } from '../../redux/slices/workspaceSlice';

interface WorkspaceEditDialogProps {
    open: boolean;
    onClose: () => void;
    workspace: Workspace | null;
    onSuccess?: (workspace: any) => void;
}

export interface WorkspaceFormData {
    name: string;
    description: string;
    type: string; // This will map to workspace_type in API
    visibility: string;
    colorScheme: string; // This will map to color_scheme in API
}

const workspaceTypes = [
    { value: 'enterprise_client', label: 'Enterprise Client' },
    { value: 'media_partner', label: 'Media Partner' },
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

// Business rules: mirrors WorkspaceCreateDialog's rules — name/description
// have length bounds, and type/visibility/colorScheme are all required.
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
});

/**
 * Component: WorkspaceEditDialog
 *
 * Purpose: Formik-driven dialog for editing an existing workspace's name,
 * description, type, visibility, and color scheme.
 *
 * Responsibilities:
 * - Prefills the form from the `workspace` prop and lets the user change its
 *   editable fields (name/description/type/visibility/colorScheme).
 * - Maps Formik field names to the API's snake_case fields
 *   (`workspace_type`, `color_scheme`) on submit.
 * - Reports success/failure via toast and auto-closes shortly after success.
 *
 * Props:
 * - open (boolean): whether the dialog is visible.
 * - onClose (() => void): called to dismiss the dialog.
 * - workspace (Workspace | null): the workspace being edited.
 * - onSuccess ((workspace: any) => void, optional): called with the updated workspace.
 *
 * Redux: reads `selectUpdateLoading` (workspaceSlice) and
 * `selectCurrentOrganization` (organizationSlice); dispatches `updateWorkspace`
 * and `clearError`.
 *
 * Custom hooks: `useToast` for success/error notifications.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const WorkspaceEditDialog: React.FC<WorkspaceEditDialogProps> = ({ open, onClose, workspace, onSuccess }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { showSuccess, showError } = useToast();
    const updateLoading = useAppSelector(selectUpdateLoading);
    const currentOrganization = useAppSelector(selectCurrentOrganization);

    /**
     * Builds Formik's initial values from the `workspace` prop being edited,
     * falling back to blank defaults if no workspace is set yet.
     * @returns The initial `WorkspaceFormData` for the form.
     */
    // Get initial values from the workspace being edited
    const getInitialValues = (): WorkspaceFormData => {
        if (!workspace) {
            return {
                name: '',
                description: '',
                type: '',
                visibility: 'private',
                colorScheme: 'blue',
            };
        }

        return {
            name: workspace.name || '',
            description: workspace.description || '',
            type: workspace.workspace_type || '',
            visibility: workspace.visibility || 'private',
            colorScheme: workspace.color_scheme || 'blue',
        };
    };

    /**
     * Formik submit handler: maps form values to the API payload shape and
     * dispatches `updateWorkspace`. Bails out early with a toast if the
     * workspace or current organization id is missing.
     * @param values - validated form values.
     */
    const handleSubmit = async (values: WorkspaceFormData) => {
        if (!workspace?._id) {
            console.error('No workspace ID available');
            showError('Workspace ID is missing. Cannot update workspace.');
            return;
        }

        if (!currentOrganization?._id) {
            console.error('No organization ID available');
            showError('Organization ID is missing. Cannot update workspace.');
            return;
        }

        try {
            // Map form values to API schema
            const workspaceData = {
                workspace_id: workspace._id,
                name: values.name,
                description: values.description,
                workspace_size: workspace.workspace_size || 0,
                workspace_type: values.type,
                visibility: values.visibility,
                color_scheme: values.colorScheme,
            };

            const result = await dispatch(updateWorkspace({ id: currentOrganization._id, data: workspaceData })).unwrap();

            // Show success toast
            showSuccess(`Workspace "${values.name}" updated successfully!`);

            // Call success callback if provided
            onSuccess?.(result);

            // Close dialog after a short delay
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            console.error('Failed to update workspace:', error);
            
            // Show error toast with specific error message if available
            const errorMessage = error?.message || 'Failed to update workspace. Please try again.';
            showError(errorMessage);
        }
    };

    /** Closes the dialog and clears any workspace error, but only when no update request is in flight. */
    const handleDialogClose = () => {
        if (!updateLoading) {
            onClose();
            dispatch(clearError());
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
                            Edit Workspace
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Update workspace information and settings
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={handleDialogClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Formik
                initialValues={getInitialValues()}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
                enableReinitialize
            >
                {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
                    <Form>
                        <DialogContent sx={{ px: 3, py: 2 }}>
                            <Stack spacing={3}>
                                {/* Basic Information Section */}
                                <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                        Workspace Information
                                    </Typography>

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
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                            {option.label}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
                                disabled={updateLoading || isSubmitting}
                                sx={{ borderRadius: 2 }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={updateLoading || isSubmitting}
                                sx={{
                                    borderRadius: 2,
                                    px: 3,
                                    boxShadow: `0 4px 12px ${alpha(theme.palette.secondary.main, 0.3)}`,
                                }}
                            >
                                {updateLoading || isSubmitting ? 'Updating...' : 'Update Workspace'}
                            </Button>
                        </DialogActions>
                    </Form>
                )}
            </Formik>
        </Dialog>
    );
};

export default WorkspaceEditDialog;
