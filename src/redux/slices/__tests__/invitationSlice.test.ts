import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import invitationReducer, {
    validateInvitationToken,
    acceptInvitation,
    bulkInviteUsers,
    inviteSingleUser,
    clearError,
    clearValidationData,
    resetBulkInviteState,
    resetSingleInviteState,
    selectInvitationLoading,
    selectInvitationError,
    selectValidationData,
    selectBulkInviteLoading,
    selectBulkInviteSuccess,
    selectSingleInviteLoading,
    selectSingleInviteSuccess,
} from '../invitationSlice';

// ── Module mock ───────────────────────────────────────────────────────────────

vi.mock('../../../services/api/invitationApi', () => ({
    default: {
        validateToken: vi.fn(),
        acceptInvitation: vi.fn(),
        bulkInviteUsers: vi.fn(),
        inviteSingleUser: vi.fn(),
    },
}));

import invitationApi from '../../../services/api/invitationApi';
const mockValidateToken = vi.mocked(invitationApi.validateToken);
const mockAcceptInvitation = vi.mocked(invitationApi.acceptInvitation);
const mockBulkInviteUsers = vi.mocked(invitationApi.bulkInviteUsers);
const mockInviteSingleUser = vi.mocked(invitationApi.inviteSingleUser);

// ── Helpers ───────────────────────────────────────────────────────────────────

interface InvitationState {
    isLoading: boolean;
    error: string | null;
    validationData: any;
    bulkInviteLoading: boolean;
    bulkInviteSuccess: boolean;
    singleInviteLoading: boolean;
    singleInviteSuccess: boolean;
}

const DEFAULT_STATE: InvitationState = {
    isLoading: false,
    error: null,
    validationData: null,
    bulkInviteLoading: false,
    bulkInviteSuccess: false,
    singleInviteLoading: false,
    singleInviteSuccess: false,
};

function makeStore(preloaded?: Partial<InvitationState>) {
    return configureStore({
        reducer: { invitation: invitationReducer },
        preloadedState: preloaded ? { invitation: { ...DEFAULT_STATE, ...preloaded } } : undefined,
    });
}

