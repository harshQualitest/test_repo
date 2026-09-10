import { useMemo, useState, useEffect, type UIEvent } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    TextField,
    IconButton,
    Alert,
    CircularProgress,
    MenuItem,
    Checkbox,
    Paper,
    alpha,
    useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchEmailTemplates, selectEmailTemplates, selectEmailTemplateLoading } from '../../redux/slices/emailTemplateSlice';
import { useDebounce } from '../../interfaces/hooks/useDebounce';
import userApi from '../../services/api/usersApi';
import { useToast } from '../../hooks/useToast';
import projectApi from '../../services/api/projectApi';

interface MemberManagementDialogProps {
    open: boolean;
    onClose: () => void;
    projectId: string | null;
    workspaceId: string | null;
    currentMembers: any[];
    onMembersUpdated?: () => void;
}

interface MemberOption {
    id: string;
    name: string;
    email: string;
    role: string;
}

const ORG_USER_PAGE_SIZE = 25;

/**
 * Extracts a stable identifier for an already-added project member, trying
 * several possible shapes the member object may have depending on which API
 * populated it, so the "already a member" exclusion filter works regardless
 * of shape.
 * @param member a raw member object from `currentMembers`.
 * @returns the member's user id, or `undefined` if none could be resolved.
 */
const resolveCurrentMemberId = (member: any): string | undefined => {
    const candidate = member.user_id || member.user?._id || member._id || member.id;
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined;
};

