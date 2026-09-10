import { useState } from 'react';
import { Box, Typography, Card, Chip, Button, TextField, alpha } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import LinkIcon from '@mui/icons-material/Link';

interface FrameItem { id: string; linkId: string; timestamp: string; caption: string; }

const FRAMES: FrameItem[] = [
    { id: 'f1', linkId: 'LINK-002', timestamp: '00:00:05', caption: 'Product overview screen' },
    { id: 'f2', linkId: 'LINK-003', timestamp: '00:00:15', caption: 'Feature highlight' },
    { id: 'f3', linkId: 'LINK-004', timestamp: '00:00:30', caption: 'Integration panel' },
];

/**
 * Component: FramesTab
 *
 * Purpose: Renders the "Frames" sub-tab of the multi-modality annotation screen, showing a
 * grid of extracted video frames that annotators caption and verify individually.
 *
 * Responsibilities:
 * - Displays each frame (currently static mock FRAMES data) with its linked timestamp/link id.
 * - Lets the annotator edit a free-text caption per frame.
 * - Tracks a per-frame "verified" status, automatically un-verifying a frame if its caption
 *   is edited after verification (so a stale verification can't hide an unreviewed edit).
 *
 * Props: none.
 *
 * State:
 * - frameCaptions: map of frame id -> caption text, seeded from each frame's initial caption.
 * - verifiedFrames: set of frame ids the annotator has marked as verified.
 *
 * Major child components: none (renders MUI primitives directly).
 *
 * Important business logic: editing a caption on an already-verified frame automatically
 * clears its verified status, ensuring "verified" always reflects the currently-saved caption.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const FramesTab = () => {
    const [frameCaptions, setFrameCaptions] = useState<Record<string, string>>(
        () => Object.fromEntries(FRAMES.map((f) => [f.id, f.caption])),
    );
    const [verifiedFrames, setVerifiedFrames] = useState<Set<string>>(new Set());

    /**
     * Toggles a frame's membership in the verified set.
     * @param id - Frame id to toggle verified status for.
     */
    const toggleFrameVerified = (id: string) => {
        setVerifiedFrames((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                {FRAMES.map((frame) => {
                    const isVerified = verifiedFrames.has(frame.id);
                    return (
                        <Card
                            key={frame.id}
                            variant="outlined"
                            sx={{ borderRadius: 2, ...(isVerified && { borderColor: alpha('#22c55e', 0.5) }) }}
                        >
                            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

                                <Box
                                    sx={{
                                        width: '100%',
                                        paddingTop: '56.25%',
                                        position: 'relative',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <ImageIcon sx={{ fontSize: 48, color: '#94a3b8' }} />
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Chip
                                        icon={<LinkIcon sx={{ fontSize: '12px !important' }} />}
                                        label={frame.linkId}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {frame.timestamp}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <Typography variant="caption" fontWeight={600}>
                                        Frame Caption
                                    </Typography>
                                    <TextField
                                        multiline
                                        minRows={3}
                                        fullWidth
                                        size="small"
                                        value={frameCaptions[frame.id]}
                                        onChange={(e) => {
                                            setFrameCaptions((prev) => ({ ...prev, [frame.id]: e.target.value }));
                                            // Why: a caption edit invalidates any prior verification of this frame.
                                            if (isVerified) toggleFrameVerified(frame.id);
                                        }}
                                        placeholder="Describe what's in this frame..."
                                        sx={{ '& .MuiInputBase-input': { fontSize: '0.75rem' } }}
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<CheckIcon />}
                                        onClick={() => toggleFrameVerified(frame.id)}
                                        sx={{
                                            flex: 1,
                                            fontSize: '0.75rem',
                                            ...(isVerified && {
                                                color: '#16a34a',
                                                borderColor: '#16a34a',
                                                bgcolor: alpha('#22c55e', 0.06),
                                            }),
                                        }}
                                    >
                                        {isVerified ? 'Verified' : 'Verify'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<EditIcon />}
                                        sx={{ flex: 1, fontSize: '0.75rem' }}
                                    >
                                        Edit Objects
                                    </Button>
                                </Box>
                            </Box>
                        </Card>
                    );
                })}
            </Box>
        </Box>
    );
};

export default FramesTab;
