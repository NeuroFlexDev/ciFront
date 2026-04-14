import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CanvasMinimap } from '@/Components/canvas/CanvasMinimap';
import { LerniumCanvasEdge } from '@/Components/canvas/edge-renderers/LerniumCanvasEdge';
import { LerniumCanvasNode } from '@/Components/canvas/node-renderers/LerniumCanvasNode';
import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasNodeType } from '@/types/canvas';
import { EXTENDED_NODE_TYPES, NODE_TYPE_DEFINITIONS } from '@/utils/canvasAdapters';
import styles from '@/Components/canvas/styles.module.css';

export type CanvasViewApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
};

type InnerCanvasViewProps = {
  onReady: (api: CanvasViewApi) => void;
};

function InnerCanvasView({ onReady }: InnerCanvasViewProps) {
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

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const nodeTypes = useMemo(() => ({ canvasNode: LerniumCanvasNode }), []);
  const edgeTypes = useMemo(() => ({ lerniumEdge: LerniumCanvasEdge }), []);

  useEffect(() => {
    onReady({
      zoomIn: () => {
        void flow.zoomIn({ duration: 180 });
      },
      zoomOut: () => {
        void flow.zoomOut({ duration: 180 });
      },
      fitView: () => {
        void flow.fitView({ duration: 180, padding: 0.16 });
      },
    });
  }, [flow, onReady]);

  useEffect(() => {
    const currentViewport = flow.getViewport();
    const differs = (
      Math.abs(currentViewport.x - viewport.x) > 0.01
      || Math.abs(currentViewport.y - viewport.y) > 0.01
      || Math.abs(currentViewport.zoom - viewport.zoom) > 0.0001
    );

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
    if (node) {
      const width = node.measured?.width ?? 280;
      const height = node.measured?.height ?? 180;
      void flow.setCenter(node.position.x + width / 2, node.position.y + height / 2, {
        zoom: Math.max(flow.getZoom(), 0.94),
        duration: 220,
      });
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

  const handleCreateFromMenu = useCallback((nodeType: CanvasNodeType) => {
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
  }, [contextMenu, createNode, flow]);

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
        onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => setSelection({
          nodeIds: selectedNodes.map((node) => node.id),
          edgeIds: selectedEdges.map((edge) => edge.id),
        })}
        onPaneClick={() => setContextMenu(null)}
        onPaneContextMenu={handlePaneContextMenu as (event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => void}
        fitView
        minZoom={0.3}
        maxZoom={1.8}
        panOnDrag={interactionMode === 'hand'}
        selectionOnDrag={interactionMode === 'select'}
        nodesDraggable={interactionMode !== 'hand'}
        nodesConnectable={interactionMode !== 'hand'}
        elementsSelectable
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1.1} color="rgba(128, 149, 173, 0.12)" variant={BackgroundVariant.Lines} />
      </ReactFlow>

      <CanvasMinimap />

      {contextMenu ? (
        <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }}>
          {EXTENDED_NODE_TYPES.map((nodeType) => {
            const definition = NODE_TYPE_DEFINITIONS[nodeType];
            const Icon = definition.icon;

            return (
              <button
                key={nodeType}
                type="button"
                className={styles.contextMenuButton}
                onClick={() => handleCreateFromMenu(nodeType)}
              >
                <Icon size={15} />
                {definition.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type CanvasViewProps = {
  onReady: (api: CanvasViewApi) => void;
};

export function CanvasView({ onReady }: CanvasViewProps) {
  return (
    <ReactFlowProvider>
      <InnerCanvasView onReady={onReady} />
    </ReactFlowProvider>
  );
}
