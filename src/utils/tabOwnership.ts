/**
 * Purpose: Tab Ownership — prevents duplicate browser tabs from inheriting an
 * authenticated session (e.g. via browser "duplicate tab" or session restore),
 * which would otherwise let two tabs silently share one session's tokens.
 * Coordinates ownership across tabs using `BroadcastChannel` plus a
 * per-runtime id stashed in `sessionStorage`.
 *
 * Strategy:
 *  - `THIS_TAB_ID` is a unique UUID generated once per JS runtime, never
 *    persisted anywhere. A duplicated tab starts a fresh JS runtime, so it
 *    always gets a different ID from the one stored in sessionStorage.
 *  - When an authenticated tab starts, it checks whether sessionStorage
 *    already carries a *different* runtime ID — which can only happen when the
 *    browser has COPIED sessionStorage during a tab duplication or when the
 *    page was reloaded (same tab, but a new JS runtime).
 *  - If a mismatch is detected, a CHALLENGE is broadcast over a
 *    BroadcastChannel. The already-running original tab responds with DENY and
 *    the duplicate is kicked out. On a genuine page reload, the old runtime is
 *    dead and cannot DENY, so the reloaded tab claims ownership after a short
 *    timeout (~500 ms).
 */

const CHANNEL_NAME = 'qc_tab_ownership';
const SS_RUNTIME_KEY = 'qc_tab_runtime_id';
const CHALLENGE_WAIT_MS = 500;

/** Unique per JS runtime — a fresh UUID on every page load / app start. */
const THIS_TAB_ID =
    typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

let channel: BroadcastChannel | null = null;
let isOwner = false;

// When this tab is about to unload (reload / close / navigate away),
// relinquish ownership so a reloading tab is not falsely denied.
// This listener does NOT fire on tab duplication — only the duplicate
// tab starts a new lifecycle; the original tab stays alive.
window.addEventListener('beforeunload', () => {
    isOwner = false;
});

/**
 * Lazily creates (and memoizes) the shared BroadcastChannel used to coordinate
 * ownership across tabs, wiring its CHALLENGE→DENY responder.
 * @returns The singleton `BroadcastChannel` for tab-ownership messages.
 */
const getChannel = (): BroadcastChannel => {
    if (!channel) {
        const ch = new BroadcastChannel(CHANNEL_NAME);
        ch.onmessage = ({ data }: MessageEvent<{ type: string; from: string; to?: string }>) => {
            if (data?.type === 'CHALLENGE' && isOwner && data.from !== THIS_TAB_ID) {
                // An authenticated duplicate is challenging — deny it as the owner.
                ch.postMessage({ type: 'DENY', to: data.from });
            }
        };
        channel = ch;
    }
    return channel;
};

/**
 * Call when the user becomes authenticated.
 *
 * Resolves to `true` if this tab is the legitimate session owner, or `false`
 * if it is a duplicate tab (the `onKick` callback is also called in that case).
 * @param onKick - Callback invoked (before the promise resolves `false`) when this tab is
 * identified as a duplicate and must be logged out / blocked from the session.
 * @returns A promise resolving to whether this tab owns the session. Resolves immediately
 * for a fresh tab/reload; for a suspected duplicate it resolves after either a `DENY` is
 * received or the `CHALLENGE_WAIT_MS` timeout elapses.
 */
export const claimOwnership = (onKick: () => void): Promise<boolean> => {
    const ch = getChannel();

    // Detect page reload — sessionStorage survives a reload in the same tab
    // but the JS runtime restarts, producing a new THIS_TAB_ID. A reload
    // always reports navigation type 'reload'; tab duplication never does.
    const navEntry = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined;
    const isPageReload = navEntry?.type === 'reload';

    const inheritedRuntimeId = sessionStorage.getItem(SS_RUNTIME_KEY);

    // Mismatch means either a duplicated tab or a reload.
    // - Reload: bypass challenge entirely (safe — old runtime set isOwner=false
    //   via beforeunload and tab duplication never reports 'reload').
    // - Duplicate: broadcast CHALLENGE; the original tab will DENY.
    const mightBeDuplicate =
        !!inheritedRuntimeId &&
        inheritedRuntimeId !== THIS_TAB_ID &&
        !isPageReload;

    if (!mightBeDuplicate) {
        // Legitimate open: fresh tab or same-tab reload — claim immediately.
        sessionStorage.setItem(SS_RUNTIME_KEY, THIS_TAB_ID);
        isOwner = true;
        return Promise.resolve(true);
    }

    // Possible clone — issue a CHALLENGE and wait briefly for a DENY.
    return new Promise((resolve) => {
        let settled = false;

        const denyHandler = (event: MessageEvent<{ type: string; to?: string }>) => {
            if (event.data?.type === 'DENY' && event.data.to === THIS_TAB_ID && !settled) {
                settled = true;
                clearTimeout(timer);
                ch.removeEventListener('message', denyHandler);
                isOwner = false;
                onKick();
                resolve(false);
            }
        };

        ch.addEventListener('message', denyHandler);
        ch.postMessage({ type: 'CHALLENGE', from: THIS_TAB_ID });

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                ch.removeEventListener('message', denyHandler);
                // No DENY received — the owner tab is gone; this tab claims the session.
                sessionStorage.setItem(SS_RUNTIME_KEY, THIS_TAB_ID);
                isOwner = true;
                resolve(true);
            }
        }, CHALLENGE_WAIT_MS);
    });
};

/**
 * Call when the user logs out or auth state is cleared.
 * @returns void — clears the in-memory owner flag and removes the runtime id from
 * sessionStorage so a subsequent fresh login isn't mistaken for a duplicate.
 */
export const releaseOwnership = (): void => {
    isOwner = false;
    sessionStorage.removeItem(SS_RUNTIME_KEY);
};
