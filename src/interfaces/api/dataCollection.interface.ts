/**
 * Data Collection API Interfaces
 *
 * Purpose: Request/response and domain types for the Data Collection module —
 * project configuration (phases, demographics), dataset documents, upload
 * tracking/reporting, and the multi-step project-creation form state.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

// ─── Enums & Lookup Tables ───────────────────────────────────────────────────

export const DATA_TYPES = ['Image', 'Video', 'Audio', 'Text'] as const;
export type DataType = (typeof DATA_TYPES)[number];

export const FILE_FORMATS = ['JPEG', 'PNG', 'MP4', 'MOV', 'LivePhoto', 'MP3', 'WAV', 'HEIC', 'M4A'] as const;
export type FileFormat = (typeof FILE_FORMATS)[number];

// '10' means a 10% dimension-match tolerance; '' means no dimension constraint.
export const DIMENSION_MATCH_OPTIONS = ['Exact', '10', ''] as const;
export type DimensionMatch = (typeof DIMENSION_MATCH_OPTIONS)[number];

export const DEMOGRAPHIC_KEYS = ['age', 'gender', 'skintone', 'ethnicity'] as const;
export type DemographicKey = (typeof DEMOGRAPHIC_KEYS)[number];

// Maps age-bracket codes (L1-L7) to their human-readable range label.
export const AGE_RANGES: Record<string, string> = {
    L1: '15-17',
    L2: '18-24',
    L3: '25-34',
    L4: '35-45',
    L5: '46-64',
    L6: '65+',
    L7: 'Prefer Not to Say',
};

export const GENDER_VALUES: Record<string, string> = {
    Male: 'Male',
    Female: 'Female',
    'Non-binary': 'Non-Binary',
    Other: 'Other',
};

export const SKINTONE_VALUES: Record<string, string> = {
    Type1: 'Light / Pale White',
    Type2: 'White / Fair',
    Type3: 'Medium White to Olive',
    Type4: 'Olive / Moderate Brown',
    Type5: 'Brown / Dark Brown',
    Type6: 'Black / Very Dark Brown to Black',
};

export const ETHNICITY_VALUES: Record<string, string> = {
    african: 'African',
    east_asian: 'East Asian',
    european: 'European',
    indigenous_peoples_of_north_america: 'Indigenous Peoples of North America',
    latin_american: 'Latin American',
    middle_eastern_north_african: 'Middle Eastern / North African',
    pacific_islander: 'Pacific Islander',
    south_asian: 'South Asian',
    southeast_asian: 'Southeast Asian',
    unlisted: 'Unlisted',
};

export const DEMOGRAPHIC_VALUES: Record<DemographicKey, Record<string, string>> = {
    age: AGE_RANGES,
    gender: GENDER_VALUES,
    skintone: SKINTONE_VALUES,
    ethnicity: ETHNICITY_VALUES,
};

// Lifecycle/QA states a submitted dataset item can be in.
export const DATASET_QUALITY_STATES = [
    'Pending',
    'Accepted',
    'Rejected',
    'Auto Accepted',
    'Auto Rejected',
    'QA Rejected',
    'Needs Manual Review',
] as const;
export type DatasetQualityState = (typeof DATASET_QUALITY_STATES)[number];

// ─── Phase Configuration ─────────────────────────────────────────────────────

/** Required media dimensions/aspect constraints for a phase item. */
export interface IDimension {
    width: string;
    height: string;
    dimension_match: DimensionMatch;
}

/** Configuration for a single collection phase (a distinct capture requirement within a project). */
export interface IPhaseItem {
    id: string;
    name: string;
    device: string;
    data_type: DataType;
    file_format: FileFormat;
    iPhone_11_or_Newer: boolean;
    video_time_limit: number;
    file_size: number;
    dimension: IDimension;
    user_validation: boolean;
    admin_validation: boolean;
    // Number of submissions required per user for this phase.
    phaseCount: number;
    // How many this user has already uploaded for this phase.
    uploaded_by_user?: number;
    // How many submissions remain to reach the phase target.
    remaining?: number;
}

