import type { ReactNode } from 'react';
import { Box, Card, CardContent, CardMedia, Chip, Divider, Link, Tooltip, Typography } from '@mui/material';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import LayersIcon from '@mui/icons-material/Layers';
import PersonIcon from '@mui/icons-material/Person';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InboxIcon from '@mui/icons-material/Inbox';
import type { IDataCollectionProject, IDatasetDocument } from '../../interfaces/api/dataCollection.interface';
import { QUALITY_DOT, fmt, fmtSize } from '../../utils/dataCollectionDisplayHelpers';

/**
 * Shared presentational pieces for viewing a data-collection project's uploads.
 * Used by DataCollectionTracking (view-only) and DataCollectionReview (reviewer approve/reject).
 */

// ── Ledger stat (horizontal row inside black header) ──────────────────────

/**
 * Component: LedgerStat
 *
 * Purpose: Renders one labeled stat (icon + uppercase label + value) inside
 * the project header's horizontal "ledger" row (e.g. Target, Duration).
 *
 * Props:
 * - icon (ReactNode): small icon shown above/beside the label.
 * - label (string): uppercase stat name.
 * - value (string): the stat's display value.
 * - divider (boolean, default true): whether to render a right-hand divider,
 *   used to omit the divider after the last stat in the row.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const LedgerStat = ({
    icon,
    label,
    value,
    divider = true,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    divider?: boolean;
}) => (
    <Box
        sx={{
            pr: { xs: 2, sm: 3 },
            mr: { xs: 2, sm: 3 },
            borderRight: divider ? '1px solid rgba(255,255,255,0.1)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.4,
            minWidth: 0,
        }}
    >
        <Box display="flex" alignItems="center" gap={0.5}>
            <Box sx={{ color: 'rgba(255,255,255,0.65)', display: 'flex' }}>{icon}</Box>
            <Typography
                sx={{
                    fontSize: '0.57rem',
                    color: 'rgba(255,255,255,0.65)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </Typography>
        </Box>
        <Typography
            sx={{
                fontSize: '0.82rem',
                color: '#fff',
                fontWeight: 600,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}
        >
            {value}
        </Typography>
    </Box>
);

// ── Project header ─────────────────────────────────────────────────────────

/**
 * Component: ProjectHeader
 *
 * Purpose: Renders the black "masthead" header for a data-collection project —
 * name, description, active/inactive status, a ledger of key stats (target,
 * duration, phases/slots, uploads, creator), instructions, and a strip of
 * phase/slot chips.
 *
 * Responsibilities:
 * - Derive summary numbers (phase count, total slot count) from `project.phases`.
 * - Determine active/inactive status by checking either `project.status`
 *   ('active') or the legacy `project.isactive` (1) flag, since callers may
 *   supply either representation.
 * - Fall back between snake_case and camelCase date fields
 *   (`start_date`/`startDate`, `end_date`/`endDate`) for API/legacy compatibility.
 * - Conditionally render description, instruction, and creator sections only
 *   when present, and the phase/slot chip strip only when slots exist.
 *
 * Props:
 * - project (IDataCollectionProject): the project to summarize.
 * - uploadCount (number): total uploads submitted so far, shown as a ledger stat.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const ProjectHeader = ({ project, uploadCount }: { project: IDataCollectionProject; uploadCount: number }) => {
    const phaseCount = Object.keys(project.phases ?? {}).length;
    const totalSlots = Object.values(project.phases ?? {}).reduce((sum, slots) => sum + slots.length, 0);
    // Status can arrive as either a string enum or a legacy numeric flag —
    // treat either as authoritative so both API shapes render correctly.
    const isActive = project.status === 'active' || project.isactive === 1;
    // Prefer snake_case (current API) but fall back to camelCase (legacy) field names.
    const startDate = project.start_date ?? project.startDate;
    const endDate = project.end_date ?? project.endDate;

    return (
        <Box
            sx={{
                bgcolor: '#000',
                borderRadius: '14px',
                overflow: 'hidden',
                mb: 3,
                position: 'relative',
            }}
        >
            {/* Subtle dot-grid texture */}
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                    pointerEvents: 'none',
                }}
            />

            <Box sx={{ p: { xs: 2.5, sm: 3.5 }, position: 'relative', zIndex: 1 }}>
                {/* Eyebrow: type label + status pill */}
                <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <Typography
                        sx={{
                            fontSize: '0.58rem',
                            color: 'rgba(255,255,255,0.6)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.14em',
                            lineHeight: 1,
                        }}
                    >
                        Data Collection
                    </Typography>
                    <Box sx={{ width: 1, height: 10, bgcolor: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.6,
                            px: 1,
                            py: 0.3,
                            borderRadius: '20px',
                            bgcolor: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        }}
                    >
                        <Box
                            sx={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                bgcolor: isActive ? '#10B981' : 'rgba(255,255,255,0.25)',
                                flexShrink: 0,
                            }}
                        />
                        <Typography
                            sx={{
                                fontSize: '0.58rem',
                                fontWeight: 700,
                                color: isActive ? '#6ee7b7' : 'rgba(255,255,255,0.7)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.09em',
                                lineHeight: 1,
                            }}
                        >
                            {isActive ? 'Active' : 'Inactive'}
                        </Typography>
                    </Box>
                </Box>

                {/* Project name — masthead */}
                <Typography
                    sx={{
                        color: '#fff',
                        fontSize: { xs: '1.6rem', sm: '2.2rem' },
                        fontWeight: 800,
                        lineHeight: 1.05,
                        letterSpacing: '-0.025em',
                        mb: project.description ? 1.25 : 2.5,
                    }}
                >
                    {project.name}
                </Typography>

                {/* Description */}
                {project.description && (
                    <Typography
                        sx={{
                            color: 'rgba(255,255,255,0.78)',
                            fontSize: '0.85rem',
                            lineHeight: 1.65,
                            mb: 2.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {project.description}
                    </Typography>
                )}

                {/* Horizontal ledger row */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0, rowGap: 1.5, mb: project.instruction ? 2.5 : 0 }}>
                    <LedgerStat
                        icon={<TrackChangesIcon sx={{ fontSize: 11 }} />}
                        label="Target"
                        value={`${project.target} uploads`}
                    />
                    <LedgerStat
                        icon={<CalendarTodayIcon sx={{ fontSize: 11 }} />}
                        label="Duration"
                        value={`${fmt(startDate)} – ${fmt(endDate)}`}
                    />
                    <LedgerStat
                        icon={<LayersIcon sx={{ fontSize: 11 }} />}
                        label="Phases / Slots"
                        value={`${phaseCount} phase${phaseCount !== 1 ? 's' : ''} · ${totalSlots} slot${totalSlots !== 1 ? 's' : ''}`}
                    />
                    <LedgerStat
                        icon={<InboxIcon sx={{ fontSize: 11 }} />}
                        label="Uploads"
                        value={`${uploadCount}`}
                        divider={!project.created_by}
                    />
                    {project.created_by && (
                        <LedgerStat
                            icon={<PersonIcon sx={{ fontSize: 11 }} />}
                            label="Created by"
                            value={project.created_by}
                            divider={false}
                        />
                    )}
                </Box>

                {/* Instruction */}
                {project.instruction && (
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: '8px',
                            bgcolor: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            display: 'flex',
                            gap: 1,
                            alignItems: 'flex-start',
                        }}
                    >
                        <InfoOutlinedIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', mt: 0.25, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.88)', lineHeight: 1.7 }}>
                            {project.instruction}
                        </Typography>
                    </Box>
                )}
            </Box>

            {/* Phase slots strip */}
            {totalSlots > 0 && (
                <Box
                    sx={{
                        px: { xs: 2.5, sm: 3.5 },
                        py: 1.25,
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        bgcolor: 'rgba(255,255,255,0.02)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.75,
                        alignItems: 'center',
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: '0.56rem',
                            color: 'rgba(255,255,255,0.6)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            mr: 0.5,
                            lineHeight: 1,
                        }}
                    >
                        Slots
                    </Typography>
                    {Object.entries(project.phases ?? {}).flatMap(([, slots]) =>
                        slots.map((slot) => (
                            <Chip
                                key={slot.id}
                                label={`${slot.name || slot.id} · ${slot.data_type}${slot.file_format ? ` / ${slot.file_format}` : ''}`}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    fontWeight: 500,
                                    bgcolor: 'rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.88)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '4px',
                                }}
                            />
                        )),
                    )}
                </Box>
            )}
        </Box>
    );
};

