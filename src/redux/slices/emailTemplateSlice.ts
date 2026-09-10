import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { emailTemplateApi } from '../../services/api/emailTemplateApi';
import type { 
    EmailTemplate, 
    CreateEmailTemplate, 
    UpdateEmailTemplate 
} from '../../interfaces/emailTemplateInterface';

// Define the state interface
interface EmailTemplateState {
    templates: EmailTemplate[];
    selectedTemplate: EmailTemplate | null;
    loading: boolean;
    error: string | null;
    createLoading: boolean;
    updateLoading: boolean;
    deleteLoading: boolean;
}

// Initial state
const initialState: EmailTemplateState = {
    templates: [],
    selectedTemplate: null,
    loading: false,
    error: null,
    createLoading: false,
    updateLoading: false,
    deleteLoading: false,
};

// Async thunks for API calls
/**
 * Fetches every email template visible to the caller.
 * @returns an array of `EmailTemplate`; normalizes both the `{ data: [...] }`
 * wrapped shape and a bare array response, defaulting to `[]` otherwise.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const fetchEmailTemplates = createAsyncThunk(
    'emailTemplates/fetchAll',
    async (_: void, { rejectWithValue }) => {
        try {
            const response = await emailTemplateApi.fetchTemplates();
            // The API returns templates wrapped in a data property
            if (response && Array.isArray(response.data)) {
                return response.data;
            } else if (Array.isArray(response)) {
                return response;
            }
            return [];
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch email templates');
        }
    }
);

/**
 * Fetches email templates applicable to a given role.
 * @param role - the role code to filter templates by.
 * @returns an array of `EmailTemplate`; same wrapped/bare-array
 * normalization as {@link fetchEmailTemplates}.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const fetchEmailTemplatesByRole = createAsyncThunk(
    'emailTemplates/fetchByRole',
    async (role: string, { rejectWithValue }) => {
        try {
            const response = await emailTemplateApi.fetchTemplateByRole(role);
            // The API returns templates wrapped in a data property
            if (response && Array.isArray(response.data)) {
                return response.data;
            } else if (Array.isArray(response)) {
                return response;
            }
            return [];
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch email templates by role');
        }
    }
);

/**
 * Creates a new email template.
 * @param templateData - the template fields to create (`CreateEmailTemplate`).
 * @returns the created `EmailTemplate`.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const createEmailTemplate = createAsyncThunk(
    'emailTemplates/create',
    async (templateData: CreateEmailTemplate, { rejectWithValue }) => {
        try {
            const response = await emailTemplateApi.createTemplate(templateData);
            // Handle wrapped response
            if (response?.data) {
                return response.data;
            }
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create email template');
        }
    }
);

/**
 * Updates an existing email template.
 * @param templateData - the updated fields; must include `_id`.
 * @returns the updated `EmailTemplate`.
 * @throws (via `rejectWithValue`) 'Template ID is required for update' if
 * `_id` is missing (checked before calling the API), or the API error
 * message on request failure.
 */
export const updateEmailTemplate = createAsyncThunk(
    'emailTemplates/update',
    async (templateData: UpdateEmailTemplate, { rejectWithValue }) => {
        try {
            if (!templateData._id) {
                return rejectWithValue('Template ID is required for update');
            }
            const response = await emailTemplateApi.updateTemplate(templateData);
            // Handle wrapped response
            if (response?.data) {
                return response.data;
            }
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update email template');
        }
    }
);

