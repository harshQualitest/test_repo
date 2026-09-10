import type { AnalysisData } from '../types/detail-analysis-data';

/**
 * Mock/fixture dataset backing the "Queue Depth Analysis" detail page —
 * populates the page header, filter dropdowns (date range/project/user/
 * status), summary metric cards, weekly trend chart, per-project breakdown
 * pie chart, and the detailed data table. Shape defined by `AnalysisData`
 * (see `types/detail-analysis-data.ts`). Used in place of the real backend
 * analytics endpoint during development/before that integration lands.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const queueDepthAnalysisData: AnalysisData = {
  header: {
    title: 'Queue Depth Analysis',
    subtitle: 'Detailed breakdown of task queues by project and workflow stage',
    backLabel: 'Back',
    exportLabel: 'Export CSV',
    icon: 'BarChart3',
  },
  filters: {
    dateRanges: [
      { label: 'Last 7 Days', value: 'last7' },
      { label: 'Last 30 Days', value: 'last30' },
      { label: 'Last 90 Days', value: 'last90' },
    ],
    projects: [
      { label: 'All Projects', value: 'all' },
      { label: 'Customer Support Classification', value: 'customer-support' },
      { label: 'Product Review Sentiment', value: 'product-review' },
      { label: 'Content Moderation', value: 'content-moderation' },
      { label: 'Email Intent Classification', value: 'email-intent' },
      { label: 'Document Categorization', value: 'document-cat' },
    ],
    users: [
      { label: 'All Users', value: 'all' },
      { label: 'Sarah Chen', value: 'sarah-chen' },
      { label: 'Mike Johnson', value: 'mike-johnson' },
      { label: 'Emily Davis', value: 'emily-davis' },
      { label: 'David Kim', value: 'david-kim' },
      { label: 'Lisa Wang', value: 'lisa-wang' },
    ],
    statuses: [
      { label: 'All Status', value: 'all' },
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
    searchPlaceholder: 'Search...',
  },
  metrics: [
    { label: 'Total Records', value: '6', helperText: 'Showing filtered results' },
    { label: 'Total in Queue', value: '574', helperText: 'Across all stages' },
    { label: 'In Progress', value: '55', helperText: 'Currently being worked on' },
    { label: 'Active Projects', value: '6', helperText: '0 inactive' },
  ],
  trendChart: {
    title: 'Trend Analysis (Last 7 Days)',
    series: [
      { name: 'Mon', thisWeek: 68, lastWeek: 92 },
      { name: 'Tue', thisWeek: 58, lastWeek: 64 },
      { name: 'Wed', thisWeek: 112, lastWeek: 45 },
      { name: 'Thu', thisWeek: 8, lastWeek: 72 },
      { name: 'Fri', thisWeek: 78, lastWeek: 88 },
      { name: 'Sat', thisWeek: 68, lastWeek: 56 },
      { name: 'Sun', thisWeek: 80, lastWeek: 52 },
    ],
    colors: {
      thisWeek: '#3b82f6',
      lastWeek: '#94a3b8',
    },
  },
  breakdownChart: {
    title: 'Breakdown by Project',
    slices: [
      { name: 'Customer Support', value: 145, color: '#3b82f6' },
      { name: 'Product Review', value: 132, color: '#10b981' },
      { name: 'Content Moderation', value: 123, color: '#f59e0b' },
      { name: 'Email Intent', value: 99, color: '#8b5cf6' },
      { name: 'Document Cat.', value: 75, color: '#ec4899' },
    ],
  },
  table: {
    title: 'Detailed Data',
    description: 'Click column headers to sort. 6 records shown.',
    rows: [
      {
        project: 'Customer Support Classification',
        user: 'Annotation',
        completed: 145,
        avgPerDay: 12,
        trendPercent: '2.5h',
        trendDirection: 'up',
        status: 'Active',
      },
      {
        project: 'Customer Support Classification',
        user: 'Review',
        completed: 87,
        avgPerDay: 8,
        trendPercent: '1.8h',
        trendDirection: 'down',
        status: 'Active',
      },
      {
        project: 'Product Review Sentiment',
        user: 'Annotation',
        completed: 98,
        avgPerDay: 6,
        trendPercent: '3.1h',
        trendDirection: 'up',
        status: 'Active',
      },
      {
        project: 'Product Review Sentiment',
        user: 'Review',
        completed: 45,
        avgPerDay: 5,
        trendPercent: '1.2h',
        trendDirection: 'down',
        status: 'Active',
      },
      {
        project: 'Content Moderation',
        user: 'Human Review',
        completed: 123,
        avgPerDay: 15,
        trendPercent: '4.2h',
        trendDirection: 'up',
        status: 'Active',
      },
      {
        project: 'Email Intent Classification',
        user: 'Annotation',
        completed: 76,
        avgPerDay: 9,
        trendPercent: '2.0h',
        trendDirection: 'up',
        status: 'Active',
      },
    ],
  },
};
