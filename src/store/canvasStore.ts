import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from '@xyflow/react';
import { create } from 'zustand';

import { requestAiAction } from '@/api/aiApi';
import { loadCanvasSnapshot, saveCanvasSnapshot } from '@/api/canvasApi';
import { EDGE_TYPE_DEFINITIONS } from '@/utils/canvasAdapters';
import type {
  CanvasAiActionType,
  CanvasInteractionMode,
  CanvasNodeData,
  CanvasNodeType,
  EdgeType,
  LerniumEdge,
  LerniumNode,
} from '@/types/canvas';
import { createInitialCanvas } from '@/utils/canvasAdapters.persistence';
import { createCanvasEdge, edgeFromConnection } from '@/utils/edgeFactory';
import { createCanvasNode, duplicateNode } from '@/utils/nodeFactory';

type SelectionPayload = {
  nodeIds: string[];
  edgeIds: string[];
};

type CanvasStoreState = {
  courseId: string | null;
  courseTitle: string;
  nodes: LerniumNode[];
  edges: LerniumEdge[];
  viewport: Viewport;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  interactionMode: CanvasInteractionMode;
  isSaving: boolean;
  isAiRunning: boolean;
  lastSavedAt: number | null;
  lastError: string | null;
  pendingFocusNodeId: string | null;
  loadCourse: (courseId: string, courseTitle?: string) => Promise<void>;
  saveCourse: () => Promise<void>;
  setViewport: (viewport: Viewport) => void;
  setInteractionMode: (mode: CanvasInteractionMode) => void;
  setSelection: (selection: SelectionPayload) => void;
  requestFocusNode: (nodeId: string | null) => void;
  consumeFocusNode: () => string | null;
  onNodesChange: (changes: NodeChange<LerniumNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<LerniumEdge>[]) => void;
  onConnect: (connection: Connection, edgeType?: EdgeType) => void;
  createNode: (nodeType: CanvasNodeType, position?: { x: number; y: number }) => string;
  createConnectedNode: (sourceId: string, nodeType?: CanvasNodeType) => string | null;
  updateNodeData: (nodeId: string, patch: Partial<CanvasNodeData>) => void;
  updateEdgeType: (edgeId: string, edgeType: EdgeType) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  createFrameFromSelection: () => void;
  clearFrameForSelection: () => void;
  runAiAction: (action: CanvasAiActionType) => Promise<void>;
};

const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

