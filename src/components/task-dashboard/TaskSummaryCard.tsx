import {
  Description as DescriptionIcon,
  Warning as WarningIcon,
  Storage as StorageIcon,
  Note as NoteIcon,
  SchemaOutlined as SchemaIcon,
  MenuBook as MenuBookIcon,
  CalendarToday as CalendarIcon,
  AccessTime as AccessTimeIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import type { TaskSummaryData } from './types';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

/**
 * A single labeled field rendered in the summary grid.
 * @property label - Field label (e.g. "Task ID").
 * @property value - Display value for the field.
 * @property icon - MUI icon component shown next to the label.
 * @property isBadge - When true, render `value` as a `Chip` instead of plain text (used for state/stage fields).
 * @property mono - When true, render `value` in a monospace font (used for ids/versions/timestamps).
 */
interface SummaryItem {
  label: string;
  value: string;
  icon: React.ComponentType<any>;
  isBadge?: boolean;
  mono?: boolean;
}

/**
 * Props for {@link TaskSummaryCard}.
 * @property data - Core task summary fields sourced from the tasks table and guideline reference.
 */
interface TaskSummaryCardProps {
  data: TaskSummaryData;
}

/**
 * Component: TaskSummaryCard
 *
 * Purpose: Displays core task metadata (id, state, dataset, type, schema/guideline
 * versions, timestamps, current stage) as a labeled summary grid.
 *
 * Responsibilities:
 * - Build a `summaryItems` list mapping each `TaskSummaryData` field to a label/icon/formatting.
 * - Render each item as an icon + label + value, using a `Chip` for badge fields (state, current stage)
 *   and monospace text for id/version/timestamp fields.
 *
 * Props:
 * - data: TaskSummaryData - `{ taskId, state, dataset, type, schemaVersion, guidelineVersion, createdAt, startedAt, currentStage }`.
 *
 * Major child components rendered: MUI `Paper`, `Box`, `Typography`, `Chip`.
 *
 * Important business logic:
 * - Presentation-only formatting rules: `isBadge` fields (State, Current Stage) render as `Chip`;
 *   `mono` fields (Schema/Guideline Version, Created/Started At) render in a monospace font for readability of ids/timestamps.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const TaskSummaryCard = ({ data }: TaskSummaryCardProps) => {
  // Declarative list driving the summary grid below; each entry pairs a data field with its label, icon, and display formatting
  const summaryItems: SummaryItem[] = [
    { label: 'Task ID', value: data.taskId, icon: DescriptionIcon },
    { label: 'State', value: data.state, icon: WarningIcon, isBadge: true },
    { label: 'Dataset', value: data.dataset, icon: StorageIcon },
    { label: 'Type', value: data.type, icon: NoteIcon },
    { label: 'Schema Version', value: data.schemaVersion, icon: SchemaIcon, mono: true },
    { label: 'Guideline Version', value: data.guidelineVersion, icon: MenuBookIcon, mono: true },
    { label: 'Created At', value: data.createdAt, icon: CalendarIcon, mono: true },
    { label: 'Started At', value: data.startedAt, icon: AccessTimeIcon, mono: true },
    { label: 'Current Stage', value: data.currentStage, icon: ScheduleIcon, isBadge: true },
  ];

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box sx={{ px: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon sx={{ width: 20, height: 20 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Task Summary
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
          Core task information from tasks table and guideline reference
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 2, mt: 1 }}>
          {summaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <Box key={item.label}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: 13 }}>
                  <Icon sx={{ width: 14, height: 14 }} />
                  <Typography variant="caption">{item.label}</Typography>
                </Box>
                {item.isBadge ? (
                  <Chip label={item.value} size="small" sx={{ mt: 0.5 }} />
                ) : (
                  <Typography variant="body2" sx={{ mt: 0.5, fontFamily: item.mono ? 'Monospace' : 'inherit', fontWeight: 600 }}>
                    {item.value}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
};
