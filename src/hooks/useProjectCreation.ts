/**
 * Purpose: Encapsulates all state/logic behind the "create project" dialog
 * (`ProjectCreationDialog`) — a single hook so the dialog component itself
 * can stay a thin view layer. Responsibilities:
 * - Formik + Yup form state for the non-data-collection project templates
 *   (LLM grading / multi-modal / video labeling), including file-type/size
 *   validation that varies by `template_type`.
 * - Paginated, debounced, searchable loading of organization users to
 *   populate the member picker, with a client-side cache (`orgUserCache`) so
 *   previously-seen users (e.g. already-selected ones) remain displayed even
 *   after the paginated list scrolls past them.
 * - Auto-locking workspace managers (and the current user, if they are a
 *   project manager) into the member list, since those roles must always be
 *   on a project created in their workspace.
 * - Draft-save vs full-create submission paths, each dispatching the
 *   `createProject` thunk with a different `status` field.
 *
 * Use this hook when adding project-creation UI; do not duplicate its
 * validation/user-loading logic in a new component.
 */
import { useEffect, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Dayjs } from 'dayjs';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
    createProject,
    selectCreateLoading,
    selectCreateError,
    selectCreateSuccess,
    clearCreateSuccess,
    clearErrors,
} from '../redux/slices/projectSlice';
import { ROLES, getUserRole } from '../utils/roles';
import { useDebounce } from '../interfaces/hooks/useDebounce';
import userApi from '../services/api/usersApi';
import workspaceApi from '../services/api/workspaceApi';
import type { User } from '../redux/slices/userSlice';
import { selectUser } from '../redux/slices/loginSlice';
import { useToast } from './useToast';

export interface MemberOption {
    id: string;
    name: string;
    email: string;
    role: string;
}

export interface ProjectFormValues {
    name: string;
    description: string;
    template_type: string;
    start_date: Dayjs | null;
    end_date: Dayjs | null;
    dataset_file: File | null;
    video_files: File[];
    instructions_file: File | null;
    users: string[];
    task_timeout: number | '';
}

export const TEMPLATE_TYPES = [
    { value: 'llm_grading', label: 'LLM Grading' },
    { value: 'multi_modal', label: 'MultiModality' },
    { value: 'video_labeling', label: 'Video Labeling' },
];

const ORG_USER_PAGE_SIZE = 25;

type DraftValidationResult = { nameError: string | null; descriptionError: string | null };

/**
 * Validates just name/description for the "save as draft" path.
 * Drafts intentionally skip the full Yup schema (file uploads, dates, etc. are
 * optional for a draft), but name/description still need enough content to be
 * useful in a project list — hence this lighter, standalone check.
 * @param name - Current form value for the project name.
 * @param description - Current form value for the project description.
 * @returns `{ nameError, descriptionError }`, each `null` when valid or a user-facing message.
 */
const validateDraftFields = (name: string, description: string): DraftValidationResult => {
    let nameError: string | null = null;
    let descriptionError: string | null = null;

    const trimmedName = name?.trim() ?? '';
    if (trimmedName.length < 3) {
        nameError = 'Project name is required (minimum 3 characters)';
    } else if (trimmedName.length > 100) {
        nameError = 'Project name must not exceed 100 characters';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedName)) {
        nameError = 'Project name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    const trimmedDesc = description?.trim() ?? '';
    if (trimmedDesc.length < 10) {
        descriptionError = 'Description is required (minimum 10 characters)';
    } else if (trimmedDesc.length > 500) {
        descriptionError = 'Description must not exceed 500 characters';
    }

    return { nameError, descriptionError };
};

/**
 * Converts the Formik values into a `FormData` payload for `createProject`
 * (multipart, since the request may include dataset/video/instructions files).
 * @param values - Current Formik form values.
 * @param orgId - Organization the project belongs to.
 * @param workspaceId - Workspace the project belongs to.
 * @param status - `'active'` for a real submit, `'draft'` for save-as-draft.
 * @param availableUsers - Member options used to resolve each selected user id to a role
 * (falls back to `'member'` if not found).
 * @returns A `FormData` instance ready to POST; video files are appended only for the
 * `video_labeling` template, otherwise the single dataset file is appended.
 */
