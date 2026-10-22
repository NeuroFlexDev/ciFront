import { useLocale } from '@/i18n/useLocale';
import { pluralForm } from '@/i18n/plurals';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Network, SlidersHorizontal, Blocks, Plus } from 'lucide-react';

import { CanvasLeftPanel } from '@/Components/canvas/CanvasLeftPanel';
import { CanvasSidebar } from '@/Components/canvas/CanvasSidebar';
import AIProposalReview from '@/Components/ai/AIProposalReview';
import { CanvasToolbar } from '@/Components/canvas/CanvasToolbar';
import { CanvasView } from '@/Components/canvas/CanvasView';
import { CanvasPanel } from '@/Components/canvas/CanvasPanel';
import { useCanvasActions } from '@/hooks/useCanvasActions';
import { useCanvasKeyboard } from '@/hooks/useCanvasKeyboard';
import { useCanvasStore } from '@/store/canvasStore';
import styles from '@/Components/canvas/styles.module.css';
import type { CanvasAiActionType, CanvasNodeType } from '@/types/canvas';
import { RequestError, LoadingState } from '@/Components/RequestState';
import DraftNotice from '@/Components/DraftNotice';
import { useReconnect } from '@/hooks/useReconnect';
import { fetchCanvasWorkspace, adoptCanvasRevision } from '@/api/canvasApi';
import { useAssistantAvailability } from '@/Pages/AiHelperPage/useAssistantAvailability';
import { canvasAiDisabledReasons } from '@/utils/canvasAiAvailability';