/**
 * Deletes an email template by ID.
 * @param templateId - the template to delete.
 * @returns the deleted template's ID (used to filter it out of state).
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const deleteEmailTemplate = createAsyncThunk(
    'emailTemplates/delete',
    async (templateId: string, { rejectWithValue }) => {
        try {
            await emailTemplateApi.deleteTemplate(templateId);
            return templateId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete email template');
        }
    }
);

/**
 * Fetches a single email template by ID.
 * @param templateId - the template to fetch.
 * @returns the `EmailTemplate`.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const getEmailTemplate = createAsyncThunk(
    'emailTemplates/getById',
    async (templateId: string, { rejectWithValue }) => {
        try {
            const response = await emailTemplateApi.getTemplateById(templateId);
            // Handle wrapped response
            if (response?.data) {
                return response.data;
            }
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch email template');
        }
    }
);

/**
 * Marks a template as the default (e.g. for a role/org).
 * @param args.templateId - the template to set as default.
 * @param args.orgId - optional organization scope (currently unused by the
 * request itself but kept in the argument shape for callers).
 * @returns the full, updated list of templates (server recomputes which
 * template is now flagged as default) — normalized the same way as
 * {@link fetchEmailTemplates}.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const setDefaultEmailTemplate = createAsyncThunk(
    'emailTemplates/setDefault',
    async ({ templateId }: { templateId: string; orgId?: string }, { rejectWithValue }) => {
        try {
            const response = await emailTemplateApi.setDefaultTemplate(templateId);
            // Handle wrapped response
            if (response?.data && Array.isArray(response.data)) {
                return response.data;
            } else if (Array.isArray(response)) {
                return response;
            }
            return [];
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to set default template');
        }
    }
);

/**
 * Slice: emailTemplates
 *
 * Purpose: Owns CRUD and default-selection state for email templates
 * (used by org admins/workspace managers to configure invitation and
 * notification emails).
 *
 * State shape:
 * - `templates` (EmailTemplate[]): the currently loaded template list.
 * - `selectedTemplate` (EmailTemplate | null): the template being viewed/edited.
 * - `loading` / `error`: status for list/get fetches.
 * - `createLoading`, `updateLoading`, `deleteLoading`: per-operation status
 *   flags (kept separate from `loading` so create/update/delete spinners
 *   don't fight the list-fetch spinner).
 *
 * Reducers:
 * - `clearError`: clears the shared `error` field.
 * - `setSelectedTemplate` / `clearSelectedTemplate`: set or clear the
 *   template currently being viewed/edited.
 * - `resetTemplateState`: resets the entire slice back to its initial values.
 *
 * Async thunks: `fetchEmailTemplates`, `fetchEmailTemplatesByRole`,
 * `createEmailTemplate`, `updateEmailTemplate`, `deleteEmailTemplate`,
 * `getEmailTemplate`, `setDefaultEmailTemplate` (documented above each
 * definition).
 *
 * Selectors: `selectEmailTemplates`, `selectSelectedEmailTemplate`,
 * `selectEmailTemplateLoading`, `selectEmailTemplateError`,
 * `selectEmailTemplateCreateLoading`, `selectEmailTemplateUpdateLoading`,
 * `selectEmailTemplateDeleteLoading`, `selectDefaultEmailTemplate`,
 * `selectActiveEmailTemplates` (below), reading from `state.emailTemplates`.
 *
 * Business logic: API responses are inconsistently shaped (sometimes
 * `{ data: [...] }`, sometimes a bare array/object) across endpoints, so
 * every thunk normalizes its own response shape before returning. On
 * update/delete, the in-memory `templates` array and `selectedTemplate`
 * (if it matches the affected `_id`) are kept in sync locally instead of
 * re-fetching the whole list.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// Create the slice
const emailTemplateSlice = createSlice({
    name: 'emailTemplates',
    initialState,
    reducers: {
        /** Clears the shared `error` field. */
        clearError: (state) => {
            state.error = null;
        },
        /** Sets the template currently being viewed/edited (or clears it with `null`). */
        setSelectedTemplate: (state, action: PayloadAction<EmailTemplate | null>) => {
            state.selectedTemplate = action.payload;
        },
        /** Clears the currently selected template. */
        clearSelectedTemplate: (state) => {
            state.selectedTemplate = null;
        },
        /** Resets the whole slice (templates, selection, and all status flags) to initial values. */
        resetTemplateState: (state) => {
            state.templates = [];
            state.selectedTemplate = null;
            state.loading = false;
            state.error = null;
            state.createLoading = false;
            state.updateLoading = false;
            state.deleteLoading = false;
        },
    },
    extraReducers: (builder) => {
        // Fetch email templates
        builder
            .addCase(fetchEmailTemplates.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchEmailTemplates.fulfilled, (state, action: PayloadAction<EmailTemplate[]>) => {
                state.loading = false;
                state.templates = action.payload;
                state.error = null;
            })
            .addCase(fetchEmailTemplates.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Fetch email templates by role
        builder
            .addCase(fetchEmailTemplatesByRole.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchEmailTemplatesByRole.fulfilled, (state, action: PayloadAction<EmailTemplate[]>) => {
                state.loading = false;
                state.templates = action.payload;
                state.error = null;
            })
            .addCase(fetchEmailTemplatesByRole.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Create email template
        builder
            .addCase(createEmailTemplate.pending, (state) => {
                state.createLoading = true;
                state.error = null;
            })
            .addCase(createEmailTemplate.fulfilled, (state, action: PayloadAction<EmailTemplate>) => {
                state.createLoading = false;
                state.templates.push(action.payload);
                state.error = null;
            })
            .addCase(createEmailTemplate.rejected, (state, action) => {
                state.createLoading = false;
                state.error = action.payload as string;
            });

        // Update email template
        builder
            .addCase(updateEmailTemplate.pending, (state) => {
                state.updateLoading = true;
                state.error = null;
            })
            .addCase(updateEmailTemplate.fulfilled, (state, action: PayloadAction<EmailTemplate>) => {
                state.updateLoading = false;
                const index = state.templates.findIndex(t => t._id === action.payload._id);
                if (index !== -1) {
                    state.templates[index] = action.payload;
                }
                if (state.selectedTemplate && state.selectedTemplate._id === action.payload._id) {
                    state.selectedTemplate = action.payload;
                }
                state.error = null;
            })
            .addCase(updateEmailTemplate.rejected, (state, action) => {
                state.updateLoading = false;
                state.error = action.payload as string;
            });

        // Delete email template
        builder
            .addCase(deleteEmailTemplate.pending, (state) => {
                state.deleteLoading = true;
                state.error = null;
            })
            .addCase(deleteEmailTemplate.fulfilled, (state, action: PayloadAction<string>) => {
                state.deleteLoading = false;
                state.templates = state.templates.filter(t => t._id !== action.payload);
                if (state.selectedTemplate && state.selectedTemplate._id === action.payload) {
                    state.selectedTemplate = null;
                }
                state.error = null;
            })
            .addCase(deleteEmailTemplate.rejected, (state, action) => {
                state.deleteLoading = false;
                state.error = action.payload as string;
            });

        // Get email template by ID
        builder
            .addCase(getEmailTemplate.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getEmailTemplate.fulfilled, (state, action: PayloadAction<EmailTemplate>) => {
                state.loading = false;
                state.selectedTemplate = action.payload;
                state.error = null;
            })
            .addCase(getEmailTemplate.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });

        // Set default email template
        builder
            .addCase(setDefaultEmailTemplate.pending, (state) => {
                state.updateLoading = true;
                state.error = null;
            })
            .addCase(setDefaultEmailTemplate.fulfilled, (state, action: PayloadAction<EmailTemplate[]>) => {
                state.updateLoading = false;
                state.templates = action.payload; // Returns updated list with new default
                state.error = null;
            })
            .addCase(setDefaultEmailTemplate.rejected, (state, action) => {
                state.updateLoading = false;
                state.error = action.payload as string;
            });
    },
});

