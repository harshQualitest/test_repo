/**
 * Module: schema.ts (data-collection project wizard validation)
 *
 * Purpose: Centralizes Yup validation for the multi-step "create/edit data
 * collection project" wizard (BasicInfoStep, PhaseConfigStep, DemographicStep,
 * UserAssignmentStep, ReviewStep). Formik itself has no built-in notion of
 * "block navigation until this step is valid" for a multi-step form, so
 * validation is split into per-step slices here and the hosting page
 * (e.g. DataCollectionProjectCreate) is responsible for running the right
 * slice against the current step and gating the "Continue"/"Next" action
 * manually before advancing.
 *
 * Responsibilities:
 * - step1Schema: validates the Basic Info step's fields in isolation, so it
 *   can be run standalone when the user tries to leave Step 1.
 * - fullSchema: step1Schema plus the fields that only become meaningful once
 *   later steps (Phase Config, User Assignment) have been filled in — used
 *   for the final submit-time validation of the whole form.
 * - validatePhaseConfig: a plain (non-Yup) validator for the Phase Config
 *   step, because that step's rules are structural (phases must exist, each
 *   phase needs a target, each slot needs a name and per-user cap) rather
 *   than simple field-level rules that map cleanly onto a Yup object shape.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
import * as Yup from 'yup';
import type { IProjectFormState } from '../../../interfaces/api/dataCollection.interface';

/**
 * Basic Info step (Step 1) validation slice — corresponds to BasicInfoStep.tsx.
 *
 * Fields validated:
 * - name: required, 1–50 chars, and disallows `<>'"&` (regex `[^<>'"&]+`) to
 *   avoid characters that could break HTML/attribute rendering or downstream
 *   storage of the project name.
 * - project_type: required, must be one of 'collection' | 'annotation'
 *   (this wizard always forces 'collection' via BasicInfoStep's effect, but
 *   the schema still guards the invariant).
 * - description: optional, capped at 200 chars.
 * - startDate: required (no format check here — the DatePicker only ever
 *   writes a valid 'YYYY-MM-DD' string).
 * - endDate: required, and via a custom `test` must be >= startDate (a plain
 *   string comparison works because both are zero-padded ISO date strings).
 * - instruction: required, 1–350 chars, shown to uploaders so it must not be blank.
 */
export const step1Schema = Yup.object({
    name: Yup.string()
        .required('Project name is required')
        .min(1)
        .max(50, 'Max 50 characters')
        .matches(/^[^<>'"&]+$/, 'Name cannot contain special characters'),
    project_type: Yup.string().oneOf(['collection', 'annotation']).required(),
    description: Yup.string().max(200, 'Max 200 characters'),
    startDate: Yup.string().required('Start date is required'),
    endDate: Yup.string()
        .required('End date is required')
        .test('gte-start', 'End date must be ≥ start date', function (val) {
            return !this.parent.startDate || !val || val >= this.parent.startDate;
        }),
    instruction: Yup.string().required('Instructions are required').min(1).max(350, 'Max 350 characters'),
});

/**
 * Full-form validation slice, used for final submit — corresponds to the
 * combination of BasicInfoStep + PhaseConfigStep + UserAssignmentStep output.
 *
 * Extends step1Schema with:
 * - target: must be >= 1. The project's total upload target is computed from
 *   phase/slot configuration (Σ phaseCount across slots), so a target < 1
 *   means no phase/slot with a positive per-user upload count was configured.
 * - users: required non-empty array — at least one user (or the sentinel
 *   'All Users' selection) must be assigned, otherwise no one could upload.
 */
export const fullSchema = step1Schema.concat(
    Yup.object({
        target: Yup.number().min(1, 'Add at least one slot with a phaseCount > 0 before submitting'),
        users: Yup.array().of(Yup.string().required()).min(1, 'Assign at least one user or select All Users'),
    }),
);

/**
 * Validates the required fields on the Phase Config step (Step 2 —
 * corresponds to PhaseConfigStep.tsx): phase targets + dataset slots.
 *
 * This is a hand-rolled validator rather than a Yup schema because the rules
 * are structural over a dynamic, keyed map (`values.phases`) — at least one
 * phase must exist, each phase needs a positive target, each phase needs at
 * least one slot, and each slot needs a non-blank name and a per-user upload
 * cap (`phaseCount`) >= 1. Yup's object/array validators don't map cleanly
 * onto "iterate this dynamic Record<string, T[]> and collect messages",
 * so plain function + string[] of error messages is simpler here.
 *
 * @param values - the wizard's current form state.
 * @returns An array of human-readable error strings; empty when valid.
 */
export const validatePhaseConfig = (values: IProjectFormState): string[] => {
    const errors: string[] = [];
    const phaseKeys = Object.keys(values.phases ?? {}).sort();

    if (phaseKeys.length === 0) {
        errors.push('Add at least one phase.');
        return errors;
    }

    phaseKeys.forEach((key, phaseIdx) => {
        const target = values.phase_targets?.[key] ?? 0;
        if (!target || target <= 0) {
            errors.push(`Phase ${phaseIdx + 1}: Phase target is required.`);
        }

        const slots = values.phases[key] ?? [];
        if (slots.length === 0) {
            errors.push(`Phase ${phaseIdx + 1}: Add at least one dataset slot.`);
        }

        slots.forEach((slot, slotIdx) => {
            if (!slot.name.trim()) {
                errors.push(`Phase ${phaseIdx + 1}, Slot ${slotIdx + 1}: Slot name is required.`);
            }
            if (!slot.phaseCount || slot.phaseCount < 1) {
                errors.push(`Phase ${phaseIdx + 1}, Slot ${slotIdx + 1}: Uploads per user is required.`);
            }
        });
    });

    return errors;
};
