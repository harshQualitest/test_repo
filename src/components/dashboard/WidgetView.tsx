import { Box, Typography } from '@mui/material';
import WorkSpaceCard from './workspace-card';
import { WorkspaceCardSkeleton } from '../skeletons/DashboardSkeleton';

interface WidgetViewProps {
  readonly workspaces: any[];
  readonly workspaceColors: string[];
  readonly isLoading?: boolean;
}

/**
 * Component: WidgetView
 *
 * Purpose: Renders workspaces as a responsive grid of `WorkSpaceCard` widgets —
 * the default/card-based dashboard view (as opposed to `ListView`, `KanbanView`,
 * or `GanttView`).
 *
 * Responsibilities:
 * - Lay out one card per workspace in a responsive CSS grid.
 * - Show skeleton placeholder cards while loading.
 * - Show an empty state when there are no workspaces.
 *
 * Props:
 * - `workspaces` - workspace objects to render as cards.
 * - `workspaceColors` - accent color per workspace, matched to `workspaces` by array index.
 * - `isLoading` - whether workspace data is still loading (renders skeleton cards instead).
 *
 * Major child components rendered: `WorkSpaceCard` (one per workspace), `WorkspaceCardSkeleton`
 * (loading placeholder, 4 shown while loading).
 *
 * Business logic: workspace color is assigned positionally (`workspaceColors[index]`), so the
 * two arrays must stay index-aligned with `workspaces` for colors to match the correct card.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function WidgetView(props: Readonly<WidgetViewProps>) {
  const { 
    workspaces, 
    workspaceColors, 
    isLoading = false
  } = props;
  
  return (
    <>
      <Box
        sx={{
          // mt: 2,
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
            md: 'repeat(2, 1fr)',
          },
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          py: 2,
          px:2
        }}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <WorkspaceCardSkeleton key={i} />)
          : workspaces.map((workspace, index) => (
              <WorkSpaceCard
                key={workspace.title}
                workspace={{ ...workspace, color: workspaceColors[index] }}
              />
            ))}
      </Box>
      
      {/* No workspaces message */}
      {!isLoading && workspaces.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No workspaces found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Create a new workspace to get started
          </Typography>
        </Box>
      )}
    </>
  );
}
