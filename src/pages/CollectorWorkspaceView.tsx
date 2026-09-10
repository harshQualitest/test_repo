import { useParams } from 'react-router-dom';
import CollectorHome from './CollectorHome';

/**
 * Component: CollectorWorkspaceView
 *
 * Purpose: Thin route wrapper that renders `CollectorHome` pinned to a specific
 * workspace, letting a collector be deep-linked directly into one workspace
 * (e.g. `/data-collection/collector/workspace/:id`) instead of picking one manually.
 *
 * Props: none (reads the workspace `id` from the route param).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const CollectorWorkspaceView = () => {
    const { id } = useParams<{ id: string }>();
    return <CollectorHome workspaceId={id} />;
};

export default CollectorWorkspaceView;
