import {
    Box,
    Paper,
    Typography,
    Button,
    Stack,
    useTheme,
    alpha,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
} from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import MouseRoundedIcon from '@mui/icons-material/MouseRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import { useState } from 'react';

/**
 * Component: Analytics
 *
 * Purpose: Static/demo analytics dashboard page showing key traffic metrics,
 * top pages, traffic sources, and recent events.
 *
 * Responsibilities:
 * - Render metric cards, a top-pages list, a traffic-source breakdown, and a
 *   recent-events feed using hardcoded sample data (not wired to Redux/API).
 * - Let the user pick a display-only time range filter.
 *
 * Props: none.
 *
 * State:
 * - `timeRange` — the selected "Time Range" dropdown value ('1d' | '7d' | '30d' | '90d');
 *   purely cosmetic here since it does not drive any data fetch.
 *
 * Major child components: MUI `Paper`/`Box`/`Chip` building blocks only (no
 * custom child components).
 *
 * Note: `metrics`, `topPages`, `trafficSources`, and `recentEvents` are static
 * sample data, not sourced from Redux or an API.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const Analytics = () => {
    const theme = useTheme();
    const [timeRange, setTimeRange] = useState('7d');

    const metrics = [
        {
            title: 'Page Views',
            value: '2.4M',
            change: '+12.5%',
            trend: 'up',
            icon: <VisibilityRoundedIcon />,
            color: theme.palette.primary.main,
        },
        {
            title: 'Unique Visitors',
            value: '184K',
            change: '+8.2%',
            trend: 'up',
            icon: <PeopleRoundedIcon />,
            color: theme.palette.info.main,
        },
        {
            title: 'Avg. Session Duration',
            value: '4m 32s',
            change: '-2.1%',
            trend: 'down',
            icon: <AccessTimeRoundedIcon />,
            color: theme.palette.warning.main,
        },
        {
            title: 'Click-through Rate',
            value: '3.7%',
            change: '+5.8%',
            trend: 'up',
            icon: <MouseRoundedIcon />,
            color: theme.palette.success.main,
        },
    ];

    const topPages = [
        { page: '/dashboard', views: '245K', change: '+15.2%' },
        { page: '/projects', views: '189K', change: '+8.7%' },
        { page: '/analytics', views: '156K', change: '+12.1%' },
        { page: '/settings', views: '98K', change: '-3.2%' },
        { page: '/profile', views: '87K', change: '+6.8%' },
    ];

    const trafficSources = [
        { source: 'Direct', percentage: 35, visitors: '64.4K', color: theme.palette.primary.main },
        { source: 'Search Engines', percentage: 28, visitors: '51.5K', color: theme.palette.info.main },
        { source: 'Social Media', percentage: 22, visitors: '40.5K', color: theme.palette.secondary.main },
        { source: 'Referrals', percentage: 15, visitors: '27.6K', color: theme.palette.success.main },
    ];

    const recentEvents = [
        { event: 'User Registration Spike', time: '2 hours ago', type: 'positive' },
        { event: 'High Error Rate Detected', time: '4 hours ago', type: 'negative' },
        { event: 'New Feature Launched', time: '1 day ago', type: 'info' },
        { event: 'Performance Improvement', time: '2 days ago', type: 'positive' },
    ];

    return (
        <Box sx={{ px: { xs: 2, md: 3 }, py: 2, width: '100%' }}>
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
                sx={{ mb: 2 }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        Analytics Dashboard
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                        Track your application performance and user engagement
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Time Range</InputLabel>
                        <Select value={timeRange} label="Time Range" onChange={(e) => setTimeRange(e.target.value)}>
                            <MenuItem value="1d">Last 24h</MenuItem>
                            <MenuItem value="7d">Last 7 days</MenuItem>
                            <MenuItem value="30d">Last 30 days</MenuItem>
                            <MenuItem value="90d">Last 90 days</MenuItem>
                        </Select>
                    </FormControl>
                    <Button variant="outlined" startIcon={<FilterListRoundedIcon />} sx={{ borderRadius: 2 }}>
                        Filters
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<DownloadRoundedIcon />}
                        sx={{
                            borderRadius: 2,
                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.25)}`,
                        }}
                    >
                        Export
                    </Button>
                </Stack>
            </Stack>

            {/* Key Metrics */}
            <Box
                sx={{
                    mt: 4,
                    display: 'grid',
                    gap: 3,
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        lg: 'repeat(4, 1fr)',
                    },
                }}
            >
                {metrics.map((metric) => (
                    <Paper
                        key={metric.title}
                        elevation={0}
                        sx={{
                            borderRadius: 4,
                            p: 3,
                            bgcolor:
                                theme.palette.mode === 'light' ? '#fff' : alpha(theme.palette.background.paper, 0.85),
                            boxShadow:
                                theme.palette.mode === 'dark' ? `0 24px 48px rgba(0,0,0,0.42)` : theme.shadows[6],
                            border: `1px solid ${alpha(
                                theme.palette.divider,
                                theme.palette.mode === 'dark' ? 0.4 : 0.2,
                            )}`,
                        }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 3,
                                    display: 'grid',
                                    placeItems: 'center',
                                    backgroundColor: alpha(metric.color, 0.1),
                                    color: metric.color,
                                }}
                            >
                                {metric.icon}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {metric.trend === 'up' ? (
                                    <TrendingUpRoundedIcon sx={{ color: theme.palette.success.main, fontSize: 16 }} />
                                ) : (
                                    <TrendingDownRoundedIcon sx={{ color: theme.palette.error.main, fontSize: 16 }} />
                                )}
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        color:
                                            metric.trend === 'up'
                                                ? theme.palette.success.main
                                                : theme.palette.error.main,
                                    }}
                                >
                                    {metric.change}
                                </Typography>
                            </Box>
                        </Stack>
                        <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mt: 2 }}>
                            {metric.title}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
                            {metric.value}
                        </Typography>
                    </Paper>
                ))}
            </Box>

            {/* Charts and Tables */}
            <Box
                sx={{
                    mt: 4,
                    display: 'grid',
                    gap: 3,
                    gridTemplateColumns: {
                        xs: '1fr',
                        lg: '2fr 1fr',
                    },
                }}
            >
                {/* Top Pages */}
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        p: 3,
                        bgcolor: theme.palette.mode === 'light' ? '#fff' : alpha(theme.palette.background.paper, 0.85),
                        boxShadow: theme.palette.mode === 'dark' ? `0 24px 48px rgba(0,0,0,0.42)` : theme.shadows[6],
                        border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.4 : 0.2)}`,
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                        Top Pages
                    </Typography>
                    <Stack spacing={2}>
                        {topPages.map((page, index) => (
                            <Box
                                key={page.page}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    p: 2,
                                    borderRadius: 2,
                                    backgroundColor: alpha(theme.palette.background.default, 0.3),
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Box
                                        sx={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 2,
                                            display: 'grid',
                                            placeItems: 'center',
                                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                            color: theme.palette.primary.main,
                                            fontWeight: 700,
                                            fontSize: 14,
                                        }}
                                    >
                                        {index + 1}
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontWeight: 600 }}>{page.page}</Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            {page.views} views
                                        </Typography>
                                    </Box>
                                </Stack>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        color: page.change.startsWith('+')
                                            ? theme.palette.success.main
                                            : theme.palette.error.main,
                                    }}
                                >
                                    {page.change}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Paper>

                {/* Traffic Sources */}
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        p: 3,
                        bgcolor: theme.palette.mode === 'light' ? '#fff' : alpha(theme.palette.background.paper, 0.85),
                        boxShadow: theme.palette.mode === 'dark' ? `0 24px 48px rgba(0,0,0,0.42)` : theme.shadows[6],
                        border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.4 : 0.2)}`,
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                        Traffic Sources
                    </Typography>
                    <Stack spacing={2.5}>
                        {trafficSources.map((source) => (
                            <Box key={source.source}>
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    sx={{ mb: 1 }}
                                >
                                    <Typography sx={{ fontWeight: 600 }}>{source.source}</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {source.percentage}%
                                    </Typography>
                                </Stack>
                                <Box
                                    sx={{
                                        height: 8,
                                        borderRadius: 999,
                                        backgroundColor: alpha(source.color, 0.1),
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            height: '100%',
                                            width: `${source.percentage}%`,
                                            backgroundColor: source.color,
                                            borderRadius: 999,
                                        }}
                                    />
                                </Box>
                                <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}
                                >
                                    {source.visitors} visitors
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Paper>
            </Box>

            {/* Recent Events */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 4,
                    p: 3,
                    mt: 3,
                    bgcolor: theme.palette.mode === 'light' ? '#fff' : alpha(theme.palette.background.paper, 0.85),
                    boxShadow: theme.palette.mode === 'dark' ? `0 24px 48px rgba(0,0,0,0.42)` : theme.shadows[6],
                    border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.4 : 0.2)}`,
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                    Recent Events
                </Typography>
                <Stack spacing={2}>
                    {recentEvents.map((event) => {
                        // Map the event's semantic type to a MUI Chip color for quick visual scanning.
                        const getChipColor = () => {
                            if (event.type === 'positive') return 'success';
                            if (event.type === 'negative') return 'error';
                            return 'info';
                        };

                        return (
                            <Box
                                key={event.event}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    p: 2,
                                    borderRadius: 2,
                                    backgroundColor: alpha(theme.palette.background.default, 0.3),
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Chip label={event.type} size="small" color={getChipColor()} variant="outlined" />
                                    <Typography sx={{ fontWeight: 600 }}>{event.event}</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    {event.time}
                                </Typography>
                            </Box>
                        );
                    })}
                </Stack>
            </Paper>
        </Box>
    );
};

export default Analytics;
