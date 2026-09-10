import React, { useEffect, useState, useRef } from 'react';
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
    Tabs,
    Tab,
    Paper,
    Chip,
    LinearProgress,
    Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import Input from '../shared/Input';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchRoles } from '../../redux/slices/rolesSlice';
import { fetchEmailTemplates } from '../../redux/slices/emailTemplateSlice';
import { 
    bulkInviteUsers, 
    inviteSingleUser,
    selectBulkInviteLoading,
    selectSingleInviteLoading 
} from '../../redux/slices/invitationSlice';
import { selectCurrentOrganization } from '../../redux/slices/organizationSlice';
import { selectUser } from '../../redux/slices/loginSlice';
import { useToast } from '../../hooks/useToast';
import { validateUserCsvFile } from '../../utils/fileValidation';
import type { CsvValidationResult } from '../../utils/fileValidation';
import EmailTemplatePreview from './EmailTemplatePreview';
import type { EmailPreviewData } from '../../interfaces/emailTemplateInterface';

interface UserCreationDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export interface UserFormData {
    email: string;
    role: string;
    org_id: string;
    role_id: string;
}

// Roles that are considered privileged and are restricted to the internal
// @quality-ai.com email domain (external collaborators may only be reviewers,
// annotators, or collectors).
const RESTRICTED_ROLES = new Set(['project_manager', 'workspace_manager']);

// Business rule: email must be well-formed with a real domain; role selection
// is cross-validated against the email's domain via the custom 'domain-role-match'
// test so privileged roles (project/workspace manager) can only be granted to
// @quality-ai.com addresses, while other domains are limited to reviewer/
// annotator/collector roles.
const validationSchema = Yup.object({
    email: Yup.string()
        .required('Email is required')
        .email('Please enter a valid email address')
        .matches(
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            'Please enter a valid email address with a proper domain (e.g., user@example.com)'
        ),
    role: Yup.string()
        .required('Role selection is required')
        .test('domain-role-match', 'This role is only available for @quality-ai.com emails', function (value) {
            const { email } = this.parent;
            if (!email) return true; // Skip validation if email is empty

            const isQualitestgroupDomain = email.toLowerCase().endsWith('@quality-ai.com');
            const restrictedRoles = ['project_manager', 'workspace_manager'];

            // If not qualitestgroup domain, only allow reviewer, annotator, and collector
            if (!isQualitestgroupDomain && value && !value.toLowerCase().includes('reviewer') && !value.toLowerCase().includes('annotator') && !value.toLowerCase().includes('collector')) {
                return this.createError({
                    message: 'Only Reviewer, Annotator, and Collector roles are available for non-quality-ai.com emails',
                });
            }

            // If restricted role and not qualitestgroup domain, fail
            if (!isQualitestgroupDomain && restrictedRoles.includes(value)) {
                return this.createError({
                    message: `${value.replaceAll(/_/g, ' ')} role requires a @quality-ai.com email address`,
                });
            }

            return true;
        }),
    org_id: Yup.string().required('Organization ID is required'),
    role_id: Yup.string().required('Role ID is required'),
});

