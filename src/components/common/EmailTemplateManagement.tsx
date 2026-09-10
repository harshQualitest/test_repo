import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Button,
    Box,
    Typography,
    IconButton,
    Card,
    CardContent,
    CardActions,
    Chip,
    Stack,
    ListItemIcon,
    useTheme,
    alpha,
    Fab,
    Menu,
    MenuItem,
    CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
// import StarOutlineIcon from '@mui/icons-material/StarOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EmailTemplateEditor from './EmailTemplateEditor';
import EmailTemplatePreview from './EmailTemplatePreview';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
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
} from '../../redux/slices/emailTemplateSlice';
import { selectCurrentOrganization } from '../../redux/slices/organizationSlice';
import { useToast } from '../../hooks/useToast';
import type {
    EmailTemplate,
    CreateEmailTemplate,
    UpdateEmailTemplate,
    EmailPreviewData,
} from '../../interfaces/emailTemplateInterface';

interface EmailTemplateManagementProps {
    open: boolean;
    onClose: () => void;
}

type DialogMode = 'list' | 'create' | 'edit' | 'preview';

/**
 * Component: EmailTemplateManagement
 *
 * Purpose: Full-screen dialog for administering an organization's email
 * templates — list, create, edit, preview, and delete — used by admins/org
 * managers to control the wording of invitation and notification emails.
 *
 * Responsibilities:
 * - Fetches and displays all templates for the current organization as cards.
 * - Switches between list/create/edit/preview modes without closing the dialog.
 * - Delegates the create/edit form to `EmailTemplateEditor` and the rendered
 *   preview to `EmailTemplatePreview`.
 * - Surfaces success/error feedback via toast notifications.
 *
 * Props:
 * - open (boolean): whether the management dialog is visible.
 * - onClose (() => void): called when the dialog is dismissed.
 *
 * State:
 * - mode (DialogMode): which view is shown ('list' | 'create' | 'edit' | 'preview').
 * - selectedTemplate (EmailTemplate | null): template currently being edited/previewed.
 * - anchorEl (HTMLElement | null): anchor for the per-card overflow menu.
 * - actionTemplateId (string | null): id of the template the open overflow menu targets.
 *
 * Redux: reads `selectEmailTemplates`, `selectEmailTemplateLoading`,
 * `selectEmailTemplateError` (emailTemplateSlice) and `selectCurrentOrganization`
 * (organizationSlice); dispatches `fetchEmailTemplates`, `createEmailTemplate`,
 * `updateEmailTemplate`, `deleteEmailTemplate`, and `clearError` thunks/actions.
 *
 * Custom hooks: `useToast` for success/error notifications.
 *
 * Side effects:
 * - Loads templates whenever the dialog opens.
 * - Surfaces any Redux `error` via a toast, then clears it.
 * - Resets all local state whenever the dialog closes.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const EmailTemplateManagement: React.FC<EmailTemplateManagementProps> = ({ open, onClose }) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const toast = useToast();

    const [mode, setMode] = useState<DialogMode>('list');
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [actionTemplateId, setActionTemplateId] = useState<string | null>(null);

    // Redux state
    const templatesFromState = useAppSelector(selectEmailTemplates);
    // Guard against a transient non-array state (e.g. before the first fetch resolves).
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

    // Load templates when dialog opens
    // Runs whenever `open` toggles true so the list is always fresh when reopened.
    useEffect(() => {
        if (open) {
            dispatch(fetchEmailTemplates());
        }
    }, [open, dispatch]);

    // Handle errors
    // Surfaces any slice-level error as a toast, then clears it so it fires only once.
    useEffect(() => {
        if (error) {
            toast.showError(error);
            dispatch(clearError());
        }
    }, [error, toast, dispatch]);

    // Reset state when dialog closes
    // Ensures reopening the dialog always starts from the list view with no stale selection/menu state.
    useEffect(() => {
        if (!open) {
            setMode('list');
            setSelectedTemplate(null);
            setAnchorEl(null);
            setActionTemplateId(null);
        }
    }, [open]);

    /** Switches to create mode with no template selected, triggered by the "Create" buttons/FAB. */
    const handleCreate = () => {
        setMode('create');
        setSelectedTemplate(null);
    };

    /**
     * Opens the editor for an existing template. Triggered from a template card's
     * Edit button or its overflow menu.
     * @param template - the template to edit.
     */
    const handleEdit = (template: EmailTemplate) => {
        setSelectedTemplate(template);
        setMode('edit');
        handleCloseMenu();
    };

    /**
     * Opens the read-only preview for an existing template. Triggered from a
     * template card's Preview button or its overflow menu.
     * @param template - the template to preview.
     */
    const handlePreview = (template: EmailTemplate) => {
        setSelectedTemplate(template);
        setMode('preview');
        handleCloseMenu();
    };

    /**
     * Deletes a template after the user picks "Delete Template" from the overflow menu.
     * @param templateId - id of the template to delete.
     */
    const handleDelete = async (templateId: string) => {
        try {
            await dispatch(deleteEmailTemplate(templateId)).unwrap();
            toast.showSuccess('Template deleted successfully');
        } catch (error: any) {
            console.error('Delete template error:', error);
            toast.showError('Failed to delete template');
        }
        handleCloseMenu();
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
     * Persists the template form submitted by `EmailTemplateEditor`, dispatching
     * a create or update thunk depending on the current `mode`, then returns to
     * the list view on success.
     * @param templateData - form payload; shape depends on create vs. edit mode.
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

    /** Discards the create/edit form and returns to the template list, triggered by the editor's Cancel button. */
    const handleCancel = () => {
        setMode('list');
        setSelectedTemplate(null);
    };

    /**
     * Opens the per-card overflow menu, triggered by clicking a template card's
     * "more" icon button.
     * @param event - click event, used to anchor the menu to the clicked element.
     * @param templateId - id of the template the menu actions should apply to.
     */
    const handleMenuClick = (event: React.MouseEvent<HTMLElement>, templateId: string) => {
        setAnchorEl(event.currentTarget);
        setActionTemplateId(templateId);
    };

    /** Closes the overflow menu and clears which template it was targeting. */
    const handleCloseMenu = () => {
        setAnchorEl(null);
        setActionTemplateId(null);
    };

    /**
     * Substitutes `{{variable}}` placeholders in a subject/body string with the
     * fixed sample `previewData`, used only for the Preview mode rendering.
     * @param text - raw subject or body text containing `{{variable}}` tokens.
     * @returns The text with every supported variable replaced by sample values.
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

    /** Renders the grid of template cards, plus loading/empty states and the create FAB/menu. */
    const renderTemplateList = () => (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Email Templates
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage email templates for user invitations and notifications
                </Typography>
            </Box>

            {/* Loading State */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
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
                                        <Chip
                                            size="small"
                                            label={template.role}
                                            variant="outlined"
                                            color="primary"
                                        />
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
            )}

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
                        if (actionTemplateId) handleDelete(actionTemplateId);
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
            {templates.length > 0 && (
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
            )}
        </Box>
    );

    /** Renders the create/edit form via `EmailTemplateEditor`, wired to `handleSave`/`handleCancel`. */
    const renderTemplateEditor = () => (
        <EmailTemplateEditor
            template={selectedTemplate || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
            isEditing={mode === 'edit'}
        />
    );

    /** Renders the read-only preview of `selectedTemplate` with sample data substituted in. */
    const renderTemplatePreview = () => (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Preview: {selectedTemplate?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        This is how the email will appear to recipients
                    </Typography>
                </Box>
                <Button onClick={handleCancel} startIcon={<CloseIcon />}>
                    Close Preview
                </Button>
            </Box>

            {selectedTemplate && (
                <EmailTemplatePreview
                    subject={replaceVariables(selectedTemplate.subject)}
                    body={replaceVariables(selectedTemplate.body)}
                    previewData={previewData}
                />
            )}
        </Box>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            slotProps={{
                paper: {
                    sx: {
                        height: '90vh',
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
                    pb: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(
                        theme.palette.background.paper,
                        1,
                    )} 100%)`,
                }}
            >
                <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {mode === 'create' && 'Create Email Template'}
                        {mode === 'edit' && 'Edit Email Template'}
                        {mode === 'preview' && 'Preview Email Template'}
                        {mode === 'list' && 'Email Template Management'}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                {mode === 'list' && renderTemplateList()}
                {(mode === 'create' || mode === 'edit') && renderTemplateEditor()}
                {mode === 'preview' && renderTemplatePreview()}
            </DialogContent>
        </Dialog>
    );
};

export default EmailTemplateManagement;
