import {
    Box,
    Card,
    CardContent,
    Chip,
    IconButton,
    Tooltip,
    Typography,
    alpha,
    useTheme,
} from '@mui/material';
import DatasetIcon from '@mui/icons-material/Dataset';
import BarChartIcon from '@mui/icons-material/BarChart';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import type { IDataCollectionProject } from '../../interfaces/api/dataCollection.interface';

interface Props {
    project: IDataCollectionProject;
    onTrackingClick: (project: IDataCollectionProject) => void;
    onEditClick: (project: IDataCollectionProject) => void;
    onDeleteClick: (project: IDataCollectionProject) => void;
    canDelete?: boolean;
}

/**
 * Component: DataCollectionProjectCard
 *
 * Purpose: Renders a summary card for a single Data Collection project,
 * showing its status, instruction preview, target/phase/slot stats, date
 * range, and quick actions (view tracking, edit, delete).
 *
 * Responsibilities:
 * - Derives phase count and total slot count from `project.phases`.
 * - Renders a status chip (Expired / Inactive / Active) based on project flags.
 * - Exposes tracking/edit/delete actions to the parent via callbacks.
 * - Conditionally renders the delete action based on `canDelete` (RBAC gating
 *   is enforced by the parent; this component only respects the flag it's given).
 *
 * Props:
 * - `project` (`IDataCollectionProject`): the project to display.
 * - `onTrackingClick` (`(project) => void`): opens the tracking view for this project.
 * - `onEditClick` (`(project) => void`): opens the edit flow for this project.
 * - `onDeleteClick` (`(project) => void`): triggers deletion for this project.
 * - `canDelete` (`boolean`, default `false`): whether the delete action is shown.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const DataCollectionProjectCard = ({
    project,
    onTrackingClick,
    onEditClick,
    onDeleteClick,
    canDelete = false,
}: Props) => {
    const theme = useTheme();
    const color = theme.palette.success.main;

    // Phase/slot counts are derived from the phases map rather than stored
    // directly on the project, since phases can be added/removed independently.
    const phaseCount = project.phases ? Object.keys(project.phases).length : 0;
    const totalSlots = project.phases
        ? Object.values(project.phases).reduce((sum, slots) => sum + slots.length, 0)
        : 0;

    /**
     * Picks the status chip to display based on project lifecycle flags.
     * Expiry takes precedence over the active/inactive flag so an expired
     * project is never shown as merely "Inactive".
     * @returns a MUI Chip element representing the current status.
     */
    const getStatusChip = () => {
        if (project.is_expired)
            return <Chip label="Expired" size="small" color="error" sx={{ fontWeight: 600 }} />;
        if (!project.isactive)
            return <Chip label="Inactive" size="small" sx={{ fontWeight: 600 }} />;
        return <Chip label="Active" size="small" color="success" sx={{ fontWeight: 600 }} />;
    };

    return (
        <Card
            sx={{
                borderRadius: 3,
                border: `1px solid ${alpha(color, 0.25)}`,
                backgroundColor: alpha(color, 0.02),
                transition: 'all 0.2s ease',
                '&:hover': {
                    borderColor: alpha(color, 0.5),
                    boxShadow: `0 6px 20px ${alpha(color, 0.15)}`,
                    transform: 'translateY(-2px)',
                },
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <CardContent sx={{ flex: 1, p: 2.5 }}>
                {/* Header */}
                <Box display="flex" alignItems="flex-start" gap={1.5} mb={1.5}>
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            minWidth: 44,
                            borderRadius: 2,
                            backgroundColor: alpha(color, 0.12),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <DatasetIcon sx={{ fontSize: 22, color }} />
                    </Box>
                    <Box flex={1} minWidth={0}>
                        <Typography
                            variant="subtitle1"
                            fontWeight={700}
                            noWrap
                            title={project.name}
                        >
                            {project.name}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5} mt={0.25}>
                            <Chip
                                label="Data Collection"
                                size="small"
                                sx={{
                                    backgroundColor: alpha(color, 0.1),
                                    color,
                                    fontWeight: 600,
                                    fontSize: '0.65rem',
                                    height: 20,
                                }}
                            />
                            {getStatusChip()}
                        </Box>
                    </Box>
                </Box>

                {/* Instruction preview */}
                {project.instruction && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        mb={1.5}
                        sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}
                    >
                        {project.instruction}
                    </Typography>
                )}

                {/* Stats row */}
                <Box display="flex" gap={2} mb={1.5} flexWrap="wrap">
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Target
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                            {project.target}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Phases
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                            {phaseCount}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Slots
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                            {totalSlots}
                        </Typography>
                    </Box>
                </Box>

                {/* Dates */}
                <Box display="flex" gap={2} mb={1} flexWrap="wrap">
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <CalendarTodayIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                            {project.startDate} → {project.endDate}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>

            {/* Action buttons */}
            <Box
                display="flex"
                justifyContent="flex-end"
                gap={0.5}
                px={1.5}
                pb={1.5}
                borderTop={`1px solid ${theme.palette.divider}`}
                pt={1}
            >
                <Tooltip title="View Tracking">
                    <IconButton
                        size="small"
                        onClick={() => onTrackingClick(project)}
                        sx={{
                            color: theme.palette.info.main,
                            '&:hover': { backgroundColor: alpha(theme.palette.info.main, 0.1) },
                        }}
                    >
                        <BarChartIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Edit">
                    <IconButton
                        size="small"
                        onClick={() => onEditClick(project)}
                        sx={{
                            color: theme.palette.warning.main,
                            '&:hover': { backgroundColor: alpha(theme.palette.warning.main, 0.1) },
                        }}
                    >
                        <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Tooltip>
                {canDelete && (
                    <Tooltip title="Delete">
                        <IconButton
                            size="small"
                            onClick={() => onDeleteClick(project)}
                            sx={{
                                color: theme.palette.error.main,
                                '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.1) },
                            }}
                        >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                </Tooltip>
                )}
            </Box>
        </Card>
    );
};

export default DataCollectionProjectCard;