/** Map of phase key to the list of phase-item configs under it. */
export type IPhases = Record<string, IPhaseItem[]>;

// ─── Demographic Configuration ───────────────────────────────────────────────

/** Whether a demographic category is enforced and its per-value collection targets. */
export interface IDemographicTarget {
    enabled: boolean;
    // Target count per demographic value (e.g. per age bracket or gender).
    target: Record<string, number>;
}

/** Per-project demographic targets, keyed by demographic category (age/gender/skintone/ethnicity). */
export type IDemographicData = Partial<Record<DemographicKey, IDemographicTarget>>;

// ─── Project ─────────────────────────────────────────────────────────────────

/** Full data-collection project entity as returned by the API (mixes current and legacy field names). */
export interface IDataCollectionProject {
    _id?: string;
    name: string;
    description?: string;
    project_type: 'collection' | 'annotation';
    template_type?: string;
    target: number;
    // API returns snake_case; legacy used camelCase
    start_date?: string;
    end_date?: string;
    startDate?: string;
    endDate?: string;
    // API returns string status; legacy used numeric isactive
    status?: string;
    isactive?: number;
    instruction?: string;
    initial_scene?: string;
    action_template?: string;
    users?: string[];
    workspace_id?: string;
    organization_id?: string;
    phases: IPhases;
    demographic_data?: IDemographicData[];
    active_phase?: string;
    members?: any[];
    datasets?: IDatasetDocument[];
    annotation_data?: null;
    validation_data?: null;
    selected_project?: null;
    selected_data_ids?: null;
    created_by?: string;
    created_by_userid?: string;
    created_on?: string;
    need_auto_verification?: number;
    user_phases?: IUserPhase[];
    is_expired?: boolean;
}

/** Tracks a single user's current phase and completed phases within a project. */
export interface IUserPhase {
    email: string;
    phase: string;
    completed_phases: string[];
}

// ─── Create/Edit Request Bodies ──────────────────────────────────────────────

/** Request body for creating a new data-collection project. */
export interface ICreateDataCollectionProject {
    name: string;
    project_type: 'collection' | 'annotation';
    description?: string;
    target: number;
    startDate: string;
    endDate: string;
    instruction: string;
    users: string[];
    phases: IPhases;
    phase_targets?: Record<string, number>;
    demographic_data: IDemographicData[];
    initial_scene?: string;
    action_template?: string;
    organization_id?: string;
    workspace_id?: string;
}

/** PUT /data-collector/projects/ — all fields besides project_id are optional/partial. */
export interface IUpdateDataCollectionProject {
    project_id: string;
    name?: string;
    description?: string;
    target?: number;
    start_date?: string;
    end_date?: string;
    instruction?: string;
    users?: string[];
    phases?: IPhases;
    demographic_data?: IDemographicData[];
    initial_scene?: string;
    action_template?: string;
}

// ─── Upload / Dataset ─────────────────────────────────────────────────────────

/**
 * A single uploaded data item (image/video/audio/text) within a project phase.
 * Carries both legacy and current API field name variants for the same concepts.
 */
export interface IDatasetDocument {
    _id?: string;
    file_hash?: string;
    // Storage keys (S3 / legacy)
    s3_key?: string;
    s3_url?: string;
    s3_key_secondary?: string;
    thumbnail_s3_key?: string;
    // Direct URL returned by the new API
    file_url?: string;
    filename: string;
    // Legacy field names
    project?: string;
    fileformat?: string;
    filetype?: string;
    uploadedby?: string;
    createdon?: string;
    modifiedon?: string;
    modifiedby?: string;
    phase?: string;
    // New API field names
    project_id?: string;
    project_name?: string;
    phase_key?: string;
    file_format?: string;
    data_type?: string;
    file_size?: number;
    uploaded_by?: string;
    uploaded_by_userid?: string;
    created_at?: string;
    updated_at?: string;
    // Common fields
    dataset_key?: string;
    isactive?: number;
    tags?: string[];
    quality?: DatasetQualityState;
    attributes?: Record<string, unknown>;
    rejection_count?: number;
    demographic_data?: Record<string, string>;
    reason?: string;
    is_deleted?: boolean;
}

