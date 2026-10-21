import { useLocale } from "@/i18n/useLocale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Network,
  SlidersHorizontal,
  Blocks,
} from "lucide-react";

import { CanvasLeftPanel } from "@/Components/canvas/CanvasLeftPanel";
import { CanvasSidebar } from "@/Components/canvas/CanvasSidebar";
import AIProposalReview from "@/Components/ai/AIProposalReview";
import { CanvasToolbar } from "@/Components/canvas/CanvasToolbar";
import { CanvasView, type CanvasViewApi } from "@/Components/canvas/CanvasView";
import { useCanvasActions } from "@/hooks/useCanvasActions";
import { useCanvasKeyboard } from "@/hooks/useCanvasKeyboard";
import { useCanvasStore } from "@/store/canvasStore";
import styles from "@/Components/canvas/styles.module.css";
import type { CanvasAiActionType, CanvasNodeType } from "@/types/canvas";
import { RequestError, LoadingState } from "@/Components/RequestState";
import DraftNotice from "@/Components/DraftNotice";
import { useReconnect } from "@/hooks/useReconnect";
import { fetchCanvasWorkspace, adoptCanvasRevision } from "@/api/canvasApi";

function LerniumCanvasPage() {
  const { t } = useLocale();

  const { id } = useParams<{ id: string }>();
  const courseId = id ?? "draft";

  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const [searchNotice, setSearchNotice] = useState("");
  const [mobilePanel, setMobilePanel] = useState("board");
  const [conflict, setConflict] = useState<Awaited<
    ReturnType<typeof fetchCanvasWorkspace>
  > | null>(null);
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
  const lastErrorStatus = useCanvasStore((state) => state.lastErrorStatus);
  const recoveredDraft = useCanvasStore((state) => state.recoveredDraft);
  const hasUnsavedChanges = useCanvasStore((state) => state.hasUnsavedChanges);
  const aiNotice = useCanvasStore((state) => state.aiNotice);
  const loadCourse = useCanvasStore((state) => state.loadCourse);
  useReconnect(() => {
    if (loadError) setLoadVersion((v) => v + 1);
  });
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [hasUnsavedChanges]);

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

  const selectedNode = useMemo(
    () => nodes.find((node) => selectedNodeIds.includes(node.id)) ?? null,
    [nodes, selectedNodeIds],
  );

  const selectedEdge = useMemo(
    () => edges.find((edge) => selectedEdgeIds.includes(edge.id)) ?? null,
    [edges, selectedEdgeIds],
  );

  useEffect(() => {
    let ignore = false;

    (async () => {
      setPageLoading(true);

      setLoadError(null);
      try {
        if (!ignore) await loadCourse(courseId);
      } catch (error) {
        if (!ignore) setLoadError(error);
      } finally {
        if (!ignore) {
          setPageLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [courseId, loadCourse, loadVersion]);

  useCanvasKeyboard({
    onCreateNode: () => createNode("module"),
    onDelete: deleteSelection,
    onDuplicate: duplicateSelection,
    onSave: () => {
      void saveCourse();
    },
  });

  function handleSearch(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      setSearchNotice(t("Введите название узла для поиска."));
      return;
    }

    const match = nodes.find((node) =>
      node.data.title.toLowerCase().includes(normalized),
    );
    if (match) {
      requestFocusNode(match.id);
      setSearchNotice(t("Найден узел: {v0}", { v0: match.data.title }));
    } else
      setSearchNotice(
        t("По запросу «{v0}» узлов не найдено. Измените запрос.", {
          v0: value,
        }),
      );
  }

  const handleCanvasReady = useCallback((api: CanvasViewApi) => {
    viewApiRef.current = api;
  }, []);

  if (loadError)
    return (
      <main className={styles.workspacePage}>
        <RequestError
          error={loadError}
          fullPage
          onRetry={() => setLoadVersion((v) => v + 1)}
        />
      </main>
    );

  if (pageLoading) {
    return (
      <main className={styles.workspacePage}>
        <LoadingState>{t("Загрузка канвы…")}</LoadingState>
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
        hasUnsavedChanges={hasUnsavedChanges}
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

      <nav className={styles.mobilePanels} aria-label={t("Панели канвы")}>
        {[
          { id: "board", label: "Схема", icon: Network },
          { id: "tools", label: "Инструменты", icon: Blocks },
          { id: "properties", label: "Свойства", icon: SlidersHorizontal },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={mobilePanel === id}
            aria-controls={`canvas-${id}`}
            onClick={() => setMobilePanel(id)}
          >
            <Icon size={16} aria-hidden="true" />
            {t(label)}
          </button>
        ))}
      </nav>
      <div className={styles.workspaceShell} data-panel={mobilePanel}>
        <div id="canvas-tools" className={styles.leftPanelSlot}>
          <CanvasLeftPanel
            interactionMode={interactionMode}
            onModeChange={setInteractionMode}
            onAddNode={(nodeType: CanvasNodeType) => createNode(nodeType)}
            onCreateFrame={createFrameFromSelection}
            selectedNodeCount={selectedNodeIds.length}
          />
        </div>

        <section
          id="canvas-board"
          className={styles.workspaceMain}
          aria-label={t("Схема курса")}
        >
          {hasUnsavedChanges && <DraftNotice restored={recoveredDraft} />}
          {searchNotice && (
            <p className={styles.searchNotice} role="status">
              {searchNotice}
            </p>
          )}
          {lastError && (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={16} />
              {t(lastError)}
            </div>
          )}
          <div className={styles.workspaceBreadcrumbs}>
            <Link to="/courses" className={styles.backLink}>
              <ArrowLeft size={16} />
              {t("Назад к курсам")}
            </Link>
            <Link to={`/courses/${courseId}/edit`} className={styles.backLink}>
              {t("Содержание курса")}
            </Link>
            <span
              className={styles.workspaceHint}
              title={t(
                "Канва сохраняет рабочую схему и AI-предложения. Уроки и публикация доступны в содержании курса.",
              )}
            >
              {interactionMode === "connect"
                ? t("Режим связей: тяните от handle к handle.")
                : interactionMode === "hand"
                  ? t("Режим навигации: канва перетаскивается как карта.")
                  : t(
                      "Режим выбора: выделяйте, двигайте, редактируйте и группируйте узлы.",
                    )}
            </span>
          </div>

          <div className={styles.proposalReview}>
            <AIProposalReview />
          </div>
          <CanvasView onReady={handleCanvasReady} />

          <div className={styles.workspaceStatusBar}>
            <div className={styles.workspaceStatusItem}>
              <CheckCircle2 size={14} />
              {selectedNodeIds.length}
              {" " + t("узлов выбрано")}
            </div>
            <div className={styles.workspaceStatusItem}>
              {selectedEdgeIds.length}
              {" " + t("связей выбрано")}
            </div>
            <button
              type="button"
              className={styles.statusAction}
              disabled={
                !selectedNodeIds.some(
                  (id) => nodes.find((node) => node.id === id)?.parentId,
                )
              }
              onClick={clearFrameForSelection}
            >
              {t("Убрать выбранные узлы из группы")}
            </button>
          </div>

          {aiNotice && (
            <div role="status" className={styles.aiNotice}>
              {t(aiNotice)}
            </div>
          )}
          {lastErrorStatus === 409 && (
            <section className="request-state">
              <h2>{t("Канва изменена в другом окне")}</h2>
              <p>
                {t(
                  "Ваш черновик сохранён на этом устройстве. Сравните его с текущей версией перед сохранением.",
                )}
              </p>
              <button
                onClick={async () => {
                  try {
                    setConflict(await fetchCanvasWorkspace(courseId));
                  } catch (error) {
                    useCanvasStore.setState({
                      lastError:
                        error instanceof Error
                          ? error.message
                          : t("Не удалось загрузить версию"),
                    });
                  }
                }}
              >
                {t("Сравнить версии")}
              </button>
            </section>
          )}
          {conflict && (
            <section className="request-state">
              <h2>{t("Сравнение канвы")}</h2>
              <p>
                {t("На сервере версия") + " "}
                {conflict.version}: {conflict.snapshot?.nodes.length ?? 0}
                {" " + t("узлов. В вашем черновике:") + " "}
                {nodes.length}.
              </p>
              <details>
                <summary>{t("Содержание актуальной версии")}</summary>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    maxHeight: 300,
                    overflow: "auto",
                  }}
                >
                  {JSON.stringify(conflict.snapshot, null, 2)}
                </pre>
              </details>
              <p>
                {t(
                  "Сохранение заменит текущую канву вашим черновиком. Если версия снова изменится, сервер остановит запись.",
                )}
              </p>
              <button
                disabled={isSaving}
                onClick={async () => {
                  adoptCanvasRevision(courseId, conflict.version);
                  await saveCourse();
                  setConflict(null);
                }}
              >
                {t("Сохранить мой черновик вместо этой версии")}
              </button>
              <button onClick={() => setConflict(null)}>
                {t("Продолжить сравнение позже")}
              </button>
            </section>
          )}
        </section>

        <div id="canvas-properties" className={styles.sidebarSlot}>
          <CanvasSidebar
            selectedNode={
              selectedNode
                ? { id: selectedNode.id, data: selectedNode.data }
                : null
            }
            selectedEdge={
              selectedEdge
                ? { id: selectedEdge.id, data: selectedEdge.data }
                : null
            }
            isAiRunning={isAiRunning}
            onAiAction={(action) => {
              void runAiAction(action);
            }}
          />
        </div>
      </div>
    </main>
  );
}

export default LerniumCanvasPage;
