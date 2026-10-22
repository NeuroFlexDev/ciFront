import type { PropsWithChildren } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CanvasView } from './CanvasView';
import { useCanvasStore } from '@/store/canvasStore';
import type { LerniumNode } from '@/types/canvas';

const flow = vi.hoisted(() => ({
  getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
  getZoom: vi.fn(() => 1),
  getNode: vi.fn(),
  getNodesBounds: vi.fn(),
  setViewport: vi.fn(),
  setCenter: vi.fn(),
}));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...await importOriginal<typeof import('@xyflow/react')>(),
  useReactFlow: () => flow,
  ReactFlowProvider: ({ children }: PropsWithChildren) => children,
  ReactFlow: ({ children }: PropsWithChildren) => <div>{children}</div>,
  Background: () => null,
}));
vi.mock('./CanvasMinimap', () => ({ CanvasMinimap: () => null }));
vi.mock('./node-renderers/LerniumCanvasNode', () => ({ LerniumCanvasNode: () => null }));
vi.mock('./edge-renderers/LerniumCanvasEdge', () => ({ LerniumCanvasEdge: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  useCanvasStore.setState(useCanvasStore.getInitialState());
  flow.getNode.mockImplementation((id: string) => useCanvasStore.getState().nodes.find((node) => node.id === id));
  flow.getNodesBounds.mockReturnValue({ x: 600, y: 420, width: 280, height: 180 });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function rect(element: Element, x: number, y: number, width: number, height: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x, y, width, height, left: x, right: x + width, top: y, bottom: y + height,
    toJSON: () => ({}),
  });
}

function workspace() {
  const reveal = vi.fn();
  const view = render(
    <main>
      <header data-canvas-toolbar />
      <CanvasView onRevealCanvas={reveal} />
      <section data-canvas-panel data-side='right' aria-label='Свойства' />
    </main>,
  );
  rect(view.container.querySelector('main')!, 0, 0, 932, 884);
  rect(view.container.querySelector('header')!, 16, 16, 900, 114);
  rect(screen.getByRole('region', { name: 'Свойства' }), 572, 198, 344, 500);
  return reveal;
}

const selectedNode: LerniumNode = {
  id: 'lesson', type: 'canvasNode', position: { x: 600, y: 420 },
  measured: { width: 280, height: 180 },
  data: { id: 'lesson', title: 'Материал', nodeType: 'lesson', description: 'Сохранённый текст' },
};

it('shows the selected node in the free board area while keeping its properties open', () => {
  useCanvasStore.setState({ nodes: [selectedNode], selectedNodeIds: ['lesson'] });
  const reveal = workspace();
  act(() => useCanvasStore.getState().requestFocusNode('lesson'));

  expect(flow.getNodesBounds).toHaveBeenCalledWith(['lesson']);
  expect(flow.setViewport).toHaveBeenCalledExactlyOnceWith(
    { x: -450, y: -11, zoom: 1 }, { duration: 220 },
  );
  // The node center is (290, 499), the actual free rectangle's center;
  // its right edge is 430, safely before the inspector at x=572.
  expect(flow.setCenter).not.toHaveBeenCalled();
  expect(reveal).not.toHaveBeenCalled();
  expect(screen.getByRole('region', { name: 'Свойства' })).toBeVisible();
  expect(useCanvasStore.getState()).toMatchObject({
    nodes: [selectedNode], selectedNodeIds: ['lesson'], pendingFocusNodeId: null,
    hasUnsavedChanges: false,
  });
});

it('delegates grouped-node absolute bounds to React Flow and respects reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  flow.getZoom.mockReturnValueOnce(0.6);
  flow.getNodesBounds.mockReturnValue({ x: 1024, y: 860, width: 280, height: 180 });
  const group = { ...selectedNode, id: 'group', position: { x: 1000, y: 800 } };
  const child = { ...selectedNode, parentId: 'group', position: { x: 24, y: 60 } };
  useCanvasStore.setState({ nodes: [group, child], selectedNodeIds: ['lesson'] });
  const reveal = workspace();
  act(() => useCanvasStore.getState().requestFocusNode('lesson'));

  expect(flow.getNodesBounds).toHaveBeenCalledWith(['lesson']);
  expect(flow.setViewport).toHaveBeenCalledOnce();
  const [viewport, options] = flow.setViewport.mock.calls[0];
  expect(viewport.zoom).toBe(0.94);
  expect(viewport.x + (1024 + 140) * viewport.zoom).toBeCloseTo(290);
  expect(viewport.y + (860 + 90) * viewport.zoom).toBeCloseTo(499);
  expect(options).toEqual({ duration: 0 });
  expect(flow.setCenter).not.toHaveBeenCalled();
  expect(reveal).not.toHaveBeenCalled();
  expect(useCanvasStore.getState().nodes).toEqual([group, child]);
});

it('fits a large node within the available width rather than hiding it under the inspector', () => {
  useCanvasStore.setState({ nodes: [selectedNode] });
  flow.getNodesBounds.mockReturnValue({ x: 600, y: 420, width: 1000, height: 600 });
  workspace();
  act(() => useCanvasStore.getState().requestFocusNode('lesson'));
  const [viewport] = flow.setViewport.mock.calls[0];
  expect(viewport.zoom).toBeCloseTo(0.524);
  expect(viewport.x + 600 * viewport.zoom).toBeCloseTo(28);
  expect(viewport.x + 1600 * viewport.zoom).toBeCloseTo(552);
  expect(viewport.y + 420 * viewport.zoom).toBeGreaterThanOrEqual(202);
  expect(viewport.y + 1020 * viewport.zoom).toBeLessThanOrEqual(796);
  expect(screen.getByRole('region', { name: 'Свойства' })).toBeVisible();
});
