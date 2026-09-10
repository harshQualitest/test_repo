import { useState, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, alpha, useTheme } from '@mui/material';
import { validateDatasetFile, type FileValidationResult } from '../../utils/fileValidation';

interface DatasetUploadProps {
    file: File | null;
    onChange: (file: File | null) => void;
    error?: string;
    disabled?: boolean;
    existingFileName?: string;
}

/**
 * Component: DatasetUpload
 *
 * Purpose: Drag-and-drop / click-to-browse file picker for a project's
 * dataset file (CSV or Excel). Validates the file client-side before
 * handing it to the parent (typically a Formik field) so an invalid file
 * is surfaced to the user without ever reaching form state.
 *
 * Responsibilities:
 * - Accepts `.csv`, `.xls`, `.xlsx` files via drag-and-drop or a hidden file input.
 * - Runs `validateDatasetFile` (see `src/utils/fileValidation.ts`) to enforce
 *   that the file contains exactly the required columns `prompt`, `llm1`,
 *   `llm2` (no missing, no extra headers) and that none of those cells are
 *   empty — this is the dataset shape the LLM-grading pipeline expects.
 * - Only calls `onChange` with a file once it has passed validation; an
 *   invalid file is kept in local state (so the user can see what they
 *   picked and why it failed) but is never propagated to the form.
 * - Shows a validating spinner while the (async, file-read based) validation
 *   is in progress, and surfaces either the validation error or a
 *   parent-supplied (e.g. Formik/Yup) `error` string.
 *
 * Props:
 * - `file` (`File | null`): the currently accepted (valid) file, owned by the parent/form.
 * - `onChange` (`(file: File | null) => void`): called with the validated file, or `null` on removal/reset.
 * - `error` (`string?`): external validation error (e.g. from Formik) shown when there's no local validation error.
 * - `disabled` (`boolean?`): disables the picker and remove button.
 * - `existingFileName` (`string?`): name of a previously uploaded file (edit mode), shown when no new file is selected.
 *
 * State:
 * - `isDragging` (`boolean`): whether a drag is currently over the drop zone, drives border/background styling.
 * - `validating` (`boolean`): whether an async validation call is in flight.
 * - `validationError` (`string | undefined`): client-side validation failure message, takes precedence over `error`.
 * - `selectedFile` (`File | null`): the most recently picked file, tracked even if it fails validation, so the UI can display it.
 *
 * Side effects:
 * - useEffect: clears `selectedFile`/`validationError` when the parent clears
 *   `file` externally (e.g. form reset), keeping local UI state in sync with
 *   form state it doesn't otherwise own.
 *
 * Business rules enforced:
 * - Only `.csv`, `.xls`, `.xlsx` are accepted by the file input (`accept` attribute).
 * - A file is only "accepted" (propagated via `onChange`) once
 *   `validateDatasetFile` confirms it has exactly the `prompt`, `llm1`, `llm2`
 *   columns with no empty cells.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const DatasetUpload = ({ file, onChange, error, disabled, existingFileName }: DatasetUploadProps) => {
    const theme = useTheme();
    const [isDragging, setIsDragging] = useState(false);
    const [validating, setValidating] = useState(false);
    const [validationError, setValidationError] = useState<string | undefined>();
    const [selectedFile, setSelectedFile] = useState<File | null>(null); // Track selected file even if invalid

    // Clear local state when parent resets the file (e.g., form reset)
    useEffect(() => {
        if (!file && selectedFile) {
            setSelectedFile(null);
            setValidationError(undefined);
        }
    }, [file, selectedFile]);

    // Show the valid file from formik, or the selected file if it's being validated/has errors
    const displayFile = file || selectedFile;
    const hasFile = Boolean(displayFile);
    const displayError = validationError || error; // Show validation error first, then formik error

    /**
     * Validates a newly picked/dropped file against the dataset schema rules
     * (required `prompt`/`llm1`/`llm2` columns, no empty cells) and only
     * forwards it to the parent via `onChange` if validation passes.
     * @param selectedFileToValidate the file the user picked or dropped, or `null` to clear the field.
     */
    const handleFileChange = async (selectedFileToValidate: File | null) => {
        setValidationError(undefined);

        if (!selectedFileToValidate) {
            setSelectedFile(null);
            onChange(null);
            return;
        }

        // Store the selected file immediately so it shows in UI
        setSelectedFile(selectedFileToValidate);

        console.log('Starting validation for file:', selectedFileToValidate.name); // Debug log

        // Show validating state
        setValidating(true);

        try {
            // Validate file
            const result: FileValidationResult = await validateDatasetFile(selectedFileToValidate);

            console.log('Validation result:', result); // Debug log

            if (!result.isValid) {
                setValidationError(result.error);
                console.log('Validation failed:', result.error); // Debug log
                // Don't update formik with the file if validation fails
                // Keep the file in local state so user can see which file failed
            } else {
                setValidationError(undefined);
                onChange(selectedFileToValidate);
                console.log('Validation passed, file accepted'); // Debug log
            }
        } catch (err) {
            console.error('Validation exception:', err); // Debug log
            setValidationError('Failed to validate file');
            // Don't update formik on error either
        } finally {
            setValidating(false);
        }
    };

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

    /** Handles a file dropped onto the drop zone by running it through the same validation as a picked file. */
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files?.[0] ?? null;
        if (droppedFile) {
            await handleFileChange(droppedFile);
        }
    };

    /** Clears the selected/validated file and notifies the parent, in response to the "Remove dataset file" button. */
    const handleRemove = () => {
        setValidationError(undefined);
        setSelectedFile(null);
        onChange(null);
    };

    // Resolve button content outside JSX to avoid nested ternary (S3358)
    let buttonContent: React.ReactNode;
    if (validating) {
        buttonContent = (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Validating file...</Typography>
            </Box>
        );
    } else if (hasFile) {
        buttonContent = (
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📄 {displayFile?.name}
                <Typography component="span" variant="caption" color="text.secondary">
                    {'('}
                    {((displayFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                    {')'}
                </Typography>
            </Typography>
        );
    } else if (existingFileName) {
        buttonContent = (
            <Box sx={{ textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    📤 Upload Dataset - CSV, Excel
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
                    📤 Upload Dataset * - CSV, Excel
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Required columns: prompt, llm1, llm2
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                    Drag & drop or click to browse
                </Typography>
            </Box>
        );
    }

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
                    disabled={disabled || validating}
                    sx={{
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        py: 1.5,
                        color: displayError ? theme.palette.error.main : theme.palette.text.secondary,
                        '&:hover': {
                            backgroundColor: 'transparent',
                        },
                    }}
                >
                    {buttonContent}
                    <input
                        type="file"
                        hidden
                        accept=".csv,.xls,.xlsx"
                        onChange={async (event) => {
                            const selectedFile = event.target.files?.[0] ?? null;
                            await handleFileChange(selectedFile);
                            // Reset input value to allow selecting the same file again
                            event.target.value = '';
                        }}
                    />
                </Button>
            </Box>
            {hasFile && !validating && (
                <Button
                    onClick={handleRemove}
                    size="small"
                    sx={{ mt: 1, textTransform: 'none' }}
                    disabled={disabled}
                >
                    Remove dataset file
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
            {displayError && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block', px: 1.5 }}>
                    {displayError}
                </Typography>
            )}
        </Box>
    );
};

export default DatasetUpload;
