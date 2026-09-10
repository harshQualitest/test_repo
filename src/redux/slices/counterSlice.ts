import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
    value: number;
}

const initialState: CounterState = { value: 0 };

/**
 * Slice: counter
 *
 * Purpose: Minimal demo/example slice used to verify the Redux Toolkit
 * wiring (store, typed hooks, DevTools) in this codebase. It is not tied
 * to any annotation/grading domain data.
 *
 * State shape:
 * - `value` (number): the running counter value.
 *
 * Reducers:
 * - `increment`: increments `value` by 1.
 * - `decrement`: decrements `value` by 1.
 * - `incrementByAmount`: adds a caller-supplied amount to `value`.
 * - `reset`: resets `value` back to 0.
 *
 * Async thunks: none — this slice is purely synchronous.
 *
 * Selectors: none exported; consumers read `state.counter.value` directly.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
const counterSlice = createSlice({
    name: 'counter',
    initialState,
    reducers: {
        /** Increments `value` by 1. */
        increment: (state) => {
            state.value += 1;
        },
        /** Decrements `value` by 1. */
        decrement: (state) => {
            state.value -= 1;
        },
        /**
         * Increments `value` by an arbitrary amount.
         * @param action - `payload` is the amount to add to the current value.
         */
        incrementByAmount: (state, action: PayloadAction<number>) => {
            state.value += action.payload;
        },
        /** Resets `value` back to 0. */
        reset: (state) => {
            state.value = 0;
        },
    },
});


export const { increment, decrement, incrementByAmount, reset} = counterSlice.actions
export default counterSlice.reducer; 