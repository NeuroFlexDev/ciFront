import { Hand, Link2, MousePointer2, PlusSquare, SquareStack } from 'lucide-react';

import { PRIMARY_NODE_TYPES, NODE_TYPE_DEFINITIONS } from '@/utils/canvasAdapters';
import type { CanvasInteractionMode, CanvasNodeType } from '@/types/canvas';
import styles from '@/Components/canvas/styles.module.css';

type CanvasLeftPanelProps = {
  interactionMode: CanvasInteractionMode;
  onModeChange: (mode: CanvasInteractionMode) => void;
  onAddNode: (nodeType: CanvasNodeType) => void;
  onCreateFrame: () => void;
};

export function CanvasLeftPanel({
  interactionMode,
  onModeChange,
  onAddNode,
  onCreateFrame,
}: CanvasLeftPanelProps) {
  return (
    <aside className={styles.leftPanel}>
      <div className={styles.leftPanelSection}>
        <div className={styles.sectionCaption}>Режим</div>
        <div className={styles.modeRail}>
          {[
            { id: 'select', label: 'Выбор', icon: MousePointer2 },
            { id: 'connect', label: 'Связи', icon: Link2 },
            { id: 'hand', label: 'Навигация', icon: Hand },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={interactionMode === item.id ? styles.modeRailButtonActive : styles.modeRailButton}
                onClick={() => onModeChange(item.id as CanvasInteractionMode)}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.leftPanelSection}>
        <div className={styles.sectionCaption}>Добавить узел</div>
        <div className={styles.paletteGrid}>
          {PRIMARY_NODE_TYPES.map((nodeType) => {
            const definition = NODE_TYPE_DEFINITIONS[nodeType];
            const Icon = definition.icon;

            return (
              <button
                key={nodeType}
                type="button"
                className={styles.paletteButton}
                onClick={() => onAddNode(nodeType)}
              >
                <Icon size={16} />
                <span>{definition.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.leftPanelSection}>
        <button type="button" className={styles.utilityButton} onClick={onCreateFrame}>
          <SquareStack size={16} />
          Создать frame из выделения
        </button>
        <div className={styles.leftPanelHint}>
          <PlusSquare size={14} />
          Узел можно добавить также через контекстное меню и горячую клавишу <kbd>N</kbd>.
        </div>
      </div>
    </aside>
  );
}
