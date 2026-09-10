import { useState } from 'react';
import { Box, Button, Typography, alpha, useTheme } from '@mui/material';

interface InstructionsUploadProps {
    file: File | null;
    onChange: (file: File | null) => void;
    error?: string;
    disabled?: boolean;
    existingFileName?: string;
}

/**
 * Component: InstructionsUpload
 *
 * Purpose: Drag-and-drop / click-to-browse file picker for a project's
 * instructions document (PDF). Unlike `DatasetUpload`, there is no
 * client-side content validation here — any file matching the `.pdf`
 * `accept` filter is passed straight through to the parent.
 *
 * Responsibilities:
 * - Accepts a single `.pdf` file via drag-and-drop or a hidden file input
 *   (only PDF is allowed since project instructions are expected to be a
 *   formatted document, not raw data).
 * - Reports drag-over state for visual feedback on the drop zone.
 * - Forwards the picked/dropped file (or `null` on removal) to the parent
 *   unconditionally via `onChange` — validation, if any, is the caller's
 *   (e.g. Formik/Yup schema) responsibility.
 *
 * Props:
 * - `file` (`File | null`): the currently selected instructions file, owned by the parent/form.
 * - `onChange` (`(file: File | null) => void`): called with the picked file, or `null` on removal.
 * - `error` (`string?`): validation error (e.g. from Formik) shown below the picker.
 * - `disabled` (`boolean?`): disables the picker and remove button.
 * - `existingFileName` (`string?`): name of a previously uploaded file (edit mode), shown when no new file is selected.
 *
 * State:
 * - `isDragging` (`boolean`): whether a drag is currently over the drop zone, drives border/background styling.
 *
 * Business rules enforced:
 * - Only `.pdf` files are accepted by the file input (`accept` attribute).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const InstructionsUpload = ({ file, onChange, error, disabled, existingFileName }: InstructionsUploadProps) => {
    const theme = useTheme();
    const [isDragging, setIsDragging] = useState(false);

    const hasFile = Boolean(file);

    /** Marks the drop zone as active when a drag enters it (drag-and-drop styling). */
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    /** Prevents the browser's default handling so the drop zone can accept a drop. */
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    /** Clears the drag-active styling when the dragged item leaves the drop zone. */
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    /** Handles a file dropped onto the drop zone by forwarding it directly to the parent via `onChange`. */
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files?.[0] ?? null;
        if (droppedFile) {
            onChange(droppedFile);
        }
    };

    /** Clears the selected file, in response to the "Remove instructions file" button. */
    const handleRemove = () => {
        onChange(null);
    };

    // Resolve button content outside JSX to avoid nested ternary (S3358)
    let buttonContent: React.ReactNode;
    if (hasFile) {
        buttonContent = (
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📋 {file?.name}
                <Typography component="span" variant="caption" color="text.secondary">
                    {'('}
                    {((file?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                    {')'}
                </Typography>
            </Typography>
        );
    } else if (existingFileName) {
        buttonContent = (
            <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    📄 Upload Project Instructions - PDF
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Drag & drop or click to replace the current file
                </Typography>
            </Box>
        );
    } else {
        buttonContent = (
            <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    📄 Upload Project Instructions * - PDF
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Drag & drop or click to browse
                </Typography>
            </Box>
        );
    }

    const borderColor = isDragging
        ? theme.palette.primary.main
        : error
        ? theme.palette.error.main
        : theme.palette.divider;

    const hoverBorderColor = isDragging
        ? theme.palette.primary.main
        : error
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
                    position: 'relative',
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
                        color: error ? theme.palette.error.main : theme.palette.text.secondary,
                        '&:hover': {
                            backgroundColor: 'transparent',
                        },
                    }}
                >
                    {buttonContent}
                    <input
                        type="file"
                        hidden
                        accept=".pdf"
                        onChange={(event) => {
                            const selectedFile = event.target.files?.[0] ?? null;
                            onChange(selectedFile);
                            // Reset input value to allow selecting the same file again
                            event.target.value = '';
                        }}
                    />
                </Button>
            </Box>
            {hasFile && (
                <Button onClick={handleRemove} size="small" sx={{ mt: 1, textTransform: 'none' }} disabled={disabled}>
                    Remove instructions file
                </Button>
            )}
            {!hasFile && existingFileName && (
                <Box
                    sx={{
                        mt: 1,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 1.5,
                        backgroundColor: alpha(theme.palette.info.main, 0.08),
                        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                        <Typography component="span" variant="caption" fontWeight={600} color="info.main">
                            Current file:
                        </Typography>
                        {' '}{existingFileName}
                    </Typography>
                </Box>
            )}
            {error && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block', px: 1.5 }}>
                    {error}
                </Typography>
            )}
        </Box>
    );
};

export default InstructionsUpload;
