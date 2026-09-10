/**
 * Purpose: CRUD API for email templates (used to notify invited/managed users
 * with role-specific email content). All calls use the shared `client`;
 * errors are uncaught axios rejections propagated to the caller.
 */
import client from '../axiosConfig';
import type { CreateEmailTemplate, UpdateEmailTemplate } from '../../interfaces/emailTemplateInterface';

export const emailTemplateApi = {
    /**
     * POST /email-template/ — creates a new email template.
     * @param templateData - Template fields (subject, body, role, etc.).
     * @returns `response.data` — the created template.
     */
    createTemplate: async (templateData: CreateEmailTemplate) => {
        const response = await client.post('/email-template/', templateData);
        return response.data;
    },
    /**
     * GET /email-template/ — lists all email templates.
     * @returns `response.data` — array of templates.
     */
    fetchTemplates: async () => {
        const response = await client.get('/email-template/');
        return response.data;
    },
    /**
     * GET /email-template/role/{role} — fetches the template configured for a given role.
     * @param role - Role identifier (e.g. `annotator`, `reviewer`).
     * @returns `response.data` — the matching template.
     */
    fetchTemplateByRole: async (role: string) => {
        const response = await client.get('/email-template/role/' + role);
        return response.data;
    },
    /**
     * PUT /email-template/{_id} — updates an existing template.
     * @param templateData - Update payload; `_id` is stripped from the body and used in the URL instead.
     * @returns `response.data` — the updated template.
     */
    updateTemplate: async (templateData: UpdateEmailTemplate) => {
        const { _id, ...updateData } = templateData;
        const response = await client.put(`/email-template/${_id}`, updateData);
        return response.data;
    },
    /**
     * GET /email-template/{id} — fetches a single template by id.
     * @param id - Template id.
     * @returns `response.data` — the template.
     */
    getTemplateById: async (id: string) => {
        const response = await client.get(`/email-template/${id}`);
        return response.data;
    },
    /**
     * PATCH /email-template/{id}/set-default — marks a template as the default for its role.
     * @param id - Template id.
     * @returns `response.data` — confirmation/updated template.
     */
    setDefaultTemplate: async (id: string) => {
        const response = await client.patch(`/email-template/${id}/set-default`);
        return response.data;
    },
    /**
     * DELETE /email-template/{id} — removes a template.
     * @param id - Template id.
     * @returns `response.data` — deletion confirmation.
     */
    deleteTemplate: async (id: string) => {
        const response = await client.delete('/email-template/' + id);
        return response.data;
    },
};
