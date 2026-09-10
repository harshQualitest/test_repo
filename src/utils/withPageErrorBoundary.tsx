/**
 * Utility function to wrap page components with PageErrorBoundary
 * 
 * This is a helper for quickly wrapping existing page components.
 * 
 * Usage:
 * 
 * // Before:
 * const MyPage = () => {
 *     return <div>Content</div>;
 * };
 * export default MyPage;
 * 
 * // After:
 * import { withPageErrorBoundary } from '../utils/withPageErrorBoundary';
 * 
 * const MyPage = () => {
 *     return <div>Content</div>;
 * };
 * 
 * export default withPageErrorBoundary(MyPage, 'My Page');
 *
 * Purpose (HOC contract): every routable page in this app should be wrapped
 * with this so an uncaught render error in one page shows a page-scoped
 * fallback (via `PageErrorBoundary`) instead of crashing/blanking the whole
 * SPA. All props given to the wrapped component are passed through unchanged
 * to the original `Component` — this HOC only adds the boundary around it,
 * it does not intercept or transform props.
 */

import type { ComponentType } from 'react';
import PageErrorBoundary from '../components/common/PageErrorBoundary';

/**
 * Wraps a page component in a `PageErrorBoundary` so render errors are caught
 * and shown as a page-scoped fallback UI rather than crashing the app.
 * @param Component - The page component to wrap. All props `P` are forwarded to it unchanged.
 * @param pageName - Human-readable page name shown in the error boundary's fallback UI
 * (and used in its error logging).
 * @returns A new component with the same prop type `P` as `Component`, rendering
 * `Component` inside `PageErrorBoundary`. On an uncaught error during render,
 * `PageErrorBoundary` renders its "Unable to Load {pageName}" fallback instead of `Component`.
 */
export function withPageErrorBoundary<P extends object>(
    Component: ComponentType<P>,
    pageName: string
): ComponentType<P> {
    const WrappedComponent = (props: P) => {
        return (
            <PageErrorBoundary pageName={pageName}>
                <Component {...props} />
            </PageErrorBoundary>
        );
    };

    // Preserves a readable component name in React DevTools / error stacks,
    // e.g. "withPageErrorBoundary(MyPage)" instead of an anonymous function.
    WrappedComponent.displayName = `withPageErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

    return WrappedComponent;
}
