import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/shared/api';
import Menu from '@/Components/Menu/Menu';
import styles from './courseEditPage.module.css';
import {useAuth} from '@/auth/useAuth';
import {readDraft,writeDraft,clearDraft,draftStorageError} from '@/shared/drafts';
import {ApiError} from '@/shared/errors';
import {RequestError,LoadingState} from '@/Components/RequestState';
import DraftNotice from '@/Components/DraftNotice';
import {useReconnect} from '@/hooks/useReconnect';

type Lesson = {id: number; title: string; description: string; content: string; revision: number};
type ReviewTest = {id: number; question: string; answers: string[]; correct_answer: string};
type Module = {id: number; title: string; revision: number; lessons: Lesson[]; tests: ReviewTest[]; tasks: {id:number;name:string;description:string}[]};
type Structure = {course_id: number; title: string; status: string; modules_timeline: {module_id: number}[]};

export default function CourseEditPage() {
  const {id} = useParams();
  const {user}=useAuth();const owner=user?.id??null;
  const [structure, setStructure] = useState<Structure | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [finalTests, setFinalTests] = useState<ReviewTest[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [version,setVersion]=useState(0);
  const [baseRevision,setBaseRevision]=useState<number>();
  const [restored,setRestored]=useState(false);
  const [serverLesson,setServerLesson]=useState<Lesson|null>(null);
  const selectedRef=useRef<number|null>(null);
  useReconnect(()=>setVersion(v=>v+1));
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const lesson = modules.flatMap(m => m.lessons).find(l => l.id === selected);
  const dirty = Boolean(lesson && draft !== lesson.content);
  const pendingLessons=modules.flatMap(m=>m.lessons).filter(item=>{
    const local=item.id===selected?draft:readDraft<string>(`lesson:${item.id}`,owner)?.value;
    return typeof local==='string'&&local!==item.content;
  });

  useEffect(() => {
    let stopped = false;
    setLoading(true);setError(null);setNotice('');
    (async () => {
      try {
        const {data} = await api.get<Structure>(`/courses/${id}/structure`);
        const details = await Promise.all(data.modules_timeline.map(m => api.get<Module>(`/modules/${m.module_id}`)));
        const finals = await api.get<ReviewTest[]>(`/courses/${id}/tests/`);
        if (!stopped) {
          const loaded = details.map(r => r.data);
          const lessons=loaded.flatMap(m=>m.lessons);
          const first = lessons.find(l=>l.id===selectedRef.current)??lessons[0];
          setFinalTests(finals.data);setStructure(data);setModules(loaded);
          const recovery=first?readDraft<string>(`lesson:${first.id}`,owner):null;
          const recovered=Boolean(recovery&&typeof recovery.value==='string'&&recovery.value!==first?.content);
          setSelected(first?.id??null);selectedRef.current=first?.id??null;
          setDraft(recovered?recovery!.value:first?.content??'');
          setBaseRevision(recovered?recovery!.baseRevision??first?.revision:first?.revision);
          setRestored(recovered);setServerLesson(recovered&&recovery?.baseRevision!==first?.revision?first:null);
        }
      } catch(e) {if (!stopped) setError(e);}
      finally {if (!stopped) setLoading(false);}
    })();
    return () => {stopped = true;};
  }, [id,version,owner]);

  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {event.preventDefault();};
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);

  function select(item: Lesson) {
    if(dirty&&draftStorageError()){setError(new ApiError('Сначала сохраните урок или скачайте черновики: браузер не смог записать локальную копию.',0,'storage'));return;}
    const recovery=readDraft<string>(`lesson:${item.id}`,owner);
    const recovered=Boolean(recovery&&typeof recovery.value==='string'&&recovery.value!==item.content);
    setSelected(item.id);selectedRef.current=item.id;setDraft(recovered?recovery!.value:item.content);
    setBaseRevision(recovered?recovery!.baseRevision??item.revision:item.revision);setRestored(recovered);
    setServerLesson(recovered&&recovery?.baseRevision!==item.revision?item:null);setNotice('');setError(null);
  }
  function edit(value:string){
    if(!lesson)return;
    writeDraft(`lesson:${lesson.id}`,value,baseRevision,owner);setDraft(value);
  }
  async function save(expected=baseRevision) {
    if (!lesson) return;
    setBusy(true); setError(null); setNotice('');
    try {
      const {data} = await api.put<Lesson>(`/lessons/${lesson.id}`, {content: draft, expected_revision: expected??lesson.revision});
      setModules(prev => prev.map(m => ({...m, lessons: m.lessons.map(l => l.id === lesson.id ? {...l, ...data, content: draft} : l)})));
      setStructure(s => s ? {...s,status:'draft'} : s); setNotice('Урок сохранён');
      clearDraft(`lesson:${lesson.id}`,draft,owner);setBaseRevision(data.revision);setRestored(false);setServerLesson(null);
    } catch(e) {setError(e);if(e instanceof ApiError&&e.status===409){try{setServerLesson((await api.get<Lesson>(`/lessons/${lesson.id}`)).data);}catch{/* Original draft and conflict remain visible. */}}}
    finally {setBusy(false);}
  }
  async function publish() {
    if(pendingLessons.length){setError(new Error('Сначала сохраните все изменённые уроки.'));return;}
    setBusy(true); setError(null);
    try {await api.post(`/courses/${id}/publish`);setNotice('Курс опубликован');setStructure(s => s ? {...s,status:'published'} : s);}
    catch(e) {setError(e);} finally {setBusy(false);}
  }
  function download() {
    const text = `# ${structure?.title ?? 'Курс'}\n\n` + modules.map(m => `## ${m.title}\n\n` + m.lessons.map(l => `### ${l.title}\n\n${l.id===selected?draft:readDraft<string>(`lesson:${l.id}`,owner)?.value??l.content}`).join('\n\n')).join('\n\n');
    const url = URL.createObjectURL(new Blob([text], {type:'text/markdown;charset=utf-8'}));
    const anchor = document.createElement('a');anchor.href=url;anchor.download='course.md';anchor.click();URL.revokeObjectURL(url);
  }
  if(error&&!structure)return <><Menu/><RequestError error={error} fullPage onRetry={()=>setVersion(v=>v+1)} retrying={loading}/></>;
  return <><Menu/><main className={styles.container}>
    <p><Link to="/courses">Мои курсы</Link> · <Link to={`/courses/${id}/canvas`}>Канва</Link></p>
    <h1>{structure?.title ?? 'Проверка курса'}</h1>
    {loading && <LoadingState>Загружаем содержание курса…</LoadingState>}
    {Boolean(error) && <RequestError error={error} onRetry={()=>setVersion(v=>v+1)} retrying={loading}/>}
    {notice && <p role="status">{notice}</p>}
    {dirty&&<DraftNotice restored={restored}/>}
    {pendingLessons.length>0&&<p>Несохранённых уроков: {pendingLessons.length}. {pendingLessons.map(item=><button key={item.id} disabled={busy} onClick={()=>select(item)}>{item.title}</button>)}</p>}
    {!loading&&!modules.some(m=>m.lessons.length)&&<section className="request-state"><h2>В курсе пока нет уроков</h2><p>Добавьте источники и запустите подготовку содержания.</p><Link to={`/express?course=${id}`}>Продолжить создание курса</Link></section>}
    <div className={styles.content}>
      <aside className={styles.sidebar}>{modules.map(m => <section key={m.id}><h2>{m.title}</h2>
        {m.lessons.map(l => <button key={l.id} onClick={() => select(l)} disabled={busy} className={styles.lesson} aria-pressed={selected===l.id}>{l.title}</button>)}
        <details><summary>Тесты ({m.tests.length})</summary>{m.tests.map(t => <div key={t.id}><strong>{t.question}</strong><ul>{t.answers.map((a,i) => <li key={i}>{a}{a === t.correct_answer ? ' ✓' : ''}</li>)}</ul><p>Ответ: {t.correct_answer}</p></div>)}</details>
        <details><summary>Практика и кейсы ({m.tasks?.length ?? 0})</summary>{m.tasks?.map(task => <article key={task.id}><strong>{task.name}</strong><ReactMarkdown remarkPlugins={[remarkGfm]}>{task.description}</ReactMarkdown></article>)}</details>
      </section>)}
      <details><summary>Итоговый тест ({finalTests.length})</summary>{finalTests.map(test => <article key={test.id}><strong>{test.question}</strong><ul>{test.answers.map((answer,i) => <li key={i}>{answer}</li>)}</ul><p>Ответ: {test.correct_answer}</p></article>)}</details>
      </aside>
      <section className={styles.editorContainer}>{lesson ? <><h2>{lesson.title}</h2>
        <label>Текст урока (Markdown)<textarea value={draft} onChange={e => edit(e.target.value)} disabled={busy} rows={18} style={{width:'100%',padding:16}}/></label>
        <button disabled={busy || !dirty} onClick={() => void save()}>Сохранить урок</button>
        {serverLesson&&<section className="request-state"><h2>На сервере другая версия</h2><p>Ваш текст сохранён в черновике. Сравните версии и внесите нужные изменения в поле выше.</p><details><summary>Показать текст сервера (версия {serverLesson.revision})</summary><pre style={{whiteSpace:'pre-wrap'}}>{serverLesson.content}</pre></details><button disabled={busy} onClick={()=>void save(serverLesson.revision)}>Сохранить мой текст вместо этой версии</button></section>}
        <h3>Предпросмотр</h3><ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
      </> : null}</section>
    </div>
    <div className={styles.buttons}><button disabled={!modules.length} onClick={download}>Скачать Markdown с черновиками</button>
      <button className={styles.primary} disabled={busy || pendingLessons.length>0 || !modules.length || structure?.status === 'published'} onClick={() => void publish()}>{structure?.status === 'published' ? 'Опубликовано' : 'Опубликовать курс'}</button>
    </div>
  </main></>;
}
