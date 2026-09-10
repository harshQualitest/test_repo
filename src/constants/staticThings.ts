/**
 * Shared static configuration used by annotation/review UIs: the fixed set
 * of quality rating dimensions annotators/reviewers score, the fixed set of
 * pairwise LLM-comparison options, and human-readable labels for project
 * template types. These are domain constants (not user-editable config), so
 * they live here rather than in a database/admin setting.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

// Rating categories
// The fixed set of quality dimensions annotators/reviewers score a response
// on; `key` is the field name persisted/sent to the backend, `label`/
// `description` drive the UI copy.
export const RATING_CATEGORIES = [
    { key: 'overall_quality', label: 'Overall Quality', description: 'Rate the overall quality of the response' },
    { key: 'writing_style', label: 'Writing Style', description: 'Clarity, coherence, and readability' },
    { key: 'verbosity', label: 'Verbosity', description: 'Appropriate length and detail level' },
    {
        key: 'instruction_following',
        label: 'Instruction Following',
        description: 'How well the response follows the prompt',
    },
    { key: 'accuracy', label: 'Accuracy', description: 'Factual correctness of the response' },
    { key: 'harmlessness', label: 'Harmlessness', description: 'Free from harmful or inappropriate content' },
    { key: 'intent_understanding', label: 'Intent Understanding', description: "Understanding of the user's intent" },
];


// Rating categories
// The fixed set of side-by-side comparison verdicts for two-LLM-response
// grading tasks; `value` is the persisted enum, `label` is the UI copy.
export const COMPARISON_OPTIONS = [
    { value: 'llm1_significantly_better', label: 'LLM1 is significantly better than LLM 2' },
    { value: 'llm1_slightly_better', label: 'LLM1 is slightly better than LLM2' },
    { value: 'both_same', label: 'Both responses are about the same' },
    { value: 'llm2_significantly_better', label: 'LLM2 is significantly better than LLM 1' },
    { value: 'llm2_slightly_better', label: 'LLM2 is slightly better than LLM1' },
    { value: 'exactly_same', label: 'Responses are exactly the same' },
    { value: 'both_inadequate', label: 'Both responses are inadequate' },
];


// Maps a project template's backend `type` key to its display label, used
// wherever a project template type needs to be shown to the user.
export const TEMPLATE_TYPES = {
    llm_grading: 'LLM Grading',
    multi_modal: 'Multi Modal',
    video_labeling: 'Video Labeling',
};