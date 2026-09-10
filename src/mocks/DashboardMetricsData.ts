import HubIcon from '@mui/icons-material/Hub';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

/**
 * Mock/fixture data backing the top-level dashboard's summary metric cards
 * (workspaces, projects, tasks, quality score) before/while the real
 * dashboard-metrics API is wired in. Each item shape: `title` (card label),
 * `value` (headline stat), `subtitle` (supporting detail text), `Icon` (MUI
 * icon component to render), `iconSx` (icon color override), and an
 * optional `hoverable` flag toggling hover interaction styling.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const getDashboardMetrics = () => [
  {
    title: 'Total Workspaces',
    value: '4',
    subtitle: '4 total available',
    Icon: HubIcon,
    iconSx: { color: '#3B82F6' },
  },
  {
    title: 'Total Projects',
    value: '0',
    subtitle: '0',
    Icon: FolderOpenIcon,
    iconSx: { color: '#A855F7' },
    hoverable: true,
  },
  {
    title: 'Total Tasks',
    value: '0',
    subtitle: '0 completed',
    Icon: TaskAltIcon,
    iconSx: { color: '#F59E0B' },
    hoverable: true,
  },
  {
    title: 'Quality Score',
    value: '0%',
    subtitle: 'Across 0 projects',
    Icon: TrendingUpIcon,
    iconSx: { color: '#22C55E' },
    hoverable: true,
  },
];
