import type { AnalysisData } from '../types/detail-analysis-data';

/**
 * Mock/fixture dataset backing the "Rejection Rate Analysis" detail page —
 * populates the page header, filter dropdowns (date range/project/user/
 * status), summary metric cards, weekly trend chart, per-project breakdown
 * pie chart, and the detailed rejection-rate data table. Shape defined by
 * `AnalysisData` (see `types/detail-analysis-data.ts`). Used in place of the
 * real backend analytics endpoint during development/before that
 * integration lands.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const rejectionRateAnalysisData: AnalysisData = {
  header: {
    title: 'Rejection Rate Analysis',
    subtitle: 'Detailed breakdown of task rejections by project, user, and failure codes',
    backLabel: 'Back',
    exportLabel: 'Export CSV',
    icon: 'CircleX',
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
    { label: 'Total Records', value: '5', helperText: 'Showing filtered results' },
    { label: 'Total Rejected', value: '72', helperText: 'Out of 822 tasks' },
    { label: 'Avg Rejection Rate', value: '8.8%', helperText: 'Across filtered projects' },
    { label: 'Active Projects', value: '4', helperText: '1 inactive' },
  ],
  trendChart: {
    title: 'Trend Analysis (Last 7 Days)',
    series: [
      { name: 'Mon', thisWeek: 8, lastWeek: 4 },
      { name: 'Tue', thisWeek: 12, lastWeek: 8 },
      { name: 'Wed', thisWeek: 6, lastWeek: 12 },
      { name: 'Thu', thisWeek: 9, lastWeek: 5 },
      { name: 'Fri', thisWeek: 14, lastWeek: 18 },
      { name: 'Sat', thisWeek: 11, lastWeek: 20 },
      { name: 'Sun', thisWeek: 12, lastWeek: 22 },
    ],
    colors: {
      thisWeek: '#3b82f6',
      lastWeek: '#94a3b8',
    },
  },
  breakdownChart: {
    title: 'Breakdown by Project',
    slices: [
      { name: 'Customer Support', value: 25, color: '#3b82f6' },
      { name: 'Product Review', value: 24, color: '#10b981' },
      { name: 'Content Moderation', value: 8, color: '#f59e0b' },
      { name: 'Email Intent', value: 9, color: '#8b5cf6' },
      { name: 'Document Cat.', value: 6, color: '#ec4899' },
    ],
  },
  table: {
    title: 'Detailed Data',
    description: 'Click column headers to sort. 5 records shown.',
    rows: [
      {
        project: 'Customer Support Classification',
        user: 'Sarah Chen',
        completed: 245,
        avgPerDay: 25,
        trendPercent: '10.2%',
        trendDirection: 'down',
        status: 'Active',
      },
      {
        project: 'Product Review Sentiment',
        user: 'Mike Johnson',
        completed: 189,
        avgPerDay: 24,
        trendPercent: '12.7%',
        trendDirection: 'down',
        status: 'Active',
      },
      {
        project: 'Content Moderation',
        user: 'Emily Davis',
        completed: 156,
        avgPerDay: 8,
        trendPercent: '5.1%',
        trendDirection: 'down',
        status: 'Active',
      },
      {
        project: 'Email Intent Classification',
        user: 'David Kim',
        completed: 134,
        avgPerDay: 9,
        trendPercent: '6.7%',
        trendDirection: 'down',
        status: 'Active',
      },
      {
        project: 'Document Categorization',
        user: 'Lisa Wang',
        completed: 98,
        avgPerDay: 6,
        trendPercent: '6.1%',
        trendDirection: 'down',
        status: 'Inactive',
      },
    ],
  },
};
