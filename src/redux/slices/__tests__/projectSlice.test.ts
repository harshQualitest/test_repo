import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import projectReducer, {
    fetchAllProjects,
    createProject,
    archiveProject,
    deleteProject,
    updateProject,
    fetchAllProjectTasks,
    fetchProjectMembers,
    clearErrors,
    clearCreateSuccess,
    clearUpdateSuccess,
    setCurrentProject,
    clearCurrentProject,
    resetProjectState,
    selectAllProjects,
    selectCurrentProject,
    selectProjectLoading,
    selectProjectError,
    selectCreateLoading,
    selectCreateError,
    selectCreateSuccess,
    selectUpdateLoading,
    selectUpdateError,
    selectUpdateSuccess,
    selectProjectTasks,
    selectProjectMembers,
    selectTasksLoading,
    selectTasksError,
    selectTasksPagination,
    selectMembersLoading,
    selectMembersError,
    selectMembersPagination,
} from '../projectSlice';
import type { ProjectState, IProject } from '../projectSlice';

// ── Module mock ───────────────────────────────────────────────────────────────

vi.mock('../../../services/api/projectApi', () => ({
    default: {
        getAllProjects: vi.fn(),
        createProject: vi.fn(),
        archiveProject: vi.fn(),
        deleteProject: vi.fn(),
        updateProject: vi.fn(),
        getAllProjectTasks: vi.fn(),
        getProjectMembers: vi.fn(),
    },
}));

import projectApi from '../../../services/api/projectApi';
const mockGetAllProjects = vi.mocked(projectApi.getAllProjects);
const mockCreateProject = vi.mocked(projectApi.createProject);
const mockArchiveProject = vi.mocked(projectApi.archiveProject);
const mockDeleteProject = vi.mocked(projectApi.deleteProject);
const mockUpdateProject = vi.mocked(projectApi.updateProject);
const mockGetAllProjectTasks = vi.mocked(projectApi.getAllProjectTasks);
const mockGetProjectMembers = vi.mocked(projectApi.getProjectMembers);

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_STATE: ProjectState = {
    projects: [],
    currentProject: null,
    tasks: [],
    members: [],
    loading: false,
    error: null,
    tasksLoading: false,
    tasksError: null,
    tasksPagination: null,
    membersLoading: false,
    membersError: null,
    membersPagination: null,
    createLoading: false,
    createError: null,
    createSuccess: false,
    updateLoading: false,
    updateError: null,
    updateSuccess: false,
};

function makeStore(preloaded?: Partial<ProjectState>) {
    return configureStore({
        reducer: { project: projectReducer },
        preloadedState: preloaded ? { project: { ...DEFAULT_STATE, ...preloaded } } : undefined,
    });
}

type TestStore = ReturnType<typeof makeStore>;
const getState = (store: TestStore) => store.getState() as { project: ProjectState };

// ── Fixtures ──────────────────────────────────────────────────────────────────

const project1: IProject = {
    _id: 'p1',
    org_id: 'org-1',
    workspace_id: 'ws-1',
    name: 'Project Alpha',
    description: 'Test project',
    template_type: 'llm_grading',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    status: 'active',
};

