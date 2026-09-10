import { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    IconButton,
    CircularProgress,
    Alert,
    alpha,
    MenuItem,
    useTheme,
    Avatar,
    Chip,
    Stack,
    Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateProject, selectUpdateLoading, selectUpdateError, clearErrors, createProject, selectCreateLoading } from '../../redux/slices/projectSlice';
import type { IUpdateProject } from '../../interfaces/api/project.interface';
import {
    fetchWorkspaceMembers,
    selectWorkspaceMembers,
    selectWorkspaceMembersLoading,
} from '../../redux/slices/workspaceSlice';
import { useToast } from '../../hooks/useToast';
import Input from '../shared/Input';
import DatasetUpload from '../project/DatasetUpload';
import InstructionsUpload from '../project/InstructionsUpload';
import UserAssignment from '../project/UserAssignment';
import type { IProject } from '../../redux/slices/projectSlice';
import type { WorkspaceMember } from '../../interfaces/api';

interface ProjectUpdateDialogProps {
    open: boolean;
    onClose: () => void;
    project: IProject | null;
    onProjectUpdated?: () => void;
}

interface MemberOption {
    id: string;
    name: string;
    email: string;
    role: string;
}

/**
 * Extracts a stable identifier for a workspace member across the several
 * possible API shapes (`user_id`, nested `user._id`, or the row's own `_id`).
 * @param member - raw workspace member record.
 * @returns The resolved id string, or undefined if none is present/valid.
 */
const resolveMemberId = (member: WorkspaceMember): string | undefined => {
    const candidate = member.user_id || member.user?._id || member._id;
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined;
};

/**
 * Normalizes a raw `WorkspaceMember` into the simpler `MemberOption` shape used
 * by the user-assignment UI, falling back through several possible name/email
 * fields since the member payload shape varies by API response.
 * @param member - raw workspace member record.
 * @returns A `MemberOption`, or null if the member has no resolvable id.
 */
const buildMemberOption = (member: WorkspaceMember): MemberOption | null => {
    const id = resolveMemberId(member);
    if (!id) return null;
    const name =
        member.user?.name ||
        member.user?.username ||
        member.user?.email ||
        member.username ||
        member.email ||
        member.user_id ||
        'Workspace Member';
    const email = member.user?.email || member.email || '---';
    const role = member.role || member.user?.role || 'member';
    return { id, name, email, role };
};

interface ProjectUpdateFormValues {
    name: string;
    description: string;
    template_type: string;
    status: string;
    start_date: Dayjs | null;
    end_date: Dayjs | null;
    task_timeout: number | '';
    dataset_file: File | null;
    instructions_file: File | null;
    users: string[];
}

const STATUS_OPTIONS = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    // { value: 'completed', label: 'Completed' },
    { value: 'archive', label: 'Archive' },
];

/** Returns the status options available based on whether the project is still a draft. */
const getAvailableStatusOptions = (isDraft: boolean) =>
    isDraft ? STATUS_OPTIONS : STATUS_OPTIONS.filter((s) => s.value !== 'draft');

/** Builds the FormData payload used when publishing a draft project. */
const buildDraftFormData = (
    values: ProjectUpdateFormValues,
    projectId: string,
    project: IProject,
    workspaceMembers: WorkspaceMember[],
): FormData => {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('org_id', project.org_id || '');
    formData.append('workspace_id', project.workspace_id || '');
    formData.append('name', values.name.trim());
    formData.append('description', values.description.trim());
    if (values.template_type) formData.append('template_type', values.template_type);
    if (values.status) formData.append('status', values.status);
    if (values.start_date) formData.append('start_date', values.start_date.format('YYYY-MM-DD'));
    if (values.end_date) formData.append('end_date', values.end_date.format('YYYY-MM-DD'));
    if (values.task_timeout !== '' && values.task_timeout !== null && values.task_timeout !== undefined) {
        formData.append('task_timeout', String(values.task_timeout));
    }
    if (values.dataset_file) formData.append('dataset', values.dataset_file);
    if (values.instructions_file) formData.append('instructions', values.instructions_file);
    if (values.users.length > 0) {
        const usersPayload = values.users.map((userId: string) => {
            const matchedMember = workspaceMembers.find((m) => resolveMemberId(m) === userId);
            const role = matchedMember?.role || matchedMember?.user?.role || 'member';
            return { user_id: userId, role };
        });
        formData.append('users', JSON.stringify(usersPayload));
    }
    return formData;
};

