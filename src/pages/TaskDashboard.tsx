import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { TaskDashboardHeader } from '../components/task-dashboard/TaskDashboardHeader';
import { TaskSummaryCard } from '../components/task-dashboard/TaskSummaryCard';
import { ReviewerOutcomeCard } from '../components/task-dashboard/ReviewerOutcomeCard';
import { RevisionHistoryCard } from '../components/task-dashboard/RevisionHistoryCard';
import { BackendDataSourcesCard } from '../components/task-dashboard/BackendDataSourcesCard';
import {
    fetchTaskDashboard,
    selectTaskDashboardData,
    selectTaskDashboardLoading,
    selectTaskDashboardError,
} from '../redux/slices/taskDashboardSlice';
import type { AppDispatch } from '../redux/store';

interface TaskDashboardProps {
    taskId?: string;
    projectId?: string;
}

/**
 * Component: TaskDashboard
 *
 * Purpose: Displays a detailed metrics dashboard for a single task —
 * summary, reviewer outcome, revision history, and backend data sources.
 * Rendered as one of the two view modes inside `TaskDetail`.
 *
 * Responsibilities:
 * - Fetches task dashboard data for the given project/task pair.
 * - Supports switching to a different task via `TaskDashboardHeader`
 *   (re-fetching data for the newly selected task).
 * - Renders loading, error, "no data", and populated states.
 *
 * Props:
 * - `taskId?: string` - the task to display (also passed to `fetchTaskDashboard`).
 * - `projectId?: string` - the owning project, required to fetch data.
 *
 * Redux (taskDashboardSlice): `selectTaskDashboardData`, `selectTaskDashboardLoading`,
 * `selectTaskDashboardError` selectors; `fetchTaskDashboard` thunk.
 *
 * Major child components: `TaskDashboardHeader`, `TaskSummaryCard`,
 * `ReviewerOutcomeCard`, `RevisionHistoryCard`, `BackendDataSourcesCard`.
 *
 * Side effects: see the `useEffect` below — (re)fetches dashboard data when
 * `projectId`/`taskId` are available or change.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const TaskDashboard = ({ taskId, projectId }: TaskDashboardProps) => {
    const dispatch = useDispatch<AppDispatch>();
    const data = useSelector(selectTaskDashboardData);
    const loading = useSelector(selectTaskDashboardLoading);
    const error = useSelector(selectTaskDashboardError);

    // Fetch task dashboard data on mount or when IDs change
    useEffect(() => {
        if (projectId && taskId) {
            dispatch(fetchTaskDashboard({ projectId, taskId }));
        }
    }, [dispatch, projectId, taskId]);

    /** Re-fetches dashboard data for a different task. Triggered by the header's task selector. */
    const handleTaskChange = (newTaskId: string) => {
        if (projectId) {
            dispatch(fetchTaskDashboard({ projectId, taskId: newTaskId }));
        }
    };

    // Loading state
    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '400px',
                    gap: 2,
                }}
            >
                <CircularProgress size={48} />
                <Typography variant="body1" color="text.secondary">
                    Loading task dashboard...
                </Typography>
            </Box>
        );
    }

    // Error state
    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {error}
                </Alert>
            </Box>
        );
    }

    // No data state
    if (!data) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                    No task dashboard data available.
                </Alert>
            </Box>
        );
    }

    return (
        <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <Stack spacing={3}>
                <TaskDashboardHeader
                    selectedTaskId={data.taskSummary.taskId}
                    onTaskChange={handleTaskChange}
                    taskOptions={[]}
                />

                <TaskSummaryCard data={data.taskSummary} />

                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
                    <Box>
                        <ReviewerOutcomeCard data={data.reviewerOutcome} />
                    </Box>
                </Box>

                <Box>
                    <RevisionHistoryCard revisions={data.revisionHistory} />
                </Box>

                <BackendDataSourcesCard dataSources={data.backendDataSources} />
            </Stack>
        </Box>
    );
};

export default TaskDashboard;
