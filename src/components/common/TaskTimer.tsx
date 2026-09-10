import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, alpha, useTheme, Chip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimerOffIcon from '@mui/icons-material/TimerOff';

interface TaskTimerProps {
    /** Timeout duration in seconds */
    timeoutSeconds: number;
    /** Callback when timer expires */
    onTimeout?: () => void;
    /** Callback when warning threshold is reached (e.g., 2 minutes remaining) */
    onWarning?: (remainingSeconds: number) => void;
    /** Warning threshold in seconds (default: 120 = 2 minutes) */
    warningThreshold?: number;
    /** Whether the timer should be running */
    isActive?: boolean;
    /** Optional label to display */
    label?: string;
    /** Size variant */
    size?: 'small' | 'medium' | 'large';
    /** Show as compact chip or full display */
    variant?: 'chip' | 'card' | 'inline';
}

/**
 * Component: TaskTimer
 *
 * Purpose: Visual countdown timer for a timed annotation/review task —
 * counts down from `timeoutSeconds`, changes color/urgency as time runs low,
 * and fires callbacks at a warning threshold and at expiry.
 *
 * Responsibilities:
 * - Ticks a local countdown once per second while `isActive` is true.
 * - Derives a status (normal/warning/critical/expired) from the remaining
 *   time and renders it as a chip, inline snippet, or card depending on `variant`.
 * - Invokes `onWarning` exactly once when the countdown crosses
 *   `warningThreshold`, and `onTimeout` once when it reaches zero.
 *
 * Props:
 * - timeoutSeconds (number): total duration of the timer, in seconds.
 * - onTimeout (() => void, optional): called once when the timer reaches 0.
 * - onWarning ((remainingSeconds: number) => void, optional): called once when
 *   remaining time first drops to/below `warningThreshold`.
 * - warningThreshold (number, optional): seconds remaining at which to warn (default 120).
 * - isActive (boolean, optional): whether the countdown should be running (default true).
 * - label (string, optional): caption shown in the 'card' variant (default 'Time Remaining').
 * - size ('small' | 'medium' | 'large', optional): visual sizing (default 'medium').
 * - variant ('chip' | 'card' | 'inline', optional): display style (default 'chip').
 *
 * State:
 * - remainingSeconds (number): seconds left on the countdown; ticks down every second.
 * - warningTriggered (boolean): guards against calling `onWarning` more than once per timer run.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const TaskTimer = ({
    timeoutSeconds,
    onTimeout,
    onWarning,
    warningThreshold = 120,
    isActive = true,
    label = 'Time Remaining',
    size = 'medium',
    variant = 'chip',
}: TaskTimerProps) => {
    const theme = useTheme();
    const [remainingSeconds, setRemainingSeconds] = useState(timeoutSeconds);
    const [warningTriggered, setWarningTriggered] = useState(false);

    // Format time as HH:MM:SS or MM:SS depending on duration
    // Memoized as a stable callback (no dependencies) since it's a pure formatter
    // re-created identically on every render otherwise.
    const formatTime = useCallback((seconds: number): string => {
        if (seconds <= 0) return '00:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Determine timer status and color
    // Recomputed only when remaining/total time or theme changes; drives which
    // color/icon/urgency treatment the timer displays.
    const getTimerStatus = useCallback(() => {
        const percentRemaining = (remainingSeconds / timeoutSeconds) * 100;

        // Status thresholds encode the escalating urgency levels: plain countdown,
        // then "warning" near 25%/3min left, then "critical" near 10%/1min left,
        // then a terminal "expired" state once time has fully run out.
        if (remainingSeconds <= 0) {
            return {
                color: theme.palette.error.main,
                bgColor: alpha(theme.palette.error.main, 0.1),
                status: 'expired',
                icon: <TimerOffIcon />,
            };
        } else if (percentRemaining <= 10 || remainingSeconds <= 60) {
            return {
                color: theme.palette.error.main,
                bgColor: alpha(theme.palette.error.main, 0.1),
                status: 'critical',
                icon: <WarningAmberIcon />,
            };
        } else if (percentRemaining <= 25 || remainingSeconds <= 180) {
            return {
                color: theme.palette.warning.main,
                bgColor: alpha(theme.palette.warning.main, 0.1),
                status: 'warning',
                icon: <WarningAmberIcon />,
            };
        } else {
            return {
                color: theme.palette.success.main,
                bgColor: alpha(theme.palette.success.main, 0.1),
                status: 'normal',
                icon: <AccessTimeIcon />,
            };
        }
    }, [remainingSeconds, timeoutSeconds, theme]);

    // Timer effect
    // Re-arms a 1-second interval whenever `isActive`, `remainingSeconds`, or
    // `onTimeout` change; ticks the countdown down by one second, firing
    // `onTimeout` exactly once when it reaches zero. Cleanup clears the interval
    // so re-renders (and unmount) never leave a stray timer running.
    useEffect(() => {
        if (!isActive || remainingSeconds <= 0) return;

        const interval = setInterval(() => {
            setRemainingSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onTimeout?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive, remainingSeconds, onTimeout]);

    // Warning threshold effect
    // Runs on every remainingSeconds change; the moment the countdown first
    // drops to/below `warningThreshold`, fires `onWarning` once and flips
    // `warningTriggered` so it never fires again for this timer run.
    useEffect(() => {
        if (
            !warningTriggered &&
            remainingSeconds <= warningThreshold &&
            remainingSeconds > 0 &&
            onWarning
        ) {
            setWarningTriggered(true);
            onWarning(remainingSeconds);
        }
    }, [remainingSeconds, warningThreshold, warningTriggered, onWarning]);

    // Reset timer when timeoutSeconds changes
    // Runs only when `timeoutSeconds` itself changes (e.g. a new task with a
    // different timeout is assigned), restarting the countdown from full and
    // clearing the warning-fired flag so the new run can warn again.
    useEffect(() => {
        setRemainingSeconds(timeoutSeconds);
        setWarningTriggered(false);
    }, [timeoutSeconds]);

    const timerStatus = getTimerStatus();
    const formattedTime = formatTime(remainingSeconds);

    // Size configurations
    const sizeConfig = {
        small: {
            iconSize: 14,
            fontSize: '0.7rem',
            labelSize: '0.6rem',
            padding: '2px 8px',
            chipHeight: 22,
        },
        medium: {
            iconSize: 18,
            fontSize: '0.85rem',
            labelSize: '0.7rem',
            padding: '4px 12px',
            chipHeight: 28,
        },
        large: {
            iconSize: 24,
            fontSize: '1.1rem',
            labelSize: '0.8rem',
            padding: '8px 16px',
            chipHeight: 36,
        },
    };

    const config = sizeConfig[size];

    // Chip variant
    if (variant === 'chip') {
        return (
            <Chip
                icon={
                    <Box
                        component="span"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            color: timerStatus.color,
                            '& svg': { fontSize: config.iconSize },
                            animation: timerStatus.status === 'critical' ? 'pulse 1s infinite' : 'none',
                            '@keyframes pulse': {
                                '0%, 100%': { opacity: 1 },
                                '50%': { opacity: 0.5 },
                            },
                        }}
                    >
                        {timerStatus.icon}
                    </Box>
                }
                label={
                    <Typography
                        component="span"
                        sx={{
                            fontWeight: 700,
                            fontSize: config.fontSize,
                            fontFamily: 'monospace',
                            color: timerStatus.color,
                        }}
                    >
                        {formattedTime}
                    </Typography>
                }
                sx={{
                    height: config.chipHeight,
                    backgroundColor: timerStatus.bgColor,
                    border: `1px solid ${alpha(timerStatus.color, 0.3)}`,
                    '& .MuiChip-icon': {
                        marginLeft: '8px',
                        marginRight: '-4px',
                    },
                    transition: 'all 0.3s ease',
                    animation: timerStatus.status === 'critical' ? 'shake 0.5s infinite' : 'none',
                    '@keyframes shake': {
                        '0%, 100%': { transform: 'translateX(0)' },
                        '25%': { transform: 'translateX(-2px)' },
                        '75%': { transform: 'translateX(2px)' },
                    },
                }}
            />
        );
    }

    // Inline variant
    if (variant === 'inline') {
        return (
            <Box
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    backgroundColor: timerStatus.bgColor,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: timerStatus.color,
                        '& svg': { fontSize: config.iconSize },
                    }}
                >
                    {timerStatus.icon}
                </Box>
                <Typography
                    sx={{
                        fontWeight: 600,
                        fontSize: config.fontSize,
                        fontFamily: 'monospace',
                        color: timerStatus.color,
                    }}
                >
                    {formattedTime}
                </Typography>
            </Box>
        );
    }

    // Card variant (full display)
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                p: 1.5,
                borderRadius: 2,
                backgroundColor: timerStatus.bgColor,
                border: `1px solid ${alpha(timerStatus.color, 0.2)}`,
                minWidth: 120,
                transition: 'all 0.3s ease',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: timerStatus.color,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        '& svg': { fontSize: config.iconSize },
                        animation: timerStatus.status === 'critical' ? 'pulse 1s infinite' : 'none',
                        '@keyframes pulse': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0.5 },
                        },
                    }}
                >
                    {timerStatus.icon}
                </Box>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        fontSize: config.labelSize,
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                    }}
                >
                    {label}
                </Typography>
            </Box>
            <Typography
                sx={{
                    fontWeight: 700,
                    fontSize: size === 'large' ? '1.5rem' : '1.1rem',
                    fontFamily: 'monospace',
                    color: timerStatus.color,
                    lineHeight: 1,
                }}
            >
                {formattedTime}
            </Typography>
            {timerStatus.status === 'expired' && (
                <Typography
                    variant="caption"
                    sx={{
                        color: theme.palette.error.main,
                        fontWeight: 600,
                        fontSize: '0.65rem',
                    }}
                >
                    Time Expired
                </Typography>
            )}
        </Box>
    );
};

export default TaskTimer;
