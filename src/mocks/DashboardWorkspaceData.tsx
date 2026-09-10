import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import { workspaceColors } from '../constants/workspace-colors';

/**
 * Mock/fixture data backing the dashboard's workspace summary cards (name,
 * headline stat, trend, description, project/member counts, and an
 * expandable `collapsible` section with team/asset details). Used to
 * populate the dashboard workspace list before/while the real workspaces
 * API is wired in. `gradient` is theme-aware via the `isDark` param (though
 * both branches currently resolve to the same white value); `color` pulls
 * from the shared `workspaceColors` palette by index; `ganttStart`/
 * `ganttSpan` are optional fields driving a timeline/gantt visualization.
 *
 * @param isDark - Whether the dashboard is rendering in dark mode; used to
 *   pick the `gradient` value for each workspace card.
 * @returns An array of mock workspace summary objects for dashboard display.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const getDashboardWorkspaces = (isDark: boolean) => [
  {
    title: 'BigTechClient1',
    value: '28',
    change: '+12% YoY',
    icon: <DeviceHubIcon />,
    gradient: isDark ? '#fff' : '#fff',
    desc: 'Big tech client workspace for content moderation and data annotation',
    projects: '1 projects',
    members: '12 members',
    badgeLabel: 'Private',
    color: workspaceColors[0],
    ganttStart: 1,
    ganttSpan: 4,
    collapsible: {
      typeLabel: 'Workspace Type',
      typeChip: 'Enterprise Client',
      projectName: 'Default Project',
      projectChip: 'Annotation',
      statusLabel: 'On Track',
      teams: '1 teams',
      assets: '10 assets',
      teamChips: ['Team A'],
    },
  },
  {
    title: 'EnterpriseNews',
    value: '68',
    change: '+5 pts',
    icon: <DeviceHubIcon />,
    gradient: isDark ? '#fff' : '#fff',
    desc: 'News and media annotation workspace',
    projects: '3 projects',
    members: '34 members',
    badgeLabel: 'Private',
    color: workspaceColors[1],
    ganttStart: 3,
    ganttSpan: 6,
    collapsible: {
      typeLabel: 'Workspace Type',
      typeChip: 'News Client',
      projectName: 'Default Project',
      projectChip: 'Annotation',
      statusLabel: 'On Track',
      teams: '3 teams',
      assets: '24 assets',
      teamChips: ['Editorial', 'QA'],
    },
  },
  {
    title: 'OpenResearch',
    value: '12',
    change: '+1% MoM',
    icon: <DeviceHubIcon />,
    gradient: isDark ? '#fff' : '#fff',
    desc: 'Public research workspace for community datasets',
    projects: '2 projects',
    members: '8 members',
    badgeLabel: 'Public',
    color: workspaceColors[2],
    collapsible: {
      typeLabel: 'Workspace Type',
      typeChip: 'Community',
      projectName: 'Research Project',
      projectChip: 'Annotation',
      statusLabel: 'At Risk',
      teams: '2 teams',
      assets: '40 assets',
      teamChips: ['Research', 'Volunteers'],
    },
  },
  {
    title: 'SharedAssets',
    value: '5',
    change: '+0%',
    icon: <DeviceHubIcon />,
    gradient: isDark ? '#fff' : '#fff',
    desc: 'Shareable workspace for cross-team assets',
    projects: '1 projects',
    members: '4 members',
    badgeLabel: 'Shareable',
    color: workspaceColors[3],
    collapsible: {
      typeLabel: 'Workspace Type',
      typeChip: 'Shared',
      projectName: 'Assets Hub',
      projectChip: 'Storage',
      statusLabel: 'On Track',
      teams: '1 teams',
      assets: '12 assets',
      teamChips: ['Assets Team'],
    },
  },
];
