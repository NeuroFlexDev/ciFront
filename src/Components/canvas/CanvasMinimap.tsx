import { MiniMap } from '@xyflow/react';

import { useCanvasStore } from '@/store/canvasStore';
import styles from '@/Components/canvas/styles.module.css';

export function CanvasMinimap() {
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
        nodeColor="#182638"
        maskColor="rgba(3, 7, 14, 0.45)"
      />
      <div className={styles.minimapStats}>
        <span>{nodes.length} узлов</span>
        <span>{edges.length} связей</span>
        <span>{Math.round(viewport.zoom * 100)}%</span>
      </div>
    </div>
  );
}