/** Builds the JSON payload used when updating an active/archived project. */
const buildUpdatePayload = (
    values: ProjectUpdateFormValues,
    projectId: string,
): IUpdateProject => {
    const payload: IUpdateProject = { project_id: projectId };
    if (values.template_type) payload.template_type = values.template_type as IUpdateProject['template_type'];
    if (values.status) payload.status = values.status as IUpdateProject['status'];
    if (values.start_date) payload.start_date = values.start_date.format('YYYY-MM-DD');
    if (values.end_date) payload.end_date = values.end_date.format('YYYY-MM-DD');
    if (values.task_timeout !== '' && values.task_timeout !== null && values.task_timeout !== undefined) {
        payload.task_timeout = Number(values.task_timeout);
    }
    return payload;
};

const TEMPLATE_TYPES = [{ value: 'llm_grading', label: 'LLM Grading' }, { value: 'multi_modal', label: 'MultiModality' }];

// Business rules: name/description are required with length + character-set
// bounds; end_date must not precede start_date; task_timeout is optional but,
// when provided, must fall within a sane 1-1440 minute (24h) range; dataset and
// instructions files are optional but validated for size and MIME type so only
// safe, expected file types reach the backend.
const validationSchema = Yup.object({
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
        .nullable()
        .oneOf(
            [...TEMPLATE_TYPES.map((t) => t.value), '', null],
            'Please select a valid template type',
        ),
    status: Yup.string()
        .nullable()
        .oneOf(
            [...STATUS_OPTIONS.map((s) => s.value), '', null],
            'Please select a valid status',
        ),
    start_date: Yup.date().nullable().optional().typeError('Please enter a valid date'),
    end_date: Yup.date()
        .nullable()
        .optional()
        .typeError('Please enter a valid date')
        .when('start_date', {
            is: (val: any) => !!val,
            then: (schema) => schema.min(Yup.ref('start_date'), 'End date must be after start date'),
        }),
    task_timeout: Yup.number()
        .transform((value, originalValue) => {
            if (originalValue === '' || originalValue === null || Number.isNaN(value)) {
                return undefined;
            }
            return value;
        })
        .optional()
        .min(1, 'Timeout must be at least 1 minute')
        .max(1440, 'Timeout cannot exceed 1440 minutes (24 hours)')
        .typeError('Please enter a valid number'),
    dataset_file: Yup.mixed<File>()
        .nullable()
        .test('fileSize', 'File size must be less than 50MB', (value) => {
            if (!(value instanceof File)) return true;
            return value.size <= 50 * 1024 * 1024;
        })
        .test('fileType', 'Only CSV, JSON, and Excel files are allowed', (value) => {
            if (!(value instanceof File)) return true;
            const allowedTypes = [
                'text/csv',
                'application/json',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ];
            return allowedTypes.includes(value.type);
        }),
    instructions_file: Yup.mixed<File>()
        .nullable()
        .test('fileSize', 'File size must be less than 10MB', (value) => {
            if (!(value instanceof File)) return true;
            return value.size <= 10 * 1024 * 1024;
        })
        .test('fileType', 'Only PDF, DOC, DOCX, TXT, and CSV files are allowed', (value) => {
            if (!(value instanceof File)) return true;
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
});

/**
 * Component: ProjectUpdateDialog
 *
 * Purpose: Dialog for updating an existing project's metadata (template type,
 * status, dates, timeout). When the project is still a draft, it additionally
 * allows uploading the dataset/instructions files and assigning users, and
 * submits via the project *creation* thunk to "publish" the draft.
 *
 * Responsibilities:
 * - Renders read-only Name/Description fields plus editable template type,
 *   status, start/end dates, and task timeout.
 * - Shows draft-only sections (dataset upload, instructions upload, user
 *   assignment) only while `project.status === 'draft'`.
 * - Routes submission to either `createProject` (draft -> publish, as FormData)
 *   or `updateProject` (active/archived, as JSON), depending on `isDraft`.
 *
 * Props:
 * - open (boolean): whether the dialog is visible.
 * - onClose (() => void): called to dismiss the dialog.
 * - project (IProject | null): the project being edited; null while loading/closed.
 * - onProjectUpdated (() => void, optional): called after a successful save.
 *
 * State:
 * - userAssignmentSearch (string): search text for filtering the user-assignment list.
 *
 * Redux: reads `selectUpdateLoading`, `selectUpdateError`, `selectCreateLoading`
 * (projectSlice) and `selectWorkspaceMembers`, `selectWorkspaceMembersLoading`
 * (workspaceSlice); dispatches `fetchWorkspaceMembers`, `updateProject`,
 * `createProject`, `clearErrors`.
 *
 * Custom hooks: `useToast` for success/error notifications; `useFormik` (direct,
 * not the wrapper) for form state, driven by `validationSchema`.
 *
 * Side effects:
 * - Loads workspace members and resets the form to the current `project`
 *   whenever the dialog opens with a project.
 * - Clears any project error state on unmount.
 *
 * Major child components: `DatasetUpload`, `InstructionsUpload`, `UserAssignment`, `Input`.
 *
 * Business logic:
 * - `isDraft` gates which fields/sections are shown and which submit path is taken.
 * - Once a project leaves draft status it cannot be set back to draft
 *   (`getAvailableStatusOptions` filters out the 'draft' option).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ProjectUpdateDialog = ({ open, onClose, project, onProjectUpdated }: ProjectUpdateDialogProps) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { showSuccess, showError } = useToast();

    const updateLoading = useAppSelector(selectUpdateLoading);
    const createLoading = useAppSelector(selectCreateLoading);
    const isSubmitting = updateLoading || createLoading;
    const error = useAppSelector(selectUpdateError);
    const workspaceMembers = useAppSelector(selectWorkspaceMembers);
    const workspaceMembersLoading = useAppSelector(selectWorkspaceMembersLoading);

    // Drives which fields/sections are shown and which submit path (create vs update) is used.
    const isDraft = project?.status === 'draft';

    const [userAssignmentSearch, setUserAssignmentSearch] = useState('');

    // When project is already active/archive, cannot go back to draft
    const availableStatusOptions = getAvailableStatusOptions(isDraft);

    // Recomputes only when the workspace member list changes — avoids re-mapping
    // and re-filtering the (potentially large) member list on every keystroke/render.
    const memberOptions = useMemo<MemberOption[]>(() => {
        return workspaceMembers.map(buildMemberOption).filter((option): option is MemberOption => option !== null);
    }, [workspaceMembers]);

    const formik = useFormik<ProjectUpdateFormValues>({
        initialValues: {
            name: project?.name || '',
            description: project?.description || '',
            template_type: project?.template_type || '',
            status: project?.status || 'active',
            start_date: project?.start_date ? dayjs(project.start_date) : null,
            end_date: project?.end_date ? dayjs(project.end_date) : null,
            task_timeout: project?.task_timeout ? Math.round(project.task_timeout / 60) : '',
            dataset_file: null,
            instructions_file: null,
            users: project?.members?.map((m) => m.user_id || '').filter(Boolean) ?? [],
        },
        validationSchema,
        enableReinitialize: true,
        // Draft projects are "published" via the create-project endpoint (multipart
        // FormData, since files may be attached); non-draft projects go through the
        // plain JSON update endpoint instead.
        onSubmit: async (values) => {
            const projectId = project?.id || project?._id;
            if (!projectId) {
                showError('Project ID is missing');
                return;
            }

            try {
                if (isDraft) {
                    const formData = buildDraftFormData(values, projectId, project!, workspaceMembers);
                    await dispatch(createProject(formData)).unwrap();
                } else {
                    const payload = buildUpdatePayload(values, projectId);
                    await dispatch(updateProject(payload)).unwrap();
                }

                showSuccess('Project updated successfully!');
                handleClose();
                onProjectUpdated?.();
            } catch (err: any) {
                showError(err?.message || 'Failed to update project');
            }
        },
    });

    // Whenever the dialog opens for a given project: (re)load that project's
    // workspace members (needed for the user-assignment dropdown) and reset the
    // Formik form to reflect the latest project data, in case it changed since
    // the dialog was last opened.
    useEffect(() => {
        if (open && project) {
            if (project.workspace_id) {
                dispatch(fetchWorkspaceMembers({ workspaceId: project.workspace_id }));
            }
            formik.resetForm({
                values: {
                    name: project.name || '',
                    description: project.description || '',
                    template_type: project.template_type || '',
                    status: project.status || 'active',
                    start_date: project.start_date ? dayjs(project.start_date) : null,
                    end_date: project.end_date ? dayjs(project.end_date) : null,
                    task_timeout: project.task_timeout ? Math.round(project.task_timeout / 60) : '',
                    dataset_file: null,
                    instructions_file: null,
                    users: project.members?.map((m) => m.user_id || '').filter(Boolean) ?? [],
                },
            });
        }
    }, [open, project]);

    // Cleanup-only effect: clears any leftover project update/create error in
    // Redux state when this dialog instance unmounts, so it doesn't leak into
    // the next time the dialog (or another project dialog) is opened.
    useEffect(() => {
        return () => {
            dispatch(clearErrors());
        };
    }, [dispatch]);

    /** Closes the dialog and resets the form, but only if no save is in flight. Triggered by Cancel/close icon. */
    const handleClose = () => {
        if (!isSubmitting) {
            formik.resetForm();
            dispatch(clearErrors());
            onClose();
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 3,
                            boxShadow: `0 20px 60px ${alpha(theme.palette.common.black, 0.2)}`,
                        },
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        pb: 1,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                    }}
                >
                    <Box>
                        <Typography variant="h5" fontWeight={600}>
                            Update Project
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Modify project details
                        </Typography>
                    </Box>
                    <IconButton
                        onClick={handleClose}
                        disabled={isSubmitting}
                        sx={{
                            color: theme.palette.text.secondary,
                            '&:hover': {
                                backgroundColor: alpha(theme.palette.error.main, 0.1),
                                color: theme.palette.error.main,
                            },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <form onSubmit={formik.handleSubmit}>
                    <DialogContent
                        sx={{
                            pt: 3,
                            pb: 2,
                            '&::-webkit-scrollbar': { width: '8px' },
                            '&::-webkit-scrollbar-track': {
                                backgroundColor: alpha(theme.palette.divider, 0.1),
                                borderRadius: '10px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.3),
                                borderRadius: '10px',
                                '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.5) },
                            },
                            scrollbarWidth: 'thin',
                            scrollbarColor: `${alpha(theme.palette.primary.main, 0.3)} ${alpha(theme.palette.divider, 0.1)}`,
                        }}
                    >
                        {error && (
                            <Alert severity="error" onClose={() => dispatch(clearErrors())} sx={{ mb: 2, borderRadius: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            {/* Project Name (read-only) */}
                            <Input
                                fullWidth
                                id="name"
                                name="name"
                                label="Project Name"
                                value={formik.values.name}
                                slotProps={{ htmlInput: { readOnly: true } }}
                                disabled={isSubmitting}
                                helperText="Project name cannot be changed"
                            />

                            {/* Description (read-only) */}
                            <Input
                                fullWidth
                                id="description"
                                name="description"
                                label="Description"
                                multiline
                                rows={3}
                                value={formik.values.description}
                                slotProps={{ htmlInput: { readOnly: true } }}
                                disabled={isSubmitting}
                                helperText="Description cannot be changed"
                            />

                            {/* Template Type and Status */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                <TextField
                                    fullWidth
                                    id="template_type"
                                    name="template_type"
                                    label="Template Type"
                                    select
                                    value={formik.values.template_type}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.template_type && Boolean(formik.errors.template_type)}
                                    helperText={formik.touched.template_type && formik.errors.template_type}
                                    disabled={isSubmitting}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                >
                                    {TEMPLATE_TYPES.map((template) => (
                                        <MenuItem key={template.value} value={template.value}>
                                            {template.label}
                                        </MenuItem>
                                    ))}
                                </TextField>

                                <TextField
                                    fullWidth
                                    id="status"
                                    name="status"
                                    label="Status"
                                    select
                                    value={formik.values.status}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.status && Boolean(formik.errors.status)}
                                    helperText={formik.touched.status && formik.errors.status}
                                    disabled={isSubmitting}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                >
                                    {availableStatusOptions.map((status) => (
                                        <MenuItem key={status.value} value={status.value}>
                                            {status.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            {/* Start Date and End Date */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                <DatePicker
                                    label="Start Date"
                                    value={formik.values.start_date}
                                    onChange={(value) => formik.setFieldValue('start_date', value)}
                                    disabled={isSubmitting}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            error: formik.touched.start_date && Boolean(formik.errors.start_date),
                                            helperText: formik.touched.start_date && formik.errors.start_date,
                                            onBlur: formik.handleBlur,
                                            name: 'start_date',
                                            sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } },
                                        },
                                    }}
                                />

                                <DatePicker
                                    label="End Date"
                                    value={formik.values.end_date}
                                    onChange={(value) => formik.setFieldValue('end_date', value)}
                                    disabled={isSubmitting}
                                    minDate={formik.values.start_date || undefined}
                                    slotProps={{
                                        textField: {
                                            fullWidth: true,
                                            error: formik.touched.end_date && Boolean(formik.errors.end_date),
                                            helperText: formik.touched.end_date && formik.errors.end_date,
                                            onBlur: formik.handleBlur,
                                            name: 'end_date',
                                            sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } },
                                        },
                                    }}
                                />
                            </Box>

                            {/* Task Timeout */}
                            <Input
                                fullWidth
                                id="task_timeout"
                                name="task_timeout"
                                label="Task Timeout (minutes)"
                                type="number"
                                placeholder="Enter timeout in minutes"
                                value={formik.values.task_timeout}
                                onChange={(event) => {
                                    const { value } = event.target;
                                    formik.setFieldValue('task_timeout', value === '' ? '' : Number(value));
                                }}
                                onBlur={formik.handleBlur}
                                error={formik.touched.task_timeout && Boolean(formik.errors.task_timeout)}
                                helperText={
                                    (formik.touched.task_timeout && formik.errors.task_timeout) ||
                                    'Maximum time allowed per task (1-1440 minutes)'
                                }
                                disabled={isSubmitting}
                                slotProps={{
                                    htmlInput: { min: 1, max: 1440 },
                                }}
                            />

                            {/* Current Members List */}
                            {project?.members && project.members.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                        Current Members
                                    </Typography>
                                    <Box
                                        sx={{
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {project.members.map((member, idx) => (
                                            <Box key={member._id || member.user_id}>
                                                {idx > 0 && <Divider />}
                                                <Stack
                                                    direction="row"
                                                    alignItems="center"
                                                    spacing={1.5}
                                                    sx={{ px: 2, py: 1.25 }}
                                                >
                                                    <Avatar
                                                        sx={{
                                                            width: 32,
                                                            height: 32,
                                                            fontSize: 13,
                                                            bgcolor: 'primary.main',
                                                        }}
                                                    >
                                                        {(member.username || member.email || '?')[0].toUpperCase()}
                                                    </Avatar>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="body2" noWrap fontWeight={500}>
                                                            {member.username || member.email}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" noWrap>
                                                            {member.email}
                                                        </Typography>
                                                    </Box>
                                                    <Chip
                                                        label={member.role?.split('_').join(' ')}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ textTransform: 'capitalize', fontSize: 11 }}
                                                    />
                                                </Stack>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {/* Dataset Upload — only for draft projects */}
                            {isDraft && (
                                <DatasetUpload
                                    file={formik.values.dataset_file}
                                    existingFileName={project?.dataset_file_name}
                                    onChange={(file) => {
                                        formik.setFieldValue('dataset_file', file);
                                        formik.setFieldTouched('dataset_file', true, false);
                                    }}
                                    error={
                                        formik.touched.dataset_file && formik.errors.dataset_file
                                            ? String(formik.errors.dataset_file)
                                            : undefined
                                    }
                                    disabled={isSubmitting}
                                />
                            )}

                            {/* Instructions Upload — only for draft projects */}
                            {isDraft && (
                                <InstructionsUpload
                                    file={formik.values.instructions_file}
                                    existingFileName={project?.instructions_file_name}
                                    onChange={(file) => {
                                        formik.setFieldValue('instructions_file', file);
                                        formik.setFieldTouched('instructions_file', true, false);
                                    }}
                                    error={
                                        formik.touched.instructions_file && formik.errors.instructions_file
                                            ? String(formik.errors.instructions_file)
                                            : undefined
                                    }
                                    disabled={isSubmitting}
                                />
                            )}

                            {/* User Assignment — only for draft projects */}
                            {isDraft && (
                                <UserAssignment
                                    selectedUsers={formik.values.users}
                                    memberOptions={memberOptions}
                                    loading={workspaceMembersLoading}
                                    searchValue={userAssignmentSearch}
                                    onSearchValueChange={setUserAssignmentSearch}
                                    hasMore={false}
                                    onLoadMore={() => {}}
                                    disabled={isSubmitting}
                                    error={
                                        formik.touched.users && formik.errors.users
                                            ? String(formik.errors.users)
                                            : undefined
                                    }
                                    touched={formik.touched.users}
                                    onChange={(users) => {
                                        formik.setFieldValue('users', users, true);
                                        if (users.length > 0) {
                                            formik.setFieldTouched('users', true, false);
                                        }
                                    }}
                                    onBlur={() => {
                                        formik.setFieldTouched('users', true, true);
                                    }}
                                />
                            )}

                        </Box>
                    </DialogContent>

                    <DialogActions
                        sx={{
                            px: 3,
                            pb: 3,
                            pt: 2,
                            gap: 1.5,
                        }}
                    >
                        <Button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            variant="outlined"
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 3,
                                borderColor: theme.palette.divider,
                                color: theme.palette.text.primary,
                                '&:hover': {
                                    borderColor: theme.palette.text.primary,
                                    backgroundColor: alpha(theme.palette.text.primary, 0.04),
                                },
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !formik.isValid}
                            variant="contained"
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 3,
                                minWidth: 120,
                                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                                '&:hover': {
                                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                                },
                            }}
                        >
                            {isSubmitting ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={20} color="inherit" />
                                    Updating...
                                </Box>
                            ) : (
                                'Update Project'
                            )}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </LocalizationProvider>
    );
};

export default ProjectUpdateDialog;
