import type { CanvasAiActionType, CanvasAiResult, CanvasNodeType, LerniumNode } from '@/types/canvas';
import { createCanvasEdge } from '@/utils/edgeFactory';
import { createCanvasNode } from '@/utils/nodeFactory';

type AiRequest = {
  action: CanvasAiActionType;
  selectedNodes: LerniumNode[];
};

function buildGeneratedNodes(action: CanvasAiActionType, anchor: LerniumNode): CanvasAiResult {
  const baseX = anchor.position.x + 260;
  const baseY = anchor.position.y - 40;
  let generatedTypes: CanvasNodeType[] = [];
  let prefix = '';

  switch (action) {
    case 'split_module':
      generatedTypes = ['lesson', 'lesson', 'practice'];
      prefix = 'Урок';
      break;
    case 'generate_test':
      generatedTypes = ['test'];
      prefix = 'Тест';
      break;
    case 'extend_branch':
      generatedTypes = ['branch', 'lesson', 'practice'];
      prefix = 'Ветка';
      break;
    case 'simplify_structure':
      generatedTypes = ['module', 'lesson'];
      prefix = 'Упрощенный блок';
      break;
    case 'find_gaps':
      generatedTypes = ['comment', 'skill'];
      prefix = 'AI заметка';
      break;
  }

  const nodes = generatedTypes.map((nodeType, index) => createCanvasNode(nodeType, {
    x: baseX + (index % 2) * 180,
    y: baseY + index * 110,
  }, {
    title: `${prefix} ${index + 1}`,
    description: `AI-добавление для "${anchor.data.title}"`,
    status: 'draft',
  }));

  const edges = nodes.map((node) => createCanvasEdge(anchor.id, node.id, action === 'generate_test' ? 'assesses' : 'contains'));

  return {
    nodes,
    edges,
    summary: `AI добавил ${nodes.length} ${nodes.length === 1 ? 'узел' : 'узла'} на канву.`,
  };
}

export async function requestAiAction({ action, selectedNodes }: AiRequest): Promise<CanvasAiResult> {
  await new Promise((resolve) => window.setTimeout(resolve, 900));

  const anchor = selectedNodes[0];
  if (!anchor) {
    throw new Error('Сначала выделите узел или группу узлов');
  }

  return buildGeneratedNodes(action, anchor);
}
