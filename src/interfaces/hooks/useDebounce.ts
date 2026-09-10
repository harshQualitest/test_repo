/**
 * useDebounce Hook
 *
 * Purpose: Generic hook that delays propagating a fast-changing value (e.g. a
 * search input) until it has stopped changing for a given delay.
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
import { useState, useEffect } from 'react';

/**
 * Custom hook that debounces a value
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 500ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear timeout if value changes (also on unmount)
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