// Export actions
export const {
    clearError,
    setSelectedTemplate,
    clearSelectedTemplate,
    resetTemplateState,
} = emailTemplateSlice.actions;

// Selectors
export const selectEmailTemplates = (state: { emailTemplates: EmailTemplateState }) => state.emailTemplates.templates;
export const selectSelectedEmailTemplate = (state: { emailTemplates: EmailTemplateState }) => state.emailTemplates.selectedTemplate;
export const selectEmailTemplateLoading = (state: { emailTemplates: EmailTemplateState }) => state.emailTemplates.loading;
export const selectEmailTemplateError = (state: { emailTemplates: EmailTemplateState }) => state.emailTemplates.error;
export const selectEmailTemplateCreateLoading = (state: { emailTemplates: EmailTemplateState }) => state.emailTemplates.createLoading;
export const selectEmailTemplateUpdateLoading = (state: { emailTemplates: EmailTemplateState }) => state.emailTemplates.updateLoading;
export const selectEmailTemplateDeleteLoading = (state: { emailTemplates: EmailTemplateState }) => state.emailTemplates.deleteLoading;
export const selectDefaultEmailTemplate = (state: { emailTemplates: EmailTemplateState }) => 
    state.emailTemplates.templates.find(template => template.isDefault || template.is_active === 1) || null;
export const selectActiveEmailTemplates = (state: { emailTemplates: EmailTemplateState }) => 
    state.emailTemplates.templates.filter(template => template.isActive || template.is_active === 1);

// Export the reducer
export default emailTemplateSlice.reducer;