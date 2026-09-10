import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    alpha,
    useTheme,
    LinearProgress,
    IconButton,
    Tooltip,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PeopleOutline from '@mui/icons-material/PeopleOutline';
import ArchiveIcon from '@mui/icons-material/Archive';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { TEMPLATE_TYPES } from '../../constants/staticThings';
import type { IProject } from '../../redux/slices/projectSlice';

dayjs.extend(relativeTime);

interface ProjectCardProps {
    project: IProject;
    onProjectClick: (project: IProject) => void;
    onEditClick?: (project: IProject, event?: React.MouseEvent) => void;
    onArchiveClick: (project: IProject, event?: React.MouseEvent) => void;
    onDeleteClick: (project: IProject, event?: React.MouseEvent) => void;
    getTemplateColor: (template: string) => string;
    getStatusColor: (status: string) => { bg: string; color: string };
    getDynamicStatus: (project: IProject) => string;
    formatStatusLabel: (status: string) => string;
    formatDate: (dateString: string) => string;
    canArchive?: boolean;
    canDelete?: boolean;
}

/**
 * Component: ProjectCard
 *
 * Purpose: Renders a summary card for a single (non–Data Collection) project
 * in the projects grid, showing its type, description, progress, member
 * count, timeline, status badge, and hover-revealed quick actions.
 *
 * Responsibilities:
 * - Renders project metadata using formatter/color-lookup functions passed
 *   in by the parent (`getTemplateColor`, `getStatusColor`, `formatStatusLabel`,
 *   `formatDate`, `getDynamicStatus`) rather than computing them itself, so
 *   this component stays a pure presentational card.
 * - Shows a progress bar only when `project.progress` is defined.
 * - Reveals Edit/Archive/Delete action buttons on hover (`.action-buttons`).
 * - Gates the Edit action on `onEditClick` being provided, the Archive
 *   action on `canArchive` (and hides it entirely for draft projects), and
 *   the Delete action on `canDelete` — these flags are expected to already
 *   reflect the current user's RBAC permissions when passed in by the parent.
 *
 * Props:
 * - `project` (`IProject`): the project to render.
 * - `onProjectClick` (`(project) => void`): opens the project (card click).
 * - `onEditClick` (`(project, event?) => void`, optional): opens the edit flow; action button hidden if omitted.
 * - `onArchiveClick` (`(project, event?) => void`): archives the project.
 * - `onDeleteClick` (`(project, event?) => void`): deletes the project.
 * - `getTemplateColor` (`(template: string) => string`): resolves the accent color for a template type.
 * - `getStatusColor` (`(status: string) => { bg: string; color: string }`): resolves badge colors for a status.
 * - `getDynamicStatus` (`(project) => string`): computes a project's effective status (accepted but not directly used in this render).
 * - `formatStatusLabel` (`(status: string) => string`): human-readable status label.
 * - `formatDate` (`(dateString: string) => string`): human-readable date formatting.
 * - `canArchive` (`boolean`, default `true`): whether the Archive action is shown.
 * - `canDelete` (`boolean`, default `true`): whether the Delete action is shown.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const ProjectCard = ({
    project,
    onProjectClick,
    onEditClick,
    onArchiveClick,
    onDeleteClick,
    getTemplateColor,
    getStatusColor,
    formatStatusLabel,
    formatDate,
    canArchive = true,
    canDelete = true,
}: ProjectCardProps) => {
    const theme = useTheme();

    return (
        <Card
            sx={{
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: `1px solid ${theme.palette.divider}`,
                position: 'relative',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                    borderColor: theme.palette.primary.main,
                    '& .action-buttons': {
                        opacity: 1,
                    },
                },
            }}
            onClick={() => onProjectClick(project)}
        >
            <CardContent sx={{ p: 3 }}>
                {/* Header */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        mb: 2,
                        pr: project.status ? 10 : 0,
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                backgroundColor: alpha(getTemplateColor(project.template_type), 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <FolderOpenIcon
                                sx={{
                                    fontSize: 24,
                                    color: getTemplateColor(project.template_type),
                                }}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                variant="h6"
                                sx={{
                                    fontWeight: 600,
                                    mb: 0.5,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {project.name}
                            </Typography>
                            {project.template_type && <Chip
                                label={
                                    TEMPLATE_TYPES[project.template_type as keyof typeof TEMPLATE_TYPES] ||
                                    project.template_type
                                }
                                size="small"
                                sx={{
                                    backgroundColor: alpha(getTemplateColor(project.template_type), 0.1),
                                    color: getTemplateColor(project.template_type),
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    height: 24,
                                    textTransform: 'capitalize',
                                }}
                            />}
                        </Box>
                    </Box>
                </Box>

                {/* Description */}
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        minHeight: 40,
                    }}
                >
                    {project.description}
                </Typography>

                {/* Progress */}
                {project.progress !== undefined && (
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                Progress
                            </Typography>
                            <Typography variant="caption" fontWeight={600}>
                                {project.progress}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={project.progress}
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 3,
                                    backgroundColor: getTemplateColor(project.template_type),
                                },
                            }}
                        />
                    </Box>
                )}

                {/* Footer */}
                <Box
                    sx={{
                        pt: 2,
                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    }}
                >
                    {/* Members and Created Time */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1.5,
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                            }}
                        >
                            <PeopleOutline
                                sx={{
                                    fontSize: 16,
                                    color: theme.palette.primary.main,
                                }}
                            />
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 600,
                                    color: theme.palette.primary.main,
                                }}
                            >
                                {(project as any)?.members?.length || 0} member
                                {((project as any)?.members?.length || 0) === 1 ? '' : 's'}
                            </Typography>
                        </Box>

                        {/* <Typography
                            variant="caption"
                            sx={{
                                color: 'text.secondary',
                                fontWeight: 500,
                            }}
                        >
                            {dayjs(project.created_at).fromNow()}
                        </Typography> */}
                    </Box>

                    {/* Timeline */}
                    <Box>
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'text.secondary',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                fontSize: '0.65rem',
                                letterSpacing: 0.5,
                                display: 'block',
                                mb: 0.75,
                            }}
                        >
                            Timeline
                        </Typography>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    flex: 1,
                                }}
                            >
                                <CalendarTodayIcon
                                    sx={{
                                        fontSize: 14,
                                        color: theme.palette.success.main,
                                    }}
                                />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 600,
                                        color: 'text.primary',
                                    }}
                                >
                                    {project.start_date ? formatDate(project.start_date) : 'NA'}
                                </Typography>
                            </Box>

                            <Box
                                sx={{
                                    width: 24,
                                    height: 1,
                                    backgroundColor: alpha(theme.palette.divider, 0.6),
                                    position: 'relative',
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        right: -4,
                                        top: -3,
                                        width: 0,
                                        height: 0,
                                        borderLeft: `4px solid ${alpha(theme.palette.divider, 0.6)}`,
                                        borderTop: '3px solid transparent',
                                        borderBottom: '3px solid transparent',
                                    },
                                }}
                            />

                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    flex: 1,
                                }}
                            >
                                <CalendarTodayIcon
                                    sx={{
                                        fontSize: 14,
                                        color: theme.palette.error.main,
                                    }}
                                />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontWeight: 600,
                                        color: 'text.primary',
                                    }}
                                >
                                    {project.end_date ? formatDate(project.end_date) : 'NA'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {/* Status Badge */}
                {project.status && (
                    <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                        <Chip
                            label={formatStatusLabel(project.status)}
                            size="small"
                            sx={{
                                backgroundColor: getStatusColor(project.status).bg,
                                color: getStatusColor(project.status).color,
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                height: 20,
                                textTransform: 'capitalize',
                            }}
                        />
                    </Box>
                )}

                {/* Action Buttons */}
                <Box
                    className="action-buttons"
                    sx={{
                        position: 'absolute',
                        top: project.status ? 48 : 16,
                        right: 16,
                        display: 'flex',
                        gap: 0.5,
                        opacity: 0,
                        transition: 'opacity 0.3s ease',
                    }}
                >
                    {onEditClick && (
                        <Tooltip title="Edit Project">
                            <IconButton
                                size="small"
                                onClick={(e) => onEditClick(project, e)}
                                sx={{
                                    backgroundColor: alpha(theme.palette.background.paper, 0.9),
                                    color: theme.palette.info.main,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                                    },
                                }}
                            >
                                <EditIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {/* Draft projects have never been active, so "archiving" them is not a meaningful action */}
                    {canArchive && project.status != "draft" && (
                        <Tooltip title="Archive Project">
                            <IconButton
                                size="small"
                                onClick={(e) => onArchiveClick(project, e)}
                                disabled={project.status === 'archived'}
                                sx={{
                                    backgroundColor: alpha(theme.palette.background.paper, 0.9),
                                    color: theme.palette.warning.main,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.warning.main, 0.1),
                                    },
                                    '&.Mui-disabled': {
                                        backgroundColor: alpha(theme.palette.background.paper, 0.5),
                                        color: theme.palette.action.disabled,
                                    },
                                }}
                            >
                                <ArchiveIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {canDelete && (
                        <Tooltip title="Delete Project">
                            <IconButton
                                size="small"
                                onClick={(e) => onDeleteClick(project, e)}
                                sx={{
                                    backgroundColor: alpha(theme.palette.background.paper, 0.9),
                                    color: theme.palette.error.main,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                                    },
                                }}
                            >
                                <DeleteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
};

export default ProjectCard;
