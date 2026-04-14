import type { XYPosition } from '@xyflow/react';

import type {
  CanvasNodeData,
  CanvasNodeType,
  CanvasStatus,
  LerniumNode,
} from '@/types/canvas';

type CreateNodeOptions = {
  id?: string;
  title?: string;
  description?: string;
  frameId?: string | null;
  width?: number;
  height?: number;
  status?: CanvasStatus;
};

const DEFAULT_TITLES: Record<CanvasNodeType, string> = {
  course: 'Новый курс',
  module: 'Новый модуль',
  lesson: 'Новый урок',
  theory: 'Теоретический блок',
  practice: 'Практика',
  test: 'Тест',
  project: 'Проект',
  skill: 'Навык',
  competency: 'Компетенция',
  branch: 'Ветвление',
  comment: 'Комментарий',
  frame: 'Фрейм',
};

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createCanvasNode(
  nodeType: CanvasNodeType,
  position: XYPosition,
  options: CreateNodeOptions = {},
): LerniumNode {
  const id = options.id ?? createId(nodeType);
  const data: CanvasNodeData = {
    id,
    nodeType,
    title: options.title ?? DEFAULT_TITLES[nodeType],
    description: options.description ?? '',
    difficulty: 'beginner',
    status: options.status ?? 'draft',
    tags: [],
    skillIds: [],
    competencyIds: [],
    frameId: options.frameId ?? null,
    aiState: 'idle',
  };

  const baseNode: LerniumNode = {
    id,
    type: 'canvasNode',
    position,
    data,
    selected: false,
  };

  if (nodeType === 'frame') {
    baseNode.style = {
      width: options.width ?? 420,
      height: options.height ?? 260,
      zIndex: 0,
    };
    baseNode.draggable = true;
    baseNode.selectable = true;
  }

  return baseNode;
}

export function duplicateNode(node: LerniumNode): LerniumNode {
  return {
    ...node,
    id: createId(node.data.nodeType),
    position: {
      x: node.position.x + 80,
      y: node.position.y + 80,
    },
    data: {
      ...node.data,
      id: createId('data'),
      title: `${node.data.title} копия`,
      aiState: 'idle',
    },
    selected: false,
    parentId: undefined,
    extent: undefined,
  };
}
