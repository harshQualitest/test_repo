import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import invitationApi, { 
    type AcceptInvitationPayload, 
    type ValidateInvitationResponse,
    type ISingleUserInvitePayload 
} from '../../services/api/invitationApi';

// Define the state interface
interface InvitationState {
    isLoading: boolean;
    error: string | null;
    validationData: ValidateInvitationResponse | null;
    bulkInviteLoading: boolean;
    bulkInviteSuccess: boolean;
    singleInviteLoading: boolean;
    singleInviteSuccess: boolean;
}

// Initial state
const initialState: InvitationState = {
    isLoading: false,
    error: null,
    validationData: null,
    bulkInviteLoading: false,
    bulkInviteSuccess: false,
    singleInviteLoading: false,
    singleInviteSuccess: false,
};

// Async thunks for API calls
/**
 * Validates an invitation token (e.g. from an invite link) before showing
 * the accept-invitation form.
 * @param token - the invitation token to validate.
 * @returns the `ValidateInvitationResponse` describing the invite.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const validateInvitationToken = createAsyncThunk(
    'invitation/validate',
    async (token: string, { rejectWithValue }) => {
        try {
            const response = await invitationApi.validateToken(token);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to validate invitation token');
        }
    }
);

/**
 * Accepts an invitation (completes account setup for the invited user).
 * @param data - the accept-invitation payload (`AcceptInvitationPayload`).
 * @returns the API response for the accepted invitation.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const acceptInvitation = createAsyncThunk(
    'invitation/accept',
    async (data: AcceptInvitationPayload, { rejectWithValue }) => {
        try {
            const response = await invitationApi.acceptInvitation(data);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to accept invitation');
        }
    }
);

/**
 * Bulk-invites users to an organization from an uploaded file (e.g. CSV).
 * @param args.file - the file containing invitee rows.
 * @param args.org_id - the organization to invite users into.
 * @param args.subject - the invitation email subject.
 * @param args.body - the invitation email body.
 * @returns the API response describing the bulk-invite result.
 * @throws (via `rejectWithValue`) the API error message on failure.
 */
export const bulkInviteUsers = createAsyncThunk(
    'invitation/bulkInvite',
    async ({ file, org_id, subject, body }: { file: File; org_id: string; subject: string; body: string }, { rejectWithValue }) => {
        try {
            const response = await invitationApi.bulkInviteUsers(file, org_id, subject, body);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to send bulk invitations');
        }
    }
);

/**
 * Invites a single user by email/role.
 * @param data - the single-invite payload (`ISingleUserInvitePayload`).
 * @returns the API response for the sent invitation.
 * @throws (via `rejectWithValue`) the API error message (checking both
 * `message` and `error` response fields), or a generic fallback string.
 */
export const inviteSingleUser = createAsyncThunk(
    'invitation/inviteSingle',
    async (data: ISingleUserInvitePayload, { rejectWithValue }) => {
        try {
            const response = await invitationApi.inviteSingleUser(data);
            return response;
        } catch (error: any) {
            return rejectWithValue(
                error.response?.data?.message ||
                error.response?.data?.error ||
                'Failed to send invitation'
            );
        }
    }
);

