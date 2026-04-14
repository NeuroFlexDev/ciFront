import type { Edge, Node, Viewport } from '@xyflow/react';

export type CanvasNodeType =
  | 'course'
  | 'module'
  | 'lesson'
  | 'theory'
  | 'practice'
  | 'test'
  | 'project'
  | 'skill'
  | 'competency'
  | 'branch'
  | 'comment'
  | 'frame';

export type CanvasDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type CanvasStatus = 'draft' | 'in_progress' | 'ready';
export type CanvasAiState = 'idle' | 'loading' | 'generated' | 'error';
export type CanvasInteractionMode = 'select' | 'connect' | 'hand';

export type EdgeType =
  | 'contains'
  | 'prerequisite'
  | 'next'
  | 'alternative'
  | 'related'
  | 'assesses'
  | 'builds_skill'
  | 'maps_to_competency';

export type CanvasAiActionType =
  | 'split_module'
  | 'generate_test'
  | 'extend_branch'
  | 'simplify_structure'
  | 'find_gaps';

export type CanvasNodeData = {
  id: string;
  nodeType: CanvasNodeType;
  title: string;
  description?: string;
  duration?: number;
  difficulty?: CanvasDifficulty;
  status?: CanvasStatus;
  tags?: string[];
  skillIds?: string[];
  competencyIds?: string[];
  frameId?: string | null;
  aiState?: CanvasAiState;
};

export type CanvasEdgeData = {
  id: string;
  edgeType: EdgeType;
  label?: string;
};

export type LerniumNode = Node<CanvasNodeData, 'canvasNode'>;
export type LerniumEdge = Edge<CanvasEdgeData, 'lerniumEdge'>;

export type CanvasSnapshot = {
  courseId: string;
  courseTitle: string;
  nodes: LerniumNode[];
  edges: LerniumEdge[];
  viewport: Viewport;
  updatedAt: number;
};

export type CanvasAiResult = {
  nodes: LerniumNode[];
  edges: LerniumEdge[];
  summary: string;
};
