import { useLocale } from "@/i18n/useLocale";
import {
  Hand,
  Link2,
  MousePointer2,
  PlusSquare,
  SquareStack,
} from "lucide-react";

import {
  PRIMARY_NODE_TYPES,
  NODE_TYPE_DEFINITIONS,
} from "@/utils/canvasAdapters";
import type { CanvasInteractionMode, CanvasNodeType } from "@/types/canvas";
import styles from "@/Components/canvas/styles.module.css";

type CanvasLeftPanelProps = {
  interactionMode: CanvasInteractionMode;
  onModeChange: (mode: CanvasInteractionMode) => void;
  onAddNode: (nodeType: CanvasNodeType) => void;
  onCreateFrame: () => void;
  selectedNodeCount?: number;
};

export function CanvasLeftPanel({
  interactionMode,
  onModeChange,
  onAddNode,
  onCreateFrame,
  selectedNodeCount = 0,
}: CanvasLeftPanelProps) {
  const { t } = useLocale();

  return (
    <aside className={styles.leftPanel}>
      <div className={styles.leftPanelSection}>
        <div className={styles.sectionCaption}>{t("Режим")}</div>
        <div className={styles.modeRail}>
          {[
            { id: "select", label: t("Выбор"), icon: MousePointer2 },
            { id: "connect", label: t("Связи"), icon: Link2 },
            { id: "hand", label: t("Навигация"), icon: Hand },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={
                  interactionMode === item.id
                    ? styles.modeRailButtonActive
                    : styles.modeRailButton
                }
                onClick={() => onModeChange(item.id as CanvasInteractionMode)}
                aria-pressed={interactionMode === item.id}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.leftPanelSection}>
        <div className={styles.sectionCaption}>{t("Добавить узел")}</div>
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
                <span>{t(definition.label)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.leftPanelSection}>
        <button
          type="button"
          className={styles.utilityButton}
          onClick={onCreateFrame}
          disabled={!selectedNodeCount}
          title={
            !selectedNodeCount ? t("Сначала выделите узлы на схеме") : undefined
          }
        >
          <SquareStack size={16} />
          {t("Создать группу из выделения")}
        </button>
        <div className={styles.leftPanelHint}>
          <PlusSquare size={14} />
          {t(
            "Узел можно добавить также через контекстное меню и горячую клавишу",
          ) + " "}
          <kbd>N</kbd>.
        </div>
      </div>
    </aside>
  );
}