/**
 * Slice: invitation
 *
 * Purpose: Owns the invitation lifecycle — validating an invite token,
 * accepting an invitation, and sending bulk or single invitations.
 *
 * State shape:
 * - `isLoading` / `error`: shared status for token validation and accept flows.
 * - `validationData` (ValidateInvitationResponse | null): details of the
 *   validated invite (e.g. inviter, role, org) shown on the accept page.
 * - `bulkInviteLoading` / `bulkInviteSuccess`: status of the last bulk-invite request.
 * - `singleInviteLoading` / `singleInviteSuccess`: status of the last single-invite request.
 *
 * Reducers:
 * - `clearError`: clears the shared `error` field.
 * - `clearValidationData`: clears the validated invite details.
 * - `resetBulkInviteState`: resets the bulk-invite status flags.
 * - `resetSingleInviteState`: resets the single-invite status flags.
 *
 * Async thunks: `validateInvitationToken`, `acceptInvitation`,
 * `bulkInviteUsers`, `inviteSingleUser` (documented above each definition).
 *
 * Selectors: `selectInvitation`, `selectInvitationLoading`,
 * `selectInvitationError`, `selectValidationData`, `selectBulkInviteLoading`,
 * `selectBulkInviteSuccess`, `selectSingleInviteLoading`,
 * `selectSingleInviteSuccess` (below), reading from `state.invitation`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
// Create the slice
const invitationSlice = createSlice({
    name: 'invitation',
    initialState,
    reducers: {
        /** Clears the shared `error` field. */
        clearError: (state) => {
            state.error = null;
        },
        /** Clears the previously validated invite details. */
        clearValidationData: (state) => {
            state.validationData = null;
        },
        /** Resets the bulk-invite status flags (loading/success/error). */
        resetBulkInviteState: (state) => {
            state.bulkInviteLoading = false;
            state.bulkInviteSuccess = false;
            state.error = null;
        },
        /** Resets the single-invite status flags (loading/success/error). */
        resetSingleInviteState: (state) => {
            state.singleInviteLoading = false;
            state.singleInviteSuccess = false;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Validate invitation token
            .addCase(validateInvitationToken.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(validateInvitationToken.fulfilled, (state, action) => {
                state.isLoading = false;
                state.validationData = action.payload;
                state.error = null;
            })
            .addCase(validateInvitationToken.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.validationData = null;
            })

            // Accept invitation
            .addCase(acceptInvitation.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(acceptInvitation.fulfilled, (state) => {
                state.isLoading = false;
                state.error = null;
            })
            .addCase(acceptInvitation.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })

            // Bulk invite users
            .addCase(bulkInviteUsers.pending, (state) => {
                state.bulkInviteLoading = true;
                state.bulkInviteSuccess = false;
                state.error = null;
            })
            .addCase(bulkInviteUsers.fulfilled, (state) => {
                state.bulkInviteLoading = false;
                state.bulkInviteSuccess = true;
                state.error = null;
            })
            .addCase(bulkInviteUsers.rejected, (state, action) => {
                state.bulkInviteLoading = false;
                state.bulkInviteSuccess = false;
                state.error = action.payload as string;
            })

            // Single invite user
            .addCase(inviteSingleUser.pending, (state) => {
                state.singleInviteLoading = true;
                state.singleInviteSuccess = false;
                state.error = null;
            })
            .addCase(inviteSingleUser.fulfilled, (state) => {
                state.singleInviteLoading = false;
                state.singleInviteSuccess = true;
                state.error = null;
            })
            .addCase(inviteSingleUser.rejected, (state, action) => {
                state.singleInviteLoading = false;
                state.singleInviteSuccess = false;
                state.error = action.payload as string;
            });
    },
});

// Export actions
export const { clearError, clearValidationData, resetBulkInviteState, resetSingleInviteState } = invitationSlice.actions;

// Selectors
export const selectInvitation = (state: { invitation: InvitationState }) => state.invitation;
export const selectInvitationLoading = (state: { invitation: InvitationState }) => state.invitation.isLoading;
export const selectInvitationError = (state: { invitation: InvitationState }) => state.invitation.error;
export const selectValidationData = (state: { invitation: InvitationState }) => state.invitation.validationData;
export const selectBulkInviteLoading = (state: { invitation: InvitationState }) => state.invitation.bulkInviteLoading;
export const selectBulkInviteSuccess = (state: { invitation: InvitationState }) => state.invitation.bulkInviteSuccess;
export const selectSingleInviteLoading = (state: { invitation: InvitationState }) => state.invitation.singleInviteLoading;
export const selectSingleInviteSuccess = (state: { invitation: InvitationState }) => state.invitation.singleInviteSuccess;

// Export reducer
export default invitationSlice.reducer;
