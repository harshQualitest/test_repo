import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import emailTemplateReducer, {
    fetchEmailTemplates,
    fetchEmailTemplatesByRole,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    getEmailTemplate,
    setDefaultEmailTemplate,
    clearError,
    setSelectedTemplate,
    clearSelectedTemplate,
    resetTemplateState,
    selectEmailTemplates,
    selectSelectedEmailTemplate,
    selectEmailTemplateLoading,
    selectEmailTemplateError,
    selectEmailTemplateCreateLoading,
    selectEmailTemplateUpdateLoading,
    selectEmailTemplateDeleteLoading,
    selectDefaultEmailTemplate,
    selectActiveEmailTemplates,
} from '../emailTemplateSlice';

// ── Module mock ───────────────────────────────────────────────────────────────

vi.mock('../../../services/api/emailTemplateApi', () => ({
    emailTemplateApi: {
        fetchTemplates: vi.fn(),
        fetchTemplateByRole: vi.fn(),
        createTemplate: vi.fn(),
        updateTemplate: vi.fn(),
        deleteTemplate: vi.fn(),
        getTemplateById: vi.fn(),
        setDefaultTemplate: vi.fn(),
    },
}));

import { emailTemplateApi } from '../../../services/api/emailTemplateApi';
const mockFetchTemplates = vi.mocked(emailTemplateApi.fetchTemplates);
const mockFetchTemplateByRole = vi.mocked(emailTemplateApi.fetchTemplateByRole);
const mockCreateTemplate = vi.mocked(emailTemplateApi.createTemplate);
const mockUpdateTemplate = vi.mocked(emailTemplateApi.updateTemplate);
const mockDeleteTemplate = vi.mocked(emailTemplateApi.deleteTemplate);
const mockGetTemplateById = vi.mocked(emailTemplateApi.getTemplateById);
const mockSetDefaultTemplate = vi.mocked(emailTemplateApi.setDefaultTemplate);

// ── Helpers ───────────────────────────────────────────────────────────────────

interface EmailTemplateState {
    templates: any[];
    selectedTemplate: any;
    loading: boolean;
    error: string | null;
    createLoading: boolean;
    updateLoading: boolean;
    deleteLoading: boolean;
}

const DEFAULT_STATE: EmailTemplateState = {
    templates: [],
    selectedTemplate: null,
    loading: false,
    error: null,
    createLoading: false,
    updateLoading: false,
    deleteLoading: false,
};

function makeStore(preloaded?: Partial<EmailTemplateState>) {
    return configureStore({
        reducer: { emailTemplates: emailTemplateReducer },
        preloadedState: preloaded ? { emailTemplates: { ...DEFAULT_STATE, ...preloaded } } : undefined,
    });
}

