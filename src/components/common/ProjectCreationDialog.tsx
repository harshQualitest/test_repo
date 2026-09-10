import { Dialog, DialogTitle, DialogContent, Box, IconButton, Typography, Alert, alpha, useTheme } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useAppDispatch } from '../../redux/hooks';
import { clearErrors } from '../../redux/slices/projectSlice';
import { useProjectCreation } from '../../hooks/useProjectCreation';
import ProjectFormFields from '../project/ProjectFormFields';
import ProjectDialogActions from '../project/ProjectDialogActions';

interface ProjectCreationDialogProps {
    open: boolean;
    onClose: () => void;
    orgId: string;
    workspaceId: string;
    onProjectCreated?: (project: any) => void;
}

/**
 * Component: ProjectCreationDialog
 *
 * Purpose: Dialog wrapper for creating a new (annotation-style) project within
 * a workspace. Delegates virtually all form state/logic to the `useProjectCreation`
 * hook and composes the shared `ProjectFormFields`/`ProjectDialogActions` UI.
 *
 * Responsibilities:
 * - Renders the dialog chrome (title, scrollable content, close button) and a
 *   `LocalizationProvider` for the date pickers used inside the form fields.
 * - Surfaces `error`/`success` state from the hook as MUI Alerts.
 * - Computes whether "Save as Draft" should be disabled based on minimal
 *   name/description completeness, independent of full form validity.
 *
 * Props:
 * - open (boolean): whether the dialog is visible.
 * - onClose (() => void): called to dismiss the dialog.
 * - orgId (string): organization the project belongs to.
 * - workspaceId (string): workspace the project belongs to.
 * - onProjectCreated ((project: any) => void, optional): called after successful creation.
 *
 * Custom hooks: `useProjectCreation` supplies the Formik instance, submission
 * state, member/org-user lookup data, and the draft/close/load handlers.
 *
 * Redux: dispatches `clearErrors` (projectSlice) when dismissing the error alert.
 *
 * Major child components: `ProjectFormFields`, `ProjectDialogActions`.
 *
 * Business logic: "Save as Draft" only requires a minimally valid name (>=3 chars)
 * and description (>=10 chars), whereas full "Create" submission requires the
 * complete Formik validation to pass and at least one project manager assigned
 * (`hasProjectManager`).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ProjectCreationDialog = ({ open, onClose, orgId, workspaceId, onProjectCreated }: ProjectCreationDialogProps) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();

    // Form state, submission status, and lookup data are all owned by this hook.
    const {
        formik,
        activeAction,
        isSubmitting,
        error,
        success,
        memberOptions,
        lockedUserIds,
        hasProjectManager,
        orgUsersPage,
        orgUsersSearch,
        setOrgUsersSearch,
        orgUsersHasMore,
        orgUsersLoading,
        workspaceMembersLoading,
        handleSaveAsDraft,
        handleClose,
        loadOrgUsers,
    } = useProjectCreation({ open, orgId, workspaceId, onClose, onProjectCreated });

    // Draft saves only need a minimally viable name/description — not full
    // form validity — so authors can save incomplete work-in-progress projects.
    const isDraftDisabled =
        isSubmitting ||
        !formik.values.name.trim() ||
        formik.values.name.trim().length < 3 ||
        !formik.values.description.trim() ||
        formik.values.description.trim().length < 10;

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
                            Create New Project
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Fill in the details to create a new project
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
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                            {error && (
                                <Alert severity="error" onClose={() => dispatch(clearErrors())} sx={{ borderRadius: 2 }}>
                                    {error}
                                </Alert>
                            )}
                            {success && (
                                <Alert severity="success" sx={{ borderRadius: 2 }}>
                                    Project created successfully!
                                </Alert>
                            )}

                            <ProjectFormFields
                                formik={formik}
                                isSubmitting={isSubmitting}
                                memberOptions={memberOptions}
                                lockedUserIds={lockedUserIds}
                                hasProjectManager={hasProjectManager}
                                orgUsersLoading={orgUsersLoading}
                                workspaceMembersLoading={workspaceMembersLoading}
                                orgUsersSearch={orgUsersSearch}
                                onOrgUsersSearchChange={setOrgUsersSearch}
                                orgUsersHasMore={orgUsersHasMore}
                                onLoadMoreUsers={() => loadOrgUsers(orgUsersPage)}
                            />
                        </Box>
                    </DialogContent>

                    <ProjectDialogActions
                        isSubmitting={isSubmitting}
                        activeAction={activeAction}
                        isDraftDisabled={isDraftDisabled}
                        isCreateDisabled={isSubmitting || !formik.isValid || !hasProjectManager}
                        onCancel={handleClose}
                        onSaveAsDraft={handleSaveAsDraft}
                    />
                </form>
            </Dialog>
        </LocalizationProvider>
    );
};

export default ProjectCreationDialog;
