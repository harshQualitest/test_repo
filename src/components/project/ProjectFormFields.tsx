import { Box, Typography, MenuItem, Alert, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { FormikProps } from 'formik';
import dayjs from 'dayjs';
import Input from '../shared/Input';
import DatasetUpload from './DatasetUpload';
import VideoUpload from './VideoUpload';
import InstructionsUpload from './InstructionsUpload';
import UserAssignment from './UserAssignment';
import { TEMPLATE_TYPES, type MemberOption, type ProjectFormValues } from '../../hooks/useProjectCreation';

interface ProjectFormFieldsProps {
    formik: FormikProps<ProjectFormValues>;
    isSubmitting: boolean;
    memberOptions: MemberOption[];
    lockedUserIds: string[];
    hasProjectManager: boolean;
    orgUsersLoading: boolean;
    workspaceMembersLoading: boolean;
    orgUsersSearch: string;
    onOrgUsersSearchChange: (value: string) => void;
    orgUsersHasMore: boolean;
    onLoadMoreUsers: () => void;
}

/**
 * Normalizes a Formik field error into a displayable string. Formik/Yup can
 * report array-shaped errors for some field types (e.g. object/array
 * schemas), which aren't safe to render directly, so those are collapsed to
 * a generic message.
 * @param error the raw Formik error value for a file field.
 * @returns a string error message, or `undefined` if there is no error.
 */
const resolveFileError = (error: string | string[] | undefined): string | undefined => {
    if (!error) return undefined;
    if (typeof error === 'string') return error;
    return 'Invalid file';
};

/**
 * Component: ProjectFormFields
 *
 * Purpose: Renders the full set of fields for the project creation/edit
 * form (name, description, template type, date range, timeout, dataset or
 * video upload depending on template, instructions upload, and user
 * assignment), wired to a shared Formik instance owned by the parent.
 *
 * Responsibilities:
 * - Binds each field to `formik.values`/`handleChange`/`handleBlur` and
 *   surfaces per-field touched+error state as MUI `error`/`helperText`.
 * - Switches between `VideoUpload` and `DatasetUpload` based on
 *   `formik.values.template_type === 'video_labeling'` — video-labeling
 *   projects need per-frame video assets, whereas other templates need a
 *   spreadsheet-style prompt/response dataset.
 * - When the template type changes, clears both `dataset_file` and
 *   `video_files` (and their touched state) since a file valid for one
 *   template type is not meaningful for another.
 * - Delegates user selection to `UserAssignment` and enforces, via an
 *   inline `Alert`, that at least one assigned user must hold the Project
 *   Manager role before the project can be created.
 *
 * Props:
 * - `formik` (`FormikProps<ProjectFormValues>`): the shared form state/handlers for the whole project form.
 * - `isSubmitting` (`boolean`): disables all fields while the form is submitting.
 * - `memberOptions` (`MemberOption[]`): candidate users selectable in `UserAssignment`.
 * - `lockedUserIds` (`string[]`): user ids that must remain assigned (e.g. auto-assigned roles) and can't be removed.
 * - `hasProjectManager` (`boolean`): whether the current user selection includes a Project Manager.
 * - `orgUsersLoading` / `workspaceMembersLoading` (`boolean`): loading states surfaced to `UserAssignment`.
 * - `orgUsersSearch` (`string`) / `onOrgUsersSearchChange`: search box state for the user picker.
 * - `orgUsersHasMore` (`boolean`) / `onLoadMoreUsers`: pagination for the user picker's infinite scroll.
 *
 * Major child components rendered:
 * - `Input` (shared text field), MUI `DatePicker`, `VideoUpload`,
 *   `DatasetUpload`, `InstructionsUpload`, `UserAssignment`.
 *
 * Business rules enforced:
 * - Dataset vs. video upload is mutually exclusive and determined by
 *   template type.
 * - Task timeout is constrained to 1–1440 minutes (`slotProps.htmlInput`).
 * - End date cannot be before the selected start date (`minDate` on the End Date picker).
 * - A project cannot be created without a Project Manager among the
 *   assigned users once any user is assigned (surfaced as a blocking Alert).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ProjectFormFields = ({
    formik,
    isSubmitting,
    memberOptions,
    lockedUserIds,
    hasProjectManager,
    orgUsersLoading,
    workspaceMembersLoading,
    orgUsersSearch,
    onOrgUsersSearchChange,
    orgUsersHasMore,
    onLoadMoreUsers,
}: ProjectFormFieldsProps) => {
    // Per-field error strings, only surfaced once the field has been touched
    // (standard Formik pattern to avoid showing errors before user interaction)
    const datasetError = formik.touched.dataset_file
        ? resolveFileError(formik.errors.dataset_file as string | undefined)
        : undefined;
    const instructionsError = formik.touched.instructions_file
        ? resolveFileError(formik.errors.instructions_file as string | undefined)
        : undefined;
    const usersError = formik.touched.users && formik.errors.users
        ? String(formik.errors.users)
        : undefined;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Input
                fullWidth
                id="name"
                name="name"
                label="Project Name"
                placeholder="Enter project name"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={(formik.touched.name && formik.errors.name) || undefined}
                disabled={isSubmitting}
                required
                maxLength={100}
                showCharCount
            />

            <Input
                fullWidth
                id="description"
                name="description"
                label="Description"
                placeholder="Describe the project goals and objectives"
                multiline
                rows={3}
                value={formik.values.description}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.description && Boolean(formik.errors.description)}
                helperText={(formik.touched.description && formik.errors.description) || undefined}
                disabled={isSubmitting}
                required
                maxLength={500}
                showCharCount
            />

            <TextField
                fullWidth
                id="template_type"
                name="template_type"
                label="Template Type"
                select
                value={formik.values.template_type}
                onChange={(e) => {
                    formik.handleChange(e);
                    // Changing the template swaps which upload field is shown
                    // (dataset vs. video); a file chosen under the old
                    // template type is not valid for the new one, so both
                    // fields are reset (value + touched) to avoid submitting
                    // stale/mismatched data.
                    if (e.target.value !== formik.values.template_type) {
                        formik.setFieldValue('dataset_file', null);
                        formik.setFieldTouched('dataset_file', false, false);
                        formik.setFieldValue('video_files', []);
                        formik.setFieldTouched('video_files', false, false);
                    }
                }}
                onBlur={formik.handleBlur}
                error={formik.touched.template_type && Boolean(formik.errors.template_type)}
                helperText={formik.touched.template_type && formik.errors.template_type}
                disabled={isSubmitting}
                required
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
                <MenuItem value="" disabled>
                    Select a template
                </MenuItem>
                {TEMPLATE_TYPES.map((template) => (
                    <MenuItem key={template.value} value={template.value}>
                        {template.label}
                    </MenuItem>
                ))}
            </TextField>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <DatePicker
                    label="Start Date *"
                    value={formik.values.start_date}
                    onChange={(value) => formik.setFieldValue('start_date', value)}
                    disabled={isSubmitting}
                    minDate={dayjs()}
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
                    label="End Date *"
                    value={formik.values.end_date}
                    onChange={(value) => formik.setFieldValue('end_date', value)}
                    disabled={isSubmitting}
                    minDate={formik.values.start_date || dayjs()}
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
                required
                slotProps={{ htmlInput: { min: 1, max: 1440 } }}
            />

            {formik.values.template_type === 'video_labeling' ? (
                <VideoUpload
                    files={formik.values.video_files}
                    onChange={(files) => {
                        formik.setFieldValue('video_files', files);
                        formik.setFieldTouched('video_files', true, false);
                    }}
                    error={
                        formik.touched.video_files
                            ? (formik.errors.video_files as string | undefined)
                            : undefined
                    }
                    disabled={isSubmitting}
                />
            ) : (
                <DatasetUpload
                    file={formik.values.dataset_file}
                    onChange={(file) => {
                        formik.setFieldValue('dataset_file', file);
                        formik.setFieldTouched('dataset_file', true, false);
                    }}
                    error={datasetError}
                    disabled={isSubmitting}
                />
            )}

            <InstructionsUpload
                file={formik.values.instructions_file}
                onChange={(file) => {
                    formik.setFieldValue('instructions_file', file);
                    formik.setFieldTouched('instructions_file', true, false);
                }}
                error={instructionsError}
                disabled={isSubmitting}
            />

            <UserAssignment
                selectedUsers={formik.values.users}
                memberOptions={memberOptions}
                loading={orgUsersLoading || workspaceMembersLoading}
                searchValue={orgUsersSearch}
                onSearchValueChange={onOrgUsersSearchChange}
                hasMore={orgUsersHasMore}
                onLoadMore={onLoadMoreUsers}
                disabled={isSubmitting}
                lockedUserIds={lockedUserIds}
                error={usersError}
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

            {/* Business rule: a project must always have a designated Project
                Manager among its assigned users once any users are assigned,
                so the page's goNext/submit gating (outside this component)
                can rely on `hasProjectManager` to block creation. */}
            {formik.values.users.length > 0 && !hasProjectManager && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Project Manager Required
                    </Typography>
                    <Typography variant="body2">
                        At least one assigned user must have the <strong>Project Manager</strong> role to create a project.
                    </Typography>
                </Alert>
            )}

            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1 }}
            >
                * Required fields
            </Typography>
        </Box>
    );
};

export default ProjectFormFields;