const project2: IProject = {
    _id: 'p2',
    org_id: 'org-1',
    workspace_id: 'ws-1',
    name: 'Project Beta',
    description: 'Another project',
    template_type: 'text_annotation',
    start_date: '2024-02-01',
    end_date: '2024-11-30',
    status: 'draft',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('projectSlice', () => {
    beforeEach(() => vi.clearAllMocks());

    // ── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('starts with empty projects array', () => {
            expect(selectAllProjects(getState(makeStore()))).toEqual([]);
        });

        it('starts with currentProject null', () => {
            expect(selectCurrentProject(getState(makeStore()))).toBeNull();
        });

        it('starts with loading false', () => {
            expect(selectProjectLoading(getState(makeStore()))).toBe(false);
        });

        it('starts with createSuccess false', () => {
            expect(selectCreateSuccess(getState(makeStore()))).toBe(false);
        });

        it('starts with updateSuccess false', () => {
            expect(selectUpdateSuccess(getState(makeStore()))).toBe(false);
        });

        it('starts with tasksPagination null', () => {
            expect(selectTasksPagination(getState(makeStore()))).toBeNull();
        });
    });

    // ── Sync actions ─────────────────────────────────────────────────────────

    describe('clearErrors', () => {
        it('resets error, createError, and updateError to null', () => {
            const store = makeStore({ error: 'e1', createError: 'e2', updateError: 'e3' });
            store.dispatch(clearErrors());
            const state = getState(store);
            expect(selectProjectError(state)).toBeNull();
            expect(selectCreateError(state)).toBeNull();
            expect(selectUpdateError(state)).toBeNull();
        });
    });

    describe('clearCreateSuccess', () => {
        it('resets createSuccess to false', () => {
            const store = makeStore({ createSuccess: true });
            store.dispatch(clearCreateSuccess());
            expect(selectCreateSuccess(getState(store))).toBe(false);
        });
    });

    describe('clearUpdateSuccess', () => {
        it('resets updateSuccess to false', () => {
            const store = makeStore({ updateSuccess: true });
            store.dispatch(clearUpdateSuccess());
            expect(selectUpdateSuccess(getState(store))).toBe(false);
        });
    });

    describe('setCurrentProject', () => {
        it('sets the currentProject', () => {
            const store = makeStore();
            store.dispatch(setCurrentProject(project1));
            expect(selectCurrentProject(getState(store))?._id).toBe('p1');
        });

        it('clears the currentProject when called with null', () => {
            const store = makeStore({ currentProject: project1 });
            store.dispatch(setCurrentProject(null));
            expect(selectCurrentProject(getState(store))).toBeNull();
        });
    });

    describe('clearCurrentProject', () => {
        it('sets currentProject to null', () => {
            const store = makeStore({ currentProject: project1 });
            store.dispatch(clearCurrentProject());
            expect(selectCurrentProject(getState(store))).toBeNull();
        });
    });

    describe('resetProjectState', () => {
        it('returns all fields to initial values', () => {
            const store = makeStore({
                projects: [project1],
                currentProject: project1,
                error: 'err',
                createSuccess: true,
                updateSuccess: true,
            });
            store.dispatch(resetProjectState());
            const state = getState(store);
            expect(selectAllProjects(state)).toEqual([]);
            expect(selectCurrentProject(state)).toBeNull();
            expect(selectProjectError(state)).toBeNull();
            expect(selectCreateSuccess(state)).toBe(false);
            expect(selectUpdateSuccess(state)).toBe(false);
        });
    });

    // ── fetchAllProjects thunk ────────────────────────────────────────────────

    describe('fetchAllProjects', () => {
        const args = { workspaceId: 'ws-1' };

        it('sets loading true while pending', async () => {
            let resolve!: (v: any) => void;
            mockGetAllProjects.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(fetchAllProjects(args));
            expect(selectProjectLoading(getState(store))).toBe(true);
            resolve([project1]);
            await p;
        });

        it('populates projects array on success', async () => {
            mockGetAllProjects.mockResolvedValue([project1, project2] as any);
            const store = makeStore();
            await store.dispatch(fetchAllProjects(args));
            expect(selectAllProjects(getState(store))).toHaveLength(2);
            expect(selectProjectLoading(getState(store))).toBe(false);
        });

        it('sets error on rejection', async () => {
            mockGetAllProjects.mockRejectedValue({ response: { data: { message: 'Not authorized' } } });
            const store = makeStore();
            await store.dispatch(fetchAllProjects(args));
            expect(selectProjectError(getState(store))).toBe('Not authorized');
            expect(selectProjectLoading(getState(store))).toBe(false);
        });
    });

    // ── createProject thunk ───────────────────────────────────────────────────

    describe('createProject', () => {
        it('sets createLoading true and createSuccess false while pending', async () => {
            let resolve!: (v: any) => void;
            mockCreateProject.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore({ createSuccess: true });
            const p = store.dispatch(createProject({} as any));
            expect(selectCreateLoading(getState(store))).toBe(true);
            expect(selectCreateSuccess(getState(store))).toBe(false);
            resolve(project1);
            await p;
        });

        it('prepends new project on success and sets createSuccess true', async () => {
            mockCreateProject.mockResolvedValue(project1 as any);
            const store = makeStore({ projects: [project2] });
            await store.dispatch(createProject({} as any));
            const projects = selectAllProjects(getState(store));
            expect(projects[0]._id).toBe('p1'); // prepended
            expect(projects).toHaveLength(2);
            expect(selectCreateSuccess(getState(store))).toBe(true);
            expect(selectCreateLoading(getState(store))).toBe(false);
        });

        it('replaces existing project when the returned id already exists in the list', async () => {
            const updatedProject = { ...project1, name: 'Updated Name' };
            mockCreateProject.mockResolvedValue(updatedProject as any);
            const store = makeStore({ projects: [project1] });
            await store.dispatch(createProject({} as any));
            const projects = selectAllProjects(getState(store));
            expect(projects).toHaveLength(1);
            expect(projects[0].name).toBe('Updated Name');
        });

        it('sets createError on rejection', async () => {
            mockCreateProject.mockRejectedValue({ response: { data: { message: 'Invalid data' } } });
            const store = makeStore();
            await store.dispatch(createProject({} as any));
            expect(selectCreateError(getState(store))).toBe('Invalid data');
            expect(selectCreateSuccess(getState(store))).toBe(false);
        });
    });

    // ── archiveProject thunk ──────────────────────────────────────────────────

    describe('archiveProject', () => {
        it('changes the matching project status to archived', async () => {
            mockArchiveProject.mockResolvedValue({} as any);
            const store = makeStore({ projects: [project1, project2] });
            await store.dispatch(archiveProject('p1'));
            const projects = selectAllProjects(getState(store));
            expect(projects.find(p => p._id === 'p1')?.status).toBe('archived');
            expect(projects.find(p => p._id === 'p2')?.status).toBe('draft'); // unchanged
        });

        it('sets error on rejection', async () => {
            mockArchiveProject.mockRejectedValue(new Error('Archive failed'));
            const store = makeStore();
            await store.dispatch(archiveProject('p1'));
            expect(selectProjectError(getState(store))).toBe('Archive failed');
        });
    });

    // ── deleteProject thunk ───────────────────────────────────────────────────

    describe('deleteProject', () => {
        it('removes the project by _id on success', async () => {
            mockDeleteProject.mockResolvedValue(undefined as any);
            const store = makeStore({ projects: [project1, project2] });
            await store.dispatch(deleteProject('p1'));
            const projects = selectAllProjects(getState(store));
            expect(projects).toHaveLength(1);
            expect(projects[0]._id).toBe('p2');
        });

        it('sets error on rejection', async () => {
            mockDeleteProject.mockRejectedValue({ response: { data: { message: 'Cannot delete' } } });
            const store = makeStore({ projects: [project1] });
            await store.dispatch(deleteProject('p1'));
            expect(selectProjectError(getState(store))).toBe('Cannot delete');
        });
    });

    // ── updateProject thunk ───────────────────────────────────────────────────

    describe('updateProject', () => {
        it('sets updateLoading true while pending', async () => {
            let resolve!: (v: any) => void;
            mockUpdateProject.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(updateProject({} as any));
            expect(selectUpdateLoading(getState(store))).toBe(true);
            resolve(project1);
            await p;
        });

        it('updates the matching project in the list and sets updateSuccess true', async () => {
            const updatedProject = { ...project1, name: 'New Name' };
            mockUpdateProject.mockResolvedValue(updatedProject as any);
            const store = makeStore({ projects: [project1] });
            await store.dispatch(updateProject({} as any));
            expect(selectAllProjects(getState(store))[0].name).toBe('New Name');
            expect(selectUpdateSuccess(getState(store))).toBe(true);
            expect(selectUpdateLoading(getState(store))).toBe(false);
        });

        it('sets updateError on rejection', async () => {
            mockUpdateProject.mockRejectedValue({ response: { data: { message: 'Update conflict' } } });
            const store = makeStore();
            await store.dispatch(updateProject({} as any));
            expect(selectUpdateError(getState(store))).toBe('Update conflict');
            expect(selectUpdateSuccess(getState(store))).toBe(false);
        });
    });

    // ── fetchAllProjectTasks thunk ────────────────────────────────────────────

    describe('fetchAllProjectTasks', () => {
        it('sets tasksLoading true while pending', async () => {
            let resolve!: (v: any) => void;
            mockGetAllProjectTasks.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(fetchAllProjectTasks({ projectId: 'p1' }));
            expect(selectTasksLoading(getState(store))).toBe(true);
            resolve({ data: [], total: 0, limit: 10, offset: 0 });
            await p;
        });

        it('populates tasks from paginated response (response.data)', async () => {
            const tasks = [{ _id: 't1', prompt: 'hello' }, { _id: 't2', prompt: 'world' }];
            mockGetAllProjectTasks.mockResolvedValue({ data: tasks, total: 2, limit: 10, offset: 0 } as any);
            const store = makeStore();
            await store.dispatch(fetchAllProjectTasks({ projectId: 'p1' }));
            expect(selectProjectTasks(getState(store))).toHaveLength(2);
            expect(selectTasksPagination(getState(store))).toEqual({ offset: 0, limit: 10, total: 2 });
        });

        it('populates tasks from direct array response', async () => {
            const tasks = [{ _id: 't1', prompt: 'hello' }];
            mockGetAllProjectTasks.mockResolvedValue(tasks as any);
            const store = makeStore();
            await store.dispatch(fetchAllProjectTasks({ projectId: 'p1' }));
            expect(selectProjectTasks(getState(store))).toHaveLength(1);
            expect(selectTasksPagination(getState(store))).toBeNull();
        });

        it('sets tasksError on rejection', async () => {
            mockGetAllProjectTasks.mockRejectedValue(new Error('Tasks not found'));
            const store = makeStore();
            await store.dispatch(fetchAllProjectTasks({ projectId: 'p1' }));
            expect(selectTasksError(getState(store))).toBe('Tasks not found');
            expect(selectTasksLoading(getState(store))).toBe(false);
        });
    });

    // ── fetchProjectMembers thunk ─────────────────────────────────────────────

    describe('fetchProjectMembers', () => {
        it('sets membersLoading true while pending', async () => {
            let resolve!: (v: any) => void;
            mockGetProjectMembers.mockReturnValue(new Promise(res => (resolve = res)));
            const store = makeStore();
            const p = store.dispatch(fetchProjectMembers({ projectId: 'p1' }));
            expect(selectMembersLoading(getState(store))).toBe(true);
            resolve({ data: [], total: 0 });
            await p;
        });

        it('populates members from paginated response', async () => {
            const members = [{ _id: 'm1', name: 'Alice', email: 'alice@example.com' }];
            mockGetProjectMembers.mockResolvedValue({ data: members, total: 1, limit: 10, offset: 0 } as any);
            const store = makeStore();
            await store.dispatch(fetchProjectMembers({ projectId: 'p1' }));
            expect(selectProjectMembers(getState(store))).toHaveLength(1);
            expect(selectMembersPagination(getState(store))).toEqual({ offset: 0, limit: 10, total: 1 });
        });

        it('handles direct array response', async () => {
            const members = [{ _id: 'm1', name: 'Bob', email: 'bob@example.com' }];
            mockGetProjectMembers.mockResolvedValue(members as any);
            const store = makeStore();
            await store.dispatch(fetchProjectMembers({ projectId: 'p1' }));
            expect(selectProjectMembers(getState(store))).toHaveLength(1);
            expect(selectMembersPagination(getState(store))).toBeNull();
        });

        it('sets membersError on rejection', async () => {
            mockGetProjectMembers.mockRejectedValue({ response: { data: { message: 'Access denied' } } });
            const store = makeStore();
            await store.dispatch(fetchProjectMembers({ projectId: 'p1' }));
            expect(selectMembersError(getState(store))).toBe('Access denied');
            expect(selectMembersLoading(getState(store))).toBe(false);
        });
    });
});