function isSameIds(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function isSameViewport(left: Viewport, right: Viewport) {
  return (
    Math.abs(left.x - right.x) < 0.01
    && Math.abs(left.y - right.y) < 0.01
    && Math.abs(left.zoom - right.zoom) < 0.0001
  );
}

function getAbsolutePosition(node: LerniumNode, nodes: LerniumNode[]): { x: number; y: number } {
  if (!node.parentId) {
    return node.position;
  }

  const parent = nodes.find((item) => item.id === node.parentId);
  if (!parent) {
    return node.position;
  }

  const parentPosition = getAbsolutePosition(parent, nodes);
  return {
    x: parentPosition.x + node.position.x,
    y: parentPosition.y + node.position.y,
  };
}

function setAiState(nodes: LerniumNode[], selectedIds: string[], aiState: CanvasNodeData['aiState']) {
  return nodes.map((node) => (
    selectedIds.includes(node.id)
      ? { ...node, data: { ...node.data, aiState } }
      : node
  ));
}

export const useCanvasStore = create<CanvasStoreState>((set, get) => ({
  courseId: null,
  courseTitle: 'Новый курс',
  nodes: [],
  edges: [],
  viewport: DEFAULT_VIEWPORT,
  selectedNodeIds: [],
  selectedEdgeIds: [],
  interactionMode: 'select',
  isSaving: false,
  isAiRunning: false,
  lastSavedAt: null,
  lastError: null,
  pendingFocusNodeId: null,

  async loadCourse(courseId, courseTitle = `Курс ${courseId}`) {
    const saved = await loadCanvasSnapshot(courseId);
    const snapshot = saved ?? createInitialCanvas(courseId, courseTitle);

    set({
      courseId,
      courseTitle: snapshot.courseTitle,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      viewport: snapshot.viewport ?? DEFAULT_VIEWPORT,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      interactionMode: 'select',
      lastError: null,
      lastSavedAt: snapshot.updatedAt ?? null,
    });
  },

  async saveCourse() {
    const state = get();
    if (!state.courseId) {
      return;
    }

    set({ isSaving: true, lastError: null });

    try {
      const snapshot = {
        courseId: state.courseId,
        courseTitle: state.courseTitle,
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
        updatedAt: Date.now(),
      };

      await saveCanvasSnapshot(snapshot);
      set({ isSaving: false, lastSavedAt: snapshot.updatedAt });
    } catch (error) {
      set({
        isSaving: false,
        lastError: error instanceof Error ? error.message : 'Не удалось сохранить канву',
      });
    }
  },

  setViewport(viewport) {
    set((state) => (
      isSameViewport(state.viewport, viewport)
        ? state
        : { viewport }
    ));
  },

  setInteractionMode(mode) {
    set({ interactionMode: mode });
  },

  setSelection(selection) {
    set((state) => (
      isSameIds(state.selectedNodeIds, selection.nodeIds) && isSameIds(state.selectedEdgeIds, selection.edgeIds)
        ? state
        : {
          selectedNodeIds: selection.nodeIds,
          selectedEdgeIds: selection.edgeIds,
        }
    ));
  },

  requestFocusNode(nodeId) {
    set({ pendingFocusNodeId: nodeId });
  },

  consumeFocusNode() {
    const current = get().pendingFocusNodeId;
    set({ pendingFocusNodeId: null });
    return current;
  },

  onNodesChange(changes) {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));
  },

  onEdgesChange(changes) {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  onConnect(connection, edgeType = 'contains') {
    const nextEdge = edgeFromConnection(connection, edgeType);
    if (!nextEdge) {
      return;
    }

    set((state) => ({
      edges: addEdge(nextEdge, state.edges),
    }));
  },

  createNode(nodeType, position) {
    const state = get();
    const nextNode = createCanvasNode(
      nodeType,
      position ?? {
        x: state.nodes.length * 70,
        y: state.nodes.length * 50,
      },
    );

    set({
      nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), { ...nextNode, selected: true }],
      selectedNodeIds: [nextNode.id],
      selectedEdgeIds: [],
      pendingFocusNodeId: nextNode.id,
    });

    return nextNode.id;
  },

  createConnectedNode(sourceId, nodeType = 'lesson') {
    const state = get();
    const source = state.nodes.find((node) => node.id === sourceId);
    if (!source) {
      return null;
    }

    const absolute = getAbsolutePosition(source, state.nodes);
    const nextNode = createCanvasNode(nodeType, {
      x: absolute.x + 260,
      y: absolute.y + 40,
    });
    const nextEdge = createCanvasEdge(sourceId, nextNode.id, source.data.nodeType === 'practice' ? 'next' : 'contains');

    set({
      nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), { ...nextNode, selected: true }],
      edges: [...state.edges, nextEdge],
      selectedNodeIds: [nextNode.id],
      selectedEdgeIds: [],
      pendingFocusNodeId: nextNode.id,
    });

    return nextNode.id;
  },

  updateNodeData(nodeId, patch) {
    set((state) => ({
      nodes: state.nodes.map((node) => (
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...patch } }
          : node
      )),
    }));
  },

  updateEdgeType(edgeId, edgeType) {
    const definition = EDGE_TYPE_DEFINITIONS[edgeType];

    set((state) => ({
      edges: state.edges.map((edge) => (
        edge.id === edgeId
          ? {
            ...edge,
            data: {
              id: edge.data?.id ?? edge.id,
              edgeType,
              label: definition.label,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: definition.stroke,
            },
            style: {
              stroke: definition.stroke,
              strokeWidth: 2,
              strokeDasharray: definition.dash,
            },
          }
          : edge
      )),
    }));
  },

  deleteSelection() {
    const { selectedNodeIds, selectedEdgeIds } = get();
    if (!selectedNodeIds.length && !selectedEdgeIds.length) {
      return;
    }

    set((state) => ({
      nodes: state.nodes.filter((node) => !selectedNodeIds.includes(node.id)),
      edges: state.edges.filter((edge) => (
        !selectedEdgeIds.includes(edge.id)
        && !selectedNodeIds.includes(edge.source)
        && !selectedNodeIds.includes(edge.target)
      )),
      selectedNodeIds: [],
      selectedEdgeIds: [],
    }));
  },

  duplicateSelection() {
    const state = get();
    const nodeToDuplicate = state.nodes.find((node) => state.selectedNodeIds.includes(node.id) && node.data.nodeType !== 'frame');
    if (!nodeToDuplicate) {
      return;
    }

    const nextNode = duplicateNode(nodeToDuplicate);
    set({
      nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), { ...nextNode, selected: true }],
      selectedNodeIds: [nextNode.id],
      selectedEdgeIds: [],
      pendingFocusNodeId: nextNode.id,
    });
  },

  createFrameFromSelection() {
    const state = get();
    const selectedNodes = state.nodes.filter((node) => state.selectedNodeIds.includes(node.id) && node.data.nodeType !== 'frame' && !node.parentId);
    if (!selectedNodes.length) {
      return;
    }

    const absolutePositions = selectedNodes.map((node) => getAbsolutePosition(node, state.nodes));
    const minX = Math.min(...absolutePositions.map((item) => item.x));
    const minY = Math.min(...absolutePositions.map((item) => item.y));
    const maxX = Math.max(...absolutePositions.map((item, index) => item.x + (selectedNodes[index].measured?.width ?? 260)));
    const maxY = Math.max(...absolutePositions.map((item, index) => item.y + (selectedNodes[index].measured?.height ?? 160)));

    const framePadding = 56;
    const frameNode = createCanvasNode('frame', {
      x: minX - framePadding,
      y: minY - framePadding,
    }, {
      width: maxX - minX + framePadding * 2,
      height: maxY - minY + framePadding * 2,
      title: 'Группа',
      description: 'Контур для объединения узлов',
    });

    const nextNodes = state.nodes.map((node) => {
      if (!state.selectedNodeIds.includes(node.id) || node.data.nodeType === 'frame' || node.parentId) {
        return { ...node, selected: false };
      }

      const absolute = getAbsolutePosition(node, state.nodes);
      return {
        ...node,
        parentId: frameNode.id,
        extent: 'parent' as const,
        position: {
          x: absolute.x - frameNode.position.x,
          y: absolute.y - frameNode.position.y,
        },
        data: {
          ...node.data,
          frameId: frameNode.id,
        },
      };
    });

    set({
      nodes: [{ ...frameNode, selected: true }, ...nextNodes],
      selectedNodeIds: [frameNode.id],
      selectedEdgeIds: [],
      pendingFocusNodeId: frameNode.id,
    });
  },

  clearFrameForSelection() {
    const state = get();
    if (!state.selectedNodeIds.length) {
      return;
    }

    set({
      nodes: state.nodes.map((node) => {
        if (!state.selectedNodeIds.includes(node.id) || !node.parentId) {
          return node;
        }

        const parent = state.nodes.find((item) => item.id === node.parentId);
        return {
          ...node,
          parentId: undefined,
          extent: undefined,
          position: {
            x: (parent?.position.x ?? 0) + node.position.x,
            y: (parent?.position.y ?? 0) + node.position.y,
          },
          data: {
            ...node.data,
            frameId: null,
          },
        };
      }),
    });
  },

  async runAiAction(action) {
    const state = get();
    const selectedNodes = state.nodes.filter((node) => state.selectedNodeIds.includes(node.id));

    if (!selectedNodes.length) {
      set({ lastError: 'Для AI-действия нужно выделить хотя бы один узел' });
      return;
    }

    set({
      isAiRunning: true,
      lastError: null,
      nodes: setAiState(state.nodes, state.selectedNodeIds, 'loading'),
    });

    try {
      const result = await requestAiAction({
        action,
        selectedNodes,
      });

      set((current) => ({
        isAiRunning: false,
        nodes: setAiState(
          [
            ...current.nodes,
            ...result.nodes,
          ],
          current.selectedNodeIds,
          'generated',
        ).map((node) => ({
          ...node,
          selected: result.nodes.some((generatedNode) => generatedNode.id === node.id),
        })),
        edges: [...current.edges, ...result.edges],
        selectedNodeIds: result.nodes.map((node) => node.id),
        selectedEdgeIds: [],
        pendingFocusNodeId: result.nodes[0]?.id ?? null,
      }));
    } catch (error) {
      set((current) => ({
        isAiRunning: false,
        lastError: error instanceof Error ? error.message : 'Не удалось выполнить AI-действие',
        nodes: setAiState(current.nodes, current.selectedNodeIds, 'error'),
      }));
    }
  },
}));