type TestStore = ReturnType<typeof makeStore>;
const getState = (store: TestStore) => store.getState() as { invitation: InvitationState };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const validationResponse = {
    token: 'tok-123',
    email: 'invitee@example.com',
    organization_id: 'org-1',
    role: 'annotator',
    is_valid: true,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('invitationSlice', () => {
    beforeEach(() => vi.clearAllMocks());

    // ── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('starts with isLoading false', () => {
            expect(selectInvitationLoading(getState(makeStore()))).toBe(false);
        });

        it('starts with error null', () => {
            expect(selectInvitationError(getState(makeStore()))).toBeNull();
        });

        it('starts with validationData null', () => {
            expect(selectValidationData(getState(makeStore()))).toBeNull();
        });

        it('starts with bulkInviteSuccess false', () => {
            expect(selectBulkInviteSuccess(getState(makeStore()))).toBe(false);
        });

        it('starts with singleInviteSuccess false', () => {
            expect(selectSingleInviteSuccess(getState(makeStore()))).toBe(false);
        });
    });

    // ── Sync actions ─────────────────────────────────────────────────────────

    describe('clearError', () => {
        it('resets error to null', () => {
            const store = makeStore({ error: 'something went wrong' });
            store.dispatch(clearError());
            expect(selectInvitationError(getState(store))).toBeNull();
        });
    });

    describe('clearValidationData', () => {
        it('resets validationData to null', () => {
            const store = makeStore({ validationData: validationResponse });
            store.dispatch(clearValidationData());
            expect(selectValidationData(getState(store))).toBeNull();
        });
    });

    describe('resetBulkInviteState', () => {
        it('clears bulkInviteLoading, bulkInviteSuccess and error', () => {
            const store = makeStore({ bulkInviteLoading: true, bulkInviteSuccess: true, error: 'err' });
            store.dispatch(resetBulkInviteState());
            expect(selectBulkInviteLoading(getState(store))).toBe(false);
            expect(selectBulkInviteSuccess(getState(store))).toBe(false);
            expect(selectInvitationError(getState(store))).toBeNull();
        });
    });

    describe('resetSingleInviteState', () => {
        it('clears singleInviteLoading, singleInviteSuccess and error', () => {
            const store = makeStore({ singleInviteLoading: true, singleInviteSuccess: true, error: 'err' });
            store.dispatch(resetSingleInviteState());
            expect(selectSingleInviteLoading(getState(store))).toBe(false);
            expect(selectSingleInviteSuccess(getState(store))).toBe(false);
            expect(selectInvitationError(getState(store))).toBeNull();
        });
    });

    // ── validateInvitationToken thunk ─────────────────────────────────────────

    describe('validateInvitationToken', () => {
        describe('pending', () => {
            it('sets isLoading true and clears error', async () => {
                let resolve!: (v: any) => void;
                mockValidateToken.mockReturnValue(new Promise(res => (resolve = res)));
                const store = makeStore({ error: 'stale' });
                const p = store.dispatch(validateInvitationToken('tok-abc'));
                expect(selectInvitationLoading(getState(store))).toBe(true);
                expect(selectInvitationError(getState(store))).toBeNull();
                resolve(validationResponse);
                await p;
            });
        });

        describe('fulfilled', () => {
            it('sets validationData and clears isLoading', async () => {
                mockValidateToken.mockResolvedValue(validationResponse as any);
                const store = makeStore();
                await store.dispatch(validateInvitationToken('tok-abc'));
                expect(selectValidationData(getState(store))).toEqual(validationResponse);
                expect(selectInvitationLoading(getState(store))).toBe(false);
            });
        });

        describe('rejected', () => {
            it('sets error and clears validationData', async () => {
                mockValidateToken.mockRejectedValue({ response: { data: { message: 'Invalid token' } } });
                const store = makeStore({ validationData: validationResponse });
                await store.dispatch(validateInvitationToken('bad-token'));
                expect(selectInvitationError(getState(store))).toBe('Invalid token');
                expect(selectValidationData(getState(store))).toBeNull();
                expect(selectInvitationLoading(getState(store))).toBe(false);
            });

            it('uses fallback error message when none provided', async () => {
                mockValidateToken.mockRejectedValue({});
                const store = makeStore();
                await store.dispatch(validateInvitationToken('tok'));
                expect(selectInvitationError(getState(store))).toBe('Failed to validate invitation token');
            });
        });
    });

    // ── acceptInvitation thunk ────────────────────────────────────────────────

    describe('acceptInvitation', () => {
        const payload = { token: 'tok-123', password: 'secret123' } as any;

        it('sets isLoading true while pending', async () => {
            let resolve!: (v: any) => void;
            mockAcceptInvitation.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(acceptInvitation(payload));
            expect(selectInvitationLoading(getState(store))).toBe(true);
            resolve({});
            await p;
        });

        it('clears isLoading and error on success', async () => {
            mockAcceptInvitation.mockResolvedValue({} as any);
            const store = makeStore({ error: 'old error' });
            await store.dispatch(acceptInvitation(payload));
            expect(selectInvitationLoading(getState(store))).toBe(false);
            expect(selectInvitationError(getState(store))).toBeNull();
        });

        it('sets error on rejection', async () => {
            mockAcceptInvitation.mockRejectedValue({ response: { data: { message: 'Token expired' } } });
            const store = makeStore();
            await store.dispatch(acceptInvitation(payload));
            expect(selectInvitationError(getState(store))).toBe('Token expired');
            expect(selectInvitationLoading(getState(store))).toBe(false);
        });

        it('uses fallback error on rejection', async () => {
            mockAcceptInvitation.mockRejectedValue({});
            const store = makeStore();
            await store.dispatch(acceptInvitation(payload));
            expect(selectInvitationError(getState(store))).toBe('Failed to accept invitation');
        });
    });

    // ── bulkInviteUsers thunk ─────────────────────────────────────────────────

    describe('bulkInviteUsers', () => {
        const bulkArgs = {
            file: new File(['email,role\na@b.com,annotator'], 'users.csv', { type: 'text/csv' }),
            org_id: 'org-1',
            subject: 'Join us',
            body: 'Welcome!',
        };

        it('sets bulkInviteLoading true and bulkInviteSuccess false while pending', async () => {
            let resolve!: (v: any) => void;
            mockBulkInviteUsers.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore({ bulkInviteSuccess: true });
            const p = store.dispatch(bulkInviteUsers(bulkArgs));
            expect(selectBulkInviteLoading(getState(store))).toBe(true);
            expect(selectBulkInviteSuccess(getState(store))).toBe(false);
            resolve({});
            await p;
        });

        it('sets bulkInviteSuccess true on success', async () => {
            mockBulkInviteUsers.mockResolvedValue({} as any);
            const store = makeStore();
            await store.dispatch(bulkInviteUsers(bulkArgs));
            expect(selectBulkInviteSuccess(getState(store))).toBe(true);
            expect(selectBulkInviteLoading(getState(store))).toBe(false);
        });

        it('sets error and bulkInviteSuccess false on rejection', async () => {
            mockBulkInviteUsers.mockRejectedValue({ response: { data: { message: 'Invalid CSV format' } } });
            const store = makeStore();
            await store.dispatch(bulkInviteUsers(bulkArgs));
            expect(selectInvitationError(getState(store))).toBe('Invalid CSV format');
            expect(selectBulkInviteSuccess(getState(store))).toBe(false);
            expect(selectBulkInviteLoading(getState(store))).toBe(false);
        });
    });

    // ── inviteSingleUser thunk ────────────────────────────────────────────────

    describe('inviteSingleUser', () => {
        const singleArgs = {
            email: 'newuser@example.com',
            role: 'reviewer',
            org_id: 'org-1',
        } as any;

        it('sets singleInviteLoading true and singleInviteSuccess false while pending', async () => {
            let resolve!: (v: any) => void;
            mockInviteSingleUser.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore({ singleInviteSuccess: true });
            const p = store.dispatch(inviteSingleUser(singleArgs));
            expect(selectSingleInviteLoading(getState(store))).toBe(true);
            expect(selectSingleInviteSuccess(getState(store))).toBe(false);
            resolve({});
            await p;
        });

        it('sets singleInviteSuccess true on success', async () => {
            mockInviteSingleUser.mockResolvedValue({} as any);
            const store = makeStore();
            await store.dispatch(inviteSingleUser(singleArgs));
            expect(selectSingleInviteSuccess(getState(store))).toBe(true);
            expect(selectSingleInviteLoading(getState(store))).toBe(false);
        });

        it('sets error on rejection (message from response.data.message)', async () => {
            mockInviteSingleUser.mockRejectedValue({ response: { data: { message: 'Already invited' } } });
            const store = makeStore();
            await store.dispatch(inviteSingleUser(singleArgs));
            expect(selectInvitationError(getState(store))).toBe('Already invited');
            expect(selectSingleInviteSuccess(getState(store))).toBe(false);
        });

        it('falls back to response.data.error if message is absent', async () => {
            mockInviteSingleUser.mockRejectedValue({ response: { data: { error: 'Duplicate email' } } });
            const store = makeStore();
            await store.dispatch(inviteSingleUser(singleArgs));
            expect(selectInvitationError(getState(store))).toBe('Duplicate email');
        });

        it('uses hardcoded fallback when no message or error', async () => {
            mockInviteSingleUser.mockRejectedValue({});
            const store = makeStore();
            await store.dispatch(inviteSingleUser(singleArgs));
            expect(selectInvitationError(getState(store))).toBe('Failed to send invitation');
        });
    });
});