/**
 * Component: UserCreationDialog
 *
 * Purpose: Dialog for inviting new users into an organization, either
 * individually (with role + email template selection) or in bulk via a CSV
 * upload, enforcing domain-based role restrictions along the way.
 *
 * Responsibilities:
 * - Tab 0 ("Individual Invite"): Formik form collecting email + role, filtered
 *   by the invitee's email domain, plus an email template picker and live preview.
 * - Tab 1 ("Bulk Upload"): CSV drag-and-drop/upload flow with client-side
 *   validation (`validateUserCsvFile`) and a shared email template for all invitees.
 * - Dispatches `inviteSingleUser` or `bulkInviteUsers` and reports outcome via toasts.
 *
 * Props:
 * - open (boolean): whether the dialog is visible.
 * - onClose (() => void): called to dismiss the dialog.
 * - onSuccess (() => void, optional): called after a successful invite/bulk invite.
 *
 * State:
 * - tabValue (number): active tab (0 = individual invite, 1 = bulk upload).
 * - csvFile (File | null): the validated CSV file staged for bulk upload.
 * - isDragOver (boolean): whether a file is currently being dragged over the drop zone.
 * - csvValidationErrors (string[]): client-side validation errors for the CSV file.
 * - selectedTemplateId (string): email template chosen for the individual invite.
 * - showEmailPreview (boolean): whether the individual-invite email preview is expanded.
 * - bulkSelectedTemplateId (string): email template chosen for the bulk invite.
 * - showBulkEmailPreview (boolean): whether the bulk-invite email preview is expanded.
 *
 * Redux: reads `state.roles`, `state.emailTemplates`, `selectBulkInviteLoading`,
 * `selectSingleInviteLoading` (invitationSlice), `selectCurrentOrganization`
 * (organizationSlice), `selectUser` (loginSlice); dispatches `fetchRoles`,
 * `fetchEmailTemplates`, `bulkInviteUsers`, `inviteSingleUser`.
 *
 * Custom hooks: `useToast` for success/error notifications.
 *
 * Side effects:
 * - Loads roles/email templates the first time the dialog opens (if not already loaded).
 * - Auto-selects a default email template (active one, else the first) for both
 *   the individual and bulk flows once templates are available.
 * - Resets all local state when the dialog closes.
 *
 * Business logic: `validationSchema`'s domain-role-match rule and
 * `getFilteredRoles`/`isQualitestgroupEmail` restrict privileged roles
 * (`RESTRICTED_ROLES`) to @quality-ai.com email addresses; other domains may
 * only be assigned reviewer, annotator, or collector roles.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const UserCreationDialog: React.FC<UserCreationDialogProps> = ({ open, onClose, onSuccess }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { roles, loading: rolesLoading } = useAppSelector((state) => state.roles);
    const { templates, loading: templatesLoading } = useAppSelector((state) => state.emailTemplates);
    const bulkInviteLoading = useAppSelector(selectBulkInviteLoading);
    const singleInviteLoading = useAppSelector(selectSingleInviteLoading);
    const emailTemplates = Array.isArray(templates) ? templates : [];
    const currentOrganization = useAppSelector(selectCurrentOrganization);
    const currentUser = useAppSelector(selectUser);

    // State for tab management and CSV upload
    const [tabValue, setTabValue] = useState(0);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [csvValidationErrors, setCsvValidationErrors] = useState<string[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [showEmailPreview, setShowEmailPreview] = useState(false);
    const [bulkSelectedTemplateId, setBulkSelectedTemplateId] = useState<string>('');
    const [showBulkEmailPreview, setShowBulkEmailPreview] = useState(false);

    // Fetch roles and email templates when component mounts or dialog opens
    // Only dispatches if the respective list is still empty, so reopening the
    // dialog doesn't refetch data that's already loaded.
    useEffect(() => {
        if (open) {
            if (roles.length === 0) {
                dispatch(fetchRoles());
            }
            if (emailTemplates.length === 0) {
                dispatch(fetchEmailTemplates());
            }
        }
    }, [open, roles.length, emailTemplates.length, dispatch]);

    // Set default template when templates are loaded
    // Runs whenever the template list (or either selection) changes; picks the
    // active template if one exists, otherwise falls back to the first template,
    // for both the individual and bulk invite pickers.
    useEffect(() => {
        if (emailTemplates.length > 0) {
            const activeTemplate = emailTemplates.find((t) => t.is_active === 1);
            const defaultId = activeTemplate ? activeTemplate._id : emailTemplates[0]._id;
            if (!selectedTemplateId) {
                setSelectedTemplateId(defaultId);
            }
            if (!bulkSelectedTemplateId) {
                setBulkSelectedTemplateId(defaultId);
            }
        }
    }, [emailTemplates, selectedTemplateId, bulkSelectedTemplateId]);

    // Reset state when dialog opens/closes
    // Ensures reopening the dialog starts from a clean slate (first tab, no
    // staged file, no stale validation errors or template selections).
    useEffect(() => {
        if (!open) {
            setTabValue(0);
            setCsvFile(null);
            setIsDragOver(false);
            setCsvValidationErrors([]);
            setSelectedTemplateId('');
            setShowEmailPreview(false);
            setBulkSelectedTemplateId('');
            setShowBulkEmailPreview(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [open]);

    // Monitor email validation to enforce role filtering
    // Intentionally a no-op effect: `getFilteredRoles`/rendering already react
    // to `roles` changes directly, so this only documents the dependency.
    useEffect(() => {
        // This effect runs whenever roles change to validate email-role combinations
    }, [roles]);

    /**
     * Builds and downloads a sample CSV template (email, role columns) so admins
     * know the expected bulk-upload format. Triggered by "Download CSV Template".
     */
    // CSV Utility Functions
    const generateCsvTemplate = () => {
        const csvContent = [
            ['email', 'role'],
            ['user1@example.com', 'workspace_manager'],
            ['user2@example.com', 'project_manager'],
            ['user3@example.com', 'annotator'],
            ['user4@example.com', 'reviewer'],
        ]
            .map((row) => row.join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = globalThis.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'user_upload_template.csv';
        link.click();
        globalThis.URL.revokeObjectURL(url);
    };

    /**
     * Validates and stages a CSV file selected via the file input. Triggered by
     * the user picking a file in the hidden `<input type="file">`. Rejects
     * non-CSV files and files failing `validateUserCsvFile`'s content checks,
     * surfacing errors instead of staging the file.
     * @param event - the file input's change event.
     */
    const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setCsvFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setCsvValidationErrors(['Please upload a valid CSV file.']);
            return;
        }

        try {
            const validationResult: CsvValidationResult = await validateUserCsvFile(file);

            if (!validationResult.isValid) {
                setCsvFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                setCsvValidationErrors(validationResult.errors || ['Unknown validation error']);
                return;
            }

            setCsvFile(file);
            setCsvValidationErrors([]);
            // File validated and loaded successfully
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to validate CSV file';
            setCsvFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setCsvValidationErrors([errorMessage]);
            console.error('CSV validation error:', error);
        }
    };

    /**
     * Submits the staged CSV file for bulk user invitation, triggered by the
     * "Send Invitations" button. Guards on a staged file, a resolvable
     * organization, and a selected email template before dispatching
     * `bulkInviteUsers`; closes the dialog and notifies the caller on success.
     */
    const handleBulkUserCreation = async () => {
        if (!csvFile) {
            toast.showError('Please upload a CSV file first');
            return;
        }

        if (!currentOrganization?._id) {
            toast.showError('Organization information is missing');
            return;
        }

        const bulkTemplate = emailTemplates.find((t) => t._id === bulkSelectedTemplateId);
        if (!bulkTemplate) {
            toast.showError('Please select an email template');
            return;
        }

        try {
            await dispatch(bulkInviteUsers({ 
                file: csvFile, 
                org_id: currentOrganization._id,
                subject: bulkTemplate.subject,
                body: bulkTemplate.body,
            })).unwrap();

            toast.showSuccess('Bulk invitations sent successfully!');
            
            // Reset state and close dialog
            setCsvFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            
            onClose();
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send bulk invitations. Please try again.';
            toast.showError(errorMessage);
            console.error('Bulk invite error:', error);
        }
    };

    /**
     * Checks whether an email belongs to the internal @quality-ai.com domain,
     * which gates access to privileged roles throughout this dialog.
     * @param email - the invitee's email address.
     * @returns True if the email ends with '@quality-ai.com'.
     */
    // Check if email is from quality-ai.com domain
    const isQualitestgroupEmail = (email: string): boolean => {
        return email.toLowerCase().endsWith('@quality-ai.com');
    };

    /**
     * Narrows the available role options based on the invitee's email domain —
     * external (non @quality-ai.com) emails may only be assigned reviewer,
     * annotator, or collector roles, mirroring the `domain-role-match` Yup rule.
     * @param email - the invitee's email address.
     * @returns The subset of `roles` selectable for that email.
     */
    // Filter roles based on email domain
    const getFilteredRoles = (email: string): typeof roles => {
        if (isQualitestgroupEmail(email)) {
            return roles; // Show all roles for quality-ai.com emails
        }
        // Show only reviewer, annotator, and collector roles for other domains
        return roles.filter(
            (role) =>
                role.role_id.toLowerCase().includes('reviewer') ||
                role.role_id.toLowerCase().includes('annotator') ||
                role.role_id.toLowerCase().includes('collector')
        );
    };

    /** Builds Formik's initial values for the individual-invite form, seeding `org_id` from the current organization. */
    // Get initial values with organization ID from current organization
    const getInitialValues = (): UserFormData => ({
        email: '',
        role: '',
        org_id: currentOrganization?._id || '',
        role_id: '',
    });

    /**
     * Formik submit handler for the individual-invite form. Resolves the
     * selected email template, substitutes its variables with the actual
     * invitee/organization/inviter details, then dispatches `inviteSingleUser`.
     * @param values - validated form values (email, role, org_id, role_id).
     * @throws Nothing — all error paths are caught and surfaced via toast.
     */
    const handleSubmit = async (values: UserFormData) => {
        try {
            // Get selected template
            const selectedTemplate = emailTemplates.find((t) => t._id === selectedTemplateId);
            if (!selectedTemplate) {
                toast.showError('Please select an email template');
                return;
            }

            // Prepare preview data with actual values from the form
            const inviterName = currentUser?.name || currentUser?.username || currentUser?.email || 'Team Member';
            const formattedRole = values.role
                ? values.role.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                : 'Team Member';
            const previewData = {
                recipientEmail: values.email,
                recipientName: values.email.split('@')[0],
                organizationName: currentOrganization?.name || 'Your Organization',
                inviterName,
                invitationLink: `${globalThis.location?.origin || 'http://localhost:5173'}/accept-invitation`,
                role: formattedRole,
            };

            // Replace variables in subject and body with actual values
            const replaceVariables = (text: string): string => {
                return text
                    .replaceAll('{{recipientEmail}}', previewData.recipientEmail)
                    .replaceAll('{{recipientName}}', previewData.recipientName)
                    .replaceAll('{{organizationName}}', previewData.organizationName)
                    .replaceAll('{{inviterName}}', previewData.inviterName)
                    .replaceAll('{{invitationLink}}', previewData.invitationLink)
                    .replaceAll('{{role}}', previewData.role);
            };

            // Prepare invitation data with replaced variables
            const invitationData = {
                email: values.email,
                org_id: values.org_id,
                role: values.role_id,
                subject: replaceVariables(selectedTemplate.subject),
                body: replaceVariables(selectedTemplate.body),
            };

            // Use inviteSingleUser API
            await dispatch(inviteSingleUser(invitationData)).unwrap();

            // Show success toast
            toast.showSuccess(`Invitation sent to ${values.email} using template "${selectedTemplate.name}" successfully!`);

            onClose(); // Close dialog on success

            // Call onSuccess callback if provided
            if (onSuccess) {
                onSuccess();
            }
        } catch (error: unknown) {
            console.error('Failed to send invitation:', error);
            // Robust error extraction for all error shapes
            let errorMessage = 'Failed to send invitation. Please try again.';
            // If error is a string
            if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object') {
                // If error is a plain object or has nested structure
                const maybeError = error as any;
                if (maybeError?.response?.data?.message) {
                    errorMessage = maybeError.response.data.message;
                } else if (maybeError?.response?.data?.error) {
                    errorMessage = maybeError.response.data.error;
                } else if (maybeError?.message) {
                    errorMessage = maybeError.message;
                } else if (maybeError?.error) {
                    errorMessage = maybeError.error;
                }
            }
            toast.showError(errorMessage);
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
                        <PersonAddOutlinedIcon />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {tabValue === 0 ? 'Invite User' : 'Bulk Upload Users'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {tabValue === 0
                                ? 'Send an invitation to a new user. They will receive an email with a link to the QualiCollect login page.'
                                : 'Upload multiple users at once using a CSV file with email and role columns.'}
                        </Typography>
                    </Box>
                </Stack>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 3, py: 2, overflow: 'auto' }}>
                {/* Tabs for switching between individual and bulk upload */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={tabValue} onChange={(_, newValue) => {
                        setTabValue(newValue);
                        if (newValue !== 1) {
                            setCsvValidationErrors([]);
                        }
                    }} variant="fullWidth">
                        <Tab
                            label="Individual Invite"
                            icon={<PersonAddOutlinedIcon />}
                            iconPosition="start"
                            sx={{ textTransform: 'none' }}
                        />
                        <Tab
                            label="Bulk Upload"
                            icon={<GroupAddOutlinedIcon />}
                            iconPosition="start"
                            sx={{ textTransform: 'none' }}
                        />
                    </Tabs>
                </Box>

                {/* Individual User Invitation Tab */}
                {tabValue === 0 && (
                    <Formik
                        initialValues={getInitialValues()}
                        validationSchema={validationSchema}
                        onSubmit={handleSubmit}
                        enableReinitialize
                        validateOnChange={true}
                        validateOnBlur={true}
                    >
                        {({
                            values,
                            errors,
                            touched,
                            handleChange,
                            handleBlur,
                            setFieldValue,
                            isSubmitting,
                            isValid,
                        }) => {
                            return (
                                <Form>
                                    <Stack spacing={3}>
                                        {/* User Invitation Section */}
                                        <Box>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                                User Details
                                            </Typography>
                                            <Stack spacing={2}>
                                                <Input
                                                    name="email"
                                                    label="Email Address"
                                                    type="email"
                                                    placeholder="Enter email address"
                                                    value={values.email}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    error={touched.email && Boolean(errors.email)}
                                                    helperText={
                                                        touched.email
                                                            ? errors.email
                                                            : 'An invitation will be sent to this email'
                                                    }
                                                    required
                                                    startIcon={<EmailOutlinedIcon />}
                                                />

                                                <Input
                                                    name="role"
                                                    label="Role"
                                                    placeholder="Select role"
                                                    value={values.role}
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        const selectedRole = getFilteredRoles(values.email).find(
                                                            (r) => r.role_id === e.target.value,
                                                        );
                                                        if (selectedRole) {
                                                            setFieldValue('role_id', selectedRole.role_id);
                                                        }
                                                    }}
                                                    onBlur={handleBlur}
                                                    error={touched.role && Boolean(errors.role)}
                                                    helperText={
                                                        touched.role ? errors.role : 'Select the role for this user'
                                                    }
                                                    required
                                                    startIcon={<SecurityOutlinedIcon />}
                                                    select
                                                    disabled={rolesLoading}
                                                >
                                                    {getFilteredRoles(values.email).map((role) => (
                                                        <MenuItem key={role._id} value={role.role_id}>
                                                            <Box>
                                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                    {role.role_id
                                                                        .split('_')
                                                                        .map(
                                                                            (word) =>
                                                                                word.charAt(0).toUpperCase() +
                                                                                word.slice(1),
                                                                        )
                                                                        .join(' ')}
                                                                </Typography>
                                                            </Box>
                                                        </MenuItem>
                                                    ))}
                                                </Input>

                                                {/* Domain restriction warning for restricted roles */}
                                                {RESTRICTED_ROLES.has(values.role) && (
                                                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            Domain Restriction
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            The <strong>{values.role.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</strong> role requires a <strong>@quality-ai.com</strong> email address.
                                                        </Typography>
                                                    </Alert>
                                                )}

                                                {/* Info alert for non-qualitestgroup emails */}
                                                {values.email && !isQualitestgroupEmail(values.email) && (
                                                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            Limited Roles Available
                                                        </Typography>
                                                        <Typography variant="body2">
                                                            Email addresses outside of <strong>@quality-ai.com</strong> domain can only be assigned <strong>Reviewer</strong>, <strong>Annotator</strong>, or <strong>Collector</strong> roles.
                                                        </Typography>
                                                    </Alert>
                                                )}

                                                {/* Email Template Selection */}
                                                <Box sx={{ mt: 1 }}>
                                                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                                                        Email Template
                                                    </Typography>
                                                    <Input
                                                        label="Invitation Email Template"
                                                        placeholder="Select email template"
                                                        value={selectedTemplateId}
                                                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                                                        helperText="Choose the email template for the invitation"
                                                        startIcon={<EmailOutlinedIcon />}
                                                        select
                                                        disabled={templatesLoading}
                                                        fullWidth
                                                    >
                                                        {emailTemplates.map((template) => (
                                                            <MenuItem key={template._id} value={template._id}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <Typography
                                                                        variant="body2"
                                                                        sx={{ fontWeight: 500 }}
                                                                    >
                                                                        {template.name}
                                                                    </Typography>
                                                                    {template.is_active === 1 && (
                                                                        <Chip
                                                                            label="Active"
                                                                            size="small"
                                                                            color="success"
                                                                            variant="outlined"
                                                                            sx={{
                                                                                height: 18,
                                                                                fontSize: '0.65rem',
                                                                            }}
                                                                        />
                                                                    )}
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{ color: 'text.secondary', ml: 'auto' }}
                                                                    >
                                                                        {template.role}
                                                                    </Typography>
                                                                </Box>
                                                            </MenuItem>
                                                        ))}
                                                    </Input>

                                                    {selectedTemplateId && (
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            onClick={() => setShowEmailPreview(!showEmailPreview)}
                                                            sx={{ mt: 1, borderRadius: 2 }}
                                                        >
                                                            {showEmailPreview ? 'Hide Preview' : 'Preview Email'}
                                                        </Button>
                                                    )}
                                                </Box>

                                                {/* Hidden fields for org_id and role_id */}
                                                <input type="hidden" name="org_id" value={values.org_id} />
                                                <input type="hidden" name="role_id" value={values.role_id} />
                                            </Stack>
                                        </Box>

                                        {/* Email Preview Section */}
                                        {showEmailPreview && selectedTemplateId && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                                    Email Preview
                                                </Typography>
                                                {(() => {
                                                    const selectedTemplate = emailTemplates.find(
                                                        (t) => t._id === selectedTemplateId,
                                                    );
                                                    if (!selectedTemplate) return null;

                                                    const previewData: EmailPreviewData = {
                                                        recipientEmail: values.email || 'user@example.com',
                                                        recipientName: values.email
                                                            ? values.email.split('@')[0]
                                                            : 'User',
                                                        organizationName:
                                                            currentOrganization?.name || 'Your Organization',
                                                        inviterName: currentUser?.name || currentUser?.username || currentUser?.email || 'Team Member',
                                                        invitationLink: `${
                                                            globalThis.location?.origin || 'http://localhost:5173'
                                                        }/accept-invitation`,
                                                        role: values.role
                                                            ? values.role.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                                                            : 'Team Member',
                                                    };

                                                    const replaceVariables = (text: string): string => {
                                                        return text
                                                            .replaceAll(
                                                                '{{recipientEmail}}',
                                                                previewData.recipientEmail,
                                                            )
                                                            .replaceAll('{{recipientName}}', previewData.recipientName)
                                                            .replaceAll(
                                                                '{{organizationName}}',
                                                                previewData.organizationName,
                                                            )
                                                            .replaceAll('{{inviterName}}', previewData.inviterName)
                                                            .replaceAll('{{invitationLink}}', previewData.invitationLink)
                                                            .replaceAll('{{role}}', previewData.role);
                                                    };

                                                    return (
                                                        <EmailTemplatePreview
                                                            subject={replaceVariables(selectedTemplate.subject)}
                                                            body={replaceVariables(selectedTemplate.body)}
                                                            previewData={previewData}
                                                        />
                                                    );
                                                })()}
                                            </Box>
                                        )}
                                    </Stack>

                                    {/* Individual Form Actions */}
                                    <DialogActions sx={{ px: 0, pt: 3, pb: 0, gap: 1 }}>
                                        <Button
                                            onClick={onClose}
                                            variant="outlined"
                                            disabled={singleInviteLoading || isSubmitting}
                                            sx={{ borderRadius: 2 }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            disabled={singleInviteLoading || isSubmitting || !isValid || !selectedTemplateId}
                                            sx={{
                                                borderRadius: 2,
                                                px: 3,
                                                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                            }}
                                        >
                                            {singleInviteLoading || isSubmitting
                                                ? 'Sending Invitation...'
                                                : 'Send Invitation'}
                                        </Button>
                                    </DialogActions>
                                </Form>
                            );
                        }}
                    </Formik>
                )}

                {/* Bulk Upload Tab */}
                {tabValue === 1 && (
                    <Stack spacing={3}>
                        {/* Email Template Selection for Bulk Upload */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                Email Template
                            </Typography>
                            <Input
                                label="Invitation Email Template"
                                placeholder="Select email template"
                                value={bulkSelectedTemplateId}
                                onChange={(e) => setBulkSelectedTemplateId(e.target.value)}
                                helperText="This template will be used for all invitations in the CSV"
                                startIcon={<EmailOutlinedIcon />}
                                select
                                disabled={templatesLoading}
                                fullWidth
                            >
                                {emailTemplates.map((template) => (
                                    <MenuItem key={template._id} value={template._id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                {template.name}
                                            </Typography>
                                            {template.is_active === 1 && (
                                                <Chip
                                                    label="Active"
                                                    size="small"
                                                    color="success"
                                                    variant="outlined"
                                                    sx={{ height: 18, fontSize: '0.65rem' }}
                                                />
                                            )}
                                            <Typography
                                                variant="caption"
                                                sx={{ color: 'text.secondary', ml: 'auto' }}
                                            >
                                                {template.role}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Input>

                            {bulkSelectedTemplateId && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => setShowBulkEmailPreview(!showBulkEmailPreview)}
                                    sx={{ mt: 1, borderRadius: 2 }}
                                >
                                    {showBulkEmailPreview ? 'Hide Preview' : 'Preview Email'}
                                </Button>
                            )}
                        </Box>

                        {/* Bulk Email Preview */}
                        {showBulkEmailPreview && bulkSelectedTemplateId && (() => {
                            const bulkTemplate = emailTemplates.find((t) => t._id === bulkSelectedTemplateId);
                            if (!bulkTemplate) return null;
                            const bulkPreviewData: EmailPreviewData = {
                                recipientEmail: 'user@example.com',
                                recipientName: 'User',
                                organizationName: currentOrganization?.name || 'Your Organization',
                                inviterName: currentUser?.name || currentUser?.username || currentUser?.email || 'Team Member',
                                invitationLink: `${globalThis.location?.origin || 'http://localhost:5173'}/accept-invitation`,
                                role: 'Team Member',
                            };
                            const replaceBulkVars = (text: string): string =>
                                text
                                    .replaceAll('{{recipientEmail}}', bulkPreviewData.recipientEmail)
                                    .replaceAll('{{recipientName}}', bulkPreviewData.recipientName)
                                    .replaceAll('{{organizationName}}', bulkPreviewData.organizationName)
                                    .replaceAll('{{inviterName}}', bulkPreviewData.inviterName)
                                    .replaceAll('{{invitationLink}}', bulkPreviewData.invitationLink)
                                    .replaceAll('{{role}}', bulkPreviewData.role);
                            return (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                                        Template Preview (sample data)
                                    </Typography>
                                    <EmailTemplatePreview
                                        subject={replaceBulkVars(bulkTemplate.subject)}
                                        body={replaceBulkVars(bulkTemplate.body)}
                                        previewData={bulkPreviewData}
                                    />
                                </Box>
                            );
                        })()}

                        {/* CSV Upload Section */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                Upload CSV File
                            </Typography>

                            {/* Template Download Button */}
                            <Box sx={{ mb: 2 }}>
                                <Button
                                    startIcon={<DownloadOutlinedIcon />}
                                    onClick={generateCsvTemplate}
                                    variant="outlined"
                                    size="small"
                                    sx={{ textTransform: 'none' }}
                                >
                                    Download CSV Template
                                </Button>
                                <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>
                                    Use this template to format your user data
                                </Typography>
                            </Box>

                            {/* File Upload Area */}
                            <Paper
                                sx={{
                                    p: 3,
                                    border: `2px dashed ${theme.palette.divider}`,
                                    borderColor: isDragOver
                                        ? theme.palette.primary.main
                                        : csvFile
                                        ? theme.palette.success.main
                                        : theme.palette.divider,
                                    backgroundColor: isDragOver
                                        ? alpha(theme.palette.primary.main, 0.05)
                                        : csvFile
                                        ? alpha(theme.palette.success.main, 0.05)
                                        : alpha(theme.palette.action.hover, 0.02),
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        borderColor: theme.palette.primary.main,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                    },
                                }}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragOver(true);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    setIsDragOver(false);
                                }}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    setIsDragOver(false);
                                    const files = e.dataTransfer.files;
                                    if (files.length > 0) {
                                        const file = files[0];
                                        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                                            setCsvFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                            setCsvValidationErrors(['Please upload a valid CSV file.']);
                                            return;
                                        }

                                        try {
                                            const validationResult: CsvValidationResult = await validateUserCsvFile(file);

                                            if (!validationResult.isValid) {
                                                setCsvFile(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                                setCsvValidationErrors(validationResult.errors || ['Unknown validation error']);
                                                return;
                                            }

                                            setCsvFile(file);
                                            setCsvValidationErrors([]);
                                            // File validated and loaded successfully
                                        } catch (error) {
                                            const errorMessage = error instanceof Error ? error.message : 'Failed to validate CSV file';
                                            setCsvFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                            setCsvValidationErrors([errorMessage]);
                                            console.error('CSV validation error:', error);
                                        }
                                    }
                                }}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleCsvUpload}
                                    style={{ display: 'none' }}
                                />
                                <Stack spacing={2} alignItems="center">
                                    <UploadFileOutlinedIcon
                                        sx={{
                                            fontSize: 48,
                                            color: csvFile ? 'success.main' : 'text.secondary',
                                        }}
                                    />
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {csvFile ? csvFile.name : 'Upload CSV File'}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {csvFile
                                                ? 'Click to choose a different file'
                                                : 'Click to select or drag & drop your CSV file here'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Required columns: email, role
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Box>

                        {/* CSV Validation Errors */}
                        {csvValidationErrors.length > 0 && (
                            <Alert severity="error" sx={{ borderRadius: 2 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                    CSV Validation Errors:
                                </Typography>
                                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                    {csvValidationErrors.map((error, index) => (
                                        <Typography key={index} component="li" variant="body2" sx={{ mb: 0.5 }}>
                                            {error}
                                        </Typography>
                                    ))}
                                </Box>
                            </Alert>
                        )}

                        {/* Bulk Upload Progress */}
                        {bulkInviteLoading && (
                            <Box>
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                    Sending invitations...
                                </Typography>
                                <LinearProgress />
                            </Box>
                        )}

                        {/* File Info */}
                        {csvFile && !bulkInviteLoading && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    File loaded: <strong>{csvFile.name}</strong> ({(csvFile.size / 1024).toFixed(2)} KB)
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    The file will be processed and validated by the server when you click "Send Invitations".
                                </Typography>
                            </Alert>
                        )}

                        {/* Bulk Upload Actions */}
                        <DialogActions sx={{ px: 0, pt: 3, pb: 0, gap: 1 }}>
                            <Button
                                onClick={onClose}
                                variant="outlined"
                                disabled={bulkInviteLoading}
                                sx={{ borderRadius: 2 }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    setCsvFile(null);
                                    setCsvValidationErrors([]);
                                    if (fileInputRef.current) {
                                        fileInputRef.current.value = '';
                                    }
                                }}
                                variant="outlined"
                                disabled={!csvFile || bulkInviteLoading}
                                sx={{ borderRadius: 2 }}
                            >
                                Clear
                            </Button>
                            <Button
                                onClick={handleBulkUserCreation}
                                variant="contained"
                                disabled={!csvFile || !bulkSelectedTemplateId || bulkInviteLoading}
                                sx={{
                                    borderRadius: 2,
                                    px: 3,
                                    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                }}
                            >
                                {bulkInviteLoading ? 'Sending Invitations...' : 'Send Invitations'}
                            </Button>
                        </DialogActions>
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default UserCreationDialog;
