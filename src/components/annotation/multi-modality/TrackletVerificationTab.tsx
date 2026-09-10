import { Box, Typography, Card, Chip, Button, IconButton, useTheme } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';

interface Tracklet {
    id: string;
    personId: string;
    frameCount: number;
}

const TRACKLETS: Tracklet[] = [
    { id: 'track-001', personId: 'spk12345', frameCount: 20 },
    { id: 'track-002', personId: 'spk12346', frameCount: 18 },
    { id: 'track-003', personId: 'spk12347', frameCount: 15 },
];

/**
 * Converts a sampled-frame index into a `m:ss.00` timestamp label for display under each
 * frame thumbnail, assuming frames are sampled at 1 frame per second (per the "frames
 * sampled at 1 FPS" caption) so frame index and elapsed seconds are numerically identical.
 * @param frameIndex - Index of the frame within its tracklet (== elapsed seconds at 1 FPS).
 * @returns `m:ss.00` formatted timestamp string.
 */
const frameTimestamp = (frameIndex: number): string => {
    const mins = Math.floor(frameIndex / 60);
    const secs = frameIndex % 60;
    return `${mins}:${String(secs).padStart(2, '0')}.00`;
};

interface Props {
    /** Set of tracklet ids currently marked as verified by the annotator. */
    verifiedTracklets: Set<string>;
    /** Called when a tracklet's Verify/Re-verify button is clicked. */
    onToggleVerified: (id: string) => void;
}

/**
 * Component: TrackletVerificationTab
 *
 * Purpose: Renders the "Tracklet Verification" annotation sub-tab, where an annotator
 * reviews a strip of sampled frames per tracklet (a contiguous run of frames tracking the
 * same detected person) and confirms the tracklet's person-ID assignment is correct.
 *
 * Responsibilities:
 * - Lists each tracklet (from static TRACKLETS mock data) with its id, associated person ID,
 *   and a grid of frame thumbnails timestamped via {@link frameTimestamp}.
 * - Shows a "Verified" badge and re-verify action once a tracklet has been confirmed, or a
 *   "Verify Tracklet" call-to-action otherwise.
 *
 * Props: see {@link Props} above (verifiedTracklets, onToggleVerified).
 *
 * Major child components: none (MUI Card/Box/Chip primitives only).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const TrackletVerificationTab = ({ verifiedTracklets, onToggleVerified }: Props) => {
    const theme = useTheme();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TRACKLETS.map((tracklet) => {
                const isVerified = verifiedTracklets.has(tracklet.id);
                return (
                    <Card
                        key={tracklet.id}
                        sx={{
                            borderRadius: 1.5,
                            p: 2,
                            border: isVerified
                                ? '2px solid #22c55e'
                                : `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Chip
                                    label={tracklet.id}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }}
                                />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                        Person ID:
                                    </Typography>
                                    <Typography variant="body2" fontWeight={500}>
                                        {tracklet.personId}
                                    </Typography>
                                    <IconButton size="small" sx={{ width: 24, height: 24 }}>
                                        <EditIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {isVerified ? (
                                    <>
                                        <Chip
                                            icon={<CheckIcon sx={{ fontSize: 12 }} />}
                                            label="Verified"
                                            size="small"
                                            sx={{
                                                bgcolor: '#16a34a',
                                                color: 'white',
                                                fontSize: '0.72rem',
                                                '& .MuiChip-icon': { color: 'white' },
                                            }}
                                        />
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => onToggleVerified(tracklet.id)}
                                            sx={{ fontSize: '0.72rem', height: 30, textTransform: 'none' }}
                                        >
                                            Re-verify
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        size="small"
                                        variant="contained"
                                        onClick={() => onToggleVerified(tracklet.id)}
                                        sx={{ fontSize: '0.72rem', height: 30, textTransform: 'none' }}
                                    >
                                        Verify Tracklet
                                    </Button>
                                )}
                            </Box>
                        </Box>

                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 0.5, mb: 1 }}>
                            {Array.from({ length: tracklet.frameCount }).map((_, fi) => (
                                <Box
                                    key={fi}
                                    sx={{
                                        position: 'relative',
                                        aspectRatio: '1 / 1',
                                        borderRadius: 0.75,
                                        overflow: 'hidden',
                                        background: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bgcolor: 'rgba(0,0,0,0.7)',
                                            textAlign: 'center',
                                            px: 0.25,
                                            py: '1px',
                                        }}
                                    >
                                        <Typography
                                            sx={{ fontSize: '0.45rem', fontFamily: 'monospace', color: 'white', lineHeight: 1.4 }}
                                        >
                                            {frameTimestamp(fi)}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Typography sx={{ fontSize: '0.5rem', color: '#475569' }}>{fi}</Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                            {tracklet.frameCount} frames sampled at 1 FPS
                        </Typography>
                    </Card>
                );
            })}
        </Box>
    );
};

export default TrackletVerificationTab;
