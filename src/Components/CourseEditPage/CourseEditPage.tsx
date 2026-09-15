import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/shared/api';
import Menu from '@/Components/Menu/Menu';
import styles from './courseEditPage.module.css';

type Lesson = {id: number; title: string; description: string; content: string; revision: number};
type ReviewTest = {id: number; question: string; answers: string[]; correct_answer: string};
type Module = {id: number; title: string; revision: number; lessons: Lesson[]; tests: ReviewTest[]; tasks: {id:number;name:string;description:string}[]};
type Structure = {course_id: number; title: string; status: string; modules_timeline: {module_id: number}[]};
const message = (e: unknown) => e instanceof Error ? e.message : 'Ошибка запроса';

export default function CourseEditPage() {
  const {id} = useParams();
  const [structure, setStructure] = useState<Structure | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [finalTests, setFinalTests] = useState<ReviewTest[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lesson = modules.flatMap(m => m.lessons).find(l => l.id === selected);
  const dirty = Boolean(lesson && draft !== lesson.content);

  useEffect(() => {
    let stopped = false;
    (async () => {
      try {
        const {data} = await api.get<Structure>(`/courses/${id}/structure`);
        const details = await Promise.all(data.modules_timeline.map(m => api.get<Module>(`/modules/${m.module_id}`)));
        const finals = await api.get<ReviewTest[]>(`/courses/${id}/tests/`);
        if (!stopped) {setFinalTests(finals.data);setStructure(data);setModules(details.map(r => r.data));}
      } catch(e) {if (!stopped) setError(message(e));}
    })();
    return () => {stopped = true;};
  }, [id]);

  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {event.preventDefault();};
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);

  function select(item: Lesson) {
    if (dirty && !window.confirm('Есть несохранённые изменения. Перейти к другому уроку?')) return;
    setSelected(item.id); setDraft(item.content); setNotice('');
  }
  async function save() {
    if (!lesson) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const {data} = await api.put<Lesson>(`/lessons/${lesson.id}`, {content: draft, expected_revision: lesson.revision});
      setModules(prev => prev.map(m => ({...m, lessons: m.lessons.map(l => l.id === lesson.id ? {...l, ...data, content: draft} : l)})));
      setStructure(s => s ? {...s,status:'draft'} : s); setNotice('Урок сохранён');
    } catch(e) {setError(message(e));}
    finally {setBusy(false);}
  }
  async function publish() {
    setBusy(true); setError('');
    try {await api.post(`/courses/${id}/publish`);setNotice('Курс опубликован');setStructure(s => s ? {...s,status:'published'} : s);}
    catch(e) {setError(message(e));} finally {setBusy(false);}
  }
  function download() {
    const text = `# ${structure?.title ?? 'Курс'}\n\n` + modules.map(m => `## ${m.title}\n\n` + m.lessons.map(l => `### ${l.title}\n\n${l.content}`).join('\n\n')).join('\n\n');
    const url = URL.createObjectURL(new Blob([text], {type:'text/markdown;charset=utf-8'}));
    const anchor = document.createElement('a');anchor.href=url;anchor.download='course.md';anchor.click();URL.revokeObjectURL(url);
  }
  return <><Menu/><main className={styles.container}>
    <p><Link to="/courses">Мои курсы</Link> · <Link to={`/courses/${id}/canvas`}>Канва</Link></p>
    <h1>{structure?.title ?? 'Проверка курса'}</h1>
    {error && <p role="alert" style={{color:'#d94747'}}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className={styles.content}>
      <aside className={styles.sidebar}>{modules.map(m => <section key={m.id}><h2>{m.title}</h2>
        {m.lessons.map(l => <button key={l.id} onClick={() => select(l)} disabled={busy} style={{display:'block',marginBottom:10}}>{l.title}</button>)}
        <details><summary>Тесты ({m.tests.length})</summary>{m.tests.map(t => <div key={t.id}><strong>{t.question}</strong><ul>{t.answers.map((a,i) => <li key={i}>{a}{a === t.correct_answer ? ' ✓' : ''}</li>)}</ul><p>Ответ: {t.correct_answer}</p></div>)}</details>
        <details><summary>Практика и кейсы ({m.tasks?.length ?? 0})</summary>{m.tasks?.map(task => <article key={task.id}><strong>{task.name}</strong><ReactMarkdown remarkPlugins={[remarkGfm]}>{task.description}</ReactMarkdown></article>)}</details>
      </section>)}
      <details><summary>Итоговый тест ({finalTests.length})</summary>{finalTests.map(test => <article key={test.id}><strong>{test.question}</strong><ul>{test.answers.map((answer,i) => <li key={i}>{answer}</li>)}</ul><p>Ответ: {test.correct_answer}</p></article>)}</details>
      </aside>
      <section className={styles.editorContainer}>{lesson ? <><h2>{lesson.title}</h2>
        <label>Текст урока (Markdown)<textarea value={draft} onChange={e => setDraft(e.target.value)} disabled={busy} rows={18} style={{width:'100%',padding:16}}/></label>
        <button disabled={busy || !dirty} onClick={() => void save()}>Сохранить урок</button>
        <h3>Предпросмотр</h3><ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
      </> : <p>Выберите урок для проверки и редактирования.</p>}</section>
    </div>
    <div className={styles.buttons}><button disabled={!modules.length || dirty} onClick={download}>Скачать Markdown</button>
      <button disabled={busy || dirty || !modules.length || structure?.status === 'published'} onClick={() => void publish()}>{structure?.status === 'published' ? 'Опубликовано' : 'Опубликовать курс'}</button>
    </div>
  </main></>;
}
