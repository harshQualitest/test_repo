import {
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { ReviewerOutcomeData } from './types';

import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

/**
 * Props for {@link ReviewerOutcomeCard}.
 * @property data - Reviewer outcome details for the task's current revision (status, reviewer, failure reason, timestamps, source).
 */
interface ReviewerOutcomeCardProps {
  data: ReviewerOutcomeData;
}

/**
 * Maps a revision/review status to its corresponding status icon.
 *
 * Why: gives a quick visual cue (green check / red cancel / blue clock) matching
 * the semantic status without the caller needing to know the icon-to-status mapping.
 *
 * @param status - Review status string (expected: 'PASSED' | 'FAILED' | 'IN_PROGRESS', otherwise falls through to default).
 * @returns A colored MUI icon element for known statuses, or `null` if the status is unrecognized.
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
      return null;
  }
};

/**
 * Component: ReviewerOutcomeCard
 *
 * Purpose: Displays the outcome of the current review pass for a task — status,
 * assigned reviewer, the last failure reason (if any), and when the review started.
 *
 * Responsibilities:
 * - Render the review status alongside a status icon and a `Chip`.
 * - Render the assigned reviewer's name.
 * - Conditionally render a highlighted failure-reason panel when `data.lastFailureReason` is present.
 * - Render review-start timestamp and data source footer.
 *
 * Props:
 * - data: ReviewerOutcomeData - `{ status, reviewer, lastFailureReason?, reviewStarted, source }`.
 *
 * Major child components rendered: MUI `Paper`, `Box`, `Typography`, `Chip`, and icons from `@mui/icons-material`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const ReviewerOutcomeCard = ({ data }: ReviewerOutcomeCardProps) => {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleIcon sx={{ width: 20, height: 20 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Reviewer Outcome (Current Revision)
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Latest revision status in REVIEW stage
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Review Status
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            {getStatusIcon(data.status)}
            <Chip label={data.status} size="small" sx={{ bgcolor: 'transparent', borderColor: 'divider' }} />
          </Box>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">
            Reviewer
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, mt: 0.5 }}>
            <PersonIcon sx={{ width: 14, height: 14, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {data.reviewer}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Only show the failure panel when a failure reason exists, so passed/in-progress reviews don't display an empty error box */}
      {data.lastFailureReason && (
        <Paper variant="outlined" sx={{ p: 1, bgcolor: '#fff1f2', borderColor: '#fecaca', mb: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <CancelIcon sx={{ width: 16, height: 16, color: '#dc2626' }} />
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#7f1d1d' }}>
                Last Failure Reason
              </Typography>
              <Typography variant="body2" sx={{ color: '#991b1b' }}>
                {data.lastFailureReason}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1, mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: 12 }}>
          <AccessTimeIcon sx={{ width: 12, height: 12 }} />
          <span>Review started: {data.reviewStarted}</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: 12, mt: 0.5 }}>
          <WarningIcon sx={{ width: 12, height: 12 }} />
          <span>Source: {data.source}</span>
        </Box>
      </Box>
    </Paper>
  );
};
