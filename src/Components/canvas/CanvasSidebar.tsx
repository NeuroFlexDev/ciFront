import { Copy, Focus, Trash2, Ungroup } from 'lucide-react';

import { AIActionsMenu } from '@/Components/ai/AIActionsMenu';
import { useCanvasStore } from '@/store/canvasStore';
import type { CanvasAiActionType, CanvasEdgeData, CanvasNodeData } from '@/types/canvas';
import { EDGE_TYPE_DEFINITIONS, NODE_TYPE_DEFINITIONS, EXTENDED_NODE_TYPES } from '@/utils/canvasAdapters';
import styles from '@/Components/canvas/styles.module.css';

type CanvasSidebarProps = {
  selectedNode: { id: string; data: CanvasNodeData } | null;
  selectedEdge: { id: string; data?: CanvasEdgeData | null } | null;
  isAiRunning: boolean;
  onAiAction: (action: CanvasAiActionType) => void;
};

function toCommaSeparated(value?: string[]) {
  return value && value.length ? value.join(', ') : '';
}

export function CanvasSidebar({
  selectedNode,
  selectedEdge,
  isAiRunning,
  onAiAction,
}: CanvasSidebarProps) {
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const updateEdgeType = useCanvasStore((state) => state.updateEdgeType);
  const deleteSelection = useCanvasStore((state) => state.deleteSelection);
  const duplicateSelection = useCanvasStore((state) => state.duplicateSelection);
  const clearFrameForSelection = useCanvasStore((state) => state.clearFrameForSelection);
  const requestFocusNode = useCanvasStore((state) => state.requestFocusNode);

  if (selectedEdge && !selectedNode) {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div>
            <div className={styles.sidebarEyebrow}>Связь</div>
            <h2 className={styles.sidebarTitle}>Настройки связи</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={deleteSelection}>
            <Trash2 size={16} />
          </button>
        </div>

        <label className={styles.sidebarField}>
          <span>Тип связи</span>
          <select
            value={selectedEdge.data?.edgeType ?? 'contains'}
            onChange={(event) => updateEdgeType(selectedEdge.id, event.target.value as CanvasEdgeData['edgeType'])}
          >
            {Object.entries(EDGE_TYPE_DEFINITIONS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </label>
      </aside>
    );
  }

  if (!selectedNode) {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div>
            <div className={styles.sidebarEyebrow}>Свойства</div>
            <h2 className={styles.sidebarTitle}>Ничего не выбрано</h2>
          </div>
        </div>
        <p className={styles.sidebarEmpty}>
          Выберите узел на канве, чтобы редактировать его свойства, запускать AI-действия и управлять структурой.
        </p>
        <AIActionsMenu isLoading={isAiRunning} onSelect={onAiAction} />
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div>
          <div className={styles.sidebarEyebrow}>{NODE_TYPE_DEFINITIONS[selectedNode.data.nodeType].label}</div>
          <h2 className={styles.sidebarTitle}>{selectedNode.data.title}</h2>
        </div>
        <div className={styles.sidebarActions}>
          <button type="button" className={styles.iconButton} onClick={duplicateSelection}>
            <Copy size={16} />
          </button>
          <button type="button" className={styles.iconButton} onClick={() => requestFocusNode(selectedNode.id)}>
            <Focus size={16} />
          </button>
          <button type="button" className={styles.iconButton} onClick={deleteSelection}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className={styles.sidebarForm}>
        <label className={styles.sidebarField}>
          <span>Заголовок</span>
          <input
            value={selectedNode.data.title}
            onChange={(event) => updateNodeData(selectedNode.id, { title: event.target.value })}
          />
        </label>

        <label className={styles.sidebarField}>
          <span>Тип</span>
          <select
            value={selectedNode.data.nodeType}
            onChange={(event) => updateNodeData(selectedNode.id, { nodeType: event.target.value as CanvasNodeData['nodeType'] })}
          >
            {EXTENDED_NODE_TYPES.map((nodeType) => (
              <option key={nodeType} value={nodeType}>
                {NODE_TYPE_DEFINITIONS[nodeType].label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.sidebarField}>
          <span>Описание</span>
          <textarea
            value={selectedNode.data.description ?? ''}
            onChange={(event) => updateNodeData(selectedNode.id, { description: event.target.value })}
            rows={4}
          />
        </label>

        <div className={styles.sidebarGrid}>
          <label className={styles.sidebarField}>
            <span>Длительность</span>
            <input
              type="number"
              min={0}
              value={selectedNode.data.duration ?? ''}
              onChange={(event) => updateNodeData(selectedNode.id, {
                duration: event.target.value ? Number(event.target.value) : undefined,
              })}
            />
          </label>

          <label className={styles.sidebarField}>
            <span>Сложность</span>
            <select
              value={selectedNode.data.difficulty ?? 'beginner'}
              onChange={(event) => updateNodeData(selectedNode.id, {
                difficulty: event.target.value as CanvasNodeData['difficulty'],
              })}
            >
              <option value="beginner">beginner</option>
              <option value="intermediate">intermediate</option>
              <option value="advanced">advanced</option>
            </select>
          </label>
        </div>

        <label className={styles.sidebarField}>
          <span>Статус</span>
          <select
            value={selectedNode.data.status ?? 'draft'}
            onChange={(event) => updateNodeData(selectedNode.id, {
              status: event.target.value as CanvasNodeData['status'],
            })}
          >
            <option value="draft">draft</option>
            <option value="in_progress">in_progress</option>
            <option value="ready">ready</option>
          </select>
        </label>

        <label className={styles.sidebarField}>
          <span>Теги</span>
          <input
            value={toCommaSeparated(selectedNode.data.tags)}
            onChange={(event) => updateNodeData(selectedNode.id, {
              tags: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
            })}
          />
        </label>

        <label className={styles.sidebarField}>
          <span>Связанные навыки</span>
          <input
            value={toCommaSeparated(selectedNode.data.skillIds)}
            onChange={(event) => updateNodeData(selectedNode.id, {
              skillIds: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
            })}
          />
        </label>

        <label className={styles.sidebarField}>
          <span>Компетенции</span>
          <input
            value={toCommaSeparated(selectedNode.data.competencyIds)}
            onChange={(event) => updateNodeData(selectedNode.id, {
              competencyIds: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
            })}
          />
        </label>
      </div>

      {selectedNode.data.frameId ? (
        <button type="button" className={styles.utilityButton} onClick={clearFrameForSelection}>
          <Ungroup size={16} />
          Убрать из frame
        </button>
      ) : null}

      <div className={styles.sidebarAiBlock}>
        <div className={styles.sectionCaption}>AI-действия</div>
        <AIActionsMenu isLoading={isAiRunning} onSelect={onAiAction} />
      </div>
    </aside>
  );
}
