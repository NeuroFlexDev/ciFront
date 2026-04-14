import { type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Plus } from 'lucide-react';

import { useCanvasStore } from '@/store/canvasStore';
import { NODE_TYPE_DEFINITIONS } from '@/utils/canvasAdapters';
import type { LerniumNode } from '@/types/canvas';
import styles from '@/Components/canvas/styles.module.css';

export function LerniumCanvasNode({ id, data, selected }: NodeProps<LerniumNode>) {
  const createConnectedNode = useCanvasStore((state) => state.createConnectedNode);
  const definition = NODE_TYPE_DEFINITIONS[data.nodeType];
  const Icon = definition.icon;

  if (data.nodeType === 'frame') {
    return (
      <div className={`${styles.frameNode} ${selected ? styles.frameNodeSelected : ''}`}>
        <div className={styles.frameNodeHeader}>
          <Icon size={14} />
          <span>{data.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.canvasNode} ${selected ? styles.canvasNodeSelected : ''}`}
      style={{
        '--node-accent': definition.accent,
        '--node-surface': definition.surface,
      } as CSSProperties}
    >
      <Handle className={styles.nodeHandle} type="target" position={Position.Left} />
      <Handle className={styles.nodeHandle} type="target" position={Position.Top} />

      <div className={styles.nodeHeader}>
        <span className={styles.nodeTypeBadge}>
          <Icon size={14} />
          {definition.label}
        </span>
        {data.aiState && data.aiState !== 'idle' ? (
          <span className={`${styles.nodeAiState} ${styles[`nodeAiState${data.aiState}`]}`}>
            {data.aiState === 'loading' ? 'AI...' : data.aiState === 'generated' ? 'AI' : 'Ошибка'}
          </span>
        ) : null}
      </div>

      <div className={styles.nodeTitle}>{data.title}</div>
      <div className={styles.nodeDescription}>{data.description || definition.description}</div>

      <div className={styles.nodeMetaRow}>
        {data.status ? <span>{data.status}</span> : null}
        {typeof data.duration === 'number' ? <span>{data.duration} мин</span> : null}
        {data.difficulty ? <span>{data.difficulty}</span> : null}
      </div>

      {selected ? (
        <button
          type="button"
          className={styles.nodeQuickAdd}
          onClick={(event) => {
            event.stopPropagation();
            createConnectedNode(id, data.nodeType === 'module' ? 'lesson' : 'practice');
          }}
        >
          <Plus size={14} />
        </button>
      ) : null}

      <Handle className={styles.nodeHandle} type="source" position={Position.Right} />
      <Handle className={styles.nodeHandle} type="source" position={Position.Bottom} />
    </div>
  );
}
