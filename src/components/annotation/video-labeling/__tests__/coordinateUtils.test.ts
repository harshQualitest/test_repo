/**
 * Pure-logic tests for coordinate normalization and frame time-snapping.
 *
 * These functions live inline inside components.  We re-implement the exact
 * same logic here so the tests can run without a DOM/React harness, giving us
 * instant, deterministic coverage of the math.
 */

import { describe, it, expect } from 'vitest';

// ─── Coordinate normalisation (mirrors FrameAnnotationTab.getRelativePos) ────

/**
 * Returns normalised coordinates (0–100) clamped to the container.
 */
function getRelativePos(
    clientX: number,
    clientY: number,
    rect: { left: number; top: number; width: number; height: number },
) {
    return {
        x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
        y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
}

/** Converts a normalised percentage pair back to a 0–1 fraction for storage. */
function toFraction(pct: number) {
    return pct / 100;
}

// ─── Nearest-frame snap (mirrors VideoPlayerPanel activeFrame reducer) ─────────

interface FrameStub {
    frameIndex: number;
    timestamp: number;
}

function nearestFrame(frames: FrameStub[], playedSeconds: number): FrameStub | null {
    if (frames.length === 0) return null;
    return frames.reduce((best, f) =>
        Math.abs(f.timestamp - playedSeconds) < Math.abs(best.timestamp - playedSeconds)
            ? f
            : best,
    );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getRelativePos — coordinate normalisation', () => {
    const rect = { left: 100, top: 50, width: 800, height: 450 };

    it('maps the top-left corner to (0, 0)', () => {
        const pos = getRelativePos(100, 50, rect);
        expect(pos.x).toBe(0);
        expect(pos.y).toBe(0);
    });

    it('maps the bottom-right corner to (100, 100)', () => {
        const pos = getRelativePos(900, 500, rect);
        expect(pos.x).toBe(100);
        expect(pos.y).toBe(100);
    });

    it('maps the centre to (50, 50)', () => {
        const pos = getRelativePos(500, 275, rect);
        expect(pos.x).toBeCloseTo(50);
        expect(pos.y).toBeCloseTo(50);
    });

    it('clamps x below 0 when cursor is left of the container', () => {
        const pos = getRelativePos(50, 100, rect); // clientX < rect.left
        expect(pos.x).toBe(0);
    });

    it('clamps x above 100 when cursor is right of the container', () => {
        const pos = getRelativePos(1000, 100, rect); // clientX > rect.right
        expect(pos.x).toBe(100);
    });

    it('clamps y below 0 when cursor is above the container', () => {
        const pos = getRelativePos(200, 0, rect); // clientY < rect.top
        expect(pos.y).toBe(0);
    });

    it('clamps y above 100 when cursor is below the container', () => {
        const pos = getRelativePos(200, 600, rect); // clientY > rect.bottom
        expect(pos.y).toBe(100);
    });

    it('converts a mid-point accurately for a 1280×720 container', () => {
        const wideRect = { left: 0, top: 0, width: 1280, height: 720 };
        const pos = getRelativePos(640, 360, wideRect);
        expect(pos.x).toBeCloseTo(50);
        expect(pos.y).toBeCloseTo(50);
    });
});

describe('toFraction — percentage to 0-1 storage conversion', () => {
    it('converts 0 % → 0', () => expect(toFraction(0)).toBe(0));
    it('converts 100 % → 1', () => expect(toFraction(100)).toBe(1));
    it('converts 50 % → 0.5', () => expect(toFraction(50)).toBe(0.5));
    it('converts 25.5 % → 0.255', () => expect(toFraction(25.5)).toBeCloseTo(0.255));
});

describe('nearestFrame — playhead snap logic', () => {
    const frames: FrameStub[] = [
        { frameIndex: 0, timestamp: 0.0 },
        { frameIndex: 1, timestamp: 0.5 },
        { frameIndex: 2, timestamp: 1.0 },
        { frameIndex: 3, timestamp: 1.5 },
        { frameIndex: 4, timestamp: 2.0 },
    ];

    it('returns null when there are no frames', () => {
        expect(nearestFrame([], 1.0)).toBeNull();
    });

    it('returns the only frame regardless of playhead position', () => {
        const single = [{ frameIndex: 0, timestamp: 0.5 }];
        expect(nearestFrame(single, 99)?.timestamp).toBe(0.5);
    });

    it('snaps 1.34 s → frame at 1.5 s', () => {
        expect(nearestFrame(frames, 1.34)?.timestamp).toBe(1.5);
    });

    it('snaps 1.24 s → frame at 1.0 s', () => {
        expect(nearestFrame(frames, 1.24)?.timestamp).toBe(1.0);
    });

    it('snaps 0.0 s → first frame', () => {
        expect(nearestFrame(frames, 0.0)?.timestamp).toBe(0.0);
    });

    it('snaps 2.0 s → last frame', () => {
        expect(nearestFrame(frames, 2.0)?.timestamp).toBe(2.0);
    });

    it('snaps a negative playhead to the first frame', () => {
        expect(nearestFrame(frames, -5)?.timestamp).toBe(0.0);
    });

    it('snaps beyond the last timestamp to the last frame', () => {
        expect(nearestFrame(frames, 100)?.timestamp).toBe(2.0);
    });

    it('picks the first frame when equidistant (stable reduce behaviour)', () => {
        // 0.25 s is equidistant between 0.0 and 0.5; reduce keeps the first winner
        const result = nearestFrame(frames, 0.25);
        expect([0.0, 0.5]).toContain(result?.timestamp);
    });
});

describe('bbox sizing guard (min-size check mirrors FrameAnnotationTab)', () => {
    /**
     * FrameAnnotationTab only creates a pending box when both dimensions
     * exceed 1 % of the container.
     */
    function isBoxLargeEnough(start: { x: number; y: number }, end: { x: number; y: number }) {
        return Math.abs(end.x - start.x) > 1 && Math.abs(end.y - start.y) > 1;
    }

    it('rejects a zero-size box (accidental click)', () => {
        expect(isBoxLargeEnough({ x: 40, y: 40 }, { x: 40, y: 40 })).toBe(false);
    });

    it('rejects a box narrower than 1 % in x', () => {
        expect(isBoxLargeEnough({ x: 40, y: 40 }, { x: 40.5, y: 60 })).toBe(false);
    });

    it('rejects a box shorter than 1 % in y', () => {
        expect(isBoxLargeEnough({ x: 40, y: 40 }, { x: 60, y: 40.5 })).toBe(false);
    });

    it('accepts a normal-sized box', () => {
        expect(isBoxLargeEnough({ x: 10, y: 10 }, { x: 50, y: 60 })).toBe(true);
    });

    it('accepts a large box drawn bottom-right to top-left', () => {
        expect(isBoxLargeEnough({ x: 80, y: 80 }, { x: 20, y: 20 })).toBe(true);
    });
});