type TestStore = ReturnType<typeof makeStore>;
const getState = (store: TestStore) => store.getState() as { emailTemplates: EmailTemplateState };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const tmpl1 = { _id: 't1', name: 'Welcome Email', subject: 'Welcome!', isDefault: false, isActive: true, is_active: 1 };
const tmpl2 = { _id: 't2', name: 'Invitation Email', subject: 'You are invited', isDefault: true, isActive: true, is_active: 1 };
const tmpl3 = { _id: 't3', name: 'Inactive Template', subject: 'Old', isDefault: false, isActive: false, is_active: 0 };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('emailTemplateSlice', () => {
    beforeEach(() => vi.clearAllMocks());

    // ── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('starts with empty templates array', () => {
            expect(selectEmailTemplates(getState(makeStore()))).toEqual([]);
        });

        it('starts with selectedTemplate null', () => {
            expect(selectSelectedEmailTemplate(getState(makeStore()))).toBeNull();
        });

        it('starts with loading false', () => {
            expect(selectEmailTemplateLoading(getState(makeStore()))).toBe(false);
        });

        it('starts with error null', () => {
            expect(selectEmailTemplateError(getState(makeStore()))).toBeNull();
        });
    });

    // ── Derived selectors ────────────────────────────────────────────────────

    describe('selectDefaultEmailTemplate', () => {
        it('returns the first template matching isDefault OR is_active===1', () => {
            // selectDefaultEmailTemplate: find(t => t.isDefault || t.is_active === 1)
            // tmpl1 has is_active=1 so it's the first match
            const store = makeStore({ templates: [tmpl1, tmpl2, tmpl3] });
            expect(selectDefaultEmailTemplate(getState(store))?._id).toBe('t1');
        });

        it('returns the template with isDefault=true when it appears first', () => {
            // Put tmpl2 (isDefault=true) before tmpl1
            const store = makeStore({ templates: [tmpl2, tmpl1, tmpl3] });
            expect(selectDefaultEmailTemplate(getState(store))?._id).toBe('t2');
        });

        it('returns null when no templates exist', () => {
            const store = makeStore({ templates: [] });
            expect(selectDefaultEmailTemplate(getState(store))).toBeNull();
        });

        it('returns null when all templates have isDefault=false and is_active=0', () => {
            const inactiveTemplate = { _id: 'ti', name: 'Inactive', subject: 'Old', isDefault: false, isActive: false, is_active: 0 };
            const store = makeStore({ templates: [inactiveTemplate] });
            expect(selectDefaultEmailTemplate(getState(store))).toBeNull();
        });
    });

    describe('selectActiveEmailTemplates', () => {
        it('returns only templates with isActive=true or is_active===1', () => {
            const store = makeStore({ templates: [tmpl1, tmpl2, tmpl3] });
            const active = selectActiveEmailTemplates(getState(store));
            expect(active).toHaveLength(2);
            expect(active.map((t: any) => t._id)).not.toContain('t3');
        });
    });

    // ── Sync actions ─────────────────────────────────────────────────────────

    describe('clearError', () => {
        it('resets error to null', () => {
            const store = makeStore({ error: 'fetch error' });
            store.dispatch(clearError());
            expect(selectEmailTemplateError(getState(store))).toBeNull();
        });
    });

    describe('setSelectedTemplate', () => {
        it('sets the selectedTemplate', () => {
            const store = makeStore();
            store.dispatch(setSelectedTemplate(tmpl1 as any));
            expect(selectSelectedEmailTemplate(getState(store))?._id).toBe('t1');
        });

        it('clears selectedTemplate when called with null', () => {
            const store = makeStore({ selectedTemplate: tmpl1 });
            store.dispatch(setSelectedTemplate(null));
            expect(selectSelectedEmailTemplate(getState(store))).toBeNull();
        });
    });

    describe('clearSelectedTemplate', () => {
        it('sets selectedTemplate to null', () => {
            const store = makeStore({ selectedTemplate: tmpl1 });
            store.dispatch(clearSelectedTemplate());
            expect(selectSelectedEmailTemplate(getState(store))).toBeNull();
        });
    });

    describe('resetTemplateState', () => {
        it('returns all fields to initial values', () => {
            const store = makeStore({
                templates: [tmpl1],
                selectedTemplate: tmpl1,
                error: 'err',
                createLoading: true,
            });
            store.dispatch(resetTemplateState());
            const state = getState(store);
            expect(selectEmailTemplates(state)).toEqual([]);
            expect(selectSelectedEmailTemplate(state)).toBeNull();
            expect(selectEmailTemplateError(state)).toBeNull();
            expect(selectEmailTemplateCreateLoading(state)).toBe(false);
        });
    });

    // ── fetchEmailTemplates thunk ─────────────────────────────────────────────

    describe('fetchEmailTemplates', () => {
        it('sets loading true while pending', async () => {
            let resolve!: (v: unknown) => void;
            mockFetchTemplates.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(fetchEmailTemplates());
            expect(selectEmailTemplateLoading(getState(store))).toBe(true);
            resolve({ data: [] });
            await p;
        });

        it('populates templates from response.data', async () => {
            mockFetchTemplates.mockResolvedValue({ data: [tmpl1, tmpl2] } as any);
            const store = makeStore();
            await store.dispatch(fetchEmailTemplates());
            expect(selectEmailTemplates(getState(store))).toHaveLength(2);
            expect(selectEmailTemplateLoading(getState(store))).toBe(false);
        });

        it('handles direct array response (no data wrapper)', async () => {
            mockFetchTemplates.mockResolvedValue([tmpl1] as any);
            const store = makeStore();
            await store.dispatch(fetchEmailTemplates());
            expect(selectEmailTemplates(getState(store))).toHaveLength(1);
        });

        it('returns empty array when response is neither array nor has data array', async () => {
            mockFetchTemplates.mockResolvedValue({} as any);
            const store = makeStore();
            await store.dispatch(fetchEmailTemplates());
            expect(selectEmailTemplates(getState(store))).toEqual([]);
        });

        it('sets error on rejection', async () => {
            mockFetchTemplates.mockRejectedValue({ response: { data: { message: 'Not found' } } });
            const store = makeStore();
            await store.dispatch(fetchEmailTemplates());
            expect(selectEmailTemplateError(getState(store))).toBe('Not found');
        });
    });

    // ── fetchEmailTemplatesByRole thunk ───────────────────────────────────────

    describe('fetchEmailTemplatesByRole', () => {
        it('replaces templates on success', async () => {
            mockFetchTemplateByRole.mockResolvedValue({ data: [tmpl2] } as any);
            const store = makeStore({ templates: [tmpl1] });
            await store.dispatch(fetchEmailTemplatesByRole('annotator'));
            expect(selectEmailTemplates(getState(store))).toHaveLength(1);
            expect(selectEmailTemplates(getState(store))[0]._id).toBe('t2');
        });

        it('sets error on rejection', async () => {
            mockFetchTemplateByRole.mockRejectedValue({});
            const store = makeStore();
            await store.dispatch(fetchEmailTemplatesByRole('unknown_role'));
            expect(selectEmailTemplateError(getState(store))).toBe('Failed to fetch email templates by role');
        });
    });

    // ── createEmailTemplate thunk ─────────────────────────────────────────────

    describe('createEmailTemplate', () => {
        const newTemplate = { name: 'New', subject: 'Subject', body: 'Body' } as any;

        it('sets createLoading true while pending', async () => {
            let resolve!: (v: unknown) => void;
            mockCreateTemplate.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(createEmailTemplate(newTemplate));
            expect(selectEmailTemplateCreateLoading(getState(store))).toBe(true);
            resolve({ data: tmpl1 });
            await p;
        });

        it('appends the template from response.data on success', async () => {
            mockCreateTemplate.mockResolvedValue({ data: tmpl1 } as any);
            const store = makeStore();
            await store.dispatch(createEmailTemplate(newTemplate));
            expect(selectEmailTemplates(getState(store))).toHaveLength(1);
            expect(selectEmailTemplateCreateLoading(getState(store))).toBe(false);
        });

        it('handles direct response (no data wrapper)', async () => {
            mockCreateTemplate.mockResolvedValue(tmpl1 as any);
            const store = makeStore();
            await store.dispatch(createEmailTemplate(newTemplate));
            expect(selectEmailTemplates(getState(store))[0]._id).toBe('t1');
        });

        it('sets error on rejection', async () => {
            mockCreateTemplate.mockRejectedValue({ response: { data: { message: 'Duplicate template' } } });
            const store = makeStore();
            await store.dispatch(createEmailTemplate(newTemplate));
            expect(selectEmailTemplateError(getState(store))).toBe('Duplicate template');
        });
    });

    // ── updateEmailTemplate thunk ─────────────────────────────────────────────

    describe('updateEmailTemplate', () => {
        it('rejects immediately when _id is missing', async () => {
            const store = makeStore({ templates: [tmpl1] });
            await store.dispatch(updateEmailTemplate({ name: 'Updated' } as any));
            expect(selectEmailTemplateError(getState(store))).toBe('Template ID is required for update');
        });

        it('sets updateLoading true while pending', async () => {
            let resolve!: (v: unknown) => void;
            mockUpdateTemplate.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(updateEmailTemplate({ _id: 't1', name: 'Updated' } as any));
            expect(selectEmailTemplateUpdateLoading(getState(store))).toBe(true);
            resolve({ data: tmpl1 });
            await p;
        });

        it('replaces the matching template in the list', async () => {
            const updated = { ...tmpl1, name: 'Updated Name' };
            mockUpdateTemplate.mockResolvedValue({ data: updated } as any);
            const store = makeStore({ templates: [tmpl1, tmpl2] });
            await store.dispatch(updateEmailTemplate({ _id: 't1', name: 'Updated Name' } as any));
            expect(selectEmailTemplates(getState(store)).find((t: any) => t._id === 't1')?.name).toBe('Updated Name');
        });

        it('also updates selectedTemplate when it matches', async () => {
            const updated = { ...tmpl1, name: 'Updated Name' };
            mockUpdateTemplate.mockResolvedValue({ data: updated } as any);
            const store = makeStore({ templates: [tmpl1], selectedTemplate: tmpl1 });
            await store.dispatch(updateEmailTemplate({ _id: 't1', name: 'Updated Name' } as any));
            expect(selectSelectedEmailTemplate(getState(store))?.name).toBe('Updated Name');
        });

        it('sets error on rejection', async () => {
            mockUpdateTemplate.mockRejectedValue({ response: { data: { message: 'Conflict' } } });
            const store = makeStore({ templates: [tmpl1] });
            await store.dispatch(updateEmailTemplate({ _id: 't1', name: 'x' } as any));
            expect(selectEmailTemplateError(getState(store))).toBe('Conflict');
        });
    });

    // ── deleteEmailTemplate thunk ─────────────────────────────────────────────

    describe('deleteEmailTemplate', () => {
        it('sets deleteLoading true while pending', async () => {
            let resolve!: (v: unknown) => void;
            mockDeleteTemplate.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(deleteEmailTemplate('t1'));
            expect(selectEmailTemplateDeleteLoading(getState(store))).toBe(true);
            resolve(undefined);
            await p;
        });

        it('removes the template from the list by id', async () => {
            mockDeleteTemplate.mockResolvedValue(undefined as any);
            const store = makeStore({ templates: [tmpl1, tmpl2] });
            await store.dispatch(deleteEmailTemplate('t1'));
            expect(selectEmailTemplates(getState(store))).toHaveLength(1);
            expect(selectEmailTemplates(getState(store))[0]._id).toBe('t2');
        });

        it('clears selectedTemplate when the deleted id matches', async () => {
            mockDeleteTemplate.mockResolvedValue(undefined as any);
            const store = makeStore({ templates: [tmpl1], selectedTemplate: tmpl1 });
            await store.dispatch(deleteEmailTemplate('t1'));
            expect(selectSelectedEmailTemplate(getState(store))).toBeNull();
        });

        it('sets error on rejection', async () => {
            mockDeleteTemplate.mockRejectedValue({ response: { data: { message: 'Template in use' } } });
            const store = makeStore();
            await store.dispatch(deleteEmailTemplate('t1'));
            expect(selectEmailTemplateError(getState(store))).toBe('Template in use');
        });
    });

    // ── getEmailTemplate thunk ────────────────────────────────────────────────

    describe('getEmailTemplate', () => {
        it('sets selectedTemplate from response.data', async () => {
            mockGetTemplateById.mockResolvedValue({ data: tmpl1 } as any);
            const store = makeStore();
            await store.dispatch(getEmailTemplate('t1'));
            expect(selectSelectedEmailTemplate(getState(store))?._id).toBe('t1');
            expect(selectEmailTemplateLoading(getState(store))).toBe(false);
        });

        it('handles direct response (no data wrapper)', async () => {
            mockGetTemplateById.mockResolvedValue(tmpl2 as any);
            const store = makeStore();
            await store.dispatch(getEmailTemplate('t2'));
            expect(selectSelectedEmailTemplate(getState(store))?._id).toBe('t2');
        });

        it('sets error on rejection', async () => {
            mockGetTemplateById.mockRejectedValue({ response: { data: { message: 'Template not found' } } });
            const store = makeStore();
            await store.dispatch(getEmailTemplate('bad-id'));
            expect(selectEmailTemplateError(getState(store))).toBe('Template not found');
        });
    });

    // ── setDefaultEmailTemplate thunk ─────────────────────────────────────────

    describe('setDefaultEmailTemplate', () => {
        it('replaces the entire templates list with the updated list from API', async () => {
            const updatedList = [{ ...tmpl1, isDefault: true }, tmpl2];
            mockSetDefaultTemplate.mockResolvedValue({ data: updatedList } as any);
            const store = makeStore({ templates: [tmpl1, tmpl2] });
            await store.dispatch(setDefaultEmailTemplate({ templateId: 't1' }));
            expect(selectEmailTemplates(getState(store))).toHaveLength(2);
            expect(selectEmailTemplates(getState(store))[0].isDefault).toBe(true);
        });

        it('handles direct array response', async () => {
            const updatedList = [tmpl1, { ...tmpl2, isDefault: false }];
            mockSetDefaultTemplate.mockResolvedValue(updatedList as any);
            const store = makeStore({ templates: [tmpl1] });
            await store.dispatch(setDefaultEmailTemplate({ templateId: 't2' }));
            expect(selectEmailTemplates(getState(store))).toHaveLength(2);
        });

        it('sets error on rejection', async () => {
            mockSetDefaultTemplate.mockRejectedValue({ response: { data: { message: 'Cannot set default' } } });
            const store = makeStore();
            await store.dispatch(setDefaultEmailTemplate({ templateId: 't1' }));
            expect(selectEmailTemplateError(getState(store))).toBe('Cannot set default');
        });
    });
});
