/**
 * Barrel export for the Task Dashboard feature.
 * Re-exports the `TaskDashboard` page plus its constituent card/header components
 * and their shared TypeScript types, so consumers can import everything from
 * `components/task-dashboard` instead of deep-importing individual files.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export { TaskDashboard } from '../../pages/TaskDashboard';
export { TaskDashboardHeader } from './TaskDashboardHeader';
export { TaskSummaryCard } from './TaskSummaryCard';
export { ReviewerOutcomeCard } from './ReviewerOutcomeCard';
export { RevisionHistoryCard } from './RevisionHistoryCard';
export { BackendDataSourcesCard } from './BackendDataSourcesCard';

export type {
  TaskSummaryData,
  FailureCode,
  RevisionEntry,
  ReviewerOutcomeData,
  BackendDataSource,
  TaskDashboardData,
} from './types';
