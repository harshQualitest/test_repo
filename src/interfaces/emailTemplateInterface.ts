/**
 * Email Template Interfaces
 *
 * Purpose: Request/response and UI types for organization email templates
 * (invitation emails, notifications) and their template-variable substitution.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/**
 * An email template as returned by the API, used for invitation and notification emails.
 */
export interface EmailTemplate {
    _id: string;
    // Role this template applies to (e.g. which invited role receives it).
    role: string;
    name: string;
    subject: string;
    body: string;
    attachments: string[];
    is_active: number; // API returns 0 or 1
    created_by: string;
    created_at: string;
    // Optional fields for backward compatibility
    variables?: string[];
    isDefault?: boolean;
    isActive?: boolean;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    org_id?: string;
}

/** Payload for creating a new email template. */
export interface CreateEmailTemplate {
    role?: string;
    name: string;
    subject: string;
    body: string;
    attachments?: string[];
    variables?: string[];
    isDefault?: boolean;
    isActive?: boolean;
    org_id?: string;
}

/** Payload for updating an existing email template; all fields but `_id` are optional. */
export interface UpdateEmailTemplate {
    _id: string;
    role?: string;
    name?: string;
    subject?: string;
    body?: string;
    attachments?: string[];
    variables?: string[];
    isDefault?: boolean;
    isActive?: boolean;
}

/** Describes one `{{placeholder}}` variable available for use inside a template body/subject. */
export interface EmailTemplateVariable {
    // Literal placeholder token as it appears in the template, e.g. '{{recipientName}}'.
    key: string;
    label: string;
    description: string;
    defaultValue: string;
}

/** Data used to render a live preview of a template with variables substituted. */
export interface EmailPreviewData {
    recipientEmail: string;
    recipientName: string;
    organizationName: string;
    inviterName: string;
    invitationLink: string;
    role: string;
}

/** Full set of variables selectable when building/editing an email template. */
export const DEFAULT_TEMPLATE_VARIABLES: EmailTemplateVariable[] = [
    {
        key: '{{recipientEmail}}',
        label: 'Recipient Email',
        description: 'Email address of the invited user',
        defaultValue: 'user@example.com',
    },
    {
        key: '{{recipientName}}',
        label: 'Recipient Name',
        description: 'Name of the invited user',
        defaultValue: 'John Doe',
    },
    {
        key: '{{organizationName}}',
        label: 'Organization Name',
        description: 'Name of the organization',
        defaultValue: 'Your Organization',
    },
    {
        key: '{{inviterName}}',
        label: 'Inviter Name',
        description: 'Name of the person sending the invitation',
        defaultValue: 'Admin User',
    },
    {
        key: '{{invitationLink}}',
        label: 'Invitation Link',
        description: 'URL for the user to accept the invitation',
        defaultValue: 'http://localhost:5173/accept-invitation',
    },
    {
        key: '{{role}}',
        label: 'User Role',
        description: 'Role assigned to the invited user',
        defaultValue: 'Member',
    },
     {
        key: '{{workspaceName}}',
        label: 'Workspace Name',
        description: 'Name of the workspace',
        defaultValue: 'Your Workspace',
    },
    {
        key: '{{projectName}}',
        label: 'Project Name',
        description: 'Name of the project',
        defaultValue: 'Your Project',
    },

];

/** Fallback template used when an organization has not configured a custom invitation email. */
export const DEFAULT_EMAIL_TEMPLATE: Partial<CreateEmailTemplate> = {
    name: 'Default Invitation Template',
    subject: "You're invited to join {{organizationName}} on QualiCollect",
    body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #1976d2; margin-bottom: 20px;">Welcome to QualiCollect!</h2>
                
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                    Hello there,
                </p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                    {{inviterName}} has invited you to join <strong>{{organizationName}}</strong> on QualiCollect as a <strong>{{role}}</strong>.
                </p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                    QualiCollect is a powerful platform for managing your organization's workflows and collaboration.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{loginUrl}}" style="display: inline-block; background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                        Accept Invitation
                    </a>
                </div>
                
                <p style="font-size: 14px; line-height: 1.6; color: #666;">
                    If you have any questions, please don't hesitate to reach out to us.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                
                <p style="font-size: 12px; color: #888; text-align: center;">
                    This invitation was sent to {{recipientEmail}}. If you weren't expecting this invitation, you can safely ignore this email.
                </p>
            </div>
        </div>
    `,
    variables: DEFAULT_TEMPLATE_VARIABLES.map((v) => v.key),
    isDefault: true,
    isActive: true,
};
