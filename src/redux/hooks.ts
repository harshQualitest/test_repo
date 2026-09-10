/**
 * Typed wrappers around react-redux's `useDispatch`/`useSelector`.
 *
 * Purpose: plain `useDispatch()`/`useSelector()` are untyped (or require
 * repeating `<RootState>`/`<AppDispatch>` generics at every call site).
 * These wrappers bind the app's actual `RootState`/`AppDispatch` types once,
 * so every component gets full type inference/autocomplete on `state.*`
 * and correctly-typed thunk dispatch, without re-declaring the types
 * throughout the codebase. Use these exclusively instead of the raw
 * react-redux hooks.
 */
import {useDispatch, useSelector} from 'react-redux';
import type {TypedUseSelectorHook} from 'react-redux';
import type {RootState, AppDispatch} from './store';

/** Returns a dispatch function typed for this store's `AppDispatch` (including thunks). */
export const useAppDispatch = () => useDispatch<AppDispatch>();
/** `useSelector`, pre-typed against this app's `RootState` — no need to annotate the selector's `state` param. */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
