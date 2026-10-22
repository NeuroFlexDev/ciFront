import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CanvasMinimap } from './CanvasMinimap';
import { canvasViewportInsets } from './viewportInsets';

const flow = vi.hoisted(() => ({ zoomIn: vi.fn(), zoomOut: vi.fn(), fitView: vi.fn() }));
vi.mock('@xyflow/react', () => ({
  useReactFlow: () => flow,
  useViewport: () => ({ zoom: 0.75 }),
  MiniMap: () => <svg aria-label='map preview' />,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function rect(element: Element, x: number, y: number, width: number, height: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x,
    y,
    width,
    height,
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    toJSON: () => ({}),
  });
}

it('frames the actual free area around an observed header and visible side panels', () => {
  const reveal = vi.fn();
  const { container } = render(
    <main>
      <header data-canvas-toolbar />
      <section data-canvas-panel data-side='left' />
      <section data-canvas-panel data-side='right' />
      <CanvasMinimap onRevealCanvas={reveal} />
    </main>,
  );
  const workspace = container.querySelector('main')!;
  rect(workspace, 0, 0, 1280, 800);
  rect(container.querySelector('header')!, 16, 16, 1248, 72);
  const panels = container.querySelectorAll('section');
  rect(panels[0], 16, 160, 288, 480);
  rect(panels[1], 920, 160, 344, 480);
  fireEvent.click(screen.getByRole('button', { name: 'Показать всю схему' }));
  expect(flow.fitView).toHaveBeenCalledWith(
    expect.objectContaining({
      padding: { left: '324px', right: '380px', top: '160px', bottom: '88px' },
    }),
  );
  expect(reveal).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Масштаб')).toHaveTextContent('75%');
  fireEvent.click(screen.getByRole('button', { name: 'Увеличить масштаб' }));
  expect(flow.zoomIn).toHaveBeenCalledWith({ duration: 180 });
  // A taller header (locale, zoom, fonts) changes framing without moving nodes or editing data.
  rect(container.querySelector('header')!, 16, 16, 1248, 120);
  expect(canvasViewportInsets(workspace).padding.top).toBe('208px');
});

it('collapses an obstructing mobile drawer before fitting and respects reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  const reveal = vi.fn(() => {
    panel.hidden = true;
  });
  const { container } = render(
    <main>
      <header data-canvas-toolbar />
      <section data-canvas-panel data-side='right' />
      <CanvasMinimap onRevealCanvas={reveal} />
    </main>,
  );
  const panel = container.querySelector('section')!;
  rect(container.querySelector('main')!, 0, 0, 390, 844);
  rect(container.querySelector('header')!, 10, 10, 370, 120);
  rect(panel, 36, 190, 344, 560);
  fireEvent.click(screen.getByRole('button', { name: 'Показать всю схему' }));
  expect(reveal).toHaveBeenCalledOnce();
  expect(flow.fitView).toHaveBeenLastCalledWith({
    duration: 0,
    maxZoom: 1,
    padding: { left: '28px', right: '28px', top: '202px', bottom: '88px' },
  });
});
