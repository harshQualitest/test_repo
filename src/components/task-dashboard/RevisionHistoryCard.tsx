import {
  History as HistoryIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import type { RevisionEntry } from './types';

import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

/**
 * Props for {@link RevisionHistoryCard}.
 * @property revisions - Ordered list of revision/pass entries to render as a timeline.
 */
interface RevisionHistoryCardProps {
  revisions: RevisionEntry[];
}

/**
 * Maps a revision status to the `Chip` color palette (background/text/border) used
 * to badge that revision's status.
 *
 * Why: gives passed/failed/in-progress revisions a consistent, at-a-glance color
 * treatment (green/red/blue) instead of a caller having to hardcode colors per status.
 *
 * @param status - Revision status string (expected: 'PASSED' | 'FAILED' | 'IN_PROGRESS').
 * @returns An `sx`-compatible color object; falls back to a neutral/transparent palette for unknown statuses.
 */
const getStatusColor = (status: string) => {
  switch (status) {
    case 'PASSED':
      return { bgcolor: '#ecfdf5', color: '#166534', borderColor: '#bbf7d0' };
    case 'FAILED':
      return { bgcolor: '#fff1f2', color: '#7f1d1d', borderColor: '#fecaca' };
    case 'IN_PROGRESS':
      return { bgcolor: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' };
    default:
      return { bgcolor: 'transparent', color: 'text.primary', borderColor: 'divider' };
  }
};

/**
 * Maps a revision status to the icon shown inside its status `Chip`.
 *
 * @param status - Revision status string (expected: 'PASSED' | 'FAILED' | 'IN_PROGRESS').
 * @returns A colored MUI icon element for known statuses, or `undefined` if unrecognized (chip renders without an icon).
 */
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'PASSED':
      return <CheckCircleIcon sx={{ width: 16, height: 16, color: '#16a34a' }} />;
    case 'FAILED':
      return <CancelIcon sx={{ width: 16, height: 16, color: '#dc2626' }} />;
    case 'IN_PROGRESS':
      return <AccessTimeIcon sx={{ width: 16, height: 16, color: '#2563eb' }} />;
    default:
      return undefined;
  }
};

/**
 * Maps a revision status to the solid color used for that revision's timeline dot.
 *
 * Why: keeps the vertical timeline scannable — a reviewer can spot failed passes
 * (red dots) among a long history without reading each entry's text.
 *
 * @param status - Revision status string (expected: 'PASSED' | 'FAILED' | 'IN_PROGRESS').
 * @returns A hex color string; defaults to neutral gray for unknown statuses.
 */
const getTimelineDotColor = (status: string) => {
  switch (status) {
    case 'PASSED':
      return '#16a34a';
    case 'FAILED':
      return '#dc2626';
    case 'IN_PROGRESS':
      return '#2563eb';
    default:
      return '#6b7280';
  }
};

/**
 * Component: RevisionHistoryCard
 *
 * Purpose: Renders a vertical timeline of every revision/pass a task has gone
 * through, showing stage, actor, duration, timestamps, status, and any failure codes.
 *
 * Responsibilities:
 * - Render one timeline entry per revision, connected by a vertical line except after the last entry.
 * - Color-code each entry's status dot and status chip via the status-mapping helpers above.
 * - Show start/end timestamps per revision, and failure codes when present.
 * - Show an empty-state message when there is no revision history.
 *
 * Props:
 * - revisions: RevisionEntry[] - ordered list of revision entries (empty array/undefined renders the empty state).
 *
 * Major child components rendered: MUI `Paper`, `Box`, `Typography`, `Chip`, and icons from `@mui/icons-material`.
 *
 * Important business logic:
 * - Timeline connector line is only rendered between entries (`index < revisions.length - 1`), not after the final entry.
 * - Status-based coloring (dot, chip, icon) is centralized in the three helper functions above so all three stay in sync.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const RevisionHistoryCard = ({ revisions }: RevisionHistoryCardProps) => {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon sx={{ width: 20, height: 20 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Revision History
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Timeline of all passes with stage, actor, timestamps, status, and failure codes
        </Typography>
      </Box>

      <Box sx={{ mt: 1 }}>
        {revisions && revisions.length > 0 ? (
          revisions.map((revision, index) => (
          <Box key={index} sx={{ position: 'relative', pl: 3, mb: index < revisions.length - 1 ? 2 : 0 }}>
            {/* Dot */}
            <Box sx={{ position: 'absolute', left: 0, top: 6 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid', borderColor: 'background.paper', bgcolor: getTimelineDotColor(revision.status) }} />
            </Box>

            {/* Vertical connecting line to next dot */}
            {index < revisions.length - 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 5,
                  top: 18,
                  width: 2,
                  bgcolor: 'divider',
                  height: 'calc(100% + 8px)',
                  borderRadius: 1,
                }}
              />
            )}

            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`Pass ${revision.passNumber}`} size="small" sx={{ fontFamily: 'Monospace' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{revision.stage}</Typography>
                    <Chip
                      icon={getStatusIcon(revision.status) ?? undefined}
                      label={revision.status}
                      size="small"
                      sx={{ ml: 1, ...getStatusColor(revision.status) }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5, color: 'text.secondary', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon sx={{ width: 14, height: 14 }} />
                      <Typography variant="body2">{revision.actor}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AccessTimeIcon sx={{ width: 14, height: 14 }} />
                      <Typography variant="body2">{revision.duration}</Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ textAlign: 'right', minWidth: 120 }}>
                  <Typography variant="caption" color="text.secondary">Start:</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'Monospace' }}>{revision.startTime}</Typography>
                  {revision.endTime && (
                    <>
                      <Typography variant="caption" color="text.secondary">End:</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'Monospace' }}>{revision.endTime}</Typography>
                    </>
                  )}
                </Box>
              </Box>

              {revision.failureCodes && revision.failureCodes.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
                  <WarningIcon sx={{ width: 14, height: 14, color: '#dc2626' }} />
                  <Typography variant="body2" color="text.secondary">Failure codes:</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {revision.failureCodes.map((code, idx) => (
                      <Chip key={idx} label={code.label} size="small" sx={{ bgcolor: '#fff1f2', color: '#9f1239' }} />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        ))
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No revision history available
          </Typography>
        )}
      </Box>

      <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'center', color: 'text.secondary', fontSize: 12 }}>
        <CodeIcon sx={{ width: 12, height: 12 }} />
        <Typography variant="caption">Source: Query revisions by task_id</Typography>
      </Box>
    </Paper>
  );
};
