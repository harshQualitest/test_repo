import React, { useState, useRef } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Stack,
    Alert,
    Tabs,
    Tab,
    useTheme,
    alpha,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import Input from '../shared/Input';
import RichTextEditor, { type RichTextEditorHandle } from './RichTextEditor';
import EmailTemplatePreview from './EmailTemplatePreview';
import type {
    EmailTemplate,
    CreateEmailTemplate,
    UpdateEmailTemplate,
    EmailPreviewData,
} from '../../interfaces/emailTemplateInterface';
import { DEFAULT_TEMPLATE_VARIABLES } from '../../interfaces/emailTemplateInterface';

interface EmailTemplateEditorProps {
    template?: EmailTemplate;
    onSave: (template: CreateEmailTemplate | UpdateEmailTemplate) => void;
    onCancel: () => void;
    isEditing?: boolean;
}

// Validation schema
// Business rule: name, subject, and body are mandatory for any template to be saved;
// isDefault is optional and simply carried through.
const validationSchema = Yup.object({
    name: Yup.string().required('Template name is required'),
    subject: Yup.string().required('Subject is required'),
    body: Yup.string().required('Body is required'),
    isDefault: Yup.boolean(),
});

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

/**
 * Renders its children only when `value` (the active tab index) matches `index`,
 * keeping the Formik form mounted across tab switches so field state is preserved.
 */
function TabPanel({ children, value, index }: TabPanelProps) {
    return (
        <Box
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
        >
            {value === index && children}
        </Box>
    );
}