const buildProjectFormData = (
    values: ProjectFormValues,
    orgId: string,
    workspaceId: string,
    status: string,
    availableUsers: MemberOption[],
): FormData => {
    const formData = new FormData();
    formData.append('org_id', orgId);
    formData.append('workspace_id', workspaceId);
    formData.append('status', status);
    formData.append('name', values.name.trim());
    formData.append('description', values.description.trim());
    if (values.template_type) formData.append('template_type', values.template_type);
    if (values.start_date) formData.append('start_date', values.start_date.format('YYYY-MM-DD'));
    if (values.end_date) formData.append('end_date', values.end_date.format('YYYY-MM-DD'));
    if (values.template_type === 'video_labeling') {
        values.video_files.forEach((f) => formData.append('videos', f));
    } else if (values.dataset_file) {
        formData.append('dataset', values.dataset_file);
    }
    if (values.instructions_file) formData.append('instructions', values.instructions_file);
    if (values.users.length > 0) {
        const usersPayload = values.users.map((userId: string) => {
            const matchedUser = availableUsers.find((user) => user.id === userId);
            const role = matchedUser?.role || 'member';
            return { user_id: userId, role };
        });
        formData.append('users', JSON.stringify(usersPayload));
    }
    if (values.task_timeout !== '' && values.task_timeout !== null && values.task_timeout !== undefined) {
        formData.append('task_timeout', String(values.task_timeout));
    }
    return formData;
};

interface UseProjectCreationOptions {
    open: boolean;
    orgId: string;
    workspaceId: string;
    onClose: () => void;
    onProjectCreated?: (project: unknown) => void;
}

/**
 * Custom hook backing the project-creation dialog.
 * @param options.open - Whether the dialog is currently open; drives the reset/load effect below.
 * @param options.orgId - Organization id the new project will belong to.
 * @param options.workspaceId - Workspace id the new project will belong to.
 * @param options.onClose - Called to close the dialog (invoked by `handleClose` and on auto-close after success).
 * @param options.onProjectCreated - Optional callback invoked with the created/drafted project payload.
 * @returns Formik bindings plus dialog-specific state/handlers: submission status
 * (`activeAction`, `isSubmitting`, `error`, `success`), member-picker data
 * (`memberOptions`, `lockedUserIds`, `hasProjectManager`, paginated org users and their
 * loading/search state), and action handlers (`handleSaveAsDraft`, `handleClose`, `loadOrgUsers`).
 */
