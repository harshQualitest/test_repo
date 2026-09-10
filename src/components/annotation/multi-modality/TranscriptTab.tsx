import { useState } from 'react';
import { Box, Typography, Button, TextField, Chip, alpha } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import SyncIcon from '@mui/icons-material/Sync';
import LinkIcon from '@mui/icons-material/Link';

const INITIAL_TRANSCRIPT =
    "Welcome to our product demonstration. In this video, we'll explore the key features of our enterprise platform, including real-time collaboration, advanced analytics, and seamless integration capabilities...";

/**
 * Component: TranscriptTab
 *
 * Purpose: Renders the standalone "Transcript" main tab (as opposed to the read-only
 * transcript panel inside ConsolidatedView) where an annotator can freely edit the
 * auto-generated transcript text and mark it verified.
 *
 * Responsibilities:
 * - Displays an editable multiline text area seeded with the auto-generated transcript.
 * - Tracks a "verified" flag that resets automatically whenever the text is edited, so a
 *   stale verification can never mask an unreviewed change.
 * - Shows a live character count and an "alignment" chip (static mock value here).
 *
 * Props: none.
 *
 * State:
 * - transcriptText: current (editable) transcript content.
 * - transcriptVerified: whether the annotator has confirmed the current transcript text.
 *
 * Important business logic: editing `transcriptText` always clears `transcriptVerified` in
 * the same `onChange` handler, enforcing "verified" only ever describes the text as last saved.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const TranscriptTab = () => {
    const [transcriptText, setTranscriptText] = useState(INITIAL_TRANSCRIPT);
    const [transcriptVerified, setTranscriptVerified] = useState(false);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" fontWeight={600}>
                        Audio Transcript
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                            icon={<LinkIcon sx={{ fontSize: '13px !important' }} />}
                            label="Linked to Audio"
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                        <Chip
                            label="Alignment: 89%"
                            size="small"
                            variant="outlined"
                            sx={{
                                fontSize: '0.7rem',
                                height: 22,
                                bgcolor: alpha('#3b82f6', 0.08),
                                // borderColor: alpha('#3b82f6', 0.3),
                                color: '#000',
                            }}
                        />
                    </Box>
                </Box>

                <TextField
                    multiline
                    fullWidth
                    minRows={10}
                    value={transcriptText}
                    // Why: any edit invalidates a prior verification of the transcript text.
                    onChange={(e) => { setTranscriptText(e.target.value); setTranscriptVerified(false); }}
                    placeholder="Edit or verify the auto-generated transcript..."
                    sx={{
                        '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.85rem', alignItems: 'flex-start' },
                        '& .MuiInputBase-input': { resize: 'none' },
                    }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                        {transcriptText.length} characters
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CheckIcon />}
                            onClick={() => setTranscriptVerified(true)}
                            sx={{
                                fontSize: '0.75rem',
                                ...(transcriptVerified && {
                                    color: '#16a34a',
                                    borderColor: '#16a34a',
                                    bgcolor: alpha('#22c55e', 0.06),
                                }),
                            }}
                        >
                            {transcriptVerified ? 'Verified' : 'Verify Transcript'}
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<SyncIcon />}
                            sx={{ fontSize: '0.75rem' }}
                        >
                            Sync with Audio
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default TranscriptTab;
