import { MarkerType, type Connection } from '@xyflow/react';

import { EDGE_TYPE_DEFINITIONS } from '@/utils/canvasAdapters';
import type { EdgeType, LerniumEdge } from '@/types/canvas';

function createId() {
  return `edge-${crypto.randomUUID()}`;
}

export function createCanvasEdge(
  source: string,
  target: string,
  edgeType: EdgeType = 'contains',
): LerniumEdge {
  const definition = EDGE_TYPE_DEFINITIONS[edgeType];

  return {
    id: createId(),
    source,
    target,
    type: 'lerniumEdge',
    data: {
      id: createId(),
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
  };
}

export function edgeFromConnection(connection: Connection, edgeType: EdgeType = 'contains') {
  if (!connection.source || !connection.target) {
    return null;
  }

  return createCanvasEdge(connection.source, connection.target, edgeType);
}
