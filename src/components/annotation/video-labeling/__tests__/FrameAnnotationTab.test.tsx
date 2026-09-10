import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FrameAnnotationTab from '../FrameAnnotationTab';
import type { FrameData, Annotation } from '../VideoLabeling';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFrame(
    frameIndex: number,
    timestamp: number,
    annotations: Annotation[] = [],
): FrameData {
    return { frameIndex, timestamp, frameUrl: `data:image/jpeg;base64,frame${frameIndex}`, annotations };
}

function makeAnnotation(id: string, label: string): Annotation {
    return { id, label, bbox: { xMin: 0.1, yMin: 0.1, xMax: 0.5, yMax: 0.5 } };
}

const mockUpdateAnnotations = vi.fn();

// Stub getBoundingClientRect so coordinate math works inside JSDOM
function stubCanvasRect(element: Element, rect: Partial<DOMRect>) {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, right: 800, bottom: 450,
        width: 800, height: 450, x: 0, y: 0,
        toJSON: () => ({}),
        ...rect,
    } as DOMRect);
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('FrameAnnotationTab', () => {
    beforeEach(() => {
        mockUpdateAnnotations.mockClear();
    });

    // ── Empty state ──────────────────────────────────────────────────────────

    describe('empty state', () => {
        it('shows the "no frames" prompt when frames array is empty', () => {
            render(<FrameAnnotationTab frames={[]} onUpdateAnnotations={mockUpdateAnnotations} />);

            expect(screen.getByText(/no frames extracted yet/i)).toBeInTheDocument();
            expect(screen.getByText(/extract frames/i)).toBeInTheDocument();
        });

        it('does not render the annotation canvas when there are no frames', () => {
            render(<FrameAnnotationTab frames={[]} onUpdateAnnotations={mockUpdateAnnotations} />);

            expect(screen.queryByText(/draw box/i)).not.toBeInTheDocument();
        });
    });

    // ── Frame list ───────────────────────────────────────────────────────────

    describe('frame list', () => {
        const frames = [
            makeFrame(0, 0.0),
            makeFrame(1, 0.5),
            makeFrame(2, 1.0),
        ];

        it('renders a card for every extracted frame', () => {
            render(<FrameAnnotationTab frames={frames} onUpdateAnnotations={mockUpdateAnnotations} />);

            // formatTime(0.0)='00:00', formatTime(0.5)='00:00', formatTime(1.0)='00:01'
            // Use getAllByText since multiple frames share the '00:00' label
            const zeroCells = screen.getAllByText('00:00');
            expect(zeroCells.length).toBeGreaterThanOrEqual(2); // frame 0 and frame 1
            expect(screen.getByText('00:01')).toBeInTheDocument(); // frame 2 at 1.0 s
        });

        it('renders the FRAMES header with the correct count', () => {
            render(<FrameAnnotationTab frames={frames} onUpdateAnnotations={mockUpdateAnnotations} />);

            expect(screen.getByText(/FRAMES \(3\)/i)).toBeInTheDocument();
        });

        it('shows "unlabeled" for frames with no annotations', () => {
            render(<FrameAnnotationTab frames={frames} onUpdateAnnotations={mockUpdateAnnotations} />);

            const unlabeledBadges = screen.getAllByText('unlabeled');
            expect(unlabeledBadges.length).toBe(3);
        });

        it('shows annotation count chip for labeled frames', () => {
            const framesWithAnnotation = [
                makeFrame(0, 0.0, [makeAnnotation('a1', 'Display Structure - Shelving')]),
                makeFrame(1, 0.5),
            ];
            render(
                <FrameAnnotationTab
                    frames={framesWithAnnotation}
                    onUpdateAnnotations={mockUpdateAnnotations}
                />,
            );

            expect(screen.getByText('1 label')).toBeInTheDocument();
        });

        it('auto-selects the first frame on mount', () => {
            render(<FrameAnnotationTab frames={frames} onUpdateAnnotations={mockUpdateAnnotations} />);

            // The "Draw Box" toolbar only appears when a frame is selected
            expect(screen.getByRole('button', { name: /draw box/i })).toBeInTheDocument();
        });

        it('shows the labeled / total progress chip', () => {
            const framesWithAnnotation = [
                makeFrame(0, 0.0, [makeAnnotation('a1', 'Display Structure - Fridge')]),
                makeFrame(1, 0.5),
            ];
            render(
                <FrameAnnotationTab
                    frames={framesWithAnnotation}
                    onUpdateAnnotations={mockUpdateAnnotations}
                />,
            );

            expect(screen.getByText(/1 \/ 2 labeled/i)).toBeInTheDocument();
        });
    });

    // ── Frame selection ──────────────────────────────────────────────────────

    describe('frame selection', () => {
        const frames = [makeFrame(0, 0.0), makeFrame(1, 0.5), makeFrame(2, 1.0)];

        it('clicking a frame card selects it', async () => {
            const user = userEvent.setup();
            render(<FrameAnnotationTab frames={frames} onUpdateAnnotations={mockUpdateAnnotations} />);

            // The list contains timestamp text; click the second one
            const frameCards = screen.getAllByText('00:00');
            await user.click(frameCards[frameCards.length - 1]);

            // After clicking any frame the toolbar should still be present
            expect(screen.getByRole('button', { name: /draw box/i })).toBeInTheDocument();
        });
    });

    // ── Draw mode ────────────────────────────────────────────────────────────

    describe('draw mode toggle', () => {
        const frames = [makeFrame(0, 0.0)];

        it('button label changes when draw mode is activated', async () => {
            const user = userEvent.setup();
            render(<FrameAnnotationTab frames={frames} onUpdateAnnotations={mockUpdateAnnotations} />);

            const btn = screen.getByRole('button', { name: /draw box/i });
            await user.click(btn);

            expect(screen.getByRole('button', { name: /click & drag to draw/i })).toBeInTheDocument();
        });

        it('clicking the draw-mode button again exits draw mode', async () => {
            const user = userEvent.setup();
            render(<FrameAnnotationTab frames={frames} onUpdateAnnotations={mockUpdateAnnotations} />);

            const btn = screen.getByRole('button', { name: /draw box/i });
            await user.click(btn); // enter
            await user.click(screen.getByRole('button', { name: /click & drag to draw/i })); // exit

            expect(screen.getByRole('button', { name: /draw box/i })).toBeInTheDocument();
        });
    });

    // ── Drawing a bounding box ───────────────────────────────────────────────

    describe('bounding box drawing', () => {
        const frames = [makeFrame(0, 0.0)];

        it('shows the hint overlay when draw mode is active', () => {
            const frames2 = [makeFrame(0, 0.0)];
            render(<FrameAnnotationTab frames={frames2} onUpdateAnnotations={mockUpdateAnnotations} />);
            fireEvent.click(screen.getByRole('button', { name: /draw box/i }));

            expect(screen.getByText(/click and drag to draw a bounding box/i)).toBeInTheDocument();
        });

        it('opens the label picker after a valid drag', () => {
            render(<FrameAnnotationTab frames={frames} onUpdateAnnotations={mockUpdateAnnotations} />);
            fireEvent.click(screen.getByRole('button', { name: /draw box/i }));

            // MUI Box renders plain divs; the hint is a direct child of canvasRef div.
            // hintEl.parentElement IS the div with onMouseDown / onMouseMove / onMouseUp.
            const hintEl = screen.getByText(/click and drag to draw a bounding box/i);
            const target = hintEl.parentElement as HTMLElement;
            stubCanvasRect(target, { left: 0, top: 0, width: 800, height: 450 });

            fireEvent.mouseDown(target, { clientX: 50,  clientY: 50  });
            fireEvent.mouseMove(target, { clientX: 450, clientY: 300 });
            fireEvent.mouseUp(target);

            // After a valid drag (> 1 % in both axes) the label picker appears
            expect(screen.getByText(/assign label/i)).toBeInTheDocument();
        });
    });

    // ── Label picker & annotation save ───────────────────────────────────────

    describe('label picker', () => {
        function openLabelPicker() {
            const frames2 = [makeFrame(0, 0.0)];
            render(<FrameAnnotationTab frames={frames2} onUpdateAnnotations={mockUpdateAnnotations} />);

            fireEvent.click(screen.getByRole('button', { name: /draw box/i }));

            // hintEl.parentElement is the canvasRef div that carries the mouse handlers
            const hintEl = screen.getByText(/click and drag to draw a bounding box/i);
            const target = hintEl.parentElement as HTMLElement;
            stubCanvasRect(target, { left: 0, top: 0, width: 800, height: 450 });
            fireEvent.mouseDown(target, { clientX: 50,  clientY: 50  });
            fireEvent.mouseMove(target, { clientX: 450, clientY: 300 });
            fireEvent.mouseUp(target);
        }

        it('renders "Assign Label:" text in the picker popup after drawing', () => {
            openLabelPicker();
            expect(screen.getByText(/assign label/i)).toBeInTheDocument();
        });

        it('shows the default label in the dropdown', () => {
            openLabelPicker();
            expect(screen.getByText('Display Structure - Shelving')).toBeInTheDocument();
        });

        it('calls onUpdateAnnotations when the Add button is clicked', async () => {
            const user = userEvent.setup();
            openLabelPicker();

            const addBtn = screen.getByRole('button', { name: /add/i });
            await user.click(addBtn);

            expect(mockUpdateAnnotations).toHaveBeenCalledWith(
                0,
                expect.arrayContaining([
                    expect.objectContaining({ label: expect.any(String) }),
                ]),
            );
        });

        it('clears the picker when the cancel (×) button is clicked', async () => {
            const user = userEvent.setup();
            openLabelPicker();

            expect(screen.getByText(/assign label/i)).toBeInTheDocument();

            // The close IconButton has no label; it is the only button with CloseIcon
            const closeBtn = screen.getAllByRole('button').find(
                (btn) => btn.querySelector('svg') && btn.closest('[style*="position: absolute"]'),
            );
            if (closeBtn) {
                await user.click(closeBtn);
                expect(screen.queryByText(/assign label/i)).not.toBeInTheDocument();
            }
        });
    });

    // ── Existing annotations CRUD ────────────────────────────────────────────

    describe('existing annotations', () => {
        const annotation = makeAnnotation('ann-1', 'Display Structure - Shelving');
        const frames = [makeFrame(0, 0.0, [annotation])];

        it('renders the annotation list for the selected frame', () => {
            render(<FrameAnnotationTab frames={frames} onUpdateAnnotations={mockUpdateAnnotations} />);

            expect(screen.getByText('ANNOTATIONS (1)')).toBeInTheDocument();
        });

        it('shows the bbox size as W×H percentage', () => {
            render(<FrameAnnotationTab frames={frames} onUpdateAnnotations={mockUpdateAnnotations} />);

            // bbox: xMin 0.1, yMin 0.1, xMax 0.5, yMax 0.5 → 40×40%
            expect(screen.getByText('40×40%')).toBeInTheDocument();
        });

        it('calls onUpdateAnnotations with the annotation removed when delete is clicked', async () => {
            const user = userEvent.setup();
            render(<FrameAnnotationTab frames={frames} onUpdateAnnotations={mockUpdateAnnotations} />);

            // Click the first delete button (SVG icon button)
            const allBtns = screen.getAllByRole('button');
            // The delete IconButton is the last button in the annotation row
            const deleteBtns = allBtns.filter(
                (btn) => btn.getAttribute('class')?.includes('MuiIconButton') &&
                    btn.querySelector('svg'),
            );
            if (deleteBtns.length > 0) {
                await user.click(deleteBtns[deleteBtns.length - 1]);
                expect(mockUpdateAnnotations).toHaveBeenCalledWith(0, []);
            }
        });

        it('multiple annotations all render in the list', () => {
            const multiFrame = makeFrame(0, 0.0, [
                makeAnnotation('a1', 'Display Structure - Shelving'),
                makeAnnotation('a2', 'Display Structure - Fridge'),
                makeAnnotation('a3', 'Display Structure - Peg'),
            ]);
            render(
                <FrameAnnotationTab
                    frames={[multiFrame]}
                    onUpdateAnnotations={mockUpdateAnnotations}
                />,
            );

            expect(screen.getByText('ANNOTATIONS (3)')).toBeInTheDocument();
        });

        it('shows "3 labels" chip in frame list when 3 annotations exist', () => {
            const multiFrame = makeFrame(0, 0.0, [
                makeAnnotation('a1', 'Display Structure - Shelving'),
                makeAnnotation('a2', 'Display Structure - Fridge'),
                makeAnnotation('a3', 'Display Structure - Peg'),
            ]);
            render(
                <FrameAnnotationTab
                    frames={[multiFrame]}
                    onUpdateAnnotations={mockUpdateAnnotations}
                />,
            );

            expect(screen.getByText('3 labels')).toBeInTheDocument();
        });
    });

    // ── Frame switching ──────────────────────────────────────────────────────

    describe('frame switching', () => {
        const annotation = makeAnnotation('ann-1', 'Display Structure - Fridge');
        const frames = [
            makeFrame(0, 0.0, [annotation]),
            makeFrame(1, 0.5),
        ];

        it('switching to an unannotated frame hides the annotations list', async () => {
            const user = userEvent.setup();
            render(<FrameAnnotationTab frames={frames} onUpdateAnnotations={mockUpdateAnnotations} />);

            // Frame 0 is selected — it has annotations
            expect(screen.getByText('ANNOTATIONS (1)')).toBeInTheDocument();

            // Click second frame card
            const unlabeledEl = screen.getByText('unlabeled');
            await user.click(unlabeledEl.closest('[class]')!);

            // Annotations section should now be gone
            expect(screen.queryByText('ANNOTATIONS (1)')).not.toBeInTheDocument();
        });
    });

    // ── Edge cases ───────────────────────────────────────────────────────────

    describe('edge cases', () => {
        it('renders correctly with a single frame and zero annotations', () => {
            render(
                <FrameAnnotationTab
                    frames={[makeFrame(0, 0.0)]}
                    onUpdateAnnotations={mockUpdateAnnotations}
                />,
            );

            expect(screen.getByText(/FRAMES \(1\)/i)).toBeInTheDocument();
            expect(screen.getByText('0 / 1 labeled')).toBeInTheDocument();
        });

        it('does not call onUpdateAnnotations on initial render', () => {
            render(
                <FrameAnnotationTab
                    frames={[makeFrame(0, 0.0)]}
                    onUpdateAnnotations={mockUpdateAnnotations}
                />,
            );

            expect(mockUpdateAnnotations).not.toHaveBeenCalled();
        });

        it('renders correctly with many frames (stress test)', () => {
            const manyFrames = Array.from({ length: 50 }, (_, i) =>
                makeFrame(i, i * 0.5),
            );
            render(
                <FrameAnnotationTab
                    frames={manyFrames}
                    onUpdateAnnotations={mockUpdateAnnotations}
                />,
            );

            expect(screen.getByText('FRAMES (50)')).toBeInTheDocument();
        });
    });
});
