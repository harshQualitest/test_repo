import {
    AppBar,
    Avatar,
    // Badge,
    Box,
    IconButton,
    // InputBase,
    Toolbar,
    Typography,
    alpha,
    useTheme,
    Menu,
    MenuItem,
} from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { selectUser, logoutUser } from '../../redux/slices/loginSlice';

type HeaderProps = {
    onToggleMenu: () => void;
    offsetLeft: number;
    isDesktop: boolean;
};

/**
 * Component: Header
 *
 * Purpose: Fixed top app bar shown across authenticated pages. Displays the
 * mobile nav toggle, the logged-in user's avatar/name, and a user menu with
 * links to Profile settings and Logout.
 *
 * Responsibilities:
 * - Shift/resize itself to make room for the sidenav on desktop (`offsetLeft`).
 * - Show a hamburger menu toggle only on non-desktop viewports.
 * - Derive and display the current user's display name and avatar initials.
 * - Open/close a user dropdown menu and handle logout.
 *
 * Props:
 * - `onToggleMenu: () => void` — invoked to open/close the mobile sidenav.
 * - `offsetLeft: number` — pixel width of the desktop sidenav, used to offset
 *   this app bar so it doesn't sit under it.
 * - `isDesktop: boolean` — controls whether the mobile menu toggle button
 *   is rendered.
 *
 * State:
 * - `anchorEl: null | HTMLElement` — anchor element for the MUI `Menu`;
 *   non-null while the user dropdown is open.
 *
 * Redux: `useAppSelector(selectUser)` reads the logged-in user from the
 * `loginSlice`; `useAppDispatch` dispatches `logoutUser()` (thunk) on logout.
 *
 * Major child components rendered: MUI `AppBar`/`Toolbar`, `Avatar`, `Menu`/
 * `MenuItem` (Profile link, Logout action).
 *
 * Business logic: Logout always navigates to `/login` even if the server-side
 * logout call fails, because `logoutUser()` already clears the local session
 * — see `handleLogout` below.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const Header = ({ onToggleMenu, offsetLeft, isDesktop }: HeaderProps) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const surfaceColor = alpha(theme.palette.background.paper, 0.95);
    const borderColor = alpha(theme.palette.divider, 0.3);

    // Get user data from Redux
    const user = useAppSelector(selectUser);

    /**
     * Derives up to two-letter avatar initials from a display name.
     * @param name - Full display name (or username/email) to abbreviate.
     * @returns Uppercase 1-2 letter initials, or 'U' if `name` is falsy.
     */
    // Helper function to get initials from name
    const getInitials = (name: string): string => {
        if (!name) return 'U';

        // Split name by spaces or common separators
        const parts = name.split(/[._-\s]+/);

        if (parts.length >= 2) {
            // If we have multiple parts, use first two
            return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
        } else {
            // If single word, use first two characters
            return name.substring(0, 2).toUpperCase();
        }
    };

    // Display name and initials - prefer name over username, fallback to email
    const displayName = user?.name || user?.username || user?.email || 'Guest';
    const avatarInitials = getInitials(displayName);

    // Handle user menu
    /**
     * Opens the user dropdown menu, anchored to the clicked element.
     * @param event - Click event from the avatar icon button.
     */
    const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    /** Closes the user dropdown menu by clearing its anchor element. */
    const handleUserMenuClose = () => {
        setAnchorEl(null);
    };

    // Handle logout
    /**
     * Logs the current user out: dispatches the `logoutUser` thunk, then
     * navigates to `/login` regardless of outcome. The server-side call may
     * fail (network/server error), but the local session is already cleared
     * by the thunk, so navigation proceeds either way (see `finally` below).
     */
    const handleLogout = async () => {
        try {
            await dispatch(logoutUser()).unwrap();
        } catch {
            // Server-side logout failed — local session is already cleared by the thunk.
        } finally {
            handleUserMenuClose();
            navigate('/login', { replace: true });
        }
    };

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                backdropFilter: 'blur(16px)',
                backgroundColor: surfaceColor,
                color: theme.palette.text.primary,
                borderBottom: `1px solid ${borderColor}`,
                boxShadow: theme.shadows[2],
                width: {
                    xs: '100%',
                    lg: `calc(100% - ${offsetLeft}px)`,
                },
                ml: { lg: `${offsetLeft}px` },
                transition: theme.transitions.create(['width', 'margin'], {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.shorter,
                }),
            }}
        >
            <Toolbar sx={{ gap: 2, justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Hamburger toggle only needed on mobile/tablet — desktop shows the persistent sidenav instead */}
                    {!isDesktop && (
                        <IconButton edge="start" onClick={onToggleMenu} size="large">
                            <MenuRoundedIcon />
                        </IconButton>
                    )}

                    {/* Search Box */}
                    {/* <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            px: 2,
                            py: 1,
                            borderRadius: 999,
                            backgroundColor: searchBackground,
                            width: {
                                xs: 200,
                                sm: 300,
                                md: 360,
                            },
                        }}
                    >
                        <SearchRoundedIcon fontSize="small" sx={{ color: searchColor, opacity: 0.8 }} />
                        <InputBase
                            placeholder="Search workspaces, projects, datasets..."
                            sx={{ width: '100%', color: searchColor }}
                        />
                    </Box> */}
                </Box>

                {/* Right side - Actions and User */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {/* <IconButton size="large">
                        <Badge color="error" variant="dot">
                            <NotificationsRoundedIcon />
                        </Badge>
                    </IconButton> */}

                    {/* <Link to="/settings">
                        <IconButton size="large">
                            <SettingsRoundedIcon />
                        </IconButton>
                    </Link> */}

                    {/* User Section */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 1 }}>
                        <IconButton onClick={handleUserMenuOpen} sx={{ p: 0 }}>
                            <Avatar
                                sx={{
                                    width: 40,
                                    height: 40,
                                    bgcolor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                    fontWeight: 600,
                                    fontSize: 14,
                                    cursor: 'pointer',
                                }}
                            >
                                {avatarInitials}
                            </Avatar>
                        </IconButton>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 500,
                                color: theme.palette.text.primary,
                                display: { xs: 'none', sm: 'block' },
                            }}
                        >
                            {displayName}
                        </Typography>

                        {/* User Menu */}
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleUserMenuClose}
                            onClick={handleUserMenuClose}
                            slotProps={{
                                paper: {
                                    elevation: 3,
                                    sx: {
                                        mt: 1.5,
                                        minWidth: 180,
                                        borderRadius: 2,
                                        '& .MuiMenuItem-root': {
                                            px: 2,
                                            py: 1,
                                            borderRadius: 1,
                                            margin: '2px 8px',
                                        },
                                    },
                                },
                            }}
                        >
                            <MenuItem component={Link} to="/settings">
                                <PersonRoundedIcon sx={{ mr: 1, fontSize: 20 }} />
                                Profile
                            </MenuItem>
                            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                                <LogoutRoundedIcon sx={{ mr: 1, fontSize: 20 }} />
                                Logout
                            </MenuItem>
                        </Menu>
                    </Box>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
