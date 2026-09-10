/**
 * Purpose: Adapters between the Data Collection domain's API shape
 * (`IDataCollectionProject`) and two other shapes it needs to fit into: the
 * generic project grid/table (`IProject`) and the multi-step project-creation
 * wizard's form state (`IProjectFormState`). Pure functions, no API calls.
 */
import type { IProject } from '../redux/slices/projectSlice';
import type { IDataCollectionProject, IProjectFormState } from '../interfaces/api/dataCollection.interface';
import { DEFAULT_DEMOGRAPHIC_DATA, DEMOGRAPHIC_KEYS } from '../interfaces/api/dataCollection.interface';

/**
 * Maps a data-collection project to the IProject shape used by the shared project grid/table.
 * @param dc - The fetched data-collection project.
 * @returns An `IProject` with data-collection-specific fields normalized (defaulted org/workspace
 * ids, status derived from `isactive` when no explicit `status` is present).
 */
export const mapDcToProject = (dc: IDataCollectionProject): IProject => ({
    _id: dc._id,
    id: dc._id,
    org_id: dc.organization_id ?? '',
    workspace_id: dc.workspace_id ?? '',
    name: dc.name,
    description: dc.description ?? '',
    template_type: 'data_collection' as any,
    start_date: dc.start_date ?? dc.startDate ?? '',
    end_date: dc.end_date ?? dc.endDate ?? '',
    status: (dc.status ?? (dc.isactive === 1 ? 'active' : 'inactive')) as any,
});

/**
 * Merges a fetched project's demographic_data into the default shape so every key/value is present for the form.
 * @param dc - The demographic_data array as returned by the API (may be missing entries).
 * @returns The full default demographic entries, with each entry's `enabled`/`target` overridden
 * by the fetched value when present — ensures the wizard always has every expected key.
 */
const mergeDemographicData = (dc: IDataCollectionProject['demographic_data']): IProjectFormState['demographic_data'] =>
    DEFAULT_DEMOGRAPHIC_DATA.map((defaultEntry) => {
        const key = DEMOGRAPHIC_KEYS.find((k) => k in defaultEntry)!;
        const fetchedEntry = dc?.find((d) => key in d);
        const fetchedTarget = fetchedEntry?.[key];
        if (!fetchedTarget) return defaultEntry;
        return {
            [key]: {
                enabled: fetchedTarget.enabled,
                target: { ...defaultEntry[key]!.target, ...fetchedTarget.target },
            },
        };
    });

/**
 * Maps a fetched data-collection project into the multi-step wizard's form state, for the edit flow.
 * @param dc - The fetched data-collection project (from `getProjectData`).
 * @returns Form state pre-populated for Formik, including normalized `users`/`allUsers`,
 * merged demographic data, and an empty `phase_targets` (see inline comment: Phase Config
 * targets aren't returned by the getdata endpoint, so editing falls back to the overall `target`).
 */
export const mapProjectToFormState = (dc: IDataCollectionProject): IProjectFormState => {
    const users = dc.users ?? ['All'];
    // The API represents "assigned to everyone" as a single-element ['All'] array
    // rather than a boolean flag — detect that sentinel here for the form's toggle.
    const allUsers = users.length === 1 && users[0]?.toLowerCase() === 'all';
    return {
        name: dc.name,
        project_type: 'collection',
        description: dc.description ?? '',
        target: dc.target,
        startDate: dc.start_date ?? dc.startDate ?? '',
        endDate: dc.end_date ?? dc.endDate ?? '',
        instruction: dc.instruction ?? '',
        users: allUsers ? ['All'] : users,
        allUsers,
        phases: dc.phases ?? { phase_1: [] },
        // Not returned by GET /projects/{id}/getdata — Phase Config is read-only in
        // the edit flow, so the wizard falls back to `target` for the overall total.
        phase_targets: {},
        demographic_data: mergeDemographicData(dc.demographic_data),
        initial_scene: dc.initial_scene ?? '',
        action_template: dc.action_template ?? '',
    };
};
