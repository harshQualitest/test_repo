import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useToast } from '../useToast';
import { ToastContext } from '../../components/shared/ToastBar';
import type { ToastContextType } from '../../components/shared/ToastBar';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useToast', () => {
    // ── Outside provider (throws) ──────────────────────────────────────────────

    it('throws an error when used outside a ToastProvider', () => {
        expect(() => renderHook(() => useToast())).toThrow(
            'useToast must be used within a ToastProvider',
        );
    });

    // ── Inside provider ───────────────────────────────────────────────────────

    it('returns the context value when used inside a ToastProvider', () => {
        const mockContext: ToastContextType = {
            showSuccess: vi.fn(),
            showError: vi.fn(),
            showWarning: vi.fn(),
            showInfo: vi.fn(),
        };

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <ToastContext.Provider value={mockContext}>{children}</ToastContext.Provider>
        );

        const { result } = renderHook(() => useToast(), { wrapper });

        expect(result.current).toBe(mockContext);
        expect(typeof result.current.showSuccess).toBe('function');
        expect(typeof result.current.showError).toBe('function');
    });

    it('showSuccess from context is callable through the hook', () => {
        const mockShowSuccess = vi.fn();
        const mockContext: ToastContextType = {
            showSuccess: mockShowSuccess,
            showError: vi.fn(),
            showWarning: vi.fn(),
            showInfo: vi.fn(),
        };

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <ToastContext.Provider value={mockContext}>{children}</ToastContext.Provider>
        );

        const { result } = renderHook(() => useToast(), { wrapper });
        result.current.showSuccess('Task completed');

        expect(mockShowSuccess).toHaveBeenCalledWith('Task completed');
    });

    it('showError from context is callable through the hook', () => {
        const mockShowError = vi.fn();
        const mockContext: ToastContextType = {
            showSuccess: vi.fn(),
            showError: mockShowError,
            showWarning: vi.fn(),
            showInfo: vi.fn(),
        };

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <ToastContext.Provider value={mockContext}>{children}</ToastContext.Provider>
        );

        const { result } = renderHook(() => useToast(), { wrapper });
        result.current.showError('Something went wrong');

        expect(mockShowError).toHaveBeenCalledWith('Something went wrong');
    });
});
