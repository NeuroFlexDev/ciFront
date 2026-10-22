import { useLocale } from '@/i18n/useLocale';
import { pluralForm } from '@/i18n/plurals';
import { MiniMap, useReactFlow, useViewport } from '@xyflow/react';
import { Expand, Map, Minus, Plus } from 'lucide-react';
import { useRef } from 'react';
import { canvasViewportInsets } from './viewportInsets';

import { useCanvasStore } from '@/store/canvasStore';
import styles from '@/Components/canvas/styles.module.css';

export function CanvasMinimap({ onRevealCanvas }: { onRevealCanvas: () => void }) {
  const { t, locale } = useLocale();
  const flow = useReactFlow();
  const { zoom } = useViewport();
  const dockRef = useRef<HTMLDivElement>(null);
  const fit = () => {
    const workspace = dockRef.current?.closest('main');
    if (!workspace) return;
    const measured = canvasViewportInsets(workspace);
    if (measured.needsPanelCollapse) {
      onRevealCanvas();
      requestAnimationFrame(() => {
        if (dockRef.current)
          void flow.fitView({
            duration: duration(),
            padding: canvasViewportInsets(workspace).padding,
            maxZoom: 1,
          });
      });
    } else void flow.fitView({ duration: duration(), padding: measured.padding, maxZoom: 1 });
  };
  const duration = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 180;

  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);

  return (
    <div
      ref={dockRef}
      className={styles.navigationDock}
      role='group'
      aria-label={t('Масштаб и навигация')}
    >
      <details className={styles.minimapDisclosure}>
        <summary title={t('Мини-карта')} aria-label={t('Мини-карта')}>
          <Map size={18} aria-hidden='true' />
        </summary>
        <div className={styles.minimapShell}>
          <MiniMap
            pannable
            zoomable
            className={styles.minimap}
            nodeStrokeWidth={2}
            nodeColor='#697544'
            nodeStrokeColor='#caf432'
            maskColor='rgba(11, 12, 15, 0.65)'
          />
          <div className={styles.minimapStats}>
            <span>
              {nodes.length}
              {' ' + t(pluralForm(locale, nodes.length, 'узел', 'узла', 'узлов'))}
            </span>
            <span>
              {edges.length}
              {' ' + t(pluralForm(locale, edges.length, 'связь', 'связи', 'связей'))}
            </span>
          </div>
        </div>
      </details>
      <button
        type='button'
        aria-label={t('Уменьшить масштаб')}
        title={t('Уменьшить масштаб')}
        disabled={zoom <= 0.3001}
        onClick={() => void flow.zoomOut({ duration: duration() })}
      >
        <Minus size={18} aria-hidden='true' />
      </button>
      <output className={styles.zoomValue} aria-label={t('Масштаб')}>
        {Math.round(zoom * 100)}%
      </output>
      <button
        type='button'
        aria-label={t('Увеличить масштаб')}
        title={t('Увеличить масштаб')}
        disabled={zoom >= 1.7999}
        onClick={() => void flow.zoomIn({ duration: duration() })}
      >
        <Plus size={18} aria-hidden='true' />
      </button>
      <button
        type='button'
        aria-label={t('Показать всю схему')}
        title={t('Показать всю схему')}
        onClick={fit}
      >
        <Expand size={18} aria-hidden='true' />
      </button>
    </div>
  );
}
