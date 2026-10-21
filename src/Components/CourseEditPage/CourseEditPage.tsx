import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MarkdownContent from '@/Components/MarkdownContent';
import EntityEditor,{type EditableEntity} from './EntityEditor';
import AssessmentEditor,{type AssessmentTarget} from './AssessmentEditor';
import ImageLibrary from '@/Components/ElementUi/ImageEditor/ImageLibrary';
import {WizardSteps} from '@/Pages/ExpressPage/CourseWizard';
import { api } from '@/shared/api';
import Menu from '@/Components/Menu/Menu';
import styles from './courseEditPage.module.css';
import {useAuth} from '@/auth/useAuth';
import {readDraft,writeDraft,clearDraft,draftStorageError} from '@/shared/drafts';
import {ApiError} from '@/shared/errors';
import {RequestError,LoadingState} from '@/Components/RequestState';
import DraftNotice from '@/Components/DraftNotice';
import {useReconnect} from '@/hooks/useReconnect';
import {PublicationHistory} from '@/Pages/Learning/CourseReviewsPage';

type Lesson = {id: number; title: string; description: string; content: string; revision: number};
type ReviewTest = {id: number; question: string; answers: string[]; correct_answer: string;revision:number};
type Module = {id: number; title: string;description?:string; revision: number; lessons: Lesson[]; tests: ReviewTest[]; tasks: {id:number;name:string;description:string;revision:number}[]};
type Structure = {course_id: number; title: string;description?:string;content_revision:number; status: string; modules_timeline: {module_id: number}[]};

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
  const [editing,setEditing]=useState<EditableEntity|null>(null);
  const [assessment,setAssessment]=useState<AssessmentTarget|null>(null);
  const [showImages,setShowImages]=useState(false);
  const [publicationProblems,setPublicationProblems]=useState<{id:string;question:string;message:string}[]>([]);
  const textInput=useRef<HTMLTextAreaElement>(null);
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
    setBusy(true); setError(null);setPublicationProblems([]);
    try {await api.post(`/courses/${id}/publish`);setNotice('Курс опубликован');setStructure(s => s ? {...s,status:'published'} : s);}
    catch(e) {setError(e);if(e instanceof ApiError&&e.data&&typeof e.data==='object'&&'detail' in e.data){const detail=e.data.detail;if(detail&&typeof detail==='object'&&'assessments' in detail&&Array.isArray(detail.assessments))setPublicationProblems(detail.assessments);}} finally {setBusy(false);}
  }
  async function modify(action:()=>Promise<unknown>){
    if(busy)return;setBusy(true);setError(null);setNotice('');
    try{await action();setVersion(value=>value+1);}catch(reason){setError(reason);}finally{setBusy(false);}
  }
  function move<T extends {id:number;revision:number}>(items:T[],index:number,direction:number,path:string){
    const next=[...items];[next[index],next[index+direction]]=[next[index+direction],next[index]];
    void modify(()=>api.put(path,{items:next.map((item,position)=>({id:item.id,position,expected_revision:item.revision}))}));
  }
  function insertMarkdown(value:string){
    const input=textInput.current;if(!input)return;
    const start=input.selectionStart;const end=input.selectionEnd;
    edit(draft.slice(0,start)+value+draft.slice(end));
    requestAnimationFrame(()=>{input.focus();input.setSelectionRange(start+value.length,start+value.length);});
  }
  function editTest(test:ReviewTest,parentId?:number){setEditing({kind:'test',courseId:Number(id),id:test.id,parentId,revision:test.revision,title:test.question,answers:test.answers,correct_answer:test.correct_answer});}
  function removeEntity(kind:'modules'|'lessons'|'tests'|'tasks',entity:{id:number;revision:number},label:string){
    if(!window.confirm(`Убрать «${label}» из черновика? Опубликованные версии и результаты участников сохранятся.`))return;
    void modify(()=>api.delete(`/${kind}/${entity.id}?expected_revision=${entity.revision}`));
  }
  function download() {
    const text = `# ${structure?.title ?? 'Курс'}\n\n` + modules.map(m => `## ${m.title}\n\n` + m.lessons.map(l => `### ${l.title}\n\n${l.id===selected?draft:readDraft<string>(`lesson:${l.id}`,owner)?.value??l.content}`).join('\n\n')).join('\n\n');
    const url = URL.createObjectURL(new Blob([text], {type:'text/markdown;charset=utf-8'}));
    const anchor = document.createElement('a');anchor.href=url;anchor.download='course.md';anchor.click();URL.revokeObjectURL(url);
  }
  if(error&&!structure)return <><Menu/><RequestError error={error} fullPage onRetry={()=>setVersion(v=>v+1)} retrying={loading}/></>;
  return <><Menu/><main className={styles.container}>
    <WizardSteps step={5}/>
    <p><Link to="/courses">Мои курсы</Link> · <Link to={`/courses/${id}/canvas`}>Канва</Link>{user?.organization_id&&<> · <Link to={`/course-reviews?course=${id}`}>Ссылка для назначенного проверяющего</Link></>}</p>
    <h1>{structure?.title ?? 'Проверка курса'}</h1>
    {structure&&<div className={styles.toolbar}><button disabled={busy} onClick={()=>setEditing({kind:'course',courseId:Number(id),id:Number(id),revision:structure.content_revision,title:structure.title,description:structure.description})}>Настройки курса</button><button disabled={busy} onClick={()=>setEditing({kind:'module',courseId:Number(id),title:''})}>Добавить модуль +</button><button disabled={busy} onClick={()=>setEditing({kind:'test',courseId:Number(id),title:''})}>Добавить итоговый вопрос</button></div>}
    {loading && <LoadingState>Загружаем содержание курса…</LoadingState>}
    {Boolean(error) && <RequestError error={error} onRetry={()=>setVersion(v=>v+1)} retrying={loading}/>}
    {notice && <p role="status">{notice}</p>}
    {user?.organization_id&&structure&&<details><summary>История согласования курса</summary><PublicationHistory key={version} courseId={Number(id)}/></details>}
    {publicationProblems.length>0&&<section className="request-state"><h2>Задания, требующие настройки</h2><ul>{publicationProblems.map(problem=><li key={problem.id}><strong>{problem.question}</strong><p>{problem.message}</p><button onClick={()=>{const [kind,key]=problem.id.split(':');const found=[...finalTests,...modules.flatMap(module=>module.tests)].find(item=>item.id===Number(key));setAssessment({kind:kind==='task'?'task':'test',id:Number(key),title:problem.question,answers:kind==='test'?found?.answers??[]:[]});}}>Настроить оценивание</button></li>)}</ul></section>}
    {dirty&&<DraftNotice restored={restored}/>}
    {pendingLessons.length>0&&<p>Несохранённых уроков: {pendingLessons.length}. {pendingLessons.map(item=><button key={item.id} disabled={busy} onClick={()=>select(item)}>{item.title}</button>)}</p>}
    {!loading&&!modules.some(m=>m.lessons.length)&&<section className="request-state"><h2>В курсе пока нет уроков</h2><p>Добавьте модуль и уроки вручную или подготовьте содержание из документов.</p><Link to={`/express?course=${id}&step=2`}>Создать из документов</Link></section>}
    {modules.length>0&&<nav className={styles.moduleMap} aria-label="Структура курса">{modules.map((module,index)=><button key={module.id} disabled={busy||!module.lessons.length} onClick={()=>select(module.lessons[0])}><small>Модуль {index+1} · {module.lessons.length} уроков</small>{module.title}</button>)}</nav>}
    <div className={styles.content}>
      <aside className={styles.sidebar}>{modules.map((m,moduleIndex) => <section key={m.id}><h2>{m.title}</h2>
        <div className={styles.moduleActions}><button disabled={busy} aria-label={`Редактировать модуль ${m.title}`} onClick={()=>setEditing({kind:'module',courseId:Number(id),id:m.id,revision:m.revision,title:m.title,description:m.description})}>Изменить</button><button disabled={busy||moduleIndex===0} aria-label={`Поднять модуль ${m.title}`} onClick={()=>move(modules,moduleIndex,-1,`/courses/${id}/modules/order`)}>↑</button><button disabled={busy||moduleIndex===modules.length-1} aria-label={`Опустить модуль ${m.title}`} onClick={()=>move(modules,moduleIndex,1,`/courses/${id}/modules/order`)}>↓</button><button disabled={busy} aria-label={`Удалить модуль ${m.title}`} onClick={()=>removeEntity('modules',m,m.title)}>Убрать</button></div>
        {m.lessons.map((l,lessonIndex) => <div key={l.id} className={styles.lessonRow}><button onClick={() => select(l)} disabled={busy} className={styles.lesson} aria-pressed={selected===l.id}>{l.title}</button><button disabled={busy||lessonIndex===0} aria-label={`Поднять урок ${l.title}`} onClick={()=>move(m.lessons,lessonIndex,-1,`/modules/${m.id}/lessons/order`)}>↑</button><button disabled={busy||lessonIndex===m.lessons.length-1} aria-label={`Опустить урок ${l.title}`} onClick={()=>move(m.lessons,lessonIndex,1,`/modules/${m.id}/lessons/order`)}>↓</button></div>)}
        <button disabled={busy} onClick={()=>setEditing({kind:'lesson',courseId:Number(id),parentId:m.id,title:''})}>Добавить урок +</button>
        <details><summary>Тесты ({m.tests.length})</summary>{m.tests.map(t => <div key={t.id}><strong>{t.question}</strong><ul>{t.answers.map((a,i) => <li key={i}>{a}{a === t.correct_answer ? ' ✓' : ''}</li>)}</ul><p>Ответ: {t.correct_answer}</p><button disabled={busy} onClick={()=>editTest(t,m.id)}>Редактировать вопрос</button><button disabled={busy} onClick={()=>setAssessment({kind:'test',id:t.id,title:t.question,answers:t.answers})}>Тип ответа и оценивание</button><button disabled={busy} onClick={()=>removeEntity('tests',t,t.question)}>Убрать вопрос</button></div>)}<button disabled={busy} onClick={()=>setEditing({kind:'test',courseId:Number(id),parentId:m.id,title:''})}>Добавить вопрос</button></details>
        <details><summary>Практика и кейсы ({m.tasks?.length ?? 0})</summary>{m.tasks?.map(task => <article key={task.id}><strong>{task.name}</strong><MarkdownContent>{task.description}</MarkdownContent><button disabled={busy} onClick={()=>setEditing({kind:'task',courseId:Number(id),parentId:m.id,id:task.id,revision:task.revision,title:task.name,description:task.description})}>Редактировать задание</button><button disabled={busy} onClick={()=>setAssessment({kind:'task',id:task.id,title:task.name,answers:[]})}>Критерии и оценивание</button><button disabled={busy} onClick={()=>removeEntity('tasks',task,task.name)}>Убрать задание</button></article>)}<button disabled={busy} onClick={()=>setEditing({kind:'task',courseId:Number(id),parentId:m.id,title:''})}>Добавить практику</button></details>
      </section>)}
      <details><summary>Итоговый тест ({finalTests.length})</summary>{finalTests.map(test => <article key={test.id}><strong>{test.question}</strong><ul>{test.answers.map((answer,i) => <li key={i}>{answer}</li>)}</ul><p>Ответ: {test.correct_answer}</p><button disabled={busy} onClick={()=>editTest(test)}>Редактировать вопрос</button><button disabled={busy} onClick={()=>setAssessment({kind:'test',id:test.id,title:test.question,answers:test.answers})}>Тип ответа и оценивание</button><button disabled={busy} onClick={()=>removeEntity('tests',test,test.question)}>Убрать вопрос</button></article>)}</details>
      </aside>
      <section className={styles.editorContainer}>{lesson ? <><h2>{lesson.title}</h2>
        <div className={styles.toolbar}><button disabled={busy} onClick={()=>setEditing({kind:'lesson',courseId:Number(id),id:lesson.id,revision:baseRevision,title:lesson.title,description:lesson.description,content:draft})}>Название и описание</button><button disabled={busy} onClick={()=>removeEntity('lessons',lesson,lesson.title)}>Убрать урок</button></div>
        <div className={styles.toolbar} role="toolbar" aria-label="Добавить блок содержания"><button disabled={busy} onClick={()=>insertMarkdown('\n## Заголовок раздела\n\n')}>Заголовок</button><button disabled={busy} onClick={()=>insertMarkdown('\n| Столбец 1 | Столбец 2 |\n| --- | --- |\n| Значение | Значение |\n')}>Таблица</button><button disabled={busy} onClick={()=>insertMarkdown('\n$$\nE = mc^2\n$$\n')}>Формула</button><button disabled={busy} onClick={()=>insertMarkdown('[Текст ссылки](https://)')}>Ссылка</button><button disabled={busy} onClick={()=>insertMarkdown('\n- Первый пункт\n- Второй пункт\n')}>Список</button></div>
        <label>Текст урока (Markdown)<textarea ref={textInput} value={draft} onChange={e => edit(e.target.value)} disabled={busy} rows={18} style={{width:'100%',padding:16}}/></label>
        <button disabled={busy || !dirty} onClick={() => void save()}>Сохранить урок</button>
        {serverLesson&&<section className="request-state"><h2>На сервере другая версия</h2><p>Ваш текст сохранён в черновике. Сравните версии и внесите нужные изменения в поле выше.</p><details><summary>Показать текст сервера (версия {serverLesson.revision})</summary><pre style={{whiteSpace:'pre-wrap'}}>{serverLesson.content}</pre></details><button disabled={busy} onClick={()=>void save(serverLesson.revision)}>Сохранить мой текст вместо этой версии</button></section>}
        <div className={styles.toolbar}><button disabled={busy} onClick={()=>setShowImages(value=>!value)} aria-expanded={showImages}>{showImages?'Закрыть иллюстрации':'Добавить иллюстрацию'}</button></div>
        {showImages&&<ImageLibrary courseId={id!} onInsert={markdown=>{insertMarkdown('\n'+markdown+'\n');setShowImages(false);}}/>}
        <h3>Предпросмотр</h3><MarkdownContent>{draft}</MarkdownContent>
      </> : null}</section>
    </div>
    <div className={styles.buttons}><button disabled={!modules.length} onClick={download}>Скачать Markdown с черновиками</button>
      <button className={styles.primary} disabled={busy || pendingLessons.length>0 || !modules.length || structure?.status === 'published'} onClick={() => void publish()}>{structure?.status === 'published' ? 'Опубликовано' : 'Опубликовать курс'}</button>{structure?.status==='published'&&<Link className={styles.primary} to={`/assignments?course=${id}`}>Назначить участникам</Link>}
    </div>
    {assessment&&<AssessmentEditor target={assessment} onClose={()=>setAssessment(null)} onSaved={()=>{setAssessment(null);setVersion(value=>value+1);}}/>}
    {editing&&<EntityEditor entity={editing} onClose={()=>setEditing(null)} onSaved={()=>{if(editing.kind==='lesson'&&editing.id)clearDraft(`lesson:${editing.id}`,editing.content??'',owner);setEditing(null);setVersion(value=>value+1);}}/>}
  </main></>;
}
