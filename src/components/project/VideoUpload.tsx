import { useState } from 'react';
import { Box, Button, IconButton, Typography, alpha, useTheme } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

interface VideoUploadProps {
    files: File[];
    onChange: (files: File[]) => void;
    error?: string;
    disabled?: boolean;
}

// MIME types accepted for video-labeling projects. Limited to widely
// supported, commonly produced video containers/codecs so downstream
// annotation tooling can reliably play them back.
const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/x-matroska',
];
// Per-file size ceiling: 2 GB. Keeps individual uploads within a size the
// browser/network layer can handle reliably and bounds storage/bandwidth
// cost per video asset.
const MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

/**
 * Formats a byte count as a human-readable size, switching from MB to GB
 * once the value reaches 1 GB so large video files don't display as an
 * unwieldy number of MB.
 * @param bytes the file size in bytes.
 * @returns a formatted size string, e.g. "512.00 MB" or "1.50 GB".
 */
const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024 * 1024
        ? `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
        : `${(bytes / 1024 / 1024).toFixed(2)} MB`;

/**
 * Component: VideoUpload
 *
 * Purpose: Drag-and-drop / click-to-browse multi-file picker for a
 * video-labeling project's source videos, with client-side type/size/
 * duplicate validation performed synchronously before files are accepted.
 *
 * Responsibilities:
 * - Accepts multiple video files at once via drag-and-drop or a hidden
 *   `multiple` file input, restricted to MP4/MOV/AVI/WebM/MKV via both the
 *   `accept` attribute and the `ALLOWED_VIDEO_TYPES` check (defense in depth,
 *   since `accept` is only a UI hint the OS file picker may not enforce).
 * - Rejects any file over 2 GB (`MAX_VIDEO_SIZE_BYTES`) and any file whose
 *   name+size exactly matches one already added, to avoid accidental
 *   duplicate uploads.
 * - Only valid files are appended to the parent's `files` list via
 *   `onChange`; invalid files are dropped but reported via inline error text.
 * - Lists already-added files with their size and a per-file remove button.
 *
 * Props:
 * - `files` (`File[]`): the currently accepted files, owned by the parent/form.
 * - `onChange` (`(files: File[]) => void`): called with the updated file list after an add or remove.
 * - `error` (`string?`): external validation error (e.g. from Formik), shown when there are no local validation errors.
 * - `disabled` (`boolean?`): disables the picker and remove buttons.
 *
 * State:
 * - `isDragging` (`boolean`): whether a drag is currently over the drop zone, drives border/background styling.
 * - `validationErrors` (`string[]`): per-file rejection reasons from the most recent add attempt; takes precedence over the parent `error`.
 *
 * Business rules enforced:
 * - Only MP4, MOV, AVI, WebM, MKV video types are accepted.
 * - Each file must be under 2 GB.
 * - A file already present (same name + size) cannot be added twice.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const VideoUpload = ({ files, onChange, error, disabled }: VideoUploadProps) => {
    const theme = useTheme();
    const [isDragging, setIsDragging] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const displayError = validationErrors.length > 0 ? validationErrors.join('; ') : error;

    /**
     * Validates a batch of newly picked/dropped files against the type,
     * size, and duplicate rules, partitioning them into files that can be
     * added and human-readable error messages for the rest.
     * @param incoming candidate files from a file input or drop event.
     * @returns `valid` files that passed all checks, and `errors` describing why any others were rejected.
     */
    const validateFiles = (incoming: File[]): { valid: File[]; errors: string[] } => {
        const errors: string[] = [];
        const valid: File[] = [];

        for (const f of incoming) {
            if (!ALLOWED_VIDEO_TYPES.includes(f.type)) {
                errors.push(`"${f.name}": only MP4, MOV, AVI, WebM, and MKV are allowed`);
                continue;
            }
            if (f.size > MAX_VIDEO_SIZE_BYTES) {
                errors.push(`"${f.name}": file must be less than 2 GB`);
                continue;
            }
            const isDuplicate = files.some((existing) => existing.name === f.name && existing.size === f.size);
            if (isDuplicate) {
                errors.push(`"${f.name}": already added`);
                continue;
            }
            valid.push(f);
        }

        return { valid, errors };
    };

    /**
     * Validates a batch of incoming files and appends any that pass to the
     * existing `files` list via `onChange`, while surfacing errors for any
     * that were rejected. Called from both the file input's onChange and drop handling.
     * @param incoming files selected via the file input or dropped onto the drop zone.
     */
    const addFiles = (incoming: FileList | File[]) => {
        const list = Array.from(incoming);
        const { valid, errors } = validateFiles(list);
        setValidationErrors(errors);
        if (valid.length > 0) onChange([...files, ...valid]);
    };

    /** Marks the drop zone as active when a drag enters it (drag-and-drop styling). */
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    /** Prevents the browser's default handling so the drop zone can accept a drop. */
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    /** Clears the drag-active styling when the dragged item leaves the drop zone. */
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    /** Handles files dropped onto the drop zone by routing them through the same validation as picked files. */
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    };

    /**
     * Removes a single file from the list by index, in response to that
     * file's delete icon button, and clears any stale validation errors.
     * @param index index of the file to remove within `files`.
     */
    const handleRemove = (index: number) => {
        setValidationErrors([]);
        onChange(files.filter((_, i) => i !== index));
    };

    const borderColor = isDragging
        ? theme.palette.primary.main
        : displayError
        ? theme.palette.error.main
        : theme.palette.divider;

    const hoverBorderColor = isDragging
        ? theme.palette.primary.main
        : displayError
        ? theme.palette.error.main
        : theme.palette.primary.light;

    return (
        <Box>
            <Box
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                sx={{
                    borderRadius: 2,
                    border: '2px dashed',
                    borderColor,
                    backgroundColor: isDragging ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        borderColor: hoverBorderColor,
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    },
                }}
            >
                <Button
                    component="label"
                    fullWidth
                    disabled={disabled}
                    sx={{
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        py: 1.5,
                        color: displayError ? theme.palette.error.main : theme.palette.text.secondary,
                        '&:hover': { backgroundColor: 'transparent' },
                    }}
                >
                    <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            🎬 Upload Video Files * — MP4, MOV, AVI, WebM, MKV
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Drag & drop or click to add videos (max 2 GB each)
                        </Typography>
                    </Box>
                    <input
                        type="file"
                        hidden
                        multiple
                        accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska,.mp4,.mov,.avi,.webm,.mkv"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                addFiles(e.target.files);
                            }
                            e.target.value = '';
                        }}
                    />
                </Button>
            </Box>

            {files.length > 0 && (
                <Box
                    sx={{
                        mt: 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.75,
                    }}
                >
                    {files.map((f, index) => (
                        <Box
                            key={`${f.name}-${f.size}`}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                px: 1.5,
                                py: 0.75,
                                borderRadius: 1.5,
                                backgroundColor: alpha(theme.palette.primary.main, 0.06),
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    🎬
                                </Typography>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                        {f.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatSize(f.size)}
                                    </Typography>
                                </Box>
                            </Box>
                            <IconButton
                                size="small"
                                onClick={() => handleRemove(index)}
                                disabled={disabled}
                                sx={{
                                    color: theme.palette.error.main,
                                    flexShrink: 0,
                                    '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.1) },
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                </Box>
            )}

            {displayError && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block', px: 1.5 }}>
                    {displayError}
                </Typography>
            )}
        </Box>
    );
};

export default VideoUpload;
