import type { AnalysisData } from '../types/detail-analysis-data';

/**
 * Mock/fixture dataset backing the "Throughput Analysis" detail page —
 * populates the page header, filter dropdowns (date range/project/user/
 * status), summary metric cards, weekly trend chart, per-project breakdown
 * pie chart, and the detailed throughput data table. Shape defined by
 * `AnalysisData` (see `types/detail-analysis-data.ts`). Used in place of the
 * real backend analytics endpoint during development/before that
 * integration lands.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const throughputAnalysisData: AnalysisData = {
  header: {
    title: 'Throughput Analysis',
    subtitle: 'Detailed breakdown of task completion rates across projects and users',
    backLabel: 'Back',
    exportLabel: 'Export CSV',
    icon: 'QueryStats',
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
    { label: 'Total Completed', value: '822', trendText: '+12% from last week', trendDirection: 'up', trendColor: '#16a34a' },
    { label: 'Avg Per Day', value: '23.4', helperText: 'Across all projects' },
    { label: 'Active Projects', value: '4', helperText: '1 inactive' },
  ],
  trendChart: {
    title: 'Trend Analysis (Last 7 Days)',
    series: [
      { name: 'Mon', thisWeek: 78, lastWeek: 12 },
      { name: 'Tue', thisWeek: 62, lastWeek: 28 },
      { name: 'Wed', thisWeek: 74, lastWeek: 70 },
      { name: 'Thu', thisWeek: 91, lastWeek: 83 },
      { name: 'Fri', thisWeek: 65, lastWeek: 98 },
      { name: 'Sat', thisWeek: 68, lastWeek: 130 },
      { name: 'Sun', thisWeek: 86, lastWeek: 140 },
    ],
    colors: {
      thisWeek: '#3b82f6',
      lastWeek: '#94a3b8',
    },
  },
  breakdownChart: {
    title: 'Breakdown by Project',
    slices: [
      { name: 'Customer Support', value: 80, color: '#3b82f6' },
      { name: 'Product Review', value: 70, color: '#10b981' },
      { name: 'Content Moderation', value: 65, color: '#f59e0b' },
      { name: 'Email Intent', value: 55, color: '#8b5cf6' },
      { name: 'Document Cat.', value: 50, color: '#ec4899' },
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
        avgPerDay: 35,
        trendPercent: '+12%',
        trendDirection: 'up',
        status: 'Active',
      },
      {
        project: 'Product Review Sentiment',
        user: 'Mike Johnson',
        completed: 189,
        avgPerDay: 27,
        trendPercent: '+8%',
        trendDirection: 'up',
        status: 'Active',
      },
      {
        project: 'Content Moderation',
        user: 'Emily Davis',
        completed: 156,
        avgPerDay: 22,
        trendPercent: '-5%',
        trendDirection: 'down',
        status: 'Active',
      },
      {
        project: 'Email Intent Classification',
        user: 'David Kim',
        completed: 134,
        avgPerDay: 19,
        trendPercent: '+15%',
        trendDirection: 'up',
        status: 'Active',
      },
      {
        project: 'Document Categorization',
        user: 'Lisa Wang',
        completed: 98,
        avgPerDay: 14,
        trendPercent: '+3%',
        trendDirection: 'up',
        status: 'Inactive',
      },
    ],
  },
};
