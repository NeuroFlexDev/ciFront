import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import { useLocale } from '@/i18n/useLocale';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CanvasMinimap } from '@/Components/canvas/CanvasMinimap';
import { LerniumCanvasEdge } from '@/Components/canvas/edge-renderers/LerniumCanvasEdge';
import { LerniumCanvasNode } from '@/Components/canvas/node-renderers/LerniumCanvasNode';
import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasNodeType } from '@/types/canvas';
import { EXTENDED_NODE_TYPES, NODE_TYPE_DEFINITIONS } from '@/utils/canvasAdapters';
import styles from '@/Components/canvas/styles.module.css';
import { canvasViewportInsets } from './viewportInsets';

function InnerCanvasView({ onRevealCanvas }: { onRevealCanvas: () => void }) {
  const { t } = useLocale();
  const flow = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const viewport = useCanvasStore((state) => state.viewport);
  const interactionMode = useCanvasStore((state) => state.interactionMode);
  const pendingFocusNodeId = useCanvasStore((state) => state.pendingFocusNodeId);
  const consumeFocusNode = useCanvasStore((state) => state.consumeFocusNode);
  const setSelection = useCanvasStore((state) => state.setSelection);
  const onNodesChange = useCanvasStore((state) => state.onNodesChange);
  const onEdgesChange = useCanvasStore((state) => state.onEdgesChange);
  const onConnect = useCanvasStore((state) => state.onConnect);
  const createNode = useCanvasStore((state) => state.createNode);
  const setViewport = useCanvasStore((state) => state.setViewport);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const nodeTypes = useMemo(() => ({ canvasNode: LerniumCanvasNode }), []);
  const edgeTypes = useMemo(() => ({ lerniumEdge: LerniumCanvasEdge }), []);
  const motionDuration = (duration: number) =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : duration;

  useEffect(() => {
    const currentViewport = flow.getViewport();
    const differs =
      Math.abs(currentViewport.x - viewport.x) > 0.01 ||
      Math.abs(currentViewport.y - viewport.y) > 0.01 ||
      Math.abs(currentViewport.zoom - viewport.zoom) > 0.0001;

    if (!differs) {
      return;
    }

    void flow.setViewport(viewport, { duration: 0 });
  }, [flow, viewport]);

  useEffect(() => {
    if (!pendingFocusNodeId) {
      return;
    }

    const node = flow.getNode(pendingFocusNodeId);
    const workspace = wrapperRef.current?.closest('main');
    if (node && workspace) {
      // React Flow resolves group-relative coordinates; center those real bounds
      // in the free board area without closing the inspector or changing nodes.
      const area = canvasViewportInsets(workspace).availableArea;
      const bounds = flow.getNodesBounds([node.id]);
      const zoom = Math.max(
        0.3,
        Math.min(
          Math.max(flow.getZoom(), 0.94),
          area.width / Math.max(1, bounds.width),
          area.height / Math.max(1, bounds.height),
        ),
      );
      void flow.setViewport(
        {
          x: area.x + area.width / 2 - (bounds.x + bounds.width / 2) * zoom,
          y: area.y + area.height / 2 - (bounds.y + bounds.height / 2) * zoom,
          zoom,
        },
        { duration: motionDuration(220) },
      );
    }

    consumeFocusNode();
  }, [consumeFocusNode, flow, pendingFocusNodeId, nodes]);

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    setContextMenu({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }, []);

  const handleCreateFromMenu = useCallback(
    (nodeType: CanvasNodeType) => {
      if (!contextMenu || !wrapperRef.current) {
        return;
      }

      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = flow.screenToFlowPosition({
        x: bounds.left + contextMenu.x,
        y: bounds.top + contextMenu.y,
      });
      createNode(nodeType, position);
      setContextMenu(null);
    },
    [contextMenu, createNode, flow],
  );

  return (
    <div className={styles.canvasStage} ref={wrapperRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(connection) => onConnect(connection)}
        onMoveEnd={(_, nextViewport) => setViewport(nextViewport)}
        onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) =>
          setSelection({
            nodeIds: selectedNodes.map((node) => node.id),
            edgeIds: selectedEdges.map((edge) => edge.id),
          })
        }
        onPaneClick={() => setContextMenu(null)}
        onPaneContextMenu={
          handlePaneContextMenu as (
            event: MouseEvent | React.MouseEvent<Element, MouseEvent>,
          ) => void
        }
        defaultViewport={viewport}
        minZoom={0.3}
        maxZoom={1.8}
        panOnDrag={interactionMode === 'hand'}
        selectionOnDrag={interactionMode === 'select'}
        nodesDraggable={interactionMode !== 'hand'}
        nodesConnectable={interactionMode !== 'hand'}
        elementsSelectable
        deleteKeyCode={null}
        attributionPosition='bottom-left'
      >
        <Background
          gap={24}
          size={1.1}
          color='rgba(202, 244, 50, 0.15)'
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>

      <CanvasMinimap onRevealCanvas={onRevealCanvas} />

      {contextMenu ? (
        <div
          className={styles.contextMenu}
          role='group'
          aria-label={t('Добавить узел')}
          style={{
            left: Math.min(
              contextMenu.x,
              Math.max(0, (wrapperRef.current?.clientWidth ?? 260) - 248),
            ),
            top: Math.min(
              contextMenu.y,
              Math.max(0, (wrapperRef.current?.clientHeight ?? 450) - 420),
            ),
          }}
        >
          {EXTENDED_NODE_TYPES.map((nodeType) => {
            const definition = NODE_TYPE_DEFINITIONS[nodeType];
            const Icon = definition.icon;

            return (
              <button
                key={nodeType}
                type='button'
                className={styles.contextMenuButton}
                onClick={() => handleCreateFromMenu(nodeType)}
              >
                <Icon size={15} />
                {t(definition.label)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function CanvasView({ onRevealCanvas }: { onRevealCanvas: () => void }) {
  return (
    <ReactFlowProvider>
      <InnerCanvasView onRevealCanvas={onRevealCanvas} />
    </ReactFlowProvider>
  );
}
