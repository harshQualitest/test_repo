import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, useTheme, alpha, Stack } from '@mui/material';
import {
    Home as HomeIcon,
    ArrowBack as ArrowBackIcon,
    SearchOff as SearchOffIcon,
} from '@mui/icons-material';

/**
 * Component: PageNotFound
 *
 * Purpose: Generic 404 "not found" page shown by the router for any
 * unmatched route. Purely presentational — no data fetching or state beyond
 * navigation handlers.
 *
 * Responsibilities:
 * - Displays a themed 404 illustration/message.
 * - Offers "Go to Home" (navigate to `/`) and "Go Back" (browser history back) actions.
 *
 * Major child components: none (all MUI primitives).
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const PageNotFound = () => {
    const theme = useTheme();
    const navigate = useNavigate();

    /** Navigates to the app's home route. Triggered by the "Go to Home" button. */
    const handleGoHome = () => {
        navigate('/');
    };

    /** Navigates back one entry in browser history. Triggered by the "Go Back" button. */
    const handleGoBack = () => {
        navigate(-1);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                    theme.palette.mode === 'light'
                        ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(
                              theme.palette.secondary.main,
                              0.1,
                          )} 100%)`
                        : `linear-gradient(135deg, ${alpha(theme.palette.background.default, 0.9)} 0%, ${alpha(
                              theme.palette.grey[900],
                              0.9,
                          )} 100%)`,
                px: { xs: 2, sm: 4 },
                py: 4,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Decorative circles */}
            <Box
                sx={{
                    position: 'absolute',
                    top: '-10%',
                    right: '-5%',
                    width: { xs: 200, md: 400 },
                    height: { xs: 200, md: 400 },
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.15)} 0%, transparent 70%)`,
                    animation: 'pulse 8s ease-in-out infinite',
                    '@keyframes pulse': {
                        '0%, 100%': { transform: 'scale(1)' },
                        '50%': { transform: 'scale(1.1)' },
                    },
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    bottom: '-10%',
                    left: '-5%',
                    width: { xs: 250, md: 500 },
                    height: { xs: 250, md: 500 },
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.15)} 0%, transparent 70%)`,
                    animation: 'pulse 6s ease-in-out infinite',
                }}
            />

            {/* Main content */}
            <Box
                sx={{
                    textAlign: 'center',
                    zIndex: 1,
                    maxWidth: 600,
                    position: 'relative',
                }}
            >
                {/* 404 Icon */}
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: { xs: 120, md: 160 },
                        height: { xs: 120, md: 160 },
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        boxShadow: `0 20px 60px ${alpha(theme.palette.primary.main, 0.4)}`,
                        mb: 4,
                        animation: 'float 3s ease-in-out infinite',
                        '@keyframes float': {
                            '0%, 100%': { transform: 'translateY(0px)' },
                            '50%': { transform: 'translateY(-20px)' },
                        },
                    }}
                >
                    <SearchOffIcon
                        sx={{
                            fontSize: { xs: 60, md: 80 },
                            color: 'white',
                        }}
                    />
                </Box>

                {/* 404 Text */}
                <Typography
                    variant="h1"
                    sx={{
                        fontSize: { xs: '5rem', sm: '7rem', md: '9rem' },
                        fontWeight: 900,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: 1,
                        mb: 2,
                        letterSpacing: '-0.02em',
                    }}
                >
                    404
                </Typography>

                {/* Title */}
                <Typography
                    variant="h3"
                    sx={{
                        fontWeight: 700,
                        mb: 2,
                        fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
                    }}
                >
                    Page Not Found
                </Typography>

                {/* Description */}
                <Typography
                    variant="h6"
                    color="text.secondary"
                    sx={{
                        mb: 5,
                        fontSize: { xs: '1rem', sm: '1.15rem' },
                        lineHeight: 1.7,
                        maxWidth: 500,
                        mx: 'auto',
                    }}
                >
                    Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
                </Typography>

                {/* Action buttons */}
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    sx={{
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<HomeIcon />}
                        onClick={handleGoHome}
                        sx={{
                            borderRadius: 3,
                            px: 4,
                            py: 1.5,
                            fontWeight: 600,
                            fontSize: '1rem',
                            minWidth: { xs: '100%', sm: 200 },
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.4)}`,
                            },
                        }}
                    >
                        Go to Home
                    </Button>

                    <Button
                        variant="outlined"
                        size="large"
                        startIcon={<ArrowBackIcon />}
                        onClick={handleGoBack}
                        sx={{
                            borderRadius: 3,
                            px: 4,
                            py: 1.5,
                            fontWeight: 600,
                            fontSize: '1rem',
                            minWidth: { xs: '100%', sm: 200 },
                            borderWidth: 2,
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                borderWidth: 2,
                                borderColor: theme.palette.primary.main,
                                background: alpha(theme.palette.primary.main, 0.1),
                                transform: 'translateY(-2px)',
                            },
                        }}
                    >
                        Go Back
                    </Button>
                </Stack>

                {/* Additional info */}
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                        mt: 6,
                        fontSize: '0.875rem',
                    }}
                >
                    Error Code: 404 | Page Not Found
                </Typography>
            </Box>
        </Box>
    );
};

export default PageNotFound;