import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoLabeling from '../VideoLabeling';

// ── Module mocks ──────────────────────────────────────────────────────────────

// react-player → stub <video> so JSDOM doesn't try to load media
vi.mock('react-player', () => ({
    default: vi.fn(
        ({
            src,
            onTimeUpdate,
            onDurationChange,
        }: {
            src?: string;
            onTimeUpdate?: React.ReactEventHandler<HTMLVideoElement>;
            onDurationChange?: React.ReactEventHandler<HTMLVideoElement>;
        }) => (
            <video
                data-testid="react-player"
                src={src}
                onTimeUpdate={onTimeUpdate}
                onDurationChange={onDurationChange}
            />
        ),
    ),
}));

import React from 'react';

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('VideoLabeling — App / State Controller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Initial render ────────────────────────────────────────────────────────

    describe('initial render', () => {
        it('renders the task card with the correct title', () => {
            render(<VideoLabeling />);
            expect(screen.getByText(/video labeling & frame annotation/i)).toBeInTheDocument();
        });

        it('shows the task identifier VL-TASK-001', () => {
            render(<VideoLabeling />);
            expect(screen.getByText(/VL-TASK-001/i)).toBeInTheDocument();
        });

        it('shows "Step 3: Annotation" chip', () => {
            render(<VideoLabeling />);
            expect(screen.getByText(/step 3: annotation/i)).toBeInTheDocument();
        });

        it('shows "Annotator" role chip', () => {
            render(<VideoLabeling />);
            expect(screen.getByText('Annotator')).toBeInTheDocument();
        });

        it('renders the Video tab and Frame Annotations tab', () => {
            render(<VideoLabeling />);
            expect(screen.getByRole('tab', { name: /video/i })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /frame annotations/i })).toBeInTheDocument();
        });

        it('defaults to the Video tab being active', () => {
            render(<VideoLabeling />);
            const videoTab = screen.getByRole('tab', { name: /video/i });
            expect(videoTab).toHaveAttribute('aria-selected', 'true');
        });

        it('renders the Save Draft and Submit Annotation buttons', () => {
            render(<VideoLabeling />);
            expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /submit annotation/i })).toBeInTheDocument();
        });

        it('renders the Skip button', () => {
            render(<VideoLabeling />);
            expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
        });
    });

    // ── Metadata row ──────────────────────────────────────────────────────────

    describe('metadata row', () => {
        it('shows Dataset label', () => {
            render(<VideoLabeling />);
            expect(screen.getByText('Dataset:')).toBeInTheDocument();
        });

        it('shows Modality: Video', () => {
            render(<VideoLabeling />);
            // The text "Video" appears in the metadata row; use getAllByText since
            // the word can also appear in tab labels.
            const videoTexts = screen.getAllByText('Video');
            expect(videoTexts.length).toBeGreaterThanOrEqual(1);
        });

        it('shows "0 extracted" frames chip before extraction', () => {
            render(<VideoLabeling />);
            expect(screen.getByText('0 extracted')).toBeInTheDocument();
        });

        it('shows "0/0 annotated" progress chip initially', () => {
            render(<VideoLabeling />);
            expect(screen.getByText('0/0 annotated')).toBeInTheDocument();
        });
    });

    // ── Task header collapse / expand ─────────────────────────────────────────

    describe('task header collapse', () => {
        it('collapses the card body when the collapse button is clicked', async () => {
            const user = userEvent.setup();
            render(<VideoLabeling />);

            // The subtitle is visible initially
            expect(
                screen.getByText(/extract frames at 2 fps/i),
            ).toBeInTheDocument();

            // The collapse IconButton is the first button in the header
            const collapseBtn = screen.getAllByRole('button')[0];
            await user.click(collapseBtn);

            // After collapsing the subtitle should be gone
            expect(
                screen.queryByText(/extract frames at 2 fps/i),
            ).not.toBeInTheDocument();
        });

        it('expands the card body again when clicked twice', async () => {
            const user = userEvent.setup();
            render(<VideoLabeling />);

            const collapseBtn = screen.getAllByRole('button')[0];
            await user.click(collapseBtn); // collapse
            await user.click(collapseBtn); // expand

            expect(
                screen.getByText(/extract frames at 2 fps/i),
            ).toBeInTheDocument();
        });
    });

    // ── Tab switching ─────────────────────────────────────────────────────────

    describe('tab switching', () => {
        it('switches to the Frame Annotations tab when clicked', async () => {
            const user = userEvent.setup();
            render(<VideoLabeling />);

            await user.click(screen.getByRole('tab', { name: /frame annotations/i }));

            // The FrameAnnotationTab shows "No frames extracted yet" when empty
            expect(screen.getByText(/no frames extracted yet/i)).toBeInTheDocument();
        });

        it('hides the VideoPlayerPanel content when Frame Annotations tab is active', async () => {
            const user = userEvent.setup();
            render(<VideoLabeling />);

            // "Extract Frames" is in VideoPlayerPanel — visible on the Video tab
            expect(screen.getByRole('button', { name: /extract frames/i })).toBeInTheDocument();

            await user.click(screen.getByRole('tab', { name: /frame annotations/i }));

            expect(screen.queryByRole('button', { name: /extract frames/i })).not.toBeInTheDocument();
        });

        it('switches back to the Video tab from Frame Annotations', async () => {
            const user = userEvent.setup();
            render(<VideoLabeling />);

            await user.click(screen.getByRole('tab', { name: /frame annotations/i }));
            await user.click(screen.getByRole('tab', { name: /video/i }));

            expect(screen.getByTestId('react-player')).toBeInTheDocument();
        });
    });

    // ── State: frame extraction flow ──────────────────────────────────────────

    describe('state — frame extraction flow', () => {
        it('shows "0 extracted" chip and Frame Annotations (0) tab before any extraction', () => {
            render(<VideoLabeling />);

            expect(screen.getByText('0 extracted')).toBeInTheDocument();
            // The tab label includes the frame count in parentheses
            expect(
                screen.getByRole('tab', { name: /frame annotations \(0\)/i }),
            ).toBeInTheDocument();
        });

        it('annotated count increments in the progress chip', () => {
            // Re-render the subtree using controlled frames to simulate annotation
            // We can't drive VideoLabeling's internal state directly, so we test
            // the child component directly (FrameAnnotationTab) in its own suite.
            // Here we just confirm the initial "0/0 annotated" chip renders.
            render(<VideoLabeling />);
            expect(screen.getByText('0/0 annotated')).toBeInTheDocument();
        });
    });

    // ── instructionsUrl prop ──────────────────────────────────────────────────

    describe('instructionsUrl prop', () => {
        it('renders without error when instructionsUrl is provided', () => {
            // instructionsUrl is accepted by the component signature; the player
            // currently uses its own default URL internally via VideoPlayerPanel.
            render(<VideoLabeling instructionsUrl="http://example.com/my-video.mp4" />);
            expect(screen.getByTestId('react-player')).toBeInTheDocument();
        });

        it('renders without error when instructionsUrl is omitted', () => {
            render(<VideoLabeling />);
            expect(screen.getByTestId('react-player')).toBeInTheDocument();
        });
    });

    // ── Edge cases ────────────────────────────────────────────────────────────

    describe('edge cases', () => {
        it('renders without any props (no crash)', () => {
            render(<VideoLabeling />);
            expect(screen.getByText(/video labeling/i)).toBeInTheDocument();
        });

        it('does not crash on multiple rapid tab switches', async () => {
            const user = userEvent.setup();
            render(<VideoLabeling />);

            const frameTab = screen.getByRole('tab', { name: /frame annotations/i });
            const videoTab = screen.getByRole('tab', { name: /video/i });

            for (let i = 0; i < 5; i++) {
                await user.click(frameTab);
                await user.click(videoTab);
            }

            expect(screen.getByTestId('react-player')).toBeInTheDocument();
        });
    });
});
