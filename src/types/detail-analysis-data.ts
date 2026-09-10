/**
 * Shape contracts for the "detail analysis" pages (Queue Depth, Rejection
 * Rate, Throughput — see `mocks/QueueDepthAnalysisData.ts`,
 * `mocks/RejectionRateAnalysisData.ts`, `mocks/ThroughputAnalysisData.ts`).
 * Each of those pages renders the same layout — header, filter bar, metric
 * cards, trend chart, breakdown pie chart, and a data table — driven by a
 * single `AnalysisData` object, so this file centralizes that shared shape.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */

/** Direction of a metric/trend value change, used to pick an up/down/flat indicator. */
export type TrendDirection = 'up' | 'down' | 'flat';

/** Content for the analysis page's header bar (title, subtitle, action button labels, icon). */
export interface HeaderData {
  title: string;
  subtitle: string;
  backLabel: string;
  exportLabel: string;
  /** Name of the icon to render; constrained to the icons this page family actually uses. */
  icon: 'QueryStats' | 'BarChart3' | 'CircleX';
}

/** A single selectable option in a filter dropdown (label shown to user, value used for filtering logic). */
export interface FilterOption {
  label: string;
  value: string;
}

/** The full set of filter controls shown on an analysis page's filter bar. */
export interface FiltersData {
  dateRanges: FilterOption[];
  projects: FilterOption[];
  users: FilterOption[];
  statuses: FilterOption[];
  searchPlaceholder: string;
}

/** A single summary metric card (e.g. "Total Records", "Total Completed"). */
export interface MetricCard {
  label: string;
  value: string;
  /** Secondary descriptive text shown under the value (mutually used with trend fields). */
  helperText?: string;
  /** Optional trend caption, e.g. "+12% from last week". */
  trendText?: string;
  trendDirection?: TrendDirection;
  /** Optional override color for the trend text/icon. */
  trendColor?: string;
}

/** One data point in the weekly trend line/bar chart, comparing this week vs. last week. */
export interface TrendSeriesPoint {
  name: string;
  thisWeek: number;
  lastWeek: number;
}

/** Full trend chart config: title, weekly series data, and the two series' colors. */
export interface TrendChartData {
  title: string;
  series: TrendSeriesPoint[];
  colors: {
    thisWeek: string;
    lastWeek: string;
  };
}

/** A single slice of the breakdown pie/donut chart. Index signature allows chart libraries that expect arbitrary extra keys on data points. */
export interface PieSlice {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

/** Breakdown chart config: title plus the slices that make it up. */
export interface BreakdownChartData {
  title: string;
  slices: PieSlice[];
}

/** A single row in the analysis page's detailed data table. */
export interface TableRowData {
  project: string;
  user: string;
  completed: number;
  avgPerDay: number;
  trendPercent: string;
  trendDirection: TrendDirection;
  status: 'Active' | 'Inactive';
}

/** Top-level shape consumed by each detail-analysis page component. */
export interface AnalysisData {
  header: HeaderData;
  filters: FiltersData;
  metrics: MetricCard[];
  trendChart: TrendChartData;
  breakdownChart: BreakdownChartData;
  table: {
    title: string;
    description: string;
    rows: TableRowData[];
  };
}