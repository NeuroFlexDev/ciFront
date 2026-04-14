import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

import { EDGE_TYPE_DEFINITIONS } from '@/utils/canvasAdapters';
import type { LerniumEdge } from '@/types/canvas';
import styles from '@/Components/canvas/styles.module.css';

export function LerniumCanvasEdge(props: EdgeProps<LerniumEdge>) {
  const [path, labelX, labelY] = getBezierPath(props);
  const definition = EDGE_TYPE_DEFINITIONS[props.data?.edgeType ?? 'contains'];

  return (
    <>
      <BaseEdge path={path} markerEnd={props.markerEnd} style={props.style} />
      <EdgeLabelRenderer>
        <div
          className={styles.edgeLabel}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            color: definition.stroke,
          }}
        >
          {props.data?.label ?? definition.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