function LerniumCanvasPage() {
  const { t, locale } = useLocale();

  const { id } = useParams<{ id: string }>();
  const courseId = id ?? 'draft';
  const assistantAvailability = useAssistantAvailability();

  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const [searchNotice, setSearchNotice] = useState('');
  const [panels, setPanels] = useState({ tools: false, properties: false });
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const closePanel = (panel: 'tools' | 'properties') => {
    setPanels((current) => ({ ...current, [panel]: false }));
    document.getElementById(`canvas-${panel}-trigger`)?.focus({ preventScroll: true });
  };
  const togglePanel = (panel: 'tools' | 'properties') => {
    const compact = window.matchMedia?.('(max-width: 760px)').matches;
    setPanels((current) => ({
      ...(compact ? { tools: false, properties: false } : current),
      [panel]: !current[panel],
    }));
  };
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 760px)');
    const resize = () => {
      if (media?.matches)
        setPanels((current) =>
          current.tools && current.properties ? { tools: false, properties: true } : current,
        );
    };
    media?.addEventListener('change', resize);
    return () => media?.removeEventListener('change', resize);
  }, []);
  const [conflict, setConflict] = useState<Awaited<ReturnType<typeof fetchCanvasWorkspace>> | null>(
    null,
  );

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
  const aiProposal = useCanvasStore((state) => state.aiProposal);
  const loadCourse = useCanvasStore((state) => state.loadCourse);
  useReconnect(() => {
    if (loadError) setLoadVersion((v) => v + 1);
  });
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
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
  const aiDisabledReasons = canvasAiDisabledReasons(
    nodes.filter((node) => selectedNodeIds.includes(node.id)),
    assistantAvailability.reason,
    Boolean(aiProposal),
  );
  const handleAiAction = (action: CanvasAiActionType) => {
    if (!assistantAvailability.blocked && !aiDisabledReasons[action] && !isAiRunning)
      void runAiAction(action);
  };

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
      setSearchNotice(t('Введите название узла для поиска.'));
      return;
    }

    const match = nodes.find((node) => node.data.title.toLowerCase().includes(normalized));
    if (match) {
      setPanels({ tools: false, properties: false });
      requestFocusNode(match.id);
      setSearchNotice(t('Найден узел: {v0}', { v0: match.data.title }));
    } else
      setSearchNotice(
        t('По запросу «{v0}» узлов не найдено. Измените запрос.', {
          v0: value,
        }),
      );
  }

  if (loadError)
    return (
      <main className={`${styles.workspacePage} ${styles.workspaceLoading}`}>
        <RequestError error={loadError} fullPage onRetry={() => setLoadVersion((v) => v + 1)} />
      </main>
    );

  if (pageLoading) {
    return (
      <main className={`${styles.workspacePage} ${styles.workspaceLoading}`}>
        <LoadingState>{t('Загрузка канвы…')}</LoadingState>
      </main>
    );
  }

  return (
    <main
      className={styles.workspacePage}
      style={
        toolbarHeight
          ? ({
              '--canvas-controls-top': `calc(var(--canvas-edge) + ${toolbarHeight}px + 12px)`,
            } as CSSProperties)
          : undefined
      }
    >
      <CanvasToolbar
        onHeightChange={setToolbarHeight}
        courseId={courseId}
        courseTitle={courseTitle}
        isSaving={isSaving}
        isAiRunning={isAiRunning}
        lastSavedAt={lastSavedAt}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={() => {
          void saveCourse();
        }}
        onSearch={handleSearch}
        onAiAction={handleAiAction}
        aiDisabledReasons={aiDisabledReasons}
      />

      <nav className={styles.panelToggles} aria-label={t('Панели канвы')}>
        {(
          [
            { id: 'tools', label: 'Инструменты', icon: Blocks },
            { id: 'properties', label: 'Свойства', icon: SlidersHorizontal },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`canvas-${id}-trigger`}
            type='button'
            aria-label={t(label)}
            aria-expanded={panels[id]}
            aria-controls={`canvas-${id}`}
            data-side={id === 'tools' ? 'left' : 'right'}
            onClick={() => togglePanel(id)}
          >
            <Icon size={18} aria-hidden='true' />
            {t(label)}
            {id === 'properties' && selectedNodeIds.length + selectedEdgeIds.length > 0 && (
              <span className={styles.selectionCount}>
                {selectedNodeIds.length + selectedEdgeIds.length}
              </span>
            )}
          </button>
        ))}
      </nav>
      <CanvasPanel
        id='canvas-tools'
        title={t('Инструменты')}
        side='left'
        open={panels.tools}
        onClose={() => closePanel('tools')}
      >
        <CanvasLeftPanel
          interactionMode={interactionMode}
          onModeChange={setInteractionMode}
          onAddNode={(nodeType: CanvasNodeType) => createNode(nodeType)}
          onCreateFrame={createFrameFromSelection}
          selectedNodeCount={selectedNodeIds.length}
        />
      </CanvasPanel>
      <section id='canvas-board' className={styles.workspaceMain} aria-label={t('Схема курса')}>
        <div className={styles.boardFrame}>
          <CanvasView onRevealCanvas={() => setPanels({ tools: false, properties: false })} />
          {!nodes.length && (
            <section className={styles.emptyBoard} aria-labelledby='canvas-empty-title'>
              <Network size={28} aria-hidden='true' />
              <h2 id='canvas-empty-title'>{t('Схема ещё не создана')}</h2>
              <p>
                {t(
                  'Канва — отдельная рабочая схема курса. Уроки доступны в содержании курса. Добавьте первый модуль, чтобы спланировать связи между учебными блоками.',
                )}
              </p>
              <button
                type='button'
                onClick={() => {
                  const nodeId = createNode('module', { x: 80, y: 80 });
                  requestFocusNode(nodeId);
                }}
              >
                <Plus size={18} aria-hidden='true' />
                {t('Добавить модуль')}
              </button>
              <Link to={`/courses/${courseId}/edit`}>{t('Открыть содержание курса')}</Link>
            </section>
          )}
        </div>
      </section>
      <div className={styles.feedbackDock}>
        {hasUnsavedChanges && <DraftNotice restored={recoveredDraft} />}
        {searchNotice && (
          <p className={styles.searchNotice} role='status'>
            {searchNotice}
          </p>
        )}
        {aiNotice && (
          <div role='status' className={styles.aiNotice}>
            {t(aiNotice)}
          </div>
        )}
      </div>
      {(lastError || aiProposal || conflict) && (
        <div className={styles.reviewOverlay}>
          {lastError && (
            <div className={styles.errorBanner} role='alert'>
              <AlertCircle size={16} />
              {t(lastError)}
            </div>
          )}
          <AIProposalReview />
          {lastErrorStatus === 409 && (
            <section className='request-state'>
              <h2>{t('Канва изменена в другом окне')}</h2>
              <p>
                {t(
                  'Ваш черновик сохранён на этом устройстве. Сравните его с текущей версией перед сохранением.',
                )}
              </p>
              <button
                onClick={async () => {
                  try {
                    setConflict(await fetchCanvasWorkspace(courseId));
                  } catch (error) {
                    useCanvasStore.setState({
                      lastError:
                        error instanceof Error ? error.message : t('Не удалось загрузить версию'),
                    });
                  }
                }}
              >
                {t('Сравнить версии')}
              </button>
            </section>
          )}
          {conflict && (
            <section className='request-state'>
              <h2>{t('Сравнение канвы')}</h2>
              <p>
                {t('На сервере версия') + ' '}
                {conflict.version}: {conflict.snapshot?.nodes.length ?? 0}
                {' ' + t('узлов. В вашем черновике:') + ' '}
                {nodes.length}.
              </p>
              <details>
                <summary>{t('Содержание актуальной версии')}</summary>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    maxHeight: 300,
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(conflict.snapshot, null, 2)}
                </pre>
              </details>
              <p>
                {t(
                  'Сохранение заменит текущую канву вашим черновиком. Если версия снова изменится, сервер остановит запись.',
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
                {t('Сохранить мой черновик вместо этой версии')}
              </button>
              <button onClick={() => setConflict(null)}>{t('Продолжить сравнение позже')}</button>
            </section>
          )}
        </div>
      )}
      {(selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) && (
        <div className={styles.workspaceStatusBar}>
          <div className={styles.workspaceStatusItem}>
            <CheckCircle2 size={14} />
            {selectedNodeIds.length}
            {' ' +
              t(
                pluralForm(
                  locale,
                  selectedNodeIds.length,
                  'узел выбран',
                  'узла выбрано',
                  'узлов выбрано',
                ),
              )}
          </div>
          <div className={styles.workspaceStatusItem}>
            {selectedEdgeIds.length}
            {' ' +
              t(
                pluralForm(
                  locale,
                  selectedEdgeIds.length,
                  'связь выбрана',
                  'связи выбрано',
                  'связей выбрано',
                ),
              )}
          </div>
          <button
            type='button'
            className={styles.statusAction}
            disabled={!selectedNodeIds.some((id) => nodes.find((node) => node.id === id)?.parentId)}
            onClick={clearFrameForSelection}
          >
            {t('Убрать выбранные узлы из группы')}
          </button>
        </div>
      )}

      <CanvasPanel
        id='canvas-properties'
        title={t('Свойства')}
        side='right'
        open={panels.properties}
        onClose={() => closePanel('properties')}
      >
        <CanvasSidebar
          selectedNode={selectedNode ? { id: selectedNode.id, data: selectedNode.data } : null}
          selectedEdge={selectedEdge ? { id: selectedEdge.id, data: selectedEdge.data } : null}
          isAiRunning={isAiRunning}
          onAiAction={handleAiAction}
          aiDisabledReasons={aiDisabledReasons}
        />
        {assistantAvailability.status === 'error' && (
          <button
            type='button'
            className={styles.utilityButton}
            onClick={() => void assistantAvailability.reload()}
          >
            {t('Повторить проверку доступности AI')}
          </button>
        )}
      </CanvasPanel>
    </main>
  );
}

export default LerniumCanvasPage;
