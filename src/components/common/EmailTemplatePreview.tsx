import React from 'react';
import { Box, Card, CardContent, Typography, useTheme, alpha, Stack } from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import type { EmailPreviewData } from '../../interfaces/emailTemplateInterface';

interface EmailTemplatePreviewProps {
    subject: string;
    body: string;
    previewData: EmailPreviewData;
}

/**
 * Component: EmailTemplatePreview
 *
 * Purpose: Renders a read-only mock-up of an email client showing how a given
 * subject/body will look once template variables have already been substituted
 * by the caller (EmailTemplateEditor/EmailTemplateManagement/UserCreationDialog).
 *
 * Responsibilities:
 * - Displays a fake email client header (To/From), the subject line, and the
 *   HTML body rendered with representative styling.
 * - Falls back to placeholder copy when subject/body are empty.
 *
 * Props:
 * - subject (string): already variable-substituted subject line to display.
 * - body (string): already variable-substituted HTML body to render.
 * - previewData (EmailPreviewData): sample recipient info shown in the mock header.
 *
 * Note: this component does not itself replace `{{variable}}` tokens — callers
 * are expected to pass already-substituted `subject`/`body` strings.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const EmailTemplatePreview: React.FC<EmailTemplatePreviewProps> = ({ subject, body, previewData }) => {
    const theme = useTheme();

    /**
     * Builds the `dangerouslySetInnerHTML` markup object for the email body.
     * The body is trusted, author-authored HTML (from the template editor), not
     * arbitrary user input, so it is rendered directly without sanitization here.
     * @returns An object with `__html` set to the raw body string.
     */
    const createMarkup = () => {
        return { __html: body };
    };

    return (
        <Box sx={{ maxWidth: '100%', margin: '0 auto' }}>
            {/* Email Client Mockup Header */}
            <Card
                sx={{
                    borderRadius: 2,
                    boxShadow:
                        theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                }}
            >
                {/* Mock Email Client Header */}
                <Box
                    sx={{
                        backgroundColor:
                            theme.palette.mode === 'dark'
                                ? alpha(theme.palette.background.paper, 0.8)
                                : alpha(theme.palette.grey[100], 0.8),
                        p: 2,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <EmailOutlinedIcon color="primary" />
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                To: {previewData.recipientEmail}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                From: noreply@qualicollect.com
                            </Typography>
                        </Box>
                        {/* <Chip label="Preview" size="small" color="primary" variant="outlined" /> */}
                    </Stack>
                </Box>

                {/* Email Subject */}
                <Box
                    sx={{
                        p: 2,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            wordBreak: 'break-word',
                        }}
                    >
                        {subject || 'No Subject'}
                    </Typography>
                </Box>

                {/* Email Body */}
                <CardContent
                    sx={{
                        p: 0,
                        '&:last-child': { pb: 0 },
                    }}
                >
                    <Box
                        sx={{
                            p: 3,
                            backgroundColor: theme.palette.background.default,
                            minHeight: 400,
                            fontFamily: 'Arial, sans-serif',
                            '& h1, & h2, & h3, & h4, & h5, & h6': {
                                color: theme.palette.text.primary,
                                marginTop: theme.spacing(2),
                                marginBottom: theme.spacing(1),
                            },
                            '& p': {
                                color: theme.palette.text.primary,
                                marginBottom: theme.spacing(1),
                                lineHeight: 1.6,
                            },
                            '& a': {
                                color: theme.palette.primary.main,
                                textDecoration: 'none',
                                '&:hover': {
                                    textDecoration: 'underline',
                                },
                            },
                            '& strong, & b': {
                                fontWeight: 600,
                            },
                            '& hr': {
                                border: 'none',
                                borderTop: `1px solid ${theme.palette.divider}`,
                                margin: theme.spacing(2, 0),
                            },
                            '& div[style*="text-align: center"]': {
                                textAlign: 'center',
                            },
                            '& div[style*="background-color"]': {
                                borderRadius: theme.spacing(1),
                            },
                        }}
                    >
                        {body ? (
                            <div dangerouslySetInnerHTML={createMarkup()} />
                        ) : (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: 200,
                                    color: 'text.secondary',
                                }}
                            >
                                <EmailOutlinedIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                                <Typography variant="body1" color="text.secondary">
                                    Email body will appear here
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Start typing in the editor to see the preview
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Preview Information */}
            <Box sx={{ mt: 2, p: 2, backgroundColor: alpha(theme.palette.info.main, 0.1), borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    <strong>Preview Information:</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    This is how your email will appear in most email clients. Some email clients may render HTML
                    differently. Template variables are replaced with the preview data you provided.
                </Typography>
            </Box>
        </Box>
    );
};

export default EmailTemplatePreview;
