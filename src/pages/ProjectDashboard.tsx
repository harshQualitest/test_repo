import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Alert } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import ProjectDashboardSkeleton from '../components/skeletons/ProjectDashboardSkeleton';
import {
    fetchProjectDashboard,
    selectProjectDashboardData,
    selectProjectDashboardLoading,
    selectProjectDashboardError,
} from '../redux/slices/dashboardSlice';
import Header from '../components/project-dashboard/Header';
import ProgressETA from '../components/project-dashboard/ProgressETA';
import MetricsCards from '../components/project-dashboard/MetricsCards';
import ReviewerOutcomesCard from '../components/project-dashboard/ReviewerOutcomesCard';
// import FailureCodesCard from "../components/project-dashboard/FailureCodesCard";
import ThroughputTrendCard from '../components/workspace-dashboard/ThroughputTrendCard';
import QueueStatus from '../components/project-dashboard/QueueStatus';
import TopPerformers from '../components/project-dashboard/TopPerformers';

/**
 * Component: ProjectDashboard
 *
 * Purpose: Displays aggregate metrics and visualizations for a single
 * project (progress/ETA, throughput, reviewer outcomes, queue status, top
 * performers) sourced from the dashboard slice.
 *
 * Responsibilities:
 * - Fetches project dashboard data for the `projectId` route param.
 * - Renders a loading skeleton, an error alert, or the populated dashboard.
 * - Composes the various dashboard cards/charts as child components.
 *
 * State: none local — all data comes from Redux.
 *
 * Redux (dashboardSlice): `selectProjectDashboardData`, `selectProjectDashboardLoading`,
 * `selectProjectDashboardError` selectors; `fetchProjectDashboard(projectId)` thunk.
 *
 * Major child components: `ProjectDashboardSkeleton`, `Header`, `ProgressETA`,
 * `MetricsCards`, `ReviewerOutcomesCard`, `ThroughputTrendCard`, `QueueStatus`,
 * `TopPerformers`.
 *
 * Side effects: see the `useEffect` below — fetches dashboard data when the
 * route's `projectId` changes.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function ProjectDashboard() {
    const { projectId } = useParams<{ projectId: string }>();
    const dispatch = useAppDispatch();

    const dashboardData = useAppSelector(selectProjectDashboardData);
    const loading = useAppSelector(selectProjectDashboardLoading);
    const error = useAppSelector(selectProjectDashboardError);

    // Fetches (or re-fetches) the project dashboard whenever the route's
    // projectId becomes available or changes.
    useEffect(() => {
        if (projectId) {
            dispatch(fetchProjectDashboard(projectId));
        }
    }, [projectId, dispatch]);


    if (loading) {
        return <ProjectDashboardSkeleton />;
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* <NotificationBanner /> */}

                <Header projectName={dashboardData?.project_name} />

                <ProgressETA
                    overallCompletionPercentage={dashboardData?.overall_completion_percentage || 0}
                    currentThroughput={dashboardData?.current_throughput || 0}
                    acceptanceRatePercentage={dashboardData?.acceptance_rate_percentage || 0}
                    totalTasksCount={dashboardData?.total_tasks_count || 0}
                    completedTasksCount={dashboardData?.completed_tasks_count || 0}
                    projectEndDate={dashboardData?.project_end_date || 'N/A'}
                />

                <MetricsCards
                    avgCompletionTimeMinutes={dashboardData?.avg_completion_time_minutes || 0}
                    currentThroughput={dashboardData?.current_throughput || 0}
                />

                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)' } }}>
                    <ReviewerOutcomesCard />
                    {/* <FailureCodesCard /> */}
                </Box>

                {/* Throughput trend visualization (full width) */}
                <Box>
                    <ThroughputTrendCard />
                </Box>

                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,1fr)' } }}>
                    <QueueStatus />
                    <TopPerformers />
                </Box>
            </Box>
        </Box>
    );
}
