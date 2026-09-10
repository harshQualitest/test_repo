/**
 * Purpose: Core identifying and lifecycle metadata for a single task, as sourced
 * from the tasks table and its linked guideline reference. Rendered by `TaskSummaryCard`.
 *
 * @property taskId - Unique task identifier.
 * @property state - Overall task state/lifecycle label (e.g. active/completed).
 * @property dataset - Name of the dataset the task belongs to.
 * @property type - Task type/category (e.g. classification, annotation).
 * @property schemaVersion - Version of the data schema the task was created against.
 * @property guidelineVersion - Version of the annotation/review guideline applied to the task.
 * @property createdAt - Task creation timestamp (display-formatted string).
 * @property startedAt - Timestamp the task's work started (display-formatted string).
 * @property currentStage - Current pipeline stage the task is in (e.g. ANNOTATION, REVIEW).
 */
export interface TaskSummaryData {
  taskId: string;
  state: string;
  dataset: string;
  type: string;
  schemaVersion: string;
  guidelineVersion: string;
  createdAt: string;
  startedAt: string;
  currentStage: string;
}

/**
 * Purpose: A single failure reason code attached to a revision, shown as a chip
 * in `RevisionHistoryCard`.
 *
 * @property code - Machine-readable failure code identifier.
 * @property label - Human-readable label displayed for the failure code.
 */
export interface FailureCode {
  code: string;
  label: string;
}

/**
 * Purpose: One entry in a task's revision/pass timeline, rendered by `RevisionHistoryCard`.
 *
 * @property passNumber - Sequential number of this pass through the workflow.
 * @property stage - Pipeline stage this pass occurred in (e.g. ANNOTATION, REVIEW, QA).
 * @property status - Outcome of this pass; drives status color/icon mapping.
 * @property actor - Name/identifier of the user who performed this pass.
 * @property duration - Display-formatted duration the pass took.
 * @property startTime - Display-formatted start timestamp of the pass.
 * @property endTime - Display-formatted end timestamp; absent while the pass is still in progress.
 * @property failureCodes - Failure codes associated with this pass, if it failed.
 */
export interface RevisionEntry {
  passNumber: number;
  stage: string;
  status: 'PASSED' | 'FAILED' | 'IN_PROGRESS';
  actor: string;
  duration: string;
  startTime: string;
  endTime?: string;
  failureCodes?: FailureCode[];
}

/**
 * Purpose: Outcome of the current (latest) revision in the REVIEW stage,
 * rendered by `ReviewerOutcomeCard`.
 *
 * @property status - Current review outcome status; drives status color/icon mapping.
 * @property reviewer - Name/identifier of the assigned reviewer.
 * @property lastFailureReason - Free-text reason for the most recent failure, if any; when present, a failure panel is shown.
 * @property reviewStarted - Display-formatted timestamp the review began.
 * @property source - Description of the backend source/table this data was read from.
 */
export interface ReviewerOutcomeData {
  status: 'IN_PROGRESS' | 'PASSED' | 'FAILED';
  reviewer: string;
  lastFailureReason?: string;
  reviewStarted: string;
  source: string;
}

/**
 * Purpose: A single backend data source entry listed in `BackendDataSourcesCard`,
 * used to document where dashboard data is sourced from.
 *
 * @property title - Name of the data source (e.g. table or query name).
 * @property description - Short explanation of what the source contains/provides.
 */
export interface BackendDataSource {
  title: string;
  description: string;
}

/**
 * Purpose: Aggregate shape combining all Task Dashboard sections, likely the
 * response shape of the task-dashboard data-fetching API/thunk.
 *
 * @property taskSummary - Core task metadata, see {@link TaskSummaryData}.
 * @property reviewerOutcome - Current revision's review outcome, see {@link ReviewerOutcomeData}.
 * @property revisionHistory - Full pass/revision timeline, see {@link RevisionEntry}.
 * @property backendDataSources - Data sources feeding the dashboard, see {@link BackendDataSource}.
 */
export interface TaskDashboardData {
  taskSummary: TaskSummaryData;
  reviewerOutcome: ReviewerOutcomeData;
  revisionHistory: RevisionEntry[];
  backendDataSources: BackendDataSource[];
}