/**
 * Component: EmailTemplateEditor
 *
 * Purpose: Formik-driven form for creating or editing an email template
 * (name, subject, HTML body) with a live "Preview" tab showing rendered output.
 *
 * Responsibilities:
 * - Presents Edit/Preview tabs; Edit tab holds the Formik form, Preview tab shows
 *   how the email will look with sample recipient data.
 * - Lets the user insert template variables (e.g. {{recipientName}}) into the
 *   subject field or directly into the rich text body via chips.
 * - Delegates rich text editing to `RichTextEditor` and rendering to `EmailTemplatePreview`.
 *
 * Props:
 * - template (EmailTemplate, optional): existing template to edit; omitted when creating new.
 * - onSave ((template: CreateEmailTemplate | UpdateEmailTemplate) => void): called with the
 *   assembled payload on successful form submit.
 * - onCancel (() => void): called when the user cancels editing.
 * - isEditing (boolean, optional): toggles "Create" vs "Update" copy and payload shape.
 *
 * State:
 * - tabValue (number): currently active tab (0 = Edit, 1 = Preview).
 * - bodyEditorRef (ref to RichTextEditorHandle): imperative handle used to insert
 *   variable text directly at the cursor inside the Tiptap body editor.
 *
 * Business logic: `validationSchema` requires name/subject/body; the Preview tab
 * substitutes template variables with fixed sample data (`previewData`) so users can
 * see a representative rendering before saving.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({ template, onSave, onCancel, isEditing = false }) => {
    const theme = useTheme();
    const [tabValue, setTabValue] = useState(0);
    const bodyEditorRef = useRef<RichTextEditorHandle>(null);

    // Sample data for preview
    const previewData: EmailPreviewData = {
        recipientEmail: 'john.doe@example.com',
        recipientName: 'John Doe',
        organizationName: 'Acme Corporation',
        inviterName: 'Jane Smith',
        invitationLink: 'http://localhost:5173/accept-invitation',
        role: 'Team Member',
    };

    /**
     * Switches the active tab (Edit vs Preview) when the user clicks a tab.
     * @param _event - unused synthetic event from MUI Tabs.
     * @param newValue - index of the newly selected tab.
     */
    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    /**
     * Substitutes all known `{{variable}}` placeholders in a subject/body string
     * with the fixed sample `previewData`, used only for the Preview tab rendering.
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

    /**
     * Inserts a template variable token into the given form field. Triggered when
     * the user clicks a variable chip in the "Available variables" list.
     * @param variable - the `{{variable}}` token to insert.
     * @param setFieldValue - Formik's setFieldValue, used for plain text fields.
     * @param fieldName - which field the chip belongs to ('subject' or 'body').
     * @param currentValue - current value of that field (used for the append case).
     */
    const insertVariable = (variable: string, setFieldValue: any, fieldName: string, currentValue: string) => {
        if (fieldName === 'body') {
            // Insert directly at cursor position inside Tiptap editor
            bodyEditorRef.current?.insertText(variable);
        } else {
            // For plain text fields (subject), append to Formik state
            setFieldValue(fieldName, currentValue + variable);
        }
    };

    // Formik seed values: prefill from an existing template when editing, otherwise
    // fall back to a ready-made HTML invitation body so authors have a starting point.
    const initialValues = {
        name: template?.name || '',
        subject: template?.subject || '',
        body:
            template?.body ||
            `
<h2>Welcome to {{organizationName}}!</h2>
<p>Hello {{recipientName}},</p>
<p>You have been invited to join <strong>{{organizationName}}</strong> as a <strong>{{role}}</strong>.</p>
<p>{{inviterName}} has invited you to collaborate with the team.</p>
<p>To get started, please click the link below to access your account:</p>
<p style="text-align: center">
    <a href="{{invitationLink}}">Access Your Account</a>
</p>
<p>If you have any questions, please don't hesitate to reach out.</p>
<p>Best regards,<br>The {{organizationName}} Team</p>
<hr>
<p><em>This invitation was sent to {{recipientEmail}}.</em></p>`,
        isDefault: template?.isDefault || false,
    };

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <CardContent sx={{ p: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Fixed Header with Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 3, flexShrink: 0 }}>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                        {isEditing ? 'Edit Email Template' : 'Create Email Template'}
                    </Typography>
                    <Tabs value={tabValue} onChange={handleTabChange}>
                        <Tab icon={<EditOutlinedIcon />} label="Edit" iconPosition="start" />
                        <Tab icon={<VisibilityOutlinedIcon />} label="Preview" iconPosition="start" />
                    </Tabs>
                </Box>

                {/* Scrollable Content Area */}
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <Formik
                        initialValues={initialValues}
                        validationSchema={validationSchema}
                        onSubmit={(values) => {
                            // Editing an existing template must preserve its _id/attachments/variables;
                            // creating a new one starts those fields empty.
                            if (isEditing && template) {
                                onSave({
                                    ...values,
                                    _id: template._id,
                                    attachments: template.attachments || [],
                                    variables: template.variables,
                                });
                            } else {
                                onSave({
                                    ...values,
                                    attachments: [],
                                    variables: [],
                                });
                            }
                        }}
                    >
                        {({ values, setFieldValue, errors, touched }) => (
                            <Form>
                                <TabPanel value={tabValue} index={0}>
                                    <Box sx={{ p: 3 }}>
                                        {/* Template Details */}
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                                Template Details
                                            </Typography>
                                        </Box>

                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                                            <Field name="name">
                                                {({ field }: any) => (
                                                    <Input
                                                        {...field}
                                                        label="Template Name"
                                                        error={touched.name && !!errors.name}
                                                        helperText={touched.name && errors.name}
                                                        fullWidth
                                                    />
                                                )}
                                            </Field>
                                        </Box>

                                        {/* Subject Section */}
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                                Email Subject
                                            </Typography>

                                            {/* Variable chips for subject */}
                                            <Alert severity="info" sx={{ mb: 2 }}>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    Available variables - click to insert:
                                                </Typography>
                                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                    {DEFAULT_TEMPLATE_VARIABLES.map((variable) => (
                                                        <Chip
                                                            key={variable.key}
                                                            label={variable.label}
                                                            size="small"
                                                            onClick={() =>
                                                                insertVariable(
                                                                    variable.key,
                                                                    setFieldValue,
                                                                    'subject',
                                                                    values.subject,
                                                                )
                                                            }
                                                            sx={{
                                                                cursor: 'pointer',
                                                                '&:hover': {
                                                                    backgroundColor: alpha(
                                                                        theme.palette.primary.main,
                                                                        0.1,
                                                                    ),
                                                                },
                                                            }}
                                                        />
                                                    ))}
                                                </Stack>
                                            </Alert>

                                            <Field name="subject">
                                                {({ field }: any) => (
                                                    <Input
                                                        {...field}
                                                        label="Subject Line"
                                                        error={touched.subject && !!errors.subject}
                                                        helperText={touched.subject && errors.subject}
                                                        fullWidth
                                                    />
                                                )}
                                            </Field>
                                        </Box>

                                        {/* Body Section */}
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                                Email Body
                                            </Typography>

                                            {/* Variable chips for body */}
                                            <Alert severity="info" sx={{ mb: 2 }}>
                                                <Typography variant="body2" sx={{ mb: 1 }}>
                                                    Available variables - click to insert:
                                                </Typography>
                                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                    {DEFAULT_TEMPLATE_VARIABLES.map((variable) => (
                                                        <Chip
                                                            key={variable.key}
                                                            label={variable.label}
                                                            size="small"
                                                            onClick={() =>
                                                                insertVariable(
                                                                    variable.key,
                                                                    setFieldValue,
                                                                    'body',
                                                                    values.body,
                                                                )
                                                            }
                                                            sx={{
                                                                cursor: 'pointer',
                                                                '&:hover': {
                                                                    backgroundColor: alpha(
                                                                        theme.palette.primary.main,
                                                                        0.1,
                                                                    ),
                                                                },
                                                            }}
                                                        />
                                                    ))}
                                                </Stack>
                                            </Alert>

                                            <RichTextEditor
                                                ref={bodyEditorRef}
                                                value={values.body}
                                                onChange={(value) => setFieldValue('body', value)}
                                                error={touched.body && !!errors.body}
                                                helperText={
                                                    touched.body && errors.body
                                                        ? String(errors.body)
                                                        : 'Use the toolbar to format your email content'
                                                }
                                            />
                                        </Box>

                                        {/* Action Buttons */}
                                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2 }}>
                                            <Button onClick={onCancel} variant="outlined">
                                                Cancel
                                            </Button>
                                            <Button type="submit" variant="contained">
                                                {isEditing ? 'Update Template' : 'Create Template'}
                                            </Button>
                                        </Box>
                                    </Box>
                                </TabPanel>

                                <TabPanel value={tabValue} index={1}>
                                    <Box sx={{ p: 3 }}>
                                        <EmailTemplatePreview
                                            subject={replaceVariables(values.subject)}
                                            body={replaceVariables(values.body)}
                                            previewData={previewData}
                                        />
                                    </Box>
                                </TabPanel>
                            </Form>
                        )}
                    </Formik>
                </Box>
            </CardContent>
        </Card>
    );
};

export default EmailTemplateEditor;