// ── Media placeholder ──────────────────────────────────────────────────────

/**
 * Component: MediaPlaceholder
 *
 * Purpose: Renders a neutral placeholder thumbnail for an upload card when
 * there is no image preview to display (e.g. Video/Audio/other file types).
 *
 * Responsibilities:
 * - Pick an icon representative of the document's data type.
 *
 * Props:
 * - dataType (string): the document's data type ('Video' | 'Audio' | other,
 *   where any other value falls back to a generic file icon).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const MediaPlaceholder = ({ dataType }: { dataType: string }) => {
    const Icon =
        dataType === 'Video' ? VideoFileIcon : dataType === 'Audio' ? AudioFileIcon : InsertDriveFileOutlinedIcon;
    return (
        <Box
            sx={{
                height: 152,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#F7F7F7',
                borderBottom: '1px solid #EFEFEF',
            }}
        >
            <Icon sx={{ fontSize: 38, color: '#D0D0D0' }} />
        </Box>
    );
};

// ── Upload card ────────────────────────────────────────────────────────────

/**
 * Component: UploadCard
 *
 * Purpose: Renders a single dataset document (image/video/audio/file upload)
 * as a card: thumbnail (or placeholder), filename with an "open file" link,
 * an optional quality indicator/reason, and a metadata ledger (uploader,
 * phase, format, dimensions, size, submitted date).
 *
 * Responsibilities:
 * - Show an image preview via `CardMedia` when the doc is an Image with a
 *   `file_url`, otherwise fall back to `MediaPlaceholder`.
 * - Build the metadata row list, omitting any row whose value is empty
 *   (e.g. no Dimensions row when width/height aren't both present).
 * - Render caller-supplied `actions` (e.g. approve/reject buttons) below a
 *   divider when provided, so this component stays agnostic of reviewer vs.
 *   view-only usage.
 *
 * Props:
 * - doc (IDatasetDocument): the uploaded document to display.
 * - actions (ReactNode, optional): action controls rendered at the bottom of
 *   the card (e.g. review actions in DataCollectionReview).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export const UploadCard = ({ doc, actions }: { doc: IDatasetDocument; actions?: ReactNode }) => {
    const isImage = doc.data_type === 'Image';
    const sizeLabel = fmtSize(doc.file_size);
    const attrs = doc.attributes as { width?: number; height?: number } | undefined;

    // Build the metadata ledger, dropping rows with no meaningful value so the
    // card doesn't show empty "Dimensions: " / "Size: " lines for non-media docs.
    const rows = [
        ['Uploader', doc.uploaded_by ?? ''],
        ['Phase', doc.phase_key ?? ''],
        ['Format', [doc.data_type, doc.file_format].filter(Boolean).join(' / ')],
        attrs?.width && attrs?.height ? ['Dimensions', `${attrs.width} × ${attrs.height}`] : null,
        sizeLabel ? ['Size', sizeLabel] : null,
        ['Submitted', fmt(doc.created_at)],
    ].filter((r): r is [string, string] => r !== null && r[1] !== '');

    return (
        <Card
            variant="outlined"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #EBEBEB',
                borderRadius: '12px',
                boxShadow: 'none',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                '&:hover': {
                    borderColor: '#000',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.07)',
                },
            }}
        >
            {isImage && doc.file_url ? (
                <CardMedia
                    component="img"
                    height={152}
                    image={doc.file_url}
                    alt={doc.filename}
                    sx={{ objectFit: 'cover', bgcolor: '#F7F7F7', borderBottom: '1px solid #EFEFEF' }}
                />
            ) : (
                <MediaPlaceholder dataType={doc.data_type ?? ''} />
            )}

            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1.75, '&:last-child': { pb: 1.75 } }}>
                {/* Filename + open link */}
                <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={0.5} mb={1}>
                    <Typography
                        sx={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#000',
                            lineHeight: 1.4,
                            flex: 1,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}
                    >
                        {doc.filename}
                    </Typography>
                    {doc.file_url && (
                        <Tooltip title="Open file">
                            <Link
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                    flexShrink: 0,
                                    color: '#000',
                                    opacity: 0.3,
                                    mt: 0.1,
                                    transition: 'opacity 0.15s',
                                    '&:hover': { opacity: 1 },
                                }}
                            >
                                <OpenInNewIcon sx={{ fontSize: 13 }} />
                            </Link>
                        </Tooltip>
                    )}
                </Box>

                {/* Quality indicator */}
                {doc.quality && (
                    <Box display="flex" alignItems="center" gap={0.75} mb={1}>
                        <Box
                            sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: QUALITY_DOT[doc.quality] ?? '#9E9E9E',
                                flexShrink: 0,
                            }}
                        />
                        <Typography
                            sx={{
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                color: '#555',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                            }}
                        >
                            {doc.quality}
                        </Typography>
                    </Box>
                )}

                {doc.reason && (
                    <Typography sx={{ fontSize: '0.68rem', color: '#EF4444', display: 'block', mb: 0.75, lineHeight: 1.45 }}>
                        {doc.reason}
                    </Typography>
                )}

                <Divider sx={{ my: 1, borderColor: '#F0F0F0' }} />

                {/* Metadata ledger */}
                <Box display="flex" flexDirection="column" gap={0.5}>
                    {rows.map(([label, value]) => (
                        <Box key={label} display="flex" justifyContent="space-between" alignItems="baseline" gap={1}>
                            <Typography
                                sx={{
                                    fontSize: '0.6rem',
                                    color: '#BDBDBD',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    flexShrink: 0,
                                    lineHeight: 1.4,
                                }}
                            >
                                {label}
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    color: '#111',
                                    textAlign: 'right',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 150,
                                    lineHeight: 1.4,
                                }}
                            >
                                {value}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                {actions && (
                    <>
                        <Divider sx={{ mt: 1.5, mb: 1.25, borderColor: '#F0F0F0' }} />
                        <Box mt="auto">{actions}</Box>
                    </>
                )}
            </CardContent>
        </Card>
    );
};
