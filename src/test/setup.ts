/**
 * Global Vitest setup file (wired via `test.setupFiles` in the Vite/Vitest
 * config), loaded once before the test suite runs in jsdom.
 *
 * Purpose: jsdom doesn't implement real media/canvas rendering, so any
 * component under test that touches `<video>` or `<canvas>` APIs (e.g.
 * video review/annotation UIs, frame-capture/thumbnailing) would otherwise
 * throw "not implemented" errors. This file patches those prototypes with
 * `vi.fn()` stubs so such components can mount and run in tests without a
 * real browser rendering engine.
 *
 * Author: AI Documentation
 * Last Updated: 2026-07-24
 */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ── HTMLVideoElement mock ─────────────────────────────────────────────────────
// JSDOM doesn't implement media elements; give them the methods the code calls.
Object.defineProperty(window.HTMLVideoElement.prototype, 'load', {
    configurable: true,
    writable: true,
    value: vi.fn(),
});
Object.defineProperty(window.HTMLVideoElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
});
Object.defineProperty(window.HTMLVideoElement.prototype, 'pause', {
    configurable: true,
    writable: true,
    value: vi.fn(),
});

// ── HTMLCanvasElement mock ────────────────────────────────────────────────────
// JSDOM's canvas has no real 2D rendering backend; stub the 2D context
// methods used by frame-capture/annotation drawing code, plus `getContext`/
// `toDataURL` themselves, so those code paths can run under test.
const mockCtx = {
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    rect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
};

HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mockFrameData');
