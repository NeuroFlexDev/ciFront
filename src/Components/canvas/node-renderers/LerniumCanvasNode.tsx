import { useLocale } from "@/i18n/useLocale";
import { type CSSProperties } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Plus } from "lucide-react";

import { useCanvasStore } from "@/store/canvasStore";
import { NODE_TYPE_DEFINITIONS } from "@/utils/canvasAdapters";
import type { LerniumNode } from "@/types/canvas";
import styles from "@/Components/canvas/styles.module.css";

export function LerniumCanvasNode({
  id,
  data,
  selected,
}: NodeProps<LerniumNode>) {
  const { t } = useLocale();

  const createConnectedNode = useCanvasStore(
    (state) => state.createConnectedNode,
  );
  const definition = NODE_TYPE_DEFINITIONS[data.nodeType];
  const Icon = definition.icon;

  if (data.nodeType === "frame") {
    return (
      <div
        className={`${styles.frameNode} ${selected ? styles.frameNodeSelected : ""}`}
      >
        <div className={styles.frameNodeHeader}>
          <Icon size={14} />
          <span>{data.title}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.canvasNode} ${selected ? styles.canvasNodeSelected : ""}`}
      style={
        {
          "--node-accent": definition.accent,
          "--node-surface": definition.surface,
        } as CSSProperties
      }
    >
      <Handle
        className={styles.nodeHandle}
        type="target"
        position={Position.Left}
      />
      <Handle
        className={styles.nodeHandle}
        type="target"
        position={Position.Top}
      />

      <div className={styles.nodeHeader}>
        <span className={styles.nodeTypeBadge}>
          <Icon size={14} />
          {t(definition.label)}
        </span>
        {data.aiState && data.aiState !== "idle" ? (
          <span
            className={`${styles.nodeAiState} ${styles[`nodeAiState${data.aiState}`]}`}
          >
            {data.aiState === "loading"
              ? "AI..."
              : data.aiState === "generated"
                ? "AI"
                : t("Ошибка")}
          </span>
        ) : null}
      </div>

      <div className={styles.nodeTitle}>{data.title}</div>
      <div className={styles.nodeDescription}>
        {data.description || t(definition.description)}
      </div>

      <div className={styles.nodeMetaRow}>
        {data.status ? (
          <span>
            {t(
              (
                {
                  draft: "Черновик",
                  in_progress: "В работе",
                  ready: "Готово",
                } as Record<string, string>
              )[data.status] ?? data.status,
            )}
          </span>
        ) : null}
        {typeof data.duration === "number" ? (
          <span>
            {data.duration}
            {" " + t("мин")}
          </span>
        ) : null}
        {data.difficulty ? (
          <span>
            {t(
              (
                {
                  beginner: "Начальный",
                  intermediate: "Средний",
                  advanced: "Продвинутый",
                } as Record<string, string>
              )[data.difficulty] ?? data.difficulty,
            )}
          </span>
        ) : null}
      </div>

      {selected ? (
        <button
          type="button"
          className={`${styles.nodeQuickAdd} nodrag nopan`}
          aria-label={t("Добавить связанный узел")}
          onClick={(event) => {
            event.stopPropagation();
            createConnectedNode(
              id,
              data.nodeType === "module" ? "lesson" : "practice",
            );
          }}
        >
          <Plus size={14} />
        </button>
      ) : null}

      <Handle
        className={styles.nodeHandle}
        type="source"
        position={Position.Right}
      />
      <Handle
        className={styles.nodeHandle}
        type="source"
        position={Position.Bottom}
      />
    </div>
  );
}
