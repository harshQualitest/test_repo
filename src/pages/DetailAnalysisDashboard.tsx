import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import {
  HeaderSection,
  FiltersCard,
  MetricCards,
  TrendChartCard,
  BreakdownChartCard,
  DataTableCard,
} from '../components/detail-analysis-dashboard';
import type { AnalysisData } from '../types/detail-analysis-data';
import { throughputAnalysisData } from '../mocks/ThroughputAnalysisData';

/**
 * Component: DetailAnalysisDashboard
 *
 * Purpose: Composes the detail-analysis dashboard from a set of presentational
 * cards (header, filters, metrics, trend/breakdown charts, data table), using
 * either injected data or a bundled mock dataset as a fallback.
 *
 * Props:
 * - data (optional) — full `AnalysisData` payload; defaults to
 *   `throughputAnalysisData` (src/mocks/ThroughputAnalysisData.ts) when omitted.
 *
 * Major child components: `HeaderSection`, `FiltersCard`, `MetricCards`,
 * `TrendChartCard`, `BreakdownChartCard`, `DataTableCard`
 * (src/components/detail-analysis-dashboard).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const DetailAnalysisDashboard = ({ data }: { data?: AnalysisData }) => {
  // Falls back to the bundled mock dataset when no live data has been wired up yet.
  const resolved = data ?? throughputAnalysisData;

  return (
    <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3 }}>
      <HeaderSection data={resolved.header} />

      <Stack spacing={3}>
        <FiltersCard data={resolved.filters} />

        <MetricCards cards={resolved.metrics} />

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
          <TrendChartCard data={resolved.trendChart} />
          <BreakdownChartCard data={resolved.breakdownChart} />
        </Box>

        <DataTableCard title={resolved.table.title} description={resolved.table.description} rows={resolved.table.rows} />
      </Stack>
    </Box>
  );
};

export default DetailAnalysisDashboard;
