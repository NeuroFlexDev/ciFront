import { useLocale } from "@/i18n/useLocale";
import { MiniMap } from "@xyflow/react";

import { useCanvasStore } from "@/store/canvasStore";
import styles from "@/Components/canvas/styles.module.css";

export function CanvasMinimap() {
  const { t } = useLocale();

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const viewport = useCanvasStore((state) => state.viewport);

  return (
    <div className={styles.minimapShell}>
      <MiniMap
        pannable
        zoomable
        className={styles.minimap}
        nodeStrokeWidth={2}
        nodeColor="#697544"
        nodeStrokeColor="#caf432"
        maskColor="rgba(11, 12, 15, 0.65)"
      />
      <div className={styles.minimapStats}>
        <span>
          {nodes.length}
          {" " + t("узлов")}
        </span>
        <span>
          {edges.length}
          {" " + t("связей")}
        </span>
        <span>{Math.round(viewport.zoom * 100)}%</span>
      </div>
    </div>
  );
}
