import { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Stack,
    TextField,
    Avatar,
    useTheme,
    alpha,
    Divider,
    CircularProgress,
} from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { selectUser, updateUserProfile } from '../redux/slices/loginSlice';
import { useToast } from '../hooks/useToast';
import userApi from '../services/api/usersApi';

/**
 * Component: Settings
 *
 * Purpose: "My Profile" settings page allowing the current user to view
 * their account details (email, role) and edit their display name.
 *
 * Responsibilities:
 * - Splits the user's stored full name into editable first/last name fields.
 * - Saves the combined name via the users API and syncs it back into Redux.
 * - Shows read-only email and role fields (not user-editable).
 *
 * Props: none (route component).
 *
 * State:
 * - `firstName` / `lastName` - editable name fields, seeded from the current user.
 * - `isLoading` - whether the profile-save request is in flight.
 *
 * Redux (loginSlice): `selectUser` selector; `updateUserProfile` action
 * (dispatched after a successful save to keep the store in sync).
 *
 * Custom hooks: `useToast` (showSuccess/showError).
 *
 * API calls: `userApi.updateUser({ name })` (direct call, not via a thunk).
 *
 * Major child components: none (all MUI primitives).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const Settings = () => {
    const theme = useTheme();
    const user = useAppSelector(selectUser);
    const dispatch = useAppDispatch();
    const { showSuccess, showError } = useToast();

    const [firstName, setFirstName] = useState(user?.name?.split(' ')[0] || '');
    const [lastName, setLastName] = useState(user?.name?.split(' ').slice(1).join(' ') || '');
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Derives up to 2 uppercase initials from a display name for the avatar.
     * Splits on common name separators (space, dot, underscore, hyphen); if
     * only one "part" is found, falls back to the first two characters.
     * @param name - The display name to derive initials from.
     * @returns A 1-2 character uppercase initials string (or 'U' if empty).
     */
    const getInitials = (name: string): string => {
        if (!name) return 'U';
        const parts = name.split(/[._-\s]+/);
        if (parts.length >= 2) {
            return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Falls back through name -> username -> email -> 'Guest' so the header
    // always has something sensible to display.
    const displayName = user?.name || user?.username || user?.email || 'Guest';
    const avatarInitials = getInitials(displayName);
    const userEmail = user?.email || '';
    const userRole = user?.organization?.role || user?.role || 'User';

    /**
     * Triggered by the "Save Changes" button. Validates that a first name is
     * present, combines first/last name, calls the update-user API, and on
     * success syncs the returned user record into Redux via `updateUserProfile`.
     */
    const handleSaveChanges = async () => {
        // Validate that at least first name is provided
        if (!firstName.trim()) {
            showError('First name is required');
            return;
        }

        setIsLoading(true);
        
        try {
            // Combine first name and last name
            const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
            
            // Call the update API
            const response = await userApi.updateUser({ name: fullName });
            
            // Update Redux store with new user data
            if (response.data) {
                dispatch(updateUserProfile(response.data));
            }
            
            showSuccess('Profile updated successfully!');
        } catch (error: any) {
            console.error('Failed to update profile:', error);
            const errorMessage = error?.response?.data?.error || 
                               error?.response?.data?.message || 
                               'Failed to update profile. Please try again.';
            showError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ px: { xs: 3, md: 4 }, py: 2, width: '100%' }}>
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
                justifyContent="space-between"
                sx={{ mt: 4 }}
            >
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        My Profile
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1 }}>
                        Manage your personal information and profile settings
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SaveRoundedIcon />}
                    onClick={handleSaveChanges}
                    disabled={isLoading}
                    sx={{
                        borderRadius: 3,
                        px: 3,
                        py: 1.5,
                        boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.25)}`,
                        '&.Mui-disabled': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.5),
                            color: 'white',
                        },
                    }}
                >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
            </Stack>

            <Stack spacing={4} sx={{ mt: 4 }}>
                {/* Profile Information Section */}
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: 4,
                        p: 4,
                        bgcolor: theme.palette.mode === 'light' ? '#fff' : alpha(theme.palette.background.paper, 0.85),
                        boxShadow: theme.palette.mode === 'dark' ? `0 24px 48px rgba(0,0,0,0.42)` : theme.shadows[6],
                        border: `1px solid ${alpha(
                            theme.palette.divider,
                            theme.palette.mode === 'dark' ? 0.4 : 0.2,
                        )}`,
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 3,
                                display: 'grid',
                                placeItems: 'center',
                                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                            }}
                        >
                            <PersonRoundedIcon />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Profile Information
                        </Typography>
                    </Stack>

                    {/* Profile Photo and Basic Info */}
                    <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 4 }}>
                        <Box sx={{ position: 'relative' }}>
                            <Avatar
                                sx={{
                                    width: 100,
                                    height: 100,
                                    fontSize: 40,
                                    fontWeight: 700,
                                    bgcolor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                }}
                            >
                                {avatarInitials}
                            </Avatar>
                            {/* <IconButton
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    width: 36,
                                    height: 36,
                                    backgroundColor: theme.palette.primary.main,
                                    color: 'white',
                                    boxShadow: theme.shadows[4],
                                    '&:hover': {
                                        backgroundColor: theme.palette.primary.dark,
                                    },
                                }}
                            >
                                <PhotoCameraRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton> */}
                        </Box>
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {displayName}
                            </Typography>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <EmailRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {userEmail}
                                    </Typography>
                                </Stack>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    •
                                </Typography>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <BadgeRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'text.secondary',
                                            textTransform: 'capitalize',
                                        }}
                                    >
                                        {userRole.replace(/_/g, ' ')}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>

                    <Divider sx={{ mb: 3 }} />

                    {/* Editable Fields */}
                    <Stack spacing={3}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                            <TextField
                                label="First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                fullWidth
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    },
                                }}
                            />
                            <TextField
                                label="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                fullWidth
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    },
                                }}
                            />
                        </Stack>
                        <TextField
                            label="Email Address"
                            value={userEmail}
                            fullWidth
                            variant="outlined"
                            disabled
                            helperText="Email cannot be changed"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                },
                            }}
                        />
                        <TextField
                            label="Role"
                            value={userRole.replace(/_/g, ' ')}
                            fullWidth
                            variant="outlined"
                            disabled
                            helperText="Role is assigned by your organization"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                },
                                '& .MuiInputBase-input': {
                                    textTransform: 'capitalize',
                                },
                            }}
                        />
                    </Stack>
                </Paper>
            </Stack>
        </Box>
    );
};

export default Settings;
