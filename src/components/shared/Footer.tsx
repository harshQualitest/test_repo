import { 
	Box, 
	Link, 
	Typography, 
	alpha, 
	useTheme, 
	Stack
} from "@mui/material";

/**
 * Component: Footer
 *
 * Purpose: Static site footer shown at the bottom of the app layout, displaying
 * the brand name/copyright and a row of placeholder legal/support links.
 *
 * Responsibilities:
 * - Render brand name and a copyright line using the current year.
 * - Render Privacy/Terms/Support links (currently `href="#"` placeholders).
 * - Adapt layout responsively (column on `xs`, row on `md`+).
 *
 * Props: none.
 *
 * State: none.
 *
 * Business logic: `currentYear` is computed once per render from `Date`, not
 * stored in state, since it only needs to reflect "now" whenever this renders.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const Footer = () => {
	const theme = useTheme();
	// Current year for the copyright line; recalculated on every render (no
	// need to memoize — this is cheap and the value only changes across years).
	const currentYear = new Date().getFullYear();

	return (
		<Box
			component="footer"
			sx={{
				mt: 6,
				borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
				py: 3,
			}}
		>
			<Box
				sx={{
					display: "flex",
					flexDirection: { xs: "column", md: "row" },
					justifyContent: "space-between",
					alignItems: { xs: "flex-start", md: "center" },
					gap: 2,
					maxWidth: 1200,
					mx: "auto",
					px: 3,
				}}
			>
				{/* Brand Section */}
				<Stack spacing={1}>
					<Typography 
						variant="h6" 
						sx={{ 
							fontWeight: 600,
							color: 'text.primary',
						}}
					>
						Qualicollect
					</Typography>
					<Typography variant="body2" color="text.secondary">
						© {currentYear} Qualicollect. Crafted with care for product teams.
					</Typography>
				</Stack>

				{/* Links Section */}
				<Stack 
					direction="row" 
					spacing={3}
					sx={{ 
						flexWrap: 'wrap',
						gap: { xs: 2, sm: 3 }
					}}
				>
					<Link 
						href="#" 
						underline="hover" 
						color="text.secondary" 
						variant="body2"
						sx={{
							transition: 'color 0.2s ease-in-out',
							'&:hover': {
								color: 'primary.main',
							},
						}}
					>
						Privacy
					</Link>
					<Link 
						href="#" 
						underline="hover" 
						color="text.secondary" 
						variant="body2"
						sx={{
							transition: 'color 0.2s ease-in-out',
							'&:hover': {
								color: 'primary.main',
							},
						}}
					>
						Terms
					</Link>
					<Link 
						href="#" 
						underline="hover" 
						color="text.secondary" 
						variant="body2"
						sx={{
							transition: 'color 0.2s ease-in-out',
							'&:hover': {
								color: 'primary.main',
							},
						}}
					>
						Support
					</Link>
				</Stack>
			</Box>
		</Box>
	);
};

export default Footer;