/** Paginated response from GET /data-collector/projects/:projectId/phases/:phaseKey/:phaseId */
export interface IPhaseDatasetsResponse {
    data: IDatasetDocument[];
    total: number;
    limit: number;
    offset: number;
}

// ─── Tracking ────────────────────────────────────────────────────────────────

/** High-level submission counts for a project's dashboard summary. */
export interface IBasicTracking {
    pending_count: number;
    qa_approved_count: number;
    in_pipeline: number;
    assigned_users: number;
    phase_user_count: Record<string, number>;
}

/** Progress-toward-target stats for a single demographic value (e.g. one age bracket). */
export interface IDemographicValueStats {
    pending: number;
    accepted: number;
    rejected: number;
    submitted: number;
    in_pipeline: number;
    target_value: number;
    in_pipeline_percent: number;
    in_pipeline_vs_target: string;
    // Human-readable status derived from progress vs. target (e.g. 'On Track', 'Behind').
    category_status: string;
    phase_breakdown?: Record<string, number>;
}

/** Detailed per-demographic-category tracking data for the advanced project dashboard. */
export interface IAdvanceTracking {
    demographic_key: string;
    // Stats keyed by demographic value within that category.
    stats: Record<string, IDemographicValueStats>;
}

/** A single row in the tracking drill-down table (one submitted dataset item). */
export interface IDrilldownEntry {
    filename: string;
    uploaded_by: string;
    phase: string;
    status: string;
    date_submitted: string;
    // Reviewer who QA'd this item, if reviewed.
    qaed_by?: string;
    qaed_on?: string;
    // Rejection/status reason, present when the item was rejected or flagged.
    reason?: string;
    demographic_data?: Record<string, string>;
}

/** Request body for updating a demographic target value for a project. */
export interface IUpdateTargetRequest {
    project: string;
    demographic_name: string;
    demographic_value: string;
    target: number;
}

// ─── Multi-step form state ────────────────────────────────────────────────────

/** Local Formik state for the multi-step data-collection project creation/edit wizard. */
export interface IProjectFormState {
    name: string;
    project_type: 'collection' | 'annotation';
    description: string;
    target: number | '';
    startDate: string;
    endDate: string;
    instruction: string;
    users: string[];
    allUsers: boolean;
    phases: IPhases;
    /** phase key → manually-set pool ceiling for that phase (all users combined) */
    phase_targets?: Record<string, number>;
    demographic_data: IDemographicData[];
    initial_scene: string;
    action_template: string;
}

/** Blank/default values used when a new phase item is added in the wizard. */
export const DEFAULT_PHASE_ITEM: IPhaseItem = {
    id: '',
    name: '',
    device: '',
    data_type: 'Image',
    file_format: 'JPEG',
    iPhone_11_or_Newer: false,
    video_time_limit: 0,
    file_size: 10,
    dimension: { width: '', height: '', dimension_match: '' },
    user_validation: true,
    admin_validation: true,
    phaseCount: 1,
};

/** Default (all-disabled, zero-target) demographic configuration for a new project. */
export const DEFAULT_DEMOGRAPHIC_DATA: IDemographicData[] = [
    { age: { enabled: false, target: { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0, L7: 0 } } },
    { gender: { enabled: false, target: { Male: 0, Female: 0, 'Non-binary': 0, Other: 0 } } },
    { skintone: { enabled: false, target: { Type1: 0, Type2: 0, Type3: 0, Type4: 0, Type5: 0, Type6: 0 } } },
    {
        ethnicity: {
            enabled: false,
            target: {
                african: 0,
                east_asian: 0,
                european: 0,
                indigenous_peoples_of_north_america: 0,
                latin_american: 0,
                middle_eastern_north_african: 0,
                pacific_islander: 0,
                south_asian: 0,
                southeast_asian: 0,
                unlisted: 0,
            },
        },
    },
];
