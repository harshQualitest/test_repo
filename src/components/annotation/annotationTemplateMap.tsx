import type { ComponentType } from 'react';
import MultiModality from './multi-modality/MultiModality';
import VideoLabeling from './video-labeling/VideoLabeling';

/**
 * ANNOTATION_TEMPLATE_MAP
 *
 * Purpose: Central registry that resolves a task/project `template_type` string to the
 * React component responsible for rendering that task's annotation UI. This lets a single
 * generic screen (UserAnnotationScreen) render the correct modality-specific editor without
 * knowing about every annotation type itself.
 *
 * Responsibilities:
 * - Maps each known `template_type` key to a `ComponentType` (or `null`).
 * - Acts as the single source of truth for "which component handles which template type" —
 *   consumers should look up components through this map rather than hardcoding conditionals.
 *
 * Values:
 * - `llm_grading: null` — no dedicated component; the default LLM grading flow built into
 *   UserAnnotationScreen handles this template type directly.
 * - `multi_modal: MultiModality` — renders the multi-modality annotation screen (video +
 *   transcript + frames + head-location/tracklet/speaker sub-tabs).
 * - `video_labeling: VideoLabeling` — renders the video frame-extraction and bounding-box
 *   labeling screen.
 *
 * How to add a new template type:
 * 1. Build the new annotation component (typically under `src/components/annotation/<name>/`).
 * 2. Import it here and add a new `template_type: Component` entry below.
 * 3. Ensure the component accepts (at minimum) the shared `{ instructionsUrl?: string; task?: any }`
 *    props so it is interchangeable with the other mapped components.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const ANNOTATION_TEMPLATE_MAP: Record<string, ComponentType<{ instructionsUrl?: string; task?: any }> | null> = {
    llm_grading: null,
    multi_modal: MultiModality,
    video_labeling: VideoLabeling
};