export const useProjectCreation = ({
    open,
    orgId,
    workspaceId,
    onClose,
    onProjectCreated,
}: UseProjectCreationOptions) => {
    const dispatch = useAppDispatch();
    const { showSuccess, showError } = useToast();

    const [activeAction, setActiveAction] = useState<'draft' | 'create' | null>(null);

    const isSubmitting = useAppSelector(selectCreateLoading);
    const error = useAppSelector(selectCreateError);
    const success = useAppSelector(selectCreateSuccess);
    const currentUser = useAppSelector(selectUser);

    const [orgUsers, setOrgUsers] = useState<User[]>([]);
    const [orgUsersPage, setOrgUsersPage] = useState(0);
    const [orgUsersSearch, setOrgUsersSearch] = useState('');
    const [orgUsersHasMore, setOrgUsersHasMore] = useState(true);
    const [orgUsersLoading, setOrgUsersLoading] = useState(false);
    const [orgUserCache, setOrgUserCache] = useState<Record<string, MemberOption>>({});
    const debouncedOrgUsersSearch = useDebounce(orgUsersSearch, 500);

    const [workspaceManagerIds, setWorkspaceManagerIds] = useState<string[]>([]);
    const [workspaceMembersLoading, setWorkspaceMembersLoading] = useState(false);

    // Loads the workspace's managers so they can be auto-locked into the member
    // list below (a project always needs its workspace managers included).
    // Handles several possible response envelope shapes defensively since the
    // members endpoint's wrapping has varied across backend versions.
    const loadWorkspaceManagers = async () => {
        if (!workspaceId) return;
        setWorkspaceMembersLoading(true);
        try {
            const response = await workspaceApi.getWorkspaceMembers(workspaceId, {
                filter: 'workspace_manager',
            });

            let members: any[] = [];
            if (Array.isArray(response?.data?.members)) {
                members = response.data.members;
            } else if (Array.isArray(response?.data)) {
                members = response.data;
            } else if (Array.isArray(response?.members)) {
                members = response.members;
            } else if (Array.isArray(response)) {
                members = response;
            }

            const managerIds: string[] = [];
            const cacheEntries: Record<string, MemberOption> = {};

            members.forEach((m: any) => {
                const id: string | undefined = m?.user_id || m?.user?._id || m?._id;
                if (typeof id !== 'string' || !id) return;

                managerIds.push(id);
                cacheEntries[id] = {
                    id,
                    name: m?.user?.name || m?.name || m?.user?.email || m?.email || 'Workspace Manager',
                    email: m?.user?.email || m?.email || '---',
                    role: ROLES.WORKSPACE_MANAGER,
                };
            });

            setWorkspaceManagerIds(managerIds);

            if (Object.keys(cacheEntries).length > 0) {
                setOrgUserCache((prev) => ({ ...prev, ...cacheEntries }));
            }
        } catch {
            setWorkspaceManagerIds([]);
        } finally {
            setWorkspaceMembersLoading(false);
        }
    };

    /**
     * Normalizes a raw org `User` (from `userApi.getAllUsers`) into a `MemberOption`
     * for the member picker, resolving the display role from whichever field the
     * backend populated (direct `role`, org-scoped assignment, or first assignment).
     * @param user - Raw user record.
     * @returns A `MemberOption`, or `null` if the user has no usable id.
     */
    const buildOrgUserOption = (user: User): MemberOption | null => {
        const id = user._id || user.id;
        if (!id) return null;

        const rawAssignments: Array<{ entity: string; role_id: string; entity_id: string }> =
            (user as any).assignments || [];
        const orgAssignment = rawAssignments.find((a) => a.entity === 'organization');
        const role = user.role || orgAssignment?.role_id || rawAssignments[0]?.role_id || 'member';

        return {
            id,
            name: user.name || user.username || user.email || 'Organization User',
            email: user.email || '---',
            role,
        };
    };

    /**
     * Loads one page of organization users for the member picker (paginated + debounced search).
     * @param page - Zero-based page index to fetch (default 0).
     * @param reset - When true, replaces `orgUsers` with this page's results (used for a fresh
     * search/open); when false, appends (used for "load more" infinite scroll).
     * @returns void — updates `orgUsers`, `orgUserCache`, `orgUsersHasMore`, and `orgUsersPage`
     * as side effects; shows an error toast on failure via `showError` rather than throwing.
     */
    const loadOrgUsers = async (page = 0, reset = false) => {
        if (orgUsersLoading) return;
        setOrgUsersLoading(true);
        try {
            const response = await userApi.getAllUsers({
                page,
                pageSize: ORG_USER_PAGE_SIZE,
                search: debouncedOrgUsersSearch.trim() || undefined,
            });

            const users = (Array.isArray(response?.data) ? response.data : []) as User[];
            const totalCount = typeof response?.total === 'number' ? response.total : users.length;

            const loadedOptions = users
                .map(buildOrgUserOption)
                .filter((option): option is MemberOption => option !== null);

            setOrgUserCache((prevCache) => {
                const nextCache = { ...prevCache };
                loadedOptions.forEach((option) => {
                    nextCache[option.id] = option;
                });
                return nextCache;
            });

            setOrgUsers((prevUsers) => (reset ? users : [...prevUsers, ...users]));
            const alreadyLoaded = reset ? users.length : orgUsers.length + users.length;
            setOrgUsersHasMore(alreadyLoaded < totalCount);
            setOrgUsersPage(page + 1);
        } catch (err: any) {
            showError(err?.response?.data?.message || err.message || 'Failed to load users');
        } finally {
            setOrgUsersLoading(false);
        }
    };

    // Full Yup schema for a real (non-draft) submission. Notably:
    // - `dataset_file` is required unless `template_type === 'video_labeling'`,
    //   in which case `video_files` (plural, with its own type/size checks) is
    //   required instead — the two template types use mutually exclusive
    //   upload fields.
    // - File-type/size checks use Yup `.test()` since Yup has no built-in File
    //   validators; each test also returns `true` for a non-File value so the
    //   "required" test is the one responsible for reporting a missing file.
    // Memoized (keyed on `orgUsers`) so the schema instance stays referentially
    // stable across unrelated re-renders — Formik re-validates whenever the
    // schema identity changes, which would be wasteful on every render.
    const validationSchema = useMemo(
        () =>
            Yup.object({
                name: Yup.string()
                    .required('Project name is required')
                    .min(3, 'Project name must be at least 3 characters')
                    .max(100, 'Project name must not exceed 100 characters')
                    .matches(
                        /^[a-zA-Z0-9\s\-_]+$/,
                        'Project name can only contain letters, numbers, spaces, hyphens, and underscores',
                    ),
                description: Yup.string()
                    .required('Description is required')
                    .min(10, 'Description must be at least 10 characters')
                    .max(500, 'Description must not exceed 500 characters'),
                template_type: Yup.string()
                    .required('Template type is required')
                    .oneOf(
                        TEMPLATE_TYPES.map((t) => t.value),
                        'Please select a valid template type',
                    ),
                start_date: Yup.date()
                    .nullable()
                    .required('Start date is required')
                    .typeError('Please enter a valid date'),
                end_date: Yup.date()
                    .nullable()
                    .required('End date is required')
                    .typeError('Please enter a valid date')
                    .min(Yup.ref('start_date'), 'End date must be after start date'),
                dataset_file: Yup.mixed<File>()
                    .nullable()
                    .when('template_type', {
                        is: 'video_labeling',
                        then: (schema) => schema.nullable(),
                        otherwise: (schema) =>
                            schema
                                .test('fileRequired', 'Dataset file is required', (value) => value instanceof File)
                                .test('fileSize', 'File size must be less than 50 MB', (value) => {
                                    if (!(value instanceof File)) return true;
                                    return value.size <= 50 * 1024 * 1024;
                                })
                                .test('fileType', 'Only CSV, JSON, and Excel files are allowed', (value) => {
                                    if (!(value instanceof File)) return true;
                                    const allowed = [
                                        'text/csv',
                                        'application/json',
                                        'application/vnd.ms-excel',
                                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                    ];
                                    return allowed.includes(value.type);
                                }),
                    }),
                video_files: Yup.array().when('template_type', {
                    is: 'video_labeling',
                    then: (schema) =>
                        schema
                            .min(1, 'At least one video file is required')
                            .of(
                                Yup.mixed<File>()
                                    .test('fileSize', 'Each file must be less than 2 GB', (value) => {
                                        if (!(value instanceof File)) return false;
                                        return value.size <= 2 * 1024 * 1024 * 1024;
                                    })
                                    .test(
                                        'fileType',
                                        'Only MP4, MOV, AVI, WebM, and MKV files are allowed',
                                        (value) => {
                                            if (!(value instanceof File)) return false;
                                            const allowed = [
                                                'video/mp4',
                                                'video/quicktime',
                                                'video/x-msvideo',
                                                'video/webm',
                                                'video/x-matroska',
                                            ];
                                            return allowed.includes(value.type);
                                        },
                                    ),
                            ),
                    otherwise: (schema) => schema.notRequired(),
                }),
                instructions_file: Yup.mixed<File>()
                    .required('Project instructions file is required')
                    .test('fileSize', 'File size must be less than 10MB', (value) => {
                        if (!(value instanceof File)) return false;
                        return value.size <= 10 * 1024 * 1024;
                    })
                    .test('fileType', 'Only PDF, DOC, DOCX, TXT, and CSV files are allowed', (value) => {
                        if (!(value instanceof File)) return false;
                        const allowedTypes = [
                            'application/pdf',
                            'application/msword',
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            'text/plain',
                            'text/csv',
                            'application/vnd.ms-excel',
                        ];
                        return allowedTypes.includes(value.type);
                    }),
                users: Yup.array().of(Yup.string().trim()),
                task_timeout: Yup.number()
                    .transform((value, originalValue) => {
                        if (originalValue === '' || originalValue === null || Number.isNaN(value)) {
                            return undefined;
                        }
                        return value;
                    })
                    .required('Task timeout is required')
                    .min(1, 'Timeout must be at least 1 minute')
                    .max(1440, 'Timeout cannot exceed 1440 minutes (24 hours)')
                    .typeError('Please enter a valid number'),
            }),
        [orgUsers],
    );

    const formik = useFormik<ProjectFormValues>({
        initialValues: {
            name: '',
            description: '',
            template_type: '',
            start_date: null,
            end_date: null,
            dataset_file: null,
            video_files: [],
            instructions_file: null,
            users: [],
            task_timeout: '',
        },
        validationSchema,
        onSubmit: async (values) => {
            setActiveAction('create');
            const formData = buildProjectFormData(values, orgId, workspaceId, 'active', memberOptions);
            const result = await dispatch(createProject(formData));
            setActiveAction(null);

            if (createProject.fulfilled.match(result)) {
                showSuccess('Project created successfully!');
                onProjectCreated?.(result.payload);
            } else if (createProject.rejected.match(result)) {
                showError((result.payload as string) || 'Failed to create project');
            }
        },
    });

    // Combines the current page of org users with the cached selected users so
    // a user selected earlier remains visible/selected in the picker even after
    // pagination or search has scrolled the underlying `orgUsers` list past them.
    // Selected options are placed first, deduped against the current page.
    const memberOptions = useMemo<MemberOption[]>(() => {
        const currentOptions = orgUsers
            .map(buildOrgUserOption)
            .filter((option): option is MemberOption => option !== null);

        const selectedOptions = formik.values.users
            .map((userId) => orgUserCache[userId])
            .filter((option): option is MemberOption => option !== undefined);

        return [
            ...selectedOptions,
            ...currentOptions.filter((option) => !selectedOptions.some((selected) => selected.id === option.id)),
        ];
    }, [orgUsers, orgUserCache, formik.values.users]);

    // Ids that must always be selected in the member picker and cannot be
    // removed by the user: confirmed workspace managers, plus the current user
    // if they are themselves a project manager creating this project.
    const lockedUserIds = useMemo<string[]>(() => {
        const confirmedManagerIds = [...workspaceManagerIds];
        const currentUserRole = getUserRole(currentUser);
        if (currentUserRole === ROLES.PROJECT_MANAGER && currentUser?._id) {
            const currentUserId = currentUser._id;
            return confirmedManagerIds.includes(currentUserId)
                ? confirmedManagerIds
                : [...confirmedManagerIds, currentUserId];
        }
        return confirmedManagerIds;
    }, [workspaceManagerIds, currentUser]);

    // Whether at least one selected member has the project_manager role —
    // used by the dialog UI to warn/require a PM be assigned before creating.
    const hasProjectManager = useMemo(() => {
        return formik.values.users.some((userId) => {
            const member = memberOptions.find((m) => m.id === userId);
            return member?.role === 'project_manager';
        });
    }, [formik.values.users, memberOptions]);

    /**
     * Save-as-draft submit path: validates only name/description (see
     * `validateDraftFields`), then dispatches `createProject` with `status: 'draft'`.
     * @returns void — shows a success/error toast and, on success, calls `onProjectCreated`.
     */
    const handleSaveAsDraft = async () => {
        const { nameError, descriptionError } = validateDraftFields(formik.values.name, formik.values.description);

        if (nameError || descriptionError) {
            formik.setTouched({ name: true, description: true });
            if (nameError) formik.setFieldError('name', nameError);
            if (descriptionError) formik.setFieldError('description', descriptionError);
            showError('Please provide valid project name and description to save as draft');
            return;
        }

        setActiveAction('draft');
        const formData = buildProjectFormData(formik.values, orgId, workspaceId, 'draft', memberOptions);
        const result = await dispatch(createProject(formData));
        setActiveAction(null);

        if (createProject.fulfilled.match(result)) {
            showSuccess('Project saved as draft successfully!');
            onProjectCreated?.(result.payload);
        } else if (createProject.rejected.match(result)) {
            showError((result.payload as string) || 'Failed to save project as draft');
        }
    };

    /**
     * Closes the dialog: resets the Formik form and clears create-related Redux
     * state, but only if a submission isn't currently in flight (prevents
     * closing out from under an in-progress request).
     * @returns void.
     */
    const handleClose = () => {
        if (!isSubmitting) {
            formik.resetForm();
            dispatch(clearErrors());
            dispatch(clearCreateSuccess());
            onClose();
        }
    };

    // Cleanup on unmount: clears any leftover create error/success state in
    // Redux so a stale result from this dialog instance doesn't leak into the
    // next time the dialog (or another one sharing the slice) is opened.
    useEffect(() => {
        return () => {
            dispatch(clearErrors());
            dispatch(clearCreateSuccess());
        };
    }, [dispatch]);

    // Auto-close on successful creation: gives the user a brief moment to see
    // the success toast/state before the dialog closes itself. Cleanup clears
    // the timer if `success` flips again (or the component unmounts) before it fires.
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                handleClose();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    // Reset state on close; reload on open / search change. Runs whenever the
    // dialog's `open` flag or the debounced search term changes: closing wipes
    // all loaded/paginated member-picker state so the next open starts fresh;
    // opening (re)loads workspace managers and org users, and seeds the current
    // user into the cache when they are themselves a project manager (so they
    // show up correctly in the picker even before any org-user page loads).
    useEffect(() => {
        if (!open) {
            setOrgUsers([]);
            setOrgUsersPage(0);
            setOrgUsersHasMore(true);
            setOrgUserCache({});
            setOrgUsersSearch('');
            setWorkspaceManagerIds([]);
            return;
        }

        loadWorkspaceManagers();

        if (currentUser?._id) {
            const currentUserRole = getUserRole(currentUser);
            if (currentUserRole === ROLES.PROJECT_MANAGER) {
                const currentUserId = currentUser._id;
                setOrgUserCache((prev) => ({
                    ...prev,
                    [currentUserId]: {
                        id: currentUserId,
                        name: currentUser.name || currentUser.username || currentUser.email || 'Me',
                        email: currentUser.email || '---',
                        role: currentUserRole,
                    },
                }));
            }
        }

        loadOrgUsers(0, true);
    }, [open, debouncedOrgUsersSearch]);

    // Auto-select locked users (workspace managers + current PM): runs whenever
    // `lockedUserIds` changes (e.g. once workspace managers finish loading) and
    // adds any not-yet-selected locked id to the form's `users` field, so they
    // can never be left out even if the user never manually picks them.
    useEffect(() => {
        if (lockedUserIds.length === 0) return;
        const newIds = lockedUserIds.filter((id) => !formik.values.users.includes(id));
        if (newIds.length > 0) {
            formik.setFieldValue('users', [...formik.values.users, ...newIds]);
        }
    }, [lockedUserIds]);

    return {
        formik,
        activeAction,
        isSubmitting,
        error,
        success,
        memberOptions,
        lockedUserIds,
        hasProjectManager,
        orgUsers,
        orgUsersPage,
        orgUsersSearch,
        setOrgUsersSearch,
        orgUsersHasMore,
        orgUsersLoading,
        workspaceMembersLoading,
        handleSaveAsDraft,
        handleClose,
        loadOrgUsers,
        dispatch,
        clearErrors,
    };
};
