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
import { getLocale, translate } from '@/i18n/locale';
import { canvasEnglish } from '@/i18n/canvas';

import { requestAiAction } from '@/api/aiApi';
import { loadCanvasSnapshot, saveCanvasSnapshot, getCanvasRevision, adoptCanvasRevision } from '@/api/canvasApi';
import {readDraft,writeDraft,clearDraft,getDraftOwner} from '@/shared/drafts';
import {ApiError} from '@/shared/errors';
import { EDGE_TYPE_DEFINITIONS } from '@/utils/canvasAdapters';
import type {
  CanvasAiActionType,
  CanvasAiResult,
  CanvasInteractionMode,
  CanvasNodeData,
  CanvasNodeType,
  CanvasSnapshot,
  EdgeType,
  LerniumEdge,
  LerniumNode,
} from '@/types/canvas';
import { createInitialCanvas } from '@/utils/canvasAdapters.persistence';
import { createCanvasEdge, edgeFromConnection } from '@/utils/edgeFactory';
import { createCanvasNode, duplicateNode } from '@/utils/nodeFactory';

type PendingAiProposal = {result: CanvasAiResult; anchorIds: string[]};

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
  lastErrorStatus: number | null;
  recoveredDraft: boolean;
  hasUnsavedChanges: boolean;
  aiNotice: string | null;
  aiProposal: PendingAiProposal | null;
  acceptAiProposal: () => void;
  rejectAiProposal: () => void;
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
let hydratedOwner:number|null=null;
let hydrating=false;
let loadSequence=0;
function recoverySnapshot(state:Pick<CanvasStoreState,'courseId'|'courseTitle'|'nodes'|'edges'|'viewport'>):CanvasSnapshot{
  return {courseId:state.courseId!,courseTitle:state.courseTitle,nodes:state.nodes,edges:state.edges,viewport:state.viewport,updatedAt:0};
}

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
  lastErrorStatus: null,
  recoveredDraft: false,
  hasUnsavedChanges: false,
  aiNotice: null,
  aiProposal: null,
  pendingFocusNodeId: null,

  async loadCourse(courseId, courseTitle = `Курс ${courseId}`) {
    const sequence=++loadSequence;
    const owner=getDraftOwner();
    hydrating=true;
    try {
    const saved = await loadCanvasSnapshot(courseId);
    if(sequence!==loadSequence||owner!==getDraftOwner())return;
    const draft=readDraft<CanvasSnapshot>(`canvas:${courseId}`,owner);
    const snapshot = draft?.value ?? saved ?? createInitialCanvas(courseId, courseTitle);
    if(draft?.baseRevision!==undefined)adoptCanvasRevision(courseId,draft.baseRevision);
    hydratedOwner=owner;

    set({
      courseId,
      courseTitle: snapshot.courseTitle,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      viewport: snapshot.viewport ?? DEFAULT_VIEWPORT,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      interactionMode: 'select',
      isSaving:false,
      isAiRunning:false,
      lastError: null,
      lastErrorStatus: null,
      recoveredDraft: Boolean(draft),
      hasUnsavedChanges: Boolean(draft),
      aiNotice: null,
      aiProposal: readDraft<PendingAiProposal>(`canvas-ai:${courseId}`,owner)?.value ?? null,
      lastSavedAt: snapshot.updatedAt ?? null,
    });
    } finally {if(sequence===loadSequence)hydrating=false;}
  },

  async saveCourse() {
    const state = get();
    const owner=getDraftOwner();
    if (!state.courseId || state.isSaving) {
      return;
    }

    set({ isSaving: true, lastError: null, lastErrorStatus:null });

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
      if(owner!==getDraftOwner())return;
      clearDraft(`canvas:${snapshot.courseId}`,{...snapshot,updatedAt:0},owner);
      const current=get();
      if(current.courseId!==snapshot.courseId)return;
      const unchanged=JSON.stringify(recoverySnapshot(current))===JSON.stringify({...snapshot,updatedAt:0});
      if(!unchanged)writeDraft(`canvas:${snapshot.courseId}`,recoverySnapshot(current),getCanvasRevision(snapshot.courseId));
      set({ isSaving: false, lastSavedAt: snapshot.updatedAt, hasUnsavedChanges:!unchanged,recoveredDraft:false });
    } catch (error) {
      set({
        isSaving: false,
        lastError: error instanceof Error ? error.message : 'Не удалось сохранить канву',
        lastErrorStatus:error instanceof ApiError?error.status:null,
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
      title: translate(getLocale(), 'Группа', undefined, { en: canvasEnglish }),
      description: translate(getLocale(), 'Контур для объединения узлов', undefined, { en: canvasEnglish }),
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

  acceptAiProposal() {
    const state=get();const proposal=state.aiProposal;
    if(!proposal||!state.courseId)return;
    if(proposal.anchorIds.some(id=>!state.nodes.some(node=>node.id===id))){set({lastError:'Исходный узел удалён. Отклоните предложение и повторите действие для актуальных узлов.'});return;}
    if(state.nodes.length+proposal.result.nodes.length>1000||state.edges.length+proposal.result.edges.length>3000){set({lastError:'Предложение превышает допустимый размер канвы. Сократите схему перед применением.'});return;}
    const ids=new Set(proposal.result.nodes.map(node=>node.id));
    set({nodes:[...state.nodes,...proposal.result.nodes].map(node=>({...node,selected:ids.has(node.id)})),
      edges:[...state.edges,...proposal.result.edges],selectedNodeIds:Array.from(ids),selectedEdgeIds:[],aiProposal:null,
      pendingFocusNodeId:proposal.result.nodes[0]?.id??null,aiNotice:'Предложение добавлено в рабочую схему. Сохраните канву после проверки.',lastError:null});
    clearDraft(`canvas-ai:${state.courseId}`,proposal);
  },

  rejectAiProposal() {
    const state=get();if(!state.aiProposal||!state.courseId)return;
    clearDraft(`canvas-ai:${state.courseId}`,state.aiProposal);
    set({aiProposal:null,aiNotice:'Предложение отклонено. Содержимое канвы сохранено без изменений.',lastError:null});
  },

  async runAiAction(action) {
    const state=get();const owner=getDraftOwner();
    if(state.isAiRunning)return;
    if(state.aiProposal){set({lastError:'Сначала примите или отклоните текущее предложение.'});return;}
    const selectedNodes=state.nodes.filter(node=>state.selectedNodeIds.includes(node.id));
    if(!selectedNodes.length){set({lastError:'Для AI-действия выделите хотя бы один узел'});return;}
    set({isAiRunning:true,lastError:null,aiNotice:null});
    try {
      const result=await requestAiAction({courseId:state.courseId!,action,selectedNodes});
      const proposal={result,anchorIds:selectedNodes.map(node=>node.id)};
      if(!result.degraded&&result.nodes.length)writeDraft(`canvas-ai:${state.courseId}`,proposal,undefined,owner);
      if(get().courseId!==state.courseId||getDraftOwner()!==owner)return;
      if(result.degraded){set({isAiRunning:false,aiNotice:result.summary});return;}
      set({isAiRunning:false,aiProposal:proposal,aiNotice:null});
    } catch(error) {
      if(get().courseId===state.courseId&&getDraftOwner()===owner)set({isAiRunning:false,lastError:error instanceof Error?error.message:'Не удалось подготовить предложение. Содержимое канвы не изменено.'});
    }
  },
}));

useCanvasStore.subscribe((state,previous)=>{
  if(hydrating||!state.courseId||state.courseId!==previous.courseId||hydratedOwner!==getDraftOwner())return;
  if(state.nodes===previous.nodes&&state.edges===previous.edges&&state.viewport===previous.viewport&&state.courseTitle===previous.courseTitle)return;
  writeDraft(`canvas:${state.courseId}`,recoverySnapshot(state),getCanvasRevision(state.courseId));
  if(!state.hasUnsavedChanges)useCanvasStore.setState({hasUnsavedChanges:true});
});
