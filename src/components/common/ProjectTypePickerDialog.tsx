import {
    Box,
    Card,
    CardContent,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DatasetIcon from '@mui/icons-material/Dataset';
import PsychologyIcon from '@mui/icons-material/Psychology';

export type ProjectKind = 'annotation' | 'data_collection';

interface OptionCardProps {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    color: string;
    onClick: () => void;
}

/**
 * Selectable card representing a single project type/kind option. Purely
 * presentational — clicking anywhere on the card invokes `onClick`.
 */
const OptionCard = ({ icon, title, subtitle, color, onClick }: OptionCardProps) => {
    return (
        <Card
            onClick={onClick}
            sx={{
                flex: 1,
                minWidth: 200,
                cursor: 'pointer',
                border: `2px solid ${alpha(color, 0.25)}`,
                borderRadius: 3,
                transition: 'all 0.2s ease',
                '&:hover': {
                    border: `2px solid ${color}`,
                    backgroundColor: alpha(color, 0.05),
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(color, 0.2)}`,
                },
            }}
        >
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        backgroundColor: alpha(color, 0.12),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mx: 'auto',
                        mb: 2,
                    }}
                >
                    <Box sx={{ color, fontSize: 32, display: 'flex' }}>{icon}</Box>
                </Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {subtitle}
                </Typography>
            </CardContent>
        </Card>
    );
};

interface Props {
    open: boolean;
    onClose: () => void;
    onSelect: (kind: ProjectKind) => void;
}

/**
 * Component: ProjectTypePickerDialog
 *
 * Purpose: First step of project creation — lets the user choose which kind of
 * project to create (annotation vs. data collection) before the corresponding
 * creation dialog is opened.
 *
 * Responsibilities:
 * - Presents two `OptionCard` choices side by side and calls `onSelect` with the
 *   chosen `ProjectKind` when either is clicked.
 *
 * Props:
 * - open (boolean): whether the dialog is visible.
 * - onClose (() => void): called to dismiss the dialog without choosing.
 * - onSelect ((kind: ProjectKind) => void): called with 'annotation' or
 *   'data_collection' once the user picks a card; the caller is responsible for
 *   then opening the matching creation dialog.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ProjectTypePickerDialog = ({ open, onClose, onSelect }: Props) => {
    const theme = useTheme();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            slotProps={{
                paper: {
                    sx: { borderRadius: 3 },
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pb: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }}
            >
                <Box>
                    <Typography variant="h5" fontWeight={600}>
                        Create New Project
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                        Choose the type of project you want to create
                    </Typography>
                </Box>
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 3, pb: 4 }}>
                <Box display="flex" gap={2} flexWrap="wrap">
                    <OptionCard
                        icon={<PsychologyIcon sx={{ fontSize: 32 }} />}
                        title="Annotation Project"
                        subtitle="LLM grading, text annotation, multi-modal labelling and review workflows."
                        color={theme.palette.primary.main}
                        onClick={() => onSelect('annotation')}
                    />
                    <OptionCard
                        icon={<DatasetIcon sx={{ fontSize: 32 }} />}
                        title="Data Collection Project"
                        subtitle="Collect images, videos, audio and text from users across configurable phases."
                        color={theme.palette.success.main}
                        onClick={() => onSelect('data_collection')}
                    />
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ProjectTypePickerDialog;
