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
import styles from '@/Components/canvas/styles.module.css';
import type { CanvasAiActionType, CanvasNodeType } from '@/types/canvas';
import {RequestError,LoadingState} from '@/Components/RequestState';
import DraftNotice from '@/Components/DraftNotice';
import {useReconnect} from '@/hooks/useReconnect';
import {fetchCanvasWorkspace,adoptCanvasRevision} from '@/api/canvasApi';

function LerniumCanvasPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = id ?? 'draft';

  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loadVersion,setLoadVersion]=useState(0);
  const [searchNotice,setSearchNotice]=useState('');
  const [conflict,setConflict]=useState<Awaited<ReturnType<typeof fetchCanvasWorkspace>>|null>(null);
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
  useReconnect(()=>{if(loadError)setLoadVersion(v=>v+1);});
  useEffect(()=>{
    const guard=(event:BeforeUnloadEvent)=>{if(hasUnsavedChanges){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
  },[hasUnsavedChanges]);

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
  }, [courseId, loadCourse,loadVersion]);

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
      setSearchNotice('Введите название узла для поиска.');
      return;
    }

    const match = nodes.find((node) => node.data.title.toLowerCase().includes(normalized));
    if (match) {
      requestFocusNode(match.id);
      setSearchNotice(`Найден узел: ${match.data.title}`);
    }else setSearchNotice(`По запросу «${value}» узлов не найдено. Измените запрос.`);
  }

  const handleCanvasReady = useCallback((api: CanvasViewApi) => {
    viewApiRef.current = api;
  }, []);

  if (loadError) return <main className={styles.workspacePage}>
    <RequestError error={loadError} fullPage onRetry={()=>setLoadVersion(v=>v+1)}/>
  </main>;

  if (pageLoading) {
    return (
      <main className={styles.workspacePage}>
        <LoadingState>Загрузка канвы…</LoadingState>
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
          {hasUnsavedChanges&&<DraftNotice restored={recoveredDraft}/>}
          {searchNotice&&<p role="status">{searchNotice}</p>}
          <div className={styles.workspaceBreadcrumbs}>
            <Link to="/courses" className={styles.backLink}>
              <ArrowLeft size={16} />
              Назад к курсам
            </Link>
            <Link to={`/courses/${courseId}/edit`} className={styles.backLink}>Содержание курса</Link>
            <span className={styles.workspaceHint} title="Канва сохраняет рабочую схему и AI-предложения. Уроки и публикация доступны в содержании курса.">
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
            <button type="button" className={styles.statusAction} disabled={!selectedNodeIds.some(id=>nodes.find(node=>node.id===id)?.parentId)} onClick={clearFrameForSelection}>
              Убрать выбранные узлы из группы
            </button>
          </div>

          {aiNotice && <div role="status" style={{padding: '12px 16px', background: '#eef4ff', borderRadius: 12}}>{aiNotice}</div>}
          {lastError ? (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={16} />
              {lastError}
            </div>
          ) : null}
          {lastErrorStatus===409&&<section className="request-state"><h2>Канва изменена в другом окне</h2><p>Ваш черновик сохранён на этом устройстве. Сравните его с текущей версией перед сохранением.</p><button onClick={async()=>{try{setConflict(await fetchCanvasWorkspace(courseId));}catch(error){useCanvasStore.setState({lastError:error instanceof Error?error.message:'Не удалось загрузить версию'});}}}>Сравнить версии</button></section>}
          {conflict&&<section className="request-state"><h2>Сравнение канвы</h2><p>На сервере версия {conflict.version}: {conflict.snapshot?.nodes.length??0} узлов. В вашем черновике: {nodes.length}.</p><details><summary>Содержание актуальной версии</summary><pre style={{whiteSpace:'pre-wrap',maxHeight:300,overflow:'auto'}}>{JSON.stringify(conflict.snapshot,null,2)}</pre></details><p>Сохранение заменит текущую канву вашим черновиком. Если версия снова изменится, сервер остановит запись.</p><button disabled={isSaving} onClick={async()=>{adoptCanvasRevision(courseId,conflict.version);await saveCourse();setConflict(null);}}>Сохранить мой черновик вместо этой версии</button><button onClick={()=>setConflict(null)}>Продолжить сравнение позже</button></section>}
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
