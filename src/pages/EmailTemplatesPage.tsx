import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
    Box,
    Typography,
    Button,
    Container,
    useTheme,
    alpha,
    Card,
    CardContent,
    CardActions,
    Chip,
    Stack,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    CircularProgress,
    Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
// import StarOutlineIcon from '@mui/icons-material/StarOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CloseIcon from '@mui/icons-material/Close';

// Lazy load heavy components
const EmailTemplateEditor = lazy(() => import('../components/common/EmailTemplateEditor'));
const EmailTemplatePreview = lazy(() => import('../components/common/EmailTemplatePreview'));

import ConfirmationDialog from '../components/common/ConfirmationDialog';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
    fetchEmailTemplates,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    // setDefaultEmailTemplate,
    selectEmailTemplates,
    selectEmailTemplateLoading,
    selectEmailTemplateError,
    clearError,
} from '../redux/slices/emailTemplateSlice';
import { selectCurrentOrganization } from '../redux/slices/organizationSlice';
import { useToast } from '../hooks/useToast';
import type {
    EmailTemplate,
    CreateEmailTemplate,
    UpdateEmailTemplate,
    EmailPreviewData,
} from '../interfaces/emailTemplateInterface';

type PageMode = 'list' | 'create' | 'edit' | 'preview';

/**
 * Component: EmailTemplatesPage
 *
 * Purpose: Admin page for managing organization email templates — list,
 * create, edit, preview (with sample variable substitution), and delete.
 *
 * Responsibilities:
 * - Load templates for the current organization and render them as cards.
 * - Switch between list/create/edit/preview modes without separate routes.
 * - Substitute `{{variable}}` placeholders with sample data for the preview mode.
 * - Confirm destructive delete via `ConfirmationDialog`.
 *
 * Props: none.
 *
 * State:
 * - `mode` — which view is active ('list' | 'create' | 'edit' | 'preview').
 * - `selectedTemplate` — the template being edited/previewed, if any.
 * - `anchorEl` / `actionTemplateId` — the open per-card action menu's anchor
 *   element and which template it belongs to.
 * - `deleteDialogOpen` / `templateToDelete` / `deleteLoading` — delete
 *   confirmation dialog state.
 *
 * Redux (slice: emailTemplateSlice):
 * - Selectors: `selectEmailTemplates`, `selectEmailTemplateLoading`, `selectEmailTemplateError`.
 * - Thunks/actions dispatched: `fetchEmailTemplates`, `createEmailTemplate`,
 *   `updateEmailTemplate`, `deleteEmailTemplate`, `clearError`.
 * - Also reads `selectCurrentOrganization` (organizationSlice) for preview sample data.
 *
 * Custom hooks: `useToast` (`showSuccess`/`showError`).
 *
 * API calls: all via the Redux thunks above (no direct axios calls in this file).
 *
 * Major child components: `EmailTemplateEditor`, `EmailTemplatePreview` (both
 * lazy-loaded), `ConfirmationDialog`.
 *
 * Side effects: see the two `useEffect` hooks below (initial load, error toast).
 *
 * Business logic: `replaceVariables` substitutes known `{{...}}` placeholders
 * with sample recipient/org/inviter data so admins can preview a realistic
 * rendering before the template is actually sent.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const EmailTemplatesPage: React.FC = () => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const toast = useToast();

    const [mode, setMode] = useState<PageMode>('list');
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [actionTemplateId, setActionTemplateId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Redux state
    const templatesFromState = useAppSelector(selectEmailTemplates);
    // Defensive guard: ensures a non-array response from the API/slice never crashes the .map() below.
    const templates: EmailTemplate[] = Array.isArray(templatesFromState) ? templatesFromState : [];
    const loading = useAppSelector(selectEmailTemplateLoading);
    const error = useAppSelector(selectEmailTemplateError);
    const currentOrganization = useAppSelector(selectCurrentOrganization);

    // Sample preview data
    const previewData: EmailPreviewData = {
        recipientEmail: 'john.doe@example.com',
        recipientName: 'John Doe',
        organizationName: currentOrganization?.name || 'Sample Organization',
        inviterName: 'Admin User',
        invitationLink: 'http://localhost:5173/accept-invitation',
        role: 'Member',
    };

    // Load templates on mount
    useEffect(() => {
        dispatch(fetchEmailTemplates());
    }, [dispatch]);

    // Handle errors
    // Surfaces any slice-level error as a toast whenever it changes, then
    // clears it from Redux state so the same error doesn't re-toast on a
    // later unrelated re-render.
    useEffect(() => {
        if (error) {
            toast.showError(error);
            dispatch(clearError());
        }
    }, [error, toast, dispatch]);

    /** Switches to create mode with no template pre-selected; bound to "Create First Template" / the FAB. */
    const handleCreate = () => {
        setMode('create');
        setSelectedTemplate(null);
    };

    /** Switches to edit mode for the given template; bound to the "Edit" button/menu item. */
    const handleEdit = (template: EmailTemplate) => {
        setSelectedTemplate(template);
        setMode('edit');
        handleCloseMenu();
    };

    /** Switches to preview mode for the given template; bound to the "Preview" button/menu item. */
    const handlePreview = (template: EmailTemplate) => {
        setSelectedTemplate(template);
        setMode('preview');
        handleCloseMenu();
    };

    /** Opens the delete-confirmation dialog for the given template; bound to the "Delete" menu item. */
    const handleDelete = (template: EmailTemplate) => {
        setTemplateToDelete(template);
        setDeleteDialogOpen(true);
        handleCloseMenu();
    };

    /**
     * Confirms deletion of `templateToDelete` via the `deleteEmailTemplate`
     * thunk, shows a success/error toast, and closes the dialog on success.
     * Triggered by the "Delete" button in the confirmation dialog.
     */
    const handleDeleteConfirm = async () => {
        if (!templateToDelete) return;

        setDeleteLoading(true);
        try {
            await dispatch(deleteEmailTemplate(templateToDelete._id)).unwrap();
            toast.showSuccess('Template deleted successfully');
            setDeleteDialogOpen(false);
            setTemplateToDelete(null);
        } catch (error: any) {
            console.error('Delete template error:', error);
            toast.showError('Failed to delete template');
        } finally {
            setDeleteLoading(false);
        }
    };

    /** Dismisses the delete-confirmation dialog without deleting; bound to its "Cancel" action. */
    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
        setTemplateToDelete(null);
    };

    // const handleSetDefault = async (templateId: string) => {
    //     try {
    //         await dispatch(
    //             setDefaultEmailTemplate({
    //                 templateId,
    //             }),
    //         ).unwrap();
    //         toast.showSuccess('Default template updated successfully');
    //     } catch (error: any) {
    //         console.error('Set default template error:', error);
    //         toast.showError('Failed to set default template');
    //     }
    //     handleCloseMenu();
    // };

    /**
     * Persists the editor's template data by dispatching either
     * `createEmailTemplate` or `updateEmailTemplate` depending on the current
     * mode, then returns to the list view on success.
     * Triggered by the editor's save action.
     * @param templateData - the create or update payload from `EmailTemplateEditor`
     */
    const handleSave = async (templateData: CreateEmailTemplate | UpdateEmailTemplate) => {
        try {
            if (mode === 'create') {
                await dispatch(createEmailTemplate(templateData as CreateEmailTemplate)).unwrap();
                toast.showSuccess('Template created successfully');
            } else if (mode === 'edit') {
                await dispatch(updateEmailTemplate(templateData as UpdateEmailTemplate)).unwrap();
                toast.showSuccess('Template updated successfully');
            }
            setMode('list');
            setSelectedTemplate(null);
        } catch (error: any) {
            console.error('Save template error:', error);
            toast.showError(`Failed to ${mode === 'create' ? 'create' : 'update'} template`);
        }
    };

    /** Discards the editor/preview and returns to the list view; bound to "Cancel"/"Close Preview". */
    const handleCancel = () => {
        setMode('list');
        setSelectedTemplate(null);
    };

    /** Opens the per-template action menu, anchored to the clicked "more" icon button. */
    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, templateId: string) => {
        setAnchorEl(event.currentTarget);
        setActionTemplateId(templateId);
    };

    /** Closes the per-template action menu. */
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setActionTemplateId(null);
    };

    /**
     * Replaces every known `{{variable}}` placeholder in a template's subject/body
     * with the corresponding sample value, so the Preview mode shows realistic output.
     * @param text - the raw template subject or body containing `{{...}}` placeholders
     * @returns the text with all recognized placeholders substituted
     */
    const replaceVariables = (text: string): string => {
        let result = text;
        result = result.replaceAll('{{recipientEmail}}', previewData.recipientEmail);
        result = result.replaceAll('{{recipientName}}', previewData.recipientName);
        result = result.replaceAll('{{organizationName}}', previewData.organizationName);
        result = result.replaceAll('{{inviterName}}', previewData.inviterName);
        result = result.replaceAll('{{invitationLink}}', previewData.invitationLink);
        result = result.replaceAll('{{role}}', previewData.role);
        return result;
    };

    /** Renders the list mode: loading/empty states, the template card grid, action menu, and create FAB. */
    const renderTemplateList = () => (
        <>
            {/* Loading State */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Empty State */}
            {!loading && templates.length === 0 && (
                <Box
                    sx={{
                        textAlign: 'center',
                        py: 8,
                        backgroundColor: alpha(theme.palette.primary.main, 0.02),
                        borderRadius: 2,
                        border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                    }}
                >
                    <EmailOutlinedIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1 }}>
                        No Email Templates
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Create your first email template to get started
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
                        Create First Template
                    </Button>
                </Box>
            )}

            {/* Template Grid */}
            {!loading && templates.length > 0 && (
                <>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {templates.map((template) => (
                            <Box
                                key={template._id}
                                sx={{ minWidth: 300, flex: '1 1 300px', maxWidth: 'calc(33.333% - 16px)' }}
                            >
                                <Card
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            boxShadow: theme.shadows[8],
                                            transform: 'translateY(-2px)',
                                        },
                                    }}
                                >
                                    <CardContent sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <EmailOutlinedIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                                            <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                                                {template.name}
                                            </Typography>
                                            <IconButton size="small" onClick={(e) => handleMenuClick(e, template._id)}>
                                                <MoreVertIcon />
                                            </IconButton>
                                        </Box>

                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                mb: 2,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        >
                                            Subject: {template.subject}
                                        </Typography>

                                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                                            <Chip
                                                size="small"
                                                label={template.is_active === 1 ? 'Active' : 'Inactive'}
                                                color={template.is_active === 1 ? 'success' : 'default'}
                                                variant="outlined"
                                            />
                                            {template.variables && template.variables.length > 0 && (
                                                <Chip
                                                    size="small"
                                                    label={`${template.variables.length} Variables`}
                                                    variant="outlined"
                                                />
                                            )}
                                        </Stack>
                                    </CardContent>

                                    <CardActions sx={{ px: 2, pb: 2 }}>
                                        <Button
                                            size="small"
                                            startIcon={<VisibilityOutlinedIcon />}
                                            onClick={() => handlePreview(template)}
                                        >
                                            Preview
                                        </Button>
                                        <Button
                                            size="small"
                                            startIcon={<EditOutlinedIcon />}
                                            onClick={() => handleEdit(template)}
                                        >
                                            Edit
                                        </Button>
                                    </CardActions>
                                </Card>
                            </Box>
                        ))}
                    </Box>

                    {/* Action Menu */}
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleCloseMenu}
                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    >
                        <MenuItem
                            onClick={() => {
                                const template = templates.find((t) => t._id === actionTemplateId);
                                if (template) handleEdit(template);
                            }}
                        >
                            <ListItemIcon>
                                <EditOutlinedIcon fontSize="small" />
                            </ListItemIcon>
                            Edit Template
                        </MenuItem>

                        <MenuItem
                            onClick={() => {
                                const template = templates.find((t) => t._id === actionTemplateId);
                                if (template) handlePreview(template);
                            }}
                        >
                            <ListItemIcon>
                                <VisibilityOutlinedIcon fontSize="small" />
                            </ListItemIcon>
                            Preview Template
                        </MenuItem>

                        {/* <MenuItem
                            onClick={() => {
                                if (actionTemplateId) handleSetDefault(actionTemplateId);
                            }}
                        >
                            <ListItemIcon>
                                <StarOutlineIcon fontSize="small" />
                            </ListItemIcon>
                            Set as Default
                        </MenuItem> */}

                        <MenuItem
                            onClick={() => {
                                const template = templates.find((t) => t._id === actionTemplateId);
                                if (template) handleDelete(template);
                            }}
                            sx={{ color: 'error.main' }}
                        >
                            <ListItemIcon>
                                <DeleteOutlineIcon fontSize="small" color="error" />
                            </ListItemIcon>
                            Delete Template
                        </MenuItem>
                    </Menu>

                    {/* Create Button */}
                    <Fab
                        color="primary"
                        aria-label="add template"
                        onClick={handleCreate}
                        sx={{
                            position: 'fixed',
                            bottom: 24,
                            right: 24,
                        }}
                    >
                        <AddIcon />
                    </Fab>
                </>
            )}
        </>
    );

    /** Renders the lazy-loaded template editor for create/edit mode. */
    const renderTemplateEditor = () => (
        <Suspense fallback={<CircularProgress />}>
            <EmailTemplateEditor
                template={selectedTemplate || undefined}
                onSave={handleSave}
                onCancel={handleCancel}
                isEditing={mode === 'edit'}
            />
        </Suspense>
    );

    /** Renders the lazy-loaded preview mode with variable-substituted subject/body. */
    const renderTemplatePreview = () => (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        Preview: {selectedTemplate?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        This is how the email will appear to recipients
                    </Typography>
                </Box>
                <Button onClick={handleCancel} startIcon={<CloseIcon />} variant="outlined">
                    Close Preview
                </Button>
            </Box>

            <Suspense fallback={<CircularProgress />}>
                {selectedTemplate && (
                    <EmailTemplatePreview
                        subject={replaceVariables(selectedTemplate.subject)}
                        body={replaceVariables(selectedTemplate.body)}
                        previewData={previewData}
                    />
                )}
            </Suspense>
        </Box>
    );

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            {mode === 'list' && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                        Email Templates
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Create and manage email templates for user invitations and notifications
                    </Typography>
                </Box>
            )}

            {/* Main Content */}
            {mode === 'list' && renderTemplateList()}
            {(mode === 'create' || mode === 'edit') && renderTemplateEditor()}
            {mode === 'preview' && renderTemplatePreview()}

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={deleteDialogOpen}
                title="Delete Email Template"
                message={`Are you sure you want to delete the template "${templateToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                confirmColor="error"
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                loading={deleteLoading}
            />
        </Container>
    );
};

export default EmailTemplatesPage;
