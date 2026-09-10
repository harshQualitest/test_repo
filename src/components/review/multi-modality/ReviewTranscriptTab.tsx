import { Box, Typography, Card } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckIcon from '@mui/icons-material/Check';
import LinkIcon from '@mui/icons-material/Link';

// Static demo transcript text — placeholder content, not fetched for the reviewed task.
const TRANSCRIPT_AUTO = `Welcome to our product demonstration...`;
const TRANSCRIPT_HUMAN = `Welcome to our product demonstration. In this video, we'll explore the key features of our enterprise platform, including real-time collaboration, advanced analytics, and seamless integration capabilities...`;

const MONO: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

/**
 * Component: ReviewTranscriptTab
 *
 * Purpose: Sub-tab of `MultiModalityReview` that shows the auto-generated transcript
 * next to the human-edited transcript, plus an alignment-score banner.
 *
 * Responsibilities:
 * - Render the two transcript variants side by side in monospaced text.
 * - Show a static alignment-score summary banner beneath them.
 *
 * Props: none.
 * State: none.
 *
 * Note: renders the static `TRANSCRIPT_AUTO`/`TRANSCRIPT_HUMAN`/89% alignment-score demo
 * data rather than task-specific data fetched from the API.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ReviewTranscriptTab = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>

            {/* Auto-Generated */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningAmberIcon sx={{ fontSize: 16, color: '#ca8a04' }} />
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>Auto-Generated Transcript</Typography>
                </Box>
                <Card
                    variant="outlined"
                    sx={{
                        borderColor: '#fde68a',
                        bgcolor: 'color-mix(in oklab, #fefce8 30%, transparent)',
                        borderRadius: 'calc(0.625rem + 4px)',
                    }}
                >
                    <Box sx={{ p: 1.5 }}>
                        <Typography component="div" sx={{ fontSize: '0.875rem', ...MONO, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {TRANSCRIPT_AUTO}
                        </Typography>
                    </Box>
                </Card>
            </Box>

            {/* Human-Edited */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ fontSize: 16, color: '#16a34a' }} />
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>Human-Edited Transcript</Typography>
                </Box>
                <Card
                    variant="outlined"
                    sx={{
                        borderColor: '#bbf7d0',
                        bgcolor: 'color-mix(in oklab, #f0fdf4 30%, transparent)',
                        borderRadius: 'calc(0.625rem + 4px)',
                    }}
                >
                    <Box sx={{ p: 1.5 }}>
                        <Typography component="div" sx={{ fontSize: '0.875rem', ...MONO, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {TRANSCRIPT_HUMAN}
                        </Typography>
                    </Box>
                </Card>
            </Box>
        </Box>

        {/* Alignment score banner */}
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                bgcolor: '#eff6ff',
                borderRadius: 1.5,
                border: '1px solid #bfdbfe',
            }}
        >
            <LinkIcon sx={{ fontSize: 16, color: '#2563eb', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.875rem', color: '#1e3a8a' }}>
                Alignment Score: <strong>89%</strong> - Audio and transcript are well-synchronized
            </Typography>
        </Box>
    </Box>
);

export default ReviewTranscriptTab;
