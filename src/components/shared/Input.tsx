import React, { forwardRef, useMemo, useCallback } from 'react';
import {
	TextField,
	InputAdornment,
	IconButton,
	useTheme,
	alpha,
} from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

/**
 * Prop contract for the shared `Input` component. Extends MUI's `TextFieldProps`
 * (minus `variant`, redeclared here with a narrower type) with project-specific
 * conveniences: password visibility toggle, start/end icons, max-length
 * enforcement, and an optional character counter merged into helper text.
 */
export interface InputProps extends Omit<TextFieldProps, 'variant'> {
	/** The input variant - outlined, filled, or standard */
	variant?: 'outlined' | 'filled' | 'standard';
	/** Whether this is a password field with toggle visibility */
	isPassword?: boolean;
	/** Icon to display at the start of the input */
	startIcon?: React.ReactNode;
	/** Icon to display at the end of the input */
	endIcon?: React.ReactNode;
	/** Custom placeholder text */
	placeholder?: string;
	/** Whether the input should have focus on mount */
	autoFocus?: boolean;
	/** Custom error state */
	error?: boolean;
	/** Helper text to display below the input */
	helperText?: string;
	/** Whether the input is required */
	required?: boolean;
	/** Whether the input is disabled */
	disabled?: boolean;
	/** Whether the input is read-only */
	readOnly?: boolean;
	/** Maximum length of input */
	maxLength?: number;
	/** Minimum length of input */
	minLength?: number;
	/** Input size */
	size?: 'small' | 'medium';
	/** Whether to show character count */
	showCharCount?: boolean;
}

/**
 * Component: Input
 *
 * Purpose: Shared, theme-aware text field wrapping MUI's `TextField`, used
 * throughout forms (typically with Formik) wherever a styled input is needed.
 * Adds password-visibility toggling, optional start/end icons, max-length
 * enforcement, and an optional live character counter.
 *
 * Responsibilities:
 * - Forward a ref to the underlying `<input>` element (via `forwardRef`) so
 *   parent forms (e.g. Formik) can focus/manage it directly.
 * - Toggle masked/plain text rendering for password fields.
 * - Block keystrokes beyond `maxLength` rather than truncating after the fact.
 * - Merge `helperText` and the character counter into a single helper string.
 * - Apply consistent focus/hover/error/autofill theming across variants.
 *
 * Props: see `InputProps` above (variant, isPassword, startIcon/endIcon,
 * maxLength/minLength, showCharCount, plus all standard `TextFieldProps`).
 *
 * State:
 * - `showPassword: boolean` — whether a password field currently renders as
 *   plain text; toggled by the visibility icon button.
 *
 * Business logic: When `isPassword` is true, the end adornment is always the
 * visibility toggle (an explicit `endIcon` is ignored in that case) — see
 * `endAdornment` below.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			variant = 'outlined',
			isPassword = false,
			startIcon,
			endIcon,
			placeholder,
			error = false,
			helperText,
			required = false,
			disabled = false,
			readOnly = false,
			maxLength,
			minLength,
			size = 'medium',
			showCharCount = false,
			value = '',
			onChange,
			...props
		},
		ref
	) => {
		const theme = useTheme();
		const [showPassword, setShowPassword] = React.useState(false);

		/**
		 * Flips the password field between masked and plain-text display.
		 * Memoized (no deps) since it only depends on the state setter, which
		 * React guarantees is stable — keeps the adornment's onClick reference stable.
		 */
		const handleTogglePassword = useCallback(() => {
			setShowPassword((prev) => !prev);
		}, []);

		/**
		 * Change handler wrapping the caller-supplied `onChange`. Enforces
		 * `maxLength` by rejecting the change entirely once exceeded (rather than
		 * truncating), which avoids the input briefly showing then snapping back.
		 * @param event - Native change event from the underlying input.
		 */
		const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = event.target.value;
			
			// Enforce max length if specified
			if (maxLength && newValue.length > maxLength) {
				return;
			}

			if (onChange) {
				onChange(event);
			}
		}, [maxLength, onChange]);

	// Memoize character count calculation
	// Recomputed only when showCharCount/value/maxLength change; formats as
	// "current/max" when a max is set, otherwise just the current length.
	const characterCount = useMemo(() => {
		if (!showCharCount) return '';
		const stringValue = typeof value === 'string' ? value : '';
		const currentLength = stringValue.length;
		return maxLength ? `${currentLength}/${maxLength}` : currentLength.toString();
	}, [showCharCount, value, maxLength]);

	// Memoize helper text
	// Combines caller-supplied helperText with the character counter into one
	// string (separated by a bullet) so TextField only needs a single helperText slot.
	const displayHelperText = useMemo(() => {
		if (!helperText && !characterCount) return undefined;
		if (helperText && characterCount) return `${helperText} • ${characterCount}`;
		return helperText || characterCount;
	}, [helperText, characterCount]);

		// Memoize input type
		// Password fields need to switch the native input type between 'password'
		// and 'text' as showPassword toggles; otherwise pass through the caller's type.
		const inputType = useMemo(() => {
			if (isPassword) return showPassword ? 'text' : 'password';
			return props.type;
		}, [isPassword, showPassword, props.type]);

		// Memoize start adornment
		const startAdornment = useMemo(() => {
			if (!startIcon) return undefined;
			return <InputAdornment position="start">{startIcon}</InputAdornment>;
		}, [startIcon]);

		// Memoize end adornment
		// Password fields always get the visibility-toggle icon button here,
		// taking precedence over any caller-supplied endIcon (see component doc above).
		const endAdornment = useMemo(() => {
			if (isPassword) {
				return (
					<InputAdornment position="end">
						<IconButton
							aria-label="toggle password visibility"
							onClick={handleTogglePassword}
							onMouseDown={(e) => e.preventDefault()}
							edge="end"
							size="small"
							disabled={disabled}
						>
							{showPassword ? <VisibilityOff /> : <Visibility />}
						</IconButton>
					</InputAdornment>
				);
			}
			if (endIcon) {
				return <InputAdornment position="end">{endIcon}</InputAdornment>;
			}
			return undefined;
		}, [isPassword, endIcon, showPassword, disabled, handleTogglePassword]);

		return (
			<TextField
				{...props}
				ref={ref}
				variant={variant}
				type={inputType}
				placeholder={placeholder}
				value={value}
				onChange={handleChange}
				error={error}
				helperText={displayHelperText}
				required={required}
				disabled={disabled}
				size={size}
				slotProps={{
					input: {
						readOnly,
						startAdornment,
						endAdornment,
					},
					htmlInput: {
						minLength,
						maxLength,
					},
				}}
				sx={{
					'& .MuiOutlinedInput-root': {
						borderRadius: 2,
						transition: theme.transitions.create(['border-color', 'box-shadow'], {
							duration: theme.transitions.duration.shorter,
						}),
						'&:hover': {
							'& .MuiOutlinedInput-notchedOutline': {
								borderColor: alpha(theme.palette.primary.main, 0.5),
							},
						},
						'&.Mui-focused': {
							'& .MuiOutlinedInput-notchedOutline': {
								borderWidth: 2,
								borderColor: theme.palette.primary.main,
							},
							boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
						},
						'&.Mui-error': {
							'& .MuiOutlinedInput-notchedOutline': {
								borderColor: theme.palette.error.main,
							},
							'&.Mui-focused': {
								boxShadow: `0 0 0 3px ${alpha(theme.palette.error.main, 0.1)}`,
							},
						},
					},
					'& .MuiFilledInput-root': {
						borderRadius: 2,
						backgroundColor: alpha(theme.palette.background.paper, 0.8),
						'&:hover': {
							backgroundColor: alpha(theme.palette.background.paper, 0.9),
						},
						'&.Mui-focused': {
							backgroundColor: alpha(theme.palette.background.paper, 1),
							boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
						},
					},
					'& .MuiInput-root': {
						'&:before': {
							borderBottomColor: alpha(theme.palette.divider, 0.5),
						},
						'&:hover:not(.Mui-disabled):before': {
							borderBottomColor: alpha(theme.palette.primary.main, 0.5),
						},
						'&.Mui-focused:after': {
							borderBottomColor: theme.palette.primary.main,
						},
					},
					'& .MuiFormHelperText-root': {
						fontSize: '0.75rem',
						marginTop: 1,
					},
					// Override autofill styles to maintain theme colors
					'& input:-webkit-autofill': {
						WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset !important`,
						WebkitTextFillColor: `${theme.palette.text.primary} !important`,
						caretColor: theme.palette.text.primary,
						borderRadius: 'inherit',
					},
					'& input:-webkit-autofill:hover': {
						WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset !important`,
						WebkitTextFillColor: `${theme.palette.text.primary} !important`,
					},
					'& input:-webkit-autofill:focus': {
						WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset !important`,
						WebkitTextFillColor: `${theme.palette.text.primary} !important`,
					},
					'& input:-webkit-autofill:active': {
						WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset !important`,
						WebkitTextFillColor: `${theme.palette.text.primary} !important`,
					},
					...props.sx,
				}}
			/>
		);
	}
);

Input.displayName = 'Input';

export default Input;