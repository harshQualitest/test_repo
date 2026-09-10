import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import counterReducer, { increment, decrement, incrementByAmount, reset } from '../counterSlice';

// ── Store factory ─────────────────────────────────────────────────────────────

function makeStore(initialValue = 0) {
    return configureStore({
        reducer: { counter: counterReducer },
        preloadedState: { counter: { value: initialValue } },
    });
}

const getValue = (store: ReturnType<typeof makeStore>) => store.getState().counter.value;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('counterSlice', () => {

    // ── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('starts at 0 when no preloaded state is given', () => {
            const store = configureStore({ reducer: { counter: counterReducer } });
            expect(getValue(store)).toBe(0);
        });

        it('respects preloaded state', () => {
            expect(getValue(makeStore(42))).toBe(42);
        });
    });

    // ── increment ────────────────────────────────────────────────────────────

    describe('increment', () => {
        it('adds 1 to the current value', () => {
            const store = makeStore(5);
            store.dispatch(increment());
            expect(getValue(store)).toBe(6);
        });

        it('goes from 0 to 1', () => {
            const store = makeStore(0);
            store.dispatch(increment());
            expect(getValue(store)).toBe(1);
        });

        it('increments from a negative value toward zero', () => {
            const store = makeStore(-1);
            store.dispatch(increment());
            expect(getValue(store)).toBe(0);
        });

        it('can be called multiple times in succession', () => {
            const store = makeStore(0);
            store.dispatch(increment());
            store.dispatch(increment());
            store.dispatch(increment());
            expect(getValue(store)).toBe(3);
        });
    });

    // ── decrement ────────────────────────────────────────────────────────────

    describe('decrement', () => {
        it('subtracts 1 from the current value', () => {
            const store = makeStore(5);
            store.dispatch(decrement());
            expect(getValue(store)).toBe(4);
        });

        it('can produce a negative result', () => {
            const store = makeStore(0);
            store.dispatch(decrement());
            expect(getValue(store)).toBe(-1);
        });

        it('can be called multiple times', () => {
            const store = makeStore(10);
            store.dispatch(decrement());
            store.dispatch(decrement());
            expect(getValue(store)).toBe(8);
        });
    });

    // ── incrementByAmount ────────────────────────────────────────────────────

    describe('incrementByAmount', () => {
        it('adds the payload to the current value', () => {
            const store = makeStore(10);
            store.dispatch(incrementByAmount(5));
            expect(getValue(store)).toBe(15);
        });

        it('works with a negative payload (acts as decrement)', () => {
            const store = makeStore(10);
            store.dispatch(incrementByAmount(-3));
            expect(getValue(store)).toBe(7);
        });

        it('is a no-op when payload is 0', () => {
            const store = makeStore(10);
            store.dispatch(incrementByAmount(0));
            expect(getValue(store)).toBe(10);
        });

        it('handles a large payload', () => {
            const store = makeStore(0);
            store.dispatch(incrementByAmount(1_000_000));
            expect(getValue(store)).toBe(1_000_000);
        });

        it('handles decimal payloads', () => {
            const store = makeStore(0);
            store.dispatch(incrementByAmount(2.5));
            expect(getValue(store)).toBeCloseTo(2.5);
        });
    });

    // ── reset ────────────────────────────────────────────────────────────────

    describe('reset', () => {
        it('sets value to 0 from a positive number', () => {
            const store = makeStore(42);
            store.dispatch(reset());
            expect(getValue(store)).toBe(0);
        });

        it('sets value to 0 from a negative number', () => {
            const store = makeStore(-100);
            store.dispatch(reset());
            expect(getValue(store)).toBe(0);
        });

        it('is a no-op when value is already 0', () => {
            const store = makeStore(0);
            store.dispatch(reset());
            expect(getValue(store)).toBe(0);
        });
    });

    // ── action sequences ─────────────────────────────────────────────────────

    describe('action sequences', () => {
        it('increment + decrement returns the original value', () => {
            const store = makeStore(7);
            store.dispatch(increment());
            store.dispatch(decrement());
            expect(getValue(store)).toBe(7);
        });

        it('complex sequence: increment × 3, decrementByAmount, reset', () => {
            const store = makeStore(0);
            store.dispatch(increment());
            store.dispatch(increment());
            store.dispatch(increment());          // value = 3
            store.dispatch(incrementByAmount(-1)); // value = 2
            expect(getValue(store)).toBe(2);
            store.dispatch(reset());
            expect(getValue(store)).toBe(0);
        });
    });
});