/**
 * Component: MemberManagementDialog
 *
 * Purpose: Dialog that lets a project manager/admin add one or more
 * organization users to a project, selecting an email template to notify
 * the newly added members.
 *
 * Responsibilities:
 * - Loads organization users page-by-page (infinite scroll) with server-side
 *   search, excluding users who are already members of the project.
 * - Loads available email templates and requires one to be selected before
 *   submission (Yup-validated via Formik).
 * - Submits the selected member ids + chosen role + email template to
 *   `projectApi.updateProjectUsers` with `action: 'add'`.
 * - Resets all local dialog state on close/cancel.
 *
 * Props:
 * - `open` (`boolean`): controls dialog visibility.
 * - `onClose` (`() => void`): called when the dialog should close.
 * - `projectId` (`string | null`): the project members are being added to.
 * - `workspaceId` (`string | null`, aliased `_workspaceId`): accepted for API
 *   symmetry but currently unused in this component.
 * - `currentMembers` (`any[]`): existing project members, used to exclude
 *   already-added users from the selectable list.
 * - `onMembersUpdated` (`() => void`, optional): called after a successful
 *   add so the parent can refresh its member list.
 *
 * State:
 * - `isSubmitting` (`boolean`): true while the add-members request is in flight.
 * - `selectedMembers` (`string[]`): user ids checked in the member list.
 * - `searchQuery` / `debouncedSearchQuery`: raw and debounced (500ms) search text for the org user list.
 * - `orgUsers` (`any[]`): accumulated pages of organization users loaded so far.
 * - `orgUsersPage` (`number`): next page index to request.
 * - `orgUsersHasMore` (`boolean`): whether more pages remain to load.
 * - `orgUsersLoading` (`boolean`): true while a page request is in flight.
 * - `orgUserCache` (`Record<string, MemberOption>`): id-indexed cache of loaded users, used to resolve a selected user's role at submit time.
 *
 * Custom hooks used:
 * - `useDebounce` (`src/interfaces/hooks/useDebounce`): debounces the search input before it drives server-side search.
 * - `useToast` (`showSuccess`/`showError`): user-facing success/error notifications.
 *
 * Redux:
 * - `useAppSelector(selectEmailTemplates)` / `selectEmailTemplateLoading` (emailTemplateSlice): the list of email templates and its loading state.
 * - `useAppDispatch` + `fetchEmailTemplates` thunk: loads email templates when the dialog opens.
 *
 * API calls:
 * - `userApi.getAllUsers` — paginated, searchable organization user listing.
 * - `projectApi.updateProjectUsers` — adds the selected members to the project.
 *
 * Side effects:
 * - useEffect [`open`, `debouncedSearchQuery`]: on open, resets org-user
 *   pagination/cache and (re)loads the first page; on close, clears
 *   accumulated org-user state so the next open starts fresh. Also re-runs
 *   (loading a fresh first page) whenever the debounced search text changes
 *   while open.
 * - useEffect [`open`, `dispatch`]: fetches email templates each time the
 *   dialog opens, since templates could change between opens.
 *
 * Business rules enforced:
 * - A member cannot be added twice — `availableMembers` filters out anyone
 *   already present in `currentMembers`.
 * - Submission is blocked (button disabled) unless at least one member is
 *   selected and an email template is chosen.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const MemberManagementDialog = ({
    open,
    onClose,
    projectId,
    workspaceId: _workspaceId,
    currentMembers,
    onMembersUpdated,
}: MemberManagementDialogProps) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const { showSuccess, showError } = useToast();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    // Org users state
    const [orgUsers, setOrgUsers] = useState<any[]>([]);
    const [orgUsersPage, setOrgUsersPage] = useState(0);
    const [orgUsersHasMore, setOrgUsersHasMore] = useState(true);
    const [orgUsersLoading, setOrgUsersLoading] = useState(false);
    const [orgUserCache, setOrgUserCache] = useState<Record<string, MemberOption>>({});

    // Redux selectors
    const emailTemplates = useAppSelector(selectEmailTemplates);
    const emailTemplateLoading = useAppSelector(selectEmailTemplateLoading);

    /**
     * Maps a raw organization user object (from `userApi.getAllUsers`) into
     * the normalized `MemberOption` shape used throughout this dialog,
     * resolving the user's role from whichever field is populated.
     * @param user a raw user object from the organization users API.
     * @returns a `MemberOption`, or `null` if the user has no resolvable id.
     */
    const buildOrgUserOption = (user: any): MemberOption | null => {
        const id = user._id || user.id;
        if (!id) return null;

        const rawAssignments: Array<{ entity: string; role_id: string; entity_id: string }> =
            user.assignments || [];
        const orgAssignment = rawAssignments.find((a) => a.entity === 'organization');
        const role =
            user.role ||
            orgAssignment?.role_id ||
            rawAssignments[0]?.role_id ||
            'member';

        return {
            id,
            name: user.name || user.username || user.email || 'Organization User',
            email: user.email || '---',
            role,
        };
    };

    /**
     * Fetches one page of organization users (with the current debounced
     * search applied), merges it into `orgUsers`/`orgUserCache`, and updates
     * pagination state. Used both for the initial load and for infinite
     * scroll (`handleListScroll`).
     * @param page zero-based page index to request (default 0).
     * @param reset when true, replaces `orgUsers` instead of appending — used when the dialog opens or the search text changes.
     */
    const loadOrgUsers = async (page = 0, reset = false) => {
        if (orgUsersLoading) return;

        setOrgUsersLoading(true);
        try {
            const response = await userApi.getAllUsers({
                page,
                pageSize: ORG_USER_PAGE_SIZE,
                search: debouncedSearchQuery.trim() || undefined,
            });

            const users = (Array.isArray(response?.data) ? response.data : []) as any[];
            const totalCount = typeof response?.total === 'number' ? response.total : users.length;

            const loadedOptions = users
                .map(buildOrgUserOption)
                .filter((opt): opt is MemberOption => opt !== null);

            setOrgUserCache((prev) => {
                const next = { ...prev };
                loadedOptions.forEach((opt) => { next[opt.id] = opt; });
                return next;
            });

            setOrgUsers((prev) => (reset ? users : [...prev, ...users]));
            const loaded = reset ? users.length : orgUsers.length + users.length;
            setOrgUsersHasMore(loaded < totalCount);
            setOrgUsersPage(page + 1);
        } catch (error: any) {
            showError(error?.response?.data?.message || error.message || 'Failed to load users');
        } finally {
            setOrgUsersLoading(false);
        }
    };

    // Validation schema - an email template must be chosen before members can be added
    const validationSchema = Yup.object({
        email_template_id: Yup.string().required('Email template is required'),
    });

    const formik = useFormik({
        initialValues: {
            email_template_id: '',
        },
        validationSchema,
        // Submits the selected members + role + email template to the API,
        // triggered by the user clicking "Add Members".
        onSubmit: async (values) => {
            if (!projectId) {
                showError('Project ID is missing');
                return;
            }

            // Belt-and-suspenders guard: the submit button is already disabled
            // when nothing is selected, but this protects against stale state.
            if (selectedMembers.length === 0) {
                showError('Please select at least one member to add');
                return;
            }

            setIsSubmitting(true);
            try {
                const projectUsers = selectedMembers.map((userId) => {
                    const matchedMember = orgUserCache[userId];
                    const role = matchedMember?.role || 'member';
                    return { user_id: userId, role };
                });

                const payload = {
                    project_id: projectId,
                    project_users: projectUsers,
                    action: 'add',
                    email_template_id: values.email_template_id,
                };

                await projectApi.updateProjectUsers(payload);
                showSuccess('Members added successfully!');
                handleClose();
                if (onMembersUpdated) {
                    onMembersUpdated();
                }
            } catch (error) {
                showError('Failed to add members');
                console.error(error);
            } finally {
                setIsSubmitting(false);
            }
        },
    });

    // Load org users when dialog opens or search changes.
    // Runs whenever `open` or `debouncedSearchQuery` changes: closing the
    // dialog wipes accumulated pagination/cache state (cleanup-by-reset) so
    // the next open starts from a clean slate; opening (or a new search term
    // while open) fetches page 0 with `reset: true`.
    useEffect(() => {
        if (!open) {
            setOrgUsers([]);
            setOrgUsersPage(0);
            setOrgUsersHasMore(true);
            setOrgUserCache({});
            return;
        }
        loadOrgUsers(0, true);
    }, [open, debouncedSearchQuery]);

    // Fetch email templates when dialog opens (depends on `open`/`dispatch`)
    // so the template dropdown always reflects the latest templates.
    useEffect(() => {
        if (open) {
            dispatch(fetchEmailTemplates());
        }
    }, [open, dispatch]);

    // Get available members (exclude current members).
    // Recomputed only when the loaded org users or current members list
    // changes, to avoid re-filtering on every render.
    const availableMembers = useMemo<MemberOption[]>(() => {
        const currentMemberIds = new Set(
            currentMembers
                .map((m) => resolveCurrentMemberId(m))
                .filter((id): id is string => Boolean(id)),
        );

        return orgUsers
            .map(buildOrgUserOption)
            .filter((opt): opt is MemberOption => opt !== null && !currentMemberIds.has(opt.id));
    }, [orgUsers, currentMembers]);

    // Search is server-side via debouncedSearchQuery; keep client filter as safety net
    const filteredMembers = useMemo(() => availableMembers, [availableMembers]);

    /**
     * Infinite-scroll handler for the member list: when the user scrolls
     * near the bottom (within 80px) and there's no request already in
     * flight and more pages remain, loads the next page of org users.
     * @param event the scroll event from the member list container.
     */
    const handleListScroll = (event: UIEvent<HTMLDivElement>) => {
        const target = event.currentTarget;
        if (orgUsersLoading || !orgUsersHasMore) return;
        if (target.scrollHeight - target.scrollTop - target.clientHeight < 80) {
            loadOrgUsers(orgUsersPage);
        }
    };

    // Builds the email template dropdown options, dropping any template
    // without a resolvable id (would otherwise render a broken MenuItem).
    const templateOptions = useMemo(
        () =>
            emailTemplates
                .map((template) => ({
                    value: template._id,
                    label: template.name || template.subject || 'Untitled Template',
                }))
                .filter((option) => Boolean(option.value)),
        [emailTemplates],
    );

    /**
     * Toggles a member's checked state in the selection list, in response to
     * the user clicking a member row's checkbox.
     * @param memberId id of the member being toggled.
     */
    const handleMemberToggle = (memberId: string) => {
        setSelectedMembers((prev) =>
            prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
        );
    };

    /**
     * Closes the dialog and resets all local form/selection state, invoked
     * from the Cancel button, the close icon, or after a successful submit.
     * No-ops while a submit is in flight to avoid losing in-progress state.
     */
    const handleClose = () => {
        if (!isSubmitting) {
            formik.resetForm();
            setSelectedMembers([]);
            onClose();
        }
    };

    // Derived flags controlling which empty/error states are shown in the UI
    const noTemplatesAvailable = !emailTemplateLoading && templateOptions.length === 0;
    const hasAvailableMembers = filteredMembers.length > 0;
    const showNoResults = !orgUsersLoading && availableMembers.length > 0 && filteredMembers.length === 0;

    return (
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
                        Add Project Members
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Select members to add to the project
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
                    }}
                >
                    {/* Members Selection Section */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                            Select Members
                        </Typography>

                        {/* Search Bar */}
                        <TextField
                            fullWidth
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="small"
                            sx={{
                                mb: 2,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                },
                            }}
                        />

                        {orgUsersLoading && orgUsers.length === 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                <CircularProgress size={32} />
                            </Box>
                        )}
                        {!orgUsersLoading && !hasAvailableMembers && showNoResults && (
                            <Alert severity="info" sx={{ borderRadius: 2 }}>
                                No members found matching your search.
                            </Alert>
                        )}
                        {!orgUsersLoading && !hasAvailableMembers && !showNoResults && orgUsers.length > 0 && (
                            <Alert severity="info" sx={{ borderRadius: 2 }}>
                                All organization members are already added to this project.
                            </Alert>
                        )}
                        {hasAvailableMembers && (
                            <Paper
                                variant="outlined"
                                sx={{
                                    maxHeight: 300,
                                    overflow: 'auto',
                                    borderRadius: 2,
                                }}
                                onScroll={handleListScroll}
                            >
                                {filteredMembers.map((member) => (
                                    <Box
                                        key={member.id}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: 2,
                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                            '&:last-child': { borderBottom: 'none' },
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                                            },
                                        }}
                                    >
                                        <Checkbox
                                            checked={selectedMembers.includes(member.id)}
                                            onChange={() => handleMemberToggle(member.id)}
                                            disabled={isSubmitting}
                                        />
                                        <Box sx={{ flex: 1, ml: 2 }}>
                                            <Typography variant="body2" fontWeight={600}>
                                                {member.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {member.email}
                                            </Typography>
                                        </Box>
                                        <Typography
                                            variant="caption"
                                            sx={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}
                                        >
                                            {member.role.replaceAll('_', ' ')}
                                        </Typography>
                                    </Box>
                                ))}
                                {orgUsersLoading && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                                        <CircularProgress size={20} />
                                    </Box>
                                )}
                            </Paper>
                        )}
                    </Box>

                    {/* Email Template Selection */}
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                            Email Template
                        </Typography>

                        {(() => {
                            /**
                             * Picks the TextField helper text: a Formik
                             * validation error takes priority, then a
                             * "no templates" notice, falling back to
                             * generic guidance text.
                             * @returns the helper text to display under the select.
                             */
                            const getHelperText = (): string => {
                                if (formik.touched.email_template_id && formik.errors.email_template_id) {
                                    return formik.errors.email_template_id;
                                }
                                if (noTemplatesAvailable) {
                                    return 'No email templates available. Please create one first.';
                                }
                                return 'Select a template to send to new members';
                            };

                            /**
                             * Renders the select's menu items: a loading
                             * placeholder while templates are being fetched,
                             * the actual template options once available, or
                             * a disabled "none available" placeholder.
                             * @returns the MenuItem(s) to render inside the select.
                             */
                            const getMenuContent = () => {
                                if (emailTemplateLoading) {
                                    return (
                                        <MenuItem value="" disabled>
                                            Loading templates...
                                        </MenuItem>
                                    );
                                }
                                if (templateOptions.length > 0) {
                                    return templateOptions.map((template) => (
                                        <MenuItem key={template.value} value={template.value}>
                                            {template.label}
                                        </MenuItem>
                                    ));
                                }
                                return (
                                    <MenuItem value="" disabled>
                                        No templates available
                                    </MenuItem>
                                );
                            };

                            return (
                                <TextField
                                    fullWidth
                                    id="email_template_id"
                                    name="email_template_id"
                                    label="Select Email Template"
                                    select
                                    value={formik.values.email_template_id}
                                    onChange={(event) => formik.setFieldValue('email_template_id', event.target.value)}
                                    onBlur={formik.handleBlur}
                                    error={formik.touched.email_template_id && Boolean(formik.errors.email_template_id)}
                                    helperText={getHelperText()}
                                    disabled={isSubmitting || emailTemplateLoading || templateOptions.length === 0}
                                    required
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                        },
                                    }}
                                >
                                    {getMenuContent()}
                                </TextField>
                            );
                        })()}
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
                        disabled={isSubmitting || selectedMembers.length === 0 || !formik.values.email_template_id}
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
                                Adding...
                            </Box>
                        ) : (
                            'Add Members'
                        )}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default MemberManagementDialog;
