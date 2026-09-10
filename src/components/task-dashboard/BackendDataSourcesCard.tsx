import type { BackendDataSource } from './types';

import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Props for {@link BackendDataSourcesCard}.
 * @property dataSources - List of backend data source entries (title + description) to display.
 */
interface BackendDataSourcesCardProps {
  dataSources: BackendDataSource[];
}

/**
 * Component: BackendDataSourcesCard
 *
 * Purpose: Presentational card listing the backend data sources (e.g. tables/queries)
 * that feed the Task Dashboard, so users can trace where the displayed data originates.
 *
 * Responsibilities:
 * - Render a titled card containing a responsive 2-column grid of data source entries.
 * - Render each source's title and description as provided by the parent.
 *
 * Props:
 * - dataSources: BackendDataSource[] - array of `{ title, description }` entries to render.
 *
 * Major child components rendered: MUI `Paper`, `Box`, `Typography`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const BackendDataSourcesCard = ({ dataSources }: BackendDataSourcesCardProps) => {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Backend Data Sources</Typography>
      </Box>

      <Box sx={{ mt: 1 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {/* Each source is rendered as a simple title/description pair; index is a stable key since the list is static per render */}
          {dataSources.map((source, index) => (
            <Box key={index}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{source.title}</Typography>
              <Typography variant="caption" color="text.secondary">{source.description}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
};
