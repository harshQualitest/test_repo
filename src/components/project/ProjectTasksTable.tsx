import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    alpha,
    useTheme,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
} from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import LinkIcon from '@mui/icons-material/Link';

interface Task {
    _id?: string;
    task_id?: string;
    assigned_annotator?: string;
    assigned_reviewer?: string;
    assigned_to?: string;
    status?: string;
    updated_at?: string;
    created_at?: string;
    logs?: {
        created_at?: string;
    };
}

interface ProjectTasksTableProps {
    tasks: Task[] | null;
    tasksLoading: boolean;
    tasksPagination: {
        total: number;
        limit: number;
        offset: number;
    } | null;
    currentProjectId: string | null;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rowsPerPage: number) => void;
}

/**
 * Component: ProjectTasksTable
 *
 * Purpose: Displays a paginated table of annotation tasks belonging to a
 * project, with status badges and click-through navigation to each task's
 * detail page.
 *
 * Responsibilities:
 * - Renders task id, assigned annotator/reviewer, status, and the most
 *   recent activity timestamp for each task.
 * - Delegates actual data fetching/pagination to the parent
 *   (`onPageChange`/`onRowsPerPageChange`) while keeping local `page`/
 *   `rowsPerPage` state in sync for the `TablePagination` control.
 * - Navigates to `/task-detail/:projectId/:taskId` when a row is clicked.
 *
 * Props:
 * - `tasks` (`Task[] | null`): the current page of tasks to display.
 * - `tasksLoading` (`boolean`): whether a tasks fetch is in flight.
 * - `tasksPagination` (`{ total, limit, offset } | null`): server-reported pagination info.
 * - `currentProjectId` (`string | null`): the project the tasks belong to; also used to build the row-click navigation URL.
 * - `onPageChange` (`(page: number) => void`): notifies the parent to fetch a different page.
 * - `onRowsPerPageChange` (`(rowsPerPage: number) => void`): notifies the parent of a page-size change.
 *
 * State:
 * - `page` (`number`): current page index, mirrors what's passed to `TablePagination`.
 * - `rowsPerPage` (`number`): current page size.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ProjectTasksTable = ({
    tasks,
    tasksLoading,
    tasksPagination,
    currentProjectId,
    onPageChange,
    onRowsPerPageChange,
}: ProjectTasksTableProps) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(10);

    /**
     * Updates local page state and asks the parent to fetch the newly
     * selected page, triggered by the pagination control's page-change action.
     * @param _event unused MUI pagination event.
     * @param newPage the zero-based page index selected by the user.
     */
    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
        onPageChange(newPage);
    };

    /**
     * Updates the page size, resets to the first page (since the previous
     * page offset is no longer meaningful at a different page size), and
     * asks the parent to refetch accordingly. Triggered by the "rows per
     * page" selector.
     * @param event the select change event from the rows-per-page control.
     */
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newRowsPerPage = Number.parseInt(event.target.value, 10);
        setRowsPerPage(newRowsPerPage);
        setPage(0);
        onRowsPerPageChange(newRowsPerPage);
    };

    /**
     * Navigates to the clicked task's detail page, in response to a row
     * click. No-ops if there is no current project id to build the URL from.
     * @param task the task row that was clicked.
     */
    const handleRowClick = (task: Task) => {
        if (currentProjectId) {
            const taskId = task._id || task.task_id;
            navigate(`/task-detail/${currentProjectId}/${taskId}`);
        }
    };

    /**
     * Maps a task status to its badge background/text colors — completed
     * (success), under_annotation (warning), annotated (secondary), and
     * anything else (info, covers "created"/default states).
     * @param status the task's status string.
     * @returns an object with `backgroundColor` and `color` for the status Chip.
     */
    const getStatusStyles = (status: string) => {
        if (status === 'completed') {
            return {
                backgroundColor: alpha(theme.palette.success.main, 0.1),
                color: theme.palette.success.main,
            };
        } else if (status === 'under_annotation') {
            return {
                backgroundColor: alpha(theme.palette.warning.main, 0.1),
                color: theme.palette.warning.main,
            };
        } else if (status === 'annotated') {
            return {
                backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                color: theme.palette.secondary.main,
            };
        }
        return {
            backgroundColor: alpha(theme.palette.info.main, 0.1),
            color: theme.palette.info.main,
        };
    };

    /**
     * Formats an ISO timestamp into a short, locale-aware display string
     * (e.g. "Jan 5, 2026, 03:45 PM").
     * @param timestamp an ISO date string, or undefined.
     * @returns the formatted string, or `'N/A'` if no timestamp is available.
     */
    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    /**
     * Chooses what to render in the card body: a loading spinner while
     * fetching, the tasks table + pagination when there is data, or an
     * empty-state alert otherwise.
     * @returns the JSX content for the card body.
     */
    const renderContent = () => {
        if (tasksLoading) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={32} />
                </Box>
            );
        }

        if (tasks && tasks.length > 0) {
            return (
                <>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Task ID</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                        Annotator Id
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                        Reviewer Id
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                        Last Step Timestamp
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tasks.map((task, index) => {
                                    const lastStepTimestamp =
                                        task.updated_at || task.logs?.created_at || task.created_at;
                                    const isClickable = true;
                                    const statusStyles = getStatusStyles(task.status || 'created');

                                    return (
                                        <TableRow
                                            key={task._id || index}
                                            onClick={() => handleRowClick(task)}
                                            sx={{
                                                cursor: isClickable ? 'pointer' : 'default',
                                                '&:hover': {
                                                    backgroundColor: alpha(
                                                        theme.palette.primary.main,
                                                        isClickable ? 0.05 : 0.02,
                                                    ),
                                                },
                                            }}
                                        >
                                            <TableCell
                                                sx={{
                                                    fontSize: '0.9rem',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.75,
                                                    }}
                                                >
                                                    {isClickable && (
                                                        <LinkIcon
                                                            sx={{
                                                                fontSize: 16,
                                                                color: theme.palette.primary.main,
                                                            }}
                                                        />
                                                    )}
                                                    <Typography
                                                        component="span"
                                                        sx={{
                                                            fontSize: '0.9rem',
                                                            fontWeight: 600,
                                                            position: 'relative',
                                                            '&:hover': isClickable
                                                                ? {
                                                                      textDecoration: 'underline',
                                                                      color: theme.palette.primary.main,
                                                                  }
                                                                : {},
                                                        }}
                                                    >
                                                        {task.task_id || task._id || 'N/A'}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.9rem' }}>
                                                {task.assigned_annotator || 'Unassigned'}
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.9rem' }}>
                                                {task.assigned_reviewer || task.assigned_to || 'Unassigned'}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={task.status || 'created'}
                                                    size="small"
                                                    sx={{
                                                        ...statusStyles,
                                                        fontWeight: 600,
                                                        textTransform: 'capitalize',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontSize: '0.9rem' }}>
                                                {formatTimestamp(lastStepTimestamp)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={tasksPagination?.total || 0}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        sx={{
                            borderTop: `1px solid ${theme.palette.divider}`,
                            mt: 1,
                        }}
                    />
                </>
            );
        }

        return (
            <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                No annotation tasks found for this project.
            </Alert>
        );
    };

    return (
        <Card
            sx={{
                borderRadius: 2.5,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                mb: 4,
            }}
        >
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <TaskAltIcon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
                    <Typography variant="h6" fontWeight={700}>
                        Annotation Tasks ({tasksPagination?.total || tasks?.length || 0})
                    </Typography>
                </Box>

                {renderContent()}
            </CardContent>
        </Card>
    );
};

export default ProjectTasksTable;
