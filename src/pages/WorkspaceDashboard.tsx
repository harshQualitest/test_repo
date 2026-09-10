import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    Box,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    type SelectChangeEvent,
} from '@mui/material';
import WorkspaceDashboardSkeleton from '../components/skeletons/WorkspaceDashboardSkeleton';

import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PortfolioSummary from '../components/workspace-dashboard/portfolio-summary';
import InfoCards from '../components/workspace-dashboard/InfoCards';
import ThrouputAndFailureVisualizations from '../components/workspace-dashboard/throughput-and-failure-visx';
import QueueDepthByStageCard from '../components/workspace-dashboard/queue-depth';
import {
    fetchWorkspaceDashboard,
    selectWorkspaceDashboardData,
    selectWorkspaceDashboardLoading,
    selectWorkspaceDashboardError,
} from '../redux/slices/workspaceDashboardSlice';

/**
 * Component: WorkspaceDashboard
 *
 * Purpose: Aggregate dashboard for a whole workspace — throughput,
 * rejection rate, queue depth, per-project portfolio summary, and
 * throughput/failure/queue-depth visualizations — filterable by a date range.
 *
 * Responsibilities:
 * - Fetches workspace dashboard data for the given `days` range.
 * - Re-fetches whenever the selected range changes.
 * - Derives display-ready "info cards" and a per-project portfolio summary
 *   from the raw dashboard data.
 * - Navigates to a project's own dashboard when a portfolio row is clicked.
 *
 * Props: none (route component; workspace id comes from the route param).
 *
 * State: `range` - the selected date-range label (e.g. "Last 30 Days"),
 * translated to a day count via `getRangeDays` for the API call.
 *
 * Redux (workspaceDashboardSlice): `selectWorkspaceDashboardData`,
 * `selectWorkspaceDashboardLoading`, `selectWorkspaceDashboardError`
 * selectors; `fetchWorkspaceDashboard` thunk.
 *
 * Major child components: `WorkspaceDashboardSkeleton`, `InfoCards`,
 * `PortfolioSummary`, `ThrouputAndFailureVisualizations`, `QueueDepthByStageCard`.
 *
 * Side effects: see the `useEffect` below — (re)fetches dashboard data when
 * the workspace id or selected range changes.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function WorkspaceDashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { id: workspaceId } = useParams<{ id: string }>();
    const [range, setRange] = React.useState('Last 30 Days');

    // Redux state
    const dashboardData = useSelector(selectWorkspaceDashboardData);
    const loading = useSelector(selectWorkspaceDashboardLoading);
    const error = useSelector(selectWorkspaceDashboardError);

    /** Converts a range label (e.g. "Last 30 Days") into a day count for the API; unknown labels return `undefined` (no range filter). */
    const getRangeDays = (rangeLabel: string): number | undefined => {
        switch (rangeLabel) {
            case 'Last 7 Days':
                return 7;
            case 'Last 30 Days':
                return 30;
            case 'Last 90 Days':
                return 90;
            // case 'Year to Date':
            //     // Calculate days from start of year to today
            //     const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            //     const today = new Date();
            //     const diffTime = Math.abs(today.getTime() - startOfYear.getTime());
            //     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            //     return diffDays;
            default:
                return undefined;
        }
    };

    // Fetch workspace dashboard data whenever the workspace id or selected
    // date range changes.
    React.useEffect(() => {
        if (workspaceId) {
            const days = getRangeDays(range);
            dispatch(fetchWorkspaceDashboard({ workspaceId, days }) as any);
        }
    }, [workspaceId, dispatch, range]);

    /** Updates the selected date range. Triggered by the range `Select` dropdown; the fetch effect above reacts to the change. */
    const handleRangeChange = (event: SelectChangeEvent<string>) => {
        const newRange = event.target.value;
        setRange(newRange);
        // Data will be fetched automatically via useEffect when range changes
    };

    /** Navigates to a specific project's dashboard. Triggered by clicking a project row in `PortfolioSummary`. */
    const onProjectClick = (projectId: number | string) => {
        navigate(`/project-dashboard/${projectId}`);
    };

    // Dynamic cards based on API data.
    // Memoized so the info-card objects (including onClick closures) aren't
    // recreated on every render — only when the underlying dashboard data changes.
    const cards = React.useMemo(() => {
        if (!dashboardData) return [];

        // Calculate total tasks for better context
        const totalTasks = dashboardData.workspace_task_metrics.reduce((sum, metric) => sum + metric.total_tasks, 0);
        const completedTasks = dashboardData.workspace_task_metrics.reduce(
            (sum, metric) => sum + metric.completed_tasks,
            0,
        );

        return [
            {
                title: 'Avg Throughput',
                value: dashboardData.avg_throughput.toFixed(1),
                subtitle: 'items/day',
                hint: 'Click for details →',
                icon: <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />,
                onClick: () => console.log('Avg Throughput clicked'),
            },
            {
                title: 'Rejection Rate',
                value: `${dashboardData.rejection_percentage.toFixed(1)}%`,
                subtitle: `${completedTasks} of ${totalTasks} completed`,
                hint: 'Click for details →',
                icon: <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />,
                onClick: () => console.log('Rejection Rate clicked'),
            },
            {
                title: 'Queue Depth',
                value: `${dashboardData.queued_tasks_count_percentage.toFixed(1)}%`,
                subtitle: 'tasks queued',
                hint: 'Click for details →',
                icon: <ShowChartIcon sx={{ fontSize: 16, color: 'text.secondary' }} />,
                onClick: () => console.log('Queue Depth clicked'),
            },
        ];
    }, [dashboardData]);

    // Transform projects data for PortfolioSummary component.
    // Memoized since it maps/derives a new array (with new objects) on every
    // call, and should only change when the raw metrics change.
    const projects = React.useMemo(() => {
        if (!dashboardData?.workspace_task_metrics) return [];

        return dashboardData.workspace_task_metrics.map((metric) => {
            const completionPercent = metric.completion_percentage || 0;
            let status = { label: 'Active', variant: 'active' };
            let progressColor = '#2563EB'; // blue

            // Determine status based on completion percentage:
            // 0% = not started, <30% = at risk, >=75% = on track, else default "Active".
            if (completionPercent === 0) {
                status = { label: 'Not Started', variant: 'paused' };
                progressColor = '#9CA3AF'; // gray
            } else if (completionPercent < 30) {
                status = { label: 'At Risk', variant: 'atRisk' };
                progressColor = '#DC2626'; // red
            } else if (completionPercent >= 75) {
                status = { label: 'On Track', variant: 'active' };
                progressColor = '#10B981'; // green
            }

            // const pendingTasks = metric.total_tasks - metric.completed_tasks;

            return {
                id: metric.project_id,
                title: metric.project_name,
                status,
                progressPercent: completionPercent,
                progressColor,
                eta: 'TBD', // Can be calculated based on avg_completed_per_day
                throughput: `${metric.avg_completed_per_day.toFixed(1)}/day`,
            };
        });
    }, [dashboardData]);

    if (loading) {
        return <WorkspaceDashboardSkeleton />;
    }

    // Show error state
    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    // Show no data state
    if (!dashboardData) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="info">No dashboard data available</Alert>
            </Box>
        );
    }

    return (
        <Box
            component="main"
            sx={{
                flex: 1,
                overflow: 'auto',
                p: 3, // Tailwind p-6 ≈ 24px
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 /* space-y-6 */ }}>
                {/* Header row */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                        <Typography variant="h5">Workspace Dashboard</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {dashboardData.workspace_task_metrics[0]?.workspace_id || workspaceId}
                        </Typography>
                    </Box>

                    {/* Combobox / Select */}
                    <FormControl
                        size="small"
                        sx={{
                            width: 160, // w-[160px]
                            // replicate subtle dark background in dark mode
                            '& .MuiOutlinedInput-root': {
                                bgcolor: (theme) =>
                                    theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'background.paper',
                            },
                        }}
                    >
                        <InputLabel id="range-select-label">Range</InputLabel>
                        <Select
                            labelId="range-select-label"
                            id="range-select"
                            value={range}
                            label="Range"
                            onChange={handleRangeChange}
                            // emulate combobox behavior visually
                            IconComponent={(props) => <ExpandMoreIcon {...props} sx={{ opacity: 0.5 }} />}
                            sx={{
                                // Tailwind-like styles: rounded-md, px-3 py-2, text-sm, focus ring
                                borderRadius: 1,
                                '& .MuiSelect-select': { py: 1, px: 1.5, fontSize: '0.875rem' },
                                '&:focus-visible': {
                                    boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}80`,
                                    outline: 'none',
                                },
                            }}
                        >
                            <MenuItem value="Last 7 Days">Last 7 Days</MenuItem>
                            <MenuItem value="Last 30 Days">Last 30 Days</MenuItem>
                            <MenuItem value="Last 90 Days">Last 90 Days</MenuItem>
                            {/* <MenuItem value="Year to Date">Year to Date</MenuItem> */}
                        </Select>
                    </FormControl>
                </Box>

                {/* Cards grid */}
                <InfoCards cards={cards} />

                <PortfolioSummary onProjectClick={onProjectClick} projects={projects} />

                <ThrouputAndFailureVisualizations />

                <QueueDepthByStageCard />
            </Box>
        </Box>
    );
}
