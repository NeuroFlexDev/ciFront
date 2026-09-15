import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Menu from '@/Components/Menu/Menu';
import { api } from '@/shared/api';
import styles from './styles.module.css';

type DocumentItem = { id: number; original_filename: string; status: string };
type Run = { run_id: number; course_id: number; status: string; progress_percent: number; current_stage: string;
  stages: { code: string; title: string; status: string }[]; status_error?: { message: string; retryable: boolean } | null };
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Не удалось выполнить запрос';
const fieldStyle = { display: 'block', width: '100%', padding: 12, borderRadius: 10, marginTop: 6 };

export default function ExpressPage() {
  const [params, setParams] = useSearchParams();
  const courseId = Number(params.get('course')) || null;
  const runId = Number(params.get('run')) || null;
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [difficulty, setDifficulty] = useState('basic');
  const [language, setLanguage] = useState('ru');
  const [lessonCount, setLessonCount] = useState(6);
  const [moduleTests, setModuleTests] = useState(true);
  const [finalTest, setFinalTest] = useState(true);
  const edited = useRef(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (!courseId || runId) return;
    let stopped = false;
    api.get<{title:string;goal:string;target_audience:string|null;difficulty:string;language:string;
      lesson_count:number;module_tests_enabled:boolean;final_test_enabled:boolean}>(`/courses/${courseId}/generation-settings`)
      .then(({data}) => {
        if (stopped || edited.current) return;
        setTitle(data.title); setGoal(data.goal); setAudience(data.target_audience ?? '');
        setDifficulty(data.difficulty); setLanguage(data.language); setLessonCount(data.lesson_count);
        setModuleTests(data.module_tests_enabled); setFinalTest(data.final_test_enabled);
      }).catch(() => { /* New drafts have no saved generation settings yet. */ });
    return () => {stopped = true;};
  }, [courseId, runId]);

  useEffect(() => {
    setSettingsSaved(false);
    if (!courseId || runId || !title.trim() || !goal.trim()) return;
    let stopped = false;
    const timer = setTimeout(() => {
      api.put(`/courses/${courseId}/generation-settings`, {title,goal,target_audience:audience || null,
        difficulty,language,lesson_count:lessonCount,module_tests_enabled:moduleTests,final_test_enabled:finalTest})
        .then(() => {if (!stopped) setSettingsSaved(true);})
        .catch(e => {if (!stopped) setError(errorText(e));});
    }, 800);
    return () => {stopped = true; clearTimeout(timer);};
  }, [courseId,runId,title,goal,audience,difficulty,language,lessonCount,moduleTests,finalTest]);

  useEffect(() => {
    if (!courseId) return;
    let stopped = false;
    api.get<{items: DocumentItem[]}>(`/courses/${courseId}/documents?limit=100`).then(({data}) => {
      if (!stopped) setDocuments(data.items);
    }).catch(e => { if (!stopped) setError(errorText(e)); });
    return () => { stopped = true; };
  }, [courseId]);

  useEffect(() => {
    if (!runId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const {data} = await api.get<Run>(`/generation-runs/${runId}`);
        if (stopped) return;
        setRun(data); setError('');
        if (['queued', 'running'].includes(data.status)) timer = setTimeout(poll, 2500);
      } catch (e) {
        if (!stopped) { setError(errorText(e)); timer = setTimeout(poll, 5000); }
      }
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [runId]);

  async function upload(files: FileList | null) {
    if (!files?.length || busy) return;
    setBusy(true); setError('');
    try {
      let id = courseId;
      if (!id) {
        id = (await api.post<{id: number}>('/courses/drafts')).data.id;
        setParams({course: String(id)}, {replace: true});
      }
      for (const file of Array.from(files)) {
        const body = new FormData(); body.append('file', file);
        const uploaded = (await api.post<DocumentItem>(`/courses/${id}/documents`, body)).data;
        setDocuments(prev => [...prev.filter(d => d.id !== uploaded.id), uploaded]);
        await api.post(`/documents/${uploaded.id}/reindex`);
        setDocuments(prev => prev.map(d => d.id === uploaded.id ? {...d, status: 'ready'} : d));
      }
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function generate() {
    if (!courseId) return;
    setBusy(true); setError('');
    try {
      const {data} = await api.post<{run_id: number}>(`/courses/${courseId}/generation-runs`, {
        document_ids: documents.filter(d => d.status === 'ready').map(d => d.id),
        settings: {title, goal, target_audience: audience || null, difficulty, language,
          lesson_count: lessonCount, module_tests_enabled: moduleTests, final_test_enabled: finalTest},
      });
      setParams({course: String(courseId), run: String(data.run_id)}, {replace: true});
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function retry() {
    if (!runId || busy) return;
    setBusy(true); setError('');
    try {
      const {data} = await api.post<{run_id: number}>(`/generation-runs/${runId}/retry`);
      setRun(null); setParams({course: String(courseId), run: String(data.run_id)}, {replace: true});
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  return <><Menu/><main className={styles.page}>
    <section className={styles.content} style={{padding: 28, maxWidth: 900, margin: '0 auto'}}>
      <h1>Создать курс по документам</h1>
      {error && <p role="alert" style={{color: '#d94747'}}>{error}</p>}
      {runId ? <section aria-live="polite">
        <h2>{run?.status === 'completed' || run?.status === 'succeeded' ? 'Курс готов к проверке' : 'Генерация курса'}</h2>
        <progress value={run?.progress_percent ?? 0} max={100} style={{width: '100%'}}/>
        <p>{run?.progress_percent ?? 0}%</p>
        <ol>{run?.stages?.map(s => <li key={s.code}>{s.title} — {s.status === 'completed' ? 'Готово' : s.status === 'running' ? 'В работе' : 'Ожидание'}</li>)}</ol>
        {run?.status_error && <p role="alert">{run.status_error.message}</p>}
        {run?.status === 'failed' && run.status_error?.retryable && <button disabled={busy} onClick={() => void retry()}>Повторить генерацию</button>}
        {run?.status === 'failed' && <p><button onClick={() => {setRun(null);setParams({course:String(courseId)}, {replace:true});}}>Изменить параметры курса</button></p>}
        {['completed', 'succeeded'].includes(run?.status ?? '') && <p><Link to={`/courses/${courseId}/edit`}>Проверить и опубликовать курс</Link> · <Link to={`/courses/${courseId}/canvas`}>Открыть канву</Link></p>}
        <p>Можно закрыть страницу: генерация продолжится на сервере. Сохраните адрес, чтобы вернуться к результату.</p>
      </section> : <form onChangeCapture={() => {edited.current = true;}} onSubmit={e => { e.preventDefault(); void generate(); }} style={{display: 'grid', gap: 18}}>
        <label>Документы (PDF, DOCX, TXT, до 25 МБ)<input type="file" multiple accept=".pdf,.docx,.txt" disabled={busy} onChange={e => void upload(e.target.files)} style={fieldStyle}/></label>
        <ul>{documents.map(d => <li key={d.id}>{d.original_filename} — {d.status === 'ready' ? 'Готов к генерации' : 'Требуется обработка'}{d.status !== 'ready' && <button type="button" disabled={busy} onClick={async () => {setBusy(true); try {await api.post(`/documents/${d.id}/reindex`);setDocuments(prev => prev.map(item => item.id === d.id ? {...item,status:'ready'} : item));} catch(e) {setError(errorText(e));} finally {setBusy(false);} }}>Обработать</button>}</li>)}</ul>
        <label>Название курса<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} style={fieldStyle}/></label>
        <label>Чему должен научиться сотрудник<textarea required maxLength={2000} value={goal} onChange={e => setGoal(e.target.value)} style={fieldStyle}/></label>
        <label>Для кого курс<input maxLength={1000} value={audience} onChange={e => setAudience(e.target.value)} style={fieldStyle}/></label>
        <label>Уровень<select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={fieldStyle}><option value="basic">Базовый</option><option value="intermediate">Средний</option><option value="advanced">Продвинутый</option></select></label>
        <label>Язык<select value={language} onChange={e => setLanguage(e.target.value)} style={fieldStyle}><option value="ru">Русский</option><option value="en">English</option></select></label>
        <label>Количество уроков<input type="number" min={1} max={100} required value={lessonCount} onChange={e => setLessonCount(Number(e.target.value))} style={fieldStyle}/></label>
        <label><input type="checkbox" checked={moduleTests} onChange={e => setModuleTests(e.target.checked)}/> Тесты после модулей</label>
        <label><input type="checkbox" checked={finalTest} onChange={e => setFinalTest(e.target.checked)}/> Итоговый тест</label>
        {settingsSaved && <small>Параметры сохранены</small>}
        <button type="submit" disabled={busy || !documents.some(d => d.status === 'ready')}>{busy ? 'Обрабатываем документы…' : 'Сгенерировать курс'}</button>
      </form>}
    </section>
  </main></>;
}
