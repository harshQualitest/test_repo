import type { TaskDashboardData as TaskDashboardDataType } from '../components/task-dashboard';

/**
 * Mock/fixture dataset backing the per-task detail dashboard (`TaskDetail`
 * page): the task's summary metadata, the current reviewer outcome/status,
 * its full revision history across annotation/review passes (including
 * failure codes on rejected passes), and a `backendDataSources` list used to
 * document (in-UI) where each panel's data would come from once wired to
 * real endpoints. Shape defined by `TaskDashboardData` in
 * `components/task-dashboard`. Stands in for the real task-detail API
 * during development.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const taskDashboardData: TaskDashboardDataType = {
    taskSummary: {
        taskId: 'TSK-001234',
        state: 'In Review',
        dataset: 'Customer Support Q4 2024',
        type: 'LLM Response Evaluation',
        schemaVersion: 'v2.1.0',
        guidelineVersion: 'v2.3.1',
        createdAt: '2024-12-28 09:15:23',
        startedAt: '2024-12-28 09:20:45',
        currentStage: 'Review',
    },
    reviewerOutcome: {
        status: 'IN_PROGRESS',
        reviewer: 'John Smith',
        lastFailureReason: 'Incorrect Label, Missing Context',
        reviewStarted: '2024-12-30 08:30:00',
        source: 'Latest revision in REVIEW stage',
    },
    revisionHistory: [
        {
            passNumber: 1,
            stage: 'Annotation',
            status: 'PASSED',
            actor: 'Sarah Chen',
            duration: '14m 27s',
            startTime: '2024-12-28 09:20:45',
            endTime: '2024-12-28 09:35:12',
        },
        {
            passNumber: 1,
            stage: 'Review',
            status: 'FAILED',
            actor: 'Mike Johnson',
            duration: '6m 48s',
            startTime: '2024-12-28 10:15:30',
            endTime: '2024-12-28 10:22:18',
            failureCodes: [
                { code: 'INCORRECT_LABEL', label: 'Incorrect Label' },
                { code: 'MISSING_CONTEXT', label: 'Missing Context' },
            ],
        },
        {
            passNumber: 2,
            stage: 'Re-Annotation',
            status: 'PASSED',
            actor: 'Sarah Chen',
            duration: '13m 35s',
            startTime: '2024-12-29 14:05:00',
            endTime: '2024-12-29 14:18:35',
        },
        {
            passNumber: 2,
            stage: 'Review',
            status: 'IN_PROGRESS',
            actor: 'John Smith',
            duration: 'In progress',
            startTime: '2024-12-30 08:30:00',
        },
    ],
    backendDataSources: [
        {
            title: 'Task Summary',
            description: 'Read from: tasks + guideline tables',
        },
        {
            title: 'Revision History',
            description: 'Query: revisions by task_id; anonymize actor unless admin',
        },
        {
            title: 'Reviewer Outcome',
            description: 'Latest revision in REVIEW stage',
        },
        {
            title: 'Time-in-Stage',
            description: 'Compute: now - stage_start_ts vs stage_sla_ms',
        },
    ],
};