/**
 * Purpose: Accessor hook for the app's global toast/snackbar notification
 * system (`components/shared/ToastBar`'s context). Per project convention,
 * this is how pages/components surface user-visible success/error/warning/
 * info messages — use `showSuccess`/`showError`/`showWarning`/`showInfo`
 * from this hook instead of rolling a local snackbar or `alert()`.
 */
import { useContext } from 'react';
import { ToastContext } from '../components/shared/ToastBar';
import type { ToastContextType } from '../components/shared/ToastBar';

/**
 * Custom hook to use toast
 * @returns The toast context: `{ showSuccess, showError, showWarning, showInfo }`,
 * each accepting `(message: string, duration?: number)`.
 * @throws {Error} If called outside a `ToastProvider` — this is a programming error
 * (missing provider in the tree), not a runtime condition to catch and recover from.
 */
export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export default useToast;
