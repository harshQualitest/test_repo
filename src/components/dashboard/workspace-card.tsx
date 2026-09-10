import * as React from 'react';
import { Card, CardContent, Box, Typography, Chip, alpha } from '@mui/material';
import HubIcon from '@mui/icons-material/Hub'; // workflow-ish
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import GroupIcon from '@mui/icons-material/Group';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import ShareIcon from '@mui/icons-material/Share';
import { Link } from 'react-router-dom';

export interface WorkSpaceCardProps {
    workspace?: {
        id: string;
        title?: string;
        desc?: string;
        projects?: number | string;
        members?: number | string;
        projectCount?: number;
        memberCount?: number;
        badgeLabel?: string;
        value?: number | string;
        collapsible?: {
            typeLabel?: string;
            typeChip?: string;
            projectName?: string;
            projectChip?: string;
            statusLabel?: string;
            teams?: string;
            assets?: string;
            teamChips?: string[];
        };
        icon?: React.ReactNode;
        color?: string;
    };
}

/**
 * Picks the icon shown inside the workspace card's colored avatar square,
 * based on workspace visibility. Falls back to the generic "hub" icon for
 * any unrecognized/missing visibility label.
 * @param badgeLabel - workspace visibility label (`private` | `public` | `shareable`), case-insensitive.
 * @returns The icon element to render in the avatar square.
 */
function getWorkspaceTypeIcon(badgeLabel: string | undefined): React.ReactNode {
    const label = (badgeLabel ?? '').toLowerCase();
    if (label === 'private') return <LockIcon sx={{ fontSize: 20, color: '#fff' }} />;
    if (label === 'public') return <PublicIcon sx={{ fontSize: 20, color: '#fff' }} />;
    if (label === 'shareable') return <ShareIcon sx={{ fontSize: 20, color: '#fff' }} />;
    return <HubIcon sx={{ fontSize: 20, color: '#fff' }} />;
}

/**
 * Picks the icon shown inside the small visibility `Chip` badge. Unlike
 * {@link getWorkspaceTypeIcon}, this defaults to the lock (private) icon
 * rather than the generic hub icon, since the badge itself always represents
 * one of the three visibility states.
 * @param badgeLabel - workspace visibility label (`private` | `public` | `shareable`), case-insensitive.
 * @returns The icon element to render inside the visibility badge.
 */
function getWorkspaceBadgeIcon(badgeLabel: string | undefined): React.ReactElement {
    const label = (badgeLabel ?? '').toLowerCase();
    if (label === 'public') return <PublicIcon sx={{ fontSize: 14, color: '#fff' }} />;
    if (label === 'shareable') return <ShareIcon sx={{ fontSize: 14, color: '#fff' }} />;
    return <LockIcon sx={{ fontSize: 14, color: '#fff' }} />;
}

/**
 * Formats the workspace's project count into a pluralized display label,
 * preferring the numeric `projectCount` and falling back to a legacy
 * pre-formatted/numeric `projects` value.
 * @param projectCount - numeric project count from the API, if present.
 * @param projects - legacy/pre-formatted projects value used as a fallback.
 * @returns A display string like "3 projects" or "0 projects".
 */
function formatProjectLabel(
    projectCount: number | undefined,
    projects: number | string | undefined,
): string {
    if (projectCount === undefined) return String(projects ?? '0 projects');
    const unit = projectCount === 1 ? 'project' : 'projects';
    return `${projectCount} ${unit}`;
}

/**
 * Formats the workspace's member count into a pluralized display label,
 * preferring the numeric `memberCount` and falling back to a legacy
 * pre-formatted/numeric `members` value.
 * @param memberCount - numeric member count from the API, if present.
 * @param members - legacy/pre-formatted members value used as a fallback.
 * @returns A display string like "5 members" or "0 members".
 */
function formatMemberLabel(
    memberCount: number | undefined,
    members: number | string | undefined,
): string {
    if (memberCount === undefined) return String(members ?? '0 members');
    const unit = memberCount === 1 ? 'member' : 'members';
    return `${memberCount} ${unit}`;
}

/**
 * Component: WorkSpaceCard
 *
 * Purpose: Renders a single workspace as a clickable card (used by `WidgetView`'s
 * grid), showing the workspace's icon/color, name, expandable description,
 * project/member counts, and a visibility badge. Clicking the card navigates to
 * that workspace's dashboard.
 *
 * Responsibilities:
 * - Format project/member counts and pick visibility-based icons for the avatar and badge.
 * - Allow the description to be expanded/collapsed ("See more"/"See less") without
 *   triggering the card's own navigation link.
 *
 * Props:
 * - `workspace` (optional): id, title, desc, project/member counts, badge label,
 *   optional `collapsible` detail block, custom icon, and accent color.
 *
 * State:
 * - `descExpanded` (`boolean`) - whether the workspace description is expanded beyond
 *   its default 2-line clamp.
 *
 * Business logic: the description toggle stops event propagation so clicking
 * "See more"/"See less" does not also navigate away via the card's wrapping `Link`.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
export default function WorkSpaceCard({ workspace }: Readonly<WorkSpaceCardProps>) {
    const [descExpanded, setDescExpanded] = React.useState(false);

    const projectLabel = formatProjectLabel(workspace?.projectCount, workspace?.projects);
    const memberLabel = formatMemberLabel(workspace?.memberCount, workspace?.members);

    const descToggleText = descExpanded ? 'See less' : 'See more';

    /**
     * Toggles the description expand/collapse state. Prevents default and stops
     * propagation so the click doesn't also activate the card's wrapping `Link`
     * navigation to the workspace dashboard.
     * @param e - the triggering mouse event.
     */
    const handleDescToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDescExpanded((prev) => !prev);
    };

    return (
        <Box 
            data-slot="collapsible"
            sx={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
            }}
        >
            <Link 
                to={`/workspace-dashboard/${workspace?.id}`}
                style={{ 
                    textDecoration: 'none',
                    display: 'block',
                    width: '100%',
                }}
            >
                <Card
                    data-slot="card"
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0,
                        borderRadius: 3, // rounded-xl feel
                        transition: 'all 0.3s ease',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        height: '100%', // Ensure consistent height in grid
                        width: '100%',
                        maxWidth: '100%',
                        minWidth: 0,
                        overflow: 'hidden',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: (theme) => `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                            borderColor: 'primary.main',
                        },
                    }}
                    variant="outlined"
                >
                    {/* Card Header */}
                    <Box
                        data-slot="card-header"
                        sx={{
                            display: 'grid',
                            gridAutoRows: 'min-content',
                            gridTemplateRows: 'auto auto',
                            alignItems: 'start',
                            gap: 0.75, // ~12px
                            px: 3, // 24px
                            pt: 3, // 24px
                            pb: 0,
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            {/* Left group: avatar + title + subtitle */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    flex: 1,
                                    minWidth: 0,
                                    cursor: 'pointer',
                                }}
                            >
                                {/* Square icon container (color from prop or fallback) */}
                                <Box
                                    sx={{
                                        height: 40,
                                        width: 40,
                                        borderRadius: 2,
                                        bgcolor: workspace?.color ?? '#3B82F6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    {workspace?.icon ?? getWorkspaceTypeIcon(workspace?.badgeLabel)}
                                </Box>

                                {/* Title + subtitle */}
                                <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                    <Typography
                                        data-slot="card-title"
                                        variant="subtitle1" // ~text-base
                                        sx={{
                                            fontWeight: 600,
                                            transition: 'color 150ms ease',
                                            '&:hover': { color: 'primary.main' },
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            width: '100%',
                                        }}
                                    >
                                        {workspace?.title ?? 'BigTechClient1'}
                                    </Typography>
                                    <Typography
                                        variant="caption" // ~text-xs
                                        sx={{
                                            color: 'text.secondary',
                                            mt: 0.5,
                                            display: '-webkit-box',
                                            WebkitLineClamp: descExpanded ? 'unset' : 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            textOverflow: descExpanded ? 'unset' : 'ellipsis',
                                            lineHeight: 1.4,
                                            maxWidth: '100%',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {workspace?.desc ??
                                            'Big tech client workspace for content moderation and data annotation'}
                                    </Typography>
                                    <Typography
                                        component="span"
                                        variant="caption"
                                        onClick={handleDescToggle}
                                        sx={{
                                            display: 'inline-block',
                                            mt: 0.25,
                                            color: 'primary.main',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            '&:hover': { textDecoration: 'underline' },
                                        }}
                                    >
                                        {descToggleText}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Right actions */}
                            {/* <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                           
                                <IconButton
                                    aria-label="Open client"
                                    size="small"
                                    sx={{
                                        width: 32,
                                        height: 32, // h-8 w-8
                                        borderRadius: 1,
                                        '& .MuiSvgIcon-root': {
                                            fontSize: 16,
                                            pointerEvents: 'none',
                                            flexShrink: 0,
                                            color: '#fff',
                                        },
                                        '&:hover': {
                                            bgcolor: (theme) =>
                                                theme.palette.mode === 'dark'
                                                    ? 'rgba(144,202,249,0.12)'
                                                    : 'rgba(25,118,210,0.08)',
                                        },
                                        '&:focusVisible': {
                                            boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}80`,
                                            outline: 'none',
                                        },
                                    }}
                                >
                                    <ArrowForwardIcon />
                                </IconButton>

                        
                                <IconButton
                                    data-slot="collapsible-trigger"
                                    aria-controls={collapsibleId}
                                    aria-expanded={open}
                                    aria-label={open ? 'Collapse details' : 'Expand details'}
                                    onClick={handleToggle}
                                    size="small"
                                    sx={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 1,
                                        transition: 'transform 150ms ease',
                                        '& .MuiSvgIcon-root': {
                                            fontSize: 16,
                                            pointerEvents: 'none',
                                            flexShrink: 0,
                                            color: '#fff',
                                        },
                                        '&:hover': {
                                            bgcolor: (theme) =>
                                                theme.palette.mode === 'dark'
                                                    ? 'rgba(144,202,249,0.12)'
                                                    : 'rgba(25,118,210,0.08)',
                                        },
                                        '&:focusVisible': {
                                            boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}80`,
                                            outline: 'none',
                                        },
                                    }}
                                >
                                    <ExpandMoreIcon
                                        sx={{
                                            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                                            transition: 'transform 150ms ease',
                                        }}
                                    />
                                </IconButton>
                            </Box> */}
                        </Box>
                    </Box>

                    {/* Card Content (top row: stats + badge) */}
                    <CardContent sx={{ px: 3, pt: 1.5, pb: 3, overflow: 'hidden', width: '100%', minWidth: 0, '&:last-child': { pb: 3 } }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                minWidth: 0,
                            }}
                        >
                            {/* Stats */}
                            <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 2, 
                                fontSize: '0.875rem',
                                minWidth: 0,
                                flex: 1,
                                flexWrap: 'wrap',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                    <FolderOpenIcon sx={{ fontSize: 16, color: '#fff', flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {projectLabel}
                                    </span>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                    <GroupIcon sx={{ fontSize: 16, color: '#fff', flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {memberLabel}
                                    </span>
                                </Box>
                            </Box>

                            {/* Badge (Private) */}
                            <Chip
                                data-slot="badge"
                                variant="outlined"
                                size="small"
                                icon={getWorkspaceBadgeIcon(workspace?.badgeLabel)}
                                label={workspace?.badgeLabel ?? 'Private'}
                                sx={{
                                    fontWeight: 500,
                                    flexShrink: 0,
                                    maxWidth: '120px',
                                    '& .MuiChip-label': {
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    },
                                    '&:focusVisible': {
                                        boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}80`,
                                        outline: 'none',
                                    },
                                }}
                            />
                        </Box>

                        {/* Collapsible content */}
                        {/* <Collapse in={open} collapsedSize={0} sx={{ mt: 2 }} aria-labelledby={collapsibleId}>
                            <CollapsibleContent data={workspace?.collapsible} />
                        </Collapse> */}
                    </CardContent>
                </Card>
            </Link>
        </Box>
    );
}
