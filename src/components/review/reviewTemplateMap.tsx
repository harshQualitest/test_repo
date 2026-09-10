import type { ComponentType } from 'react';
import MultiModalityReview from './multi-modality/MultiModalityReview';
import VideoLabelingReview from './video-labeling/VideoLabelingReview';

/**
 * Module: reviewTemplateMap
 *
 * Purpose: Central registry mapping a project/task's `template_type` string to the React
 * component that should render its review UI. `ReviewPage` (or similar) looks up a task's
 * template type in this map to decide which reviewer screen to mount.
 *
 * Responsibilities:
 * - Provide a single source of truth for template_type -> review component wiring.
 * - Allow `null` as an explicit "no custom component" marker, distinct from an unmapped
 *   (undefined) key, so callers can distinguish "known type, use the default flow" from
 *   "unrecognized type".
 *
 * How to add a new template type:
 * 1. Build the new review component (see `MultiModalityReview` / `VideoLabelingReview` for
 *    the expected shape: accepts `{ instructionsUrl?: string; task?: any }`).
 * 2. Import it above and add a new `template_type: Component` entry to the map below.
 * 3. Use `null` instead of a component only if the type should fall back to the default
 *    LLM-grading review flow already implemented directly in `ReviewPage`.
 *
 * Maps template_type values to their corresponding review UI components.
 * Add new entries here as new template types are introduced.
 * A null value means the default LLM grading review flow in ReviewPage handles it.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const REVIEW_TEMPLATE_MAP: Record<string, ComponentType<{ instructionsUrl?: string; task?: any }> | null> = {
    llm_grading: null,
    multi_modal: MultiModalityReview,
    video_labeling: VideoLabelingReview,
};
