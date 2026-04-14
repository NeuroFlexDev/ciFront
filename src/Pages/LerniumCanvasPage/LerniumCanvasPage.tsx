import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

import { CanvasLeftPanel } from '@/Components/canvas/CanvasLeftPanel';
import { CanvasSidebar } from '@/Components/canvas/CanvasSidebar';
import { CanvasToolbar } from '@/Components/canvas/CanvasToolbar';
import { CanvasView, type CanvasViewApi } from '@/Components/canvas/CanvasView';
import { useCanvasActions } from '@/hooks/useCanvasActions';
import { useCanvasKeyboard } from '@/hooks/useCanvasKeyboard';
import { useCanvasStore } from '@/store/canvasStore';
import { apiFetch } from '@/shared/api';
import styles from '@/Components/canvas/styles.module.css';
import type { CanvasAiActionType, CanvasNodeType } from '@/types/canvas';

type CourseSummary = {
  id: number;
  title: string;
  description: string;
};

function LerniumCanvasPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id ?? 'draft';

  const [pageLoading, setPageLoading] = useState(true);
  const viewApiRef = useRef<CanvasViewApi | null>(null);

  const courseTitle = useCanvasStore((state) => state.courseTitle);
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const selectedNodeIds = useCanvasStore((state) => state.selectedNodeIds);
  const selectedEdgeIds = useCanvasStore((state) => state.selectedEdgeIds);
  const interactionMode = useCanvasStore((state) => state.interactionMode);
  const isSaving = useCanvasStore((state) => state.isSaving);
  const isAiRunning = useCanvasStore((state) => state.isAiRunning);
  const lastSavedAt = useCanvasStore((state) => state.lastSavedAt);
  const lastError = useCanvasStore((state) => state.lastError);
  const loadCourse = useCanvasStore((state) => state.loadCourse);

  const {
    clearFrameForSelection,
    createFrameFromSelection,
    createNode,
    deleteSelection,
    duplicateSelection,
    requestFocusNode,
    runAiAction,
    saveCourse,
    setInteractionMode,
  } = useCanvasActions();

  const selectedNode = useMemo(() => (
    nodes.find((node) => selectedNodeIds.includes(node.id)) ?? null
  ), [nodes, selectedNodeIds]);

  const selectedEdge = useMemo(() => (
    edges.find((edge) => selectedEdgeIds.includes(edge.id)) ?? null
  ), [edges, selectedEdgeIds]);

  useEffect(() => {
    let ignore = false;

    (async () => {
      setPageLoading(true);

      try {
        const response = await apiFetch('/courses/');
        let nextTitle = `Курс ${courseId}`;

        if (response.ok) {
          const data = (await response.json()) as CourseSummary[];
          const course = data.find((item) => String(item.id) === courseId);
          if (course?.title) {
            nextTitle = course.title;
          }
        }

        if (!ignore) {
          await loadCourse(courseId, nextTitle);
        }
      } catch {
        if (!ignore) {
          await loadCourse(courseId, `Курс ${courseId}`);
        }
      } finally {
        if (!ignore) {
          setPageLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [courseId, loadCourse]);

  useCanvasKeyboard({
    onCreateNode: () => createNode('module'),
    onDelete: deleteSelection,
    onDuplicate: duplicateSelection,
    onSave: () => {
      void saveCourse();
    },
  });

  function handleSearch(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    const match = nodes.find((node) => node.data.title.toLowerCase().includes(normalized));
    if (match) {
      requestFocusNode(match.id);
    }
  }

  const handleCanvasReady = useCallback((api: CanvasViewApi) => {
    viewApiRef.current = api;
  }, []);

  if (pageLoading) {
    return (
      <main className={styles.workspacePage}>
        <div className={styles.workspaceLoading}>Загрузка канвы...</div>
      </main>
    );
  }

  return (
    <main className={styles.workspacePage}>
      <CanvasToolbar
        courseTitle={courseTitle}
        isSaving={isSaving}
        isAiRunning={isAiRunning}
        lastSavedAt={lastSavedAt}
        onSave={() => {
          void saveCourse();
        }}
        onSearch={handleSearch}
        onZoomIn={() => viewApiRef.current?.zoomIn()}
        onZoomOut={() => viewApiRef.current?.zoomOut()}
        onFitView={() => viewApiRef.current?.fitView()}
        onAiAction={(action: CanvasAiActionType) => {
          void runAiAction(action);
        }}
      />

      <div className={styles.workspaceShell}>
        <CanvasLeftPanel
          interactionMode={interactionMode}
          onModeChange={setInteractionMode}
          onAddNode={(nodeType: CanvasNodeType) => createNode(nodeType)}
          onCreateFrame={createFrameFromSelection}
        />

        <section className={styles.workspaceMain}>
          <div className={styles.workspaceBreadcrumbs}>
            <Link to="/courses" className={styles.backLink}>
              <ArrowLeft size={16} />
              Назад к курсам
            </Link>
            <span className={styles.workspaceHint}>
              {interactionMode === 'connect'
                ? 'Режим связей: тяните от handle к handle.'
                : interactionMode === 'hand'
                  ? 'Режим навигации: канва перетаскивается как карта.'
                  : 'Режим выбора: выделяйте, двигайте, редактируйте и группируйте узлы.'}
            </span>
          </div>

          <CanvasView onReady={handleCanvasReady} />

          <div className={styles.workspaceStatusBar}>
            <div className={styles.workspaceStatusItem}>
              <CheckCircle2 size={14} />
              {selectedNodeIds.length} узлов выбрано
            </div>
            <div className={styles.workspaceStatusItem}>
              {selectedEdgeIds.length} связей выбрано
            </div>
            <button type="button" className={styles.statusAction} onClick={clearFrameForSelection}>
              Убрать выделение из frame
            </button>
          </div>

          {lastError ? (
            <div className={styles.errorBanner}>
              <AlertCircle size={16} />
              {lastError}
            </div>
          ) : null}
        </section>

        <CanvasSidebar
          selectedNode={selectedNode ? { id: selectedNode.id, data: selectedNode.data } : null}
          selectedEdge={selectedEdge ? { id: selectedEdge.id, data: selectedEdge.data } : null}
          isAiRunning={isAiRunning}
          onAiAction={(action) => {
            void runAiAction(action);
          }}
        />
      </div>
    </main>
  );
}

export default LerniumCanvasPage;
