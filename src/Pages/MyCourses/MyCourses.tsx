import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Menu from '@/Components/Menu/Menu';
import { api } from '@/shared/api';
import styles from './myCourses.module.css';
export interface CourseCard {id: number; author: string; title: string; lessons: number; tests: number; tags: string[];}
type Course = {id: number; title: string | null; publication_status: string; module_count: number; lesson_count: number};
export default function MyCoursesPage() {
  const [courses,setCourses] = useState<Course[]>([]);
  const [offset,setOffset] = useState(0);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  useEffect(() => {
    let stopped = false;setLoading(true);
    api.get<Course[]>(`/courses/?limit=20&offset=${offset}`).then(({data}) => {if (!stopped) {setCourses(data);setError('');}})
      .catch(e => {if (!stopped) setError(e instanceof Error ? e.message : 'Не удалось загрузить курсы');})
      .finally(() => {if (!stopped) setLoading(false);});
    return () => {stopped=true;};
  },[offset]);
  return <><Menu/><main className={styles.page}><h1>Мои курсы</h1><p><Link to="/express">Создать курс</Link></p>
    {error && <p role="alert">{error}</p>}{loading && <p>Загрузка…</p>}
    {!loading && !courses.length && !error && <p>Курсов пока нет. Загрузите документы, чтобы создать первый.</p>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20}}>{courses.map(c => <article key={c.id} style={{padding:24,border:'1px solid #64748b',borderRadius:20}}>
      <h2>{c.title || `Черновик №${c.id}`}</h2><p>{c.module_count} модулей · {c.lesson_count} уроков</p><p>{c.publication_status === 'published' ? 'Опубликован' : 'Черновик'}</p>
      <p>{c.lesson_count ? <Link to={`/courses/${c.id}/edit`}>Открыть курс</Link> : <Link to={`/express?course=${c.id}`}>Продолжить создание</Link>} · <Link to={`/courses/${c.id}/canvas`}>Канва</Link></p>
    </article>)}</div>
    <p><button disabled={offset === 0 || loading} onClick={() => setOffset(n => Math.max(0,n-20))}>Назад</button> <button disabled={courses.length < 20 || loading} onClick={() => setOffset(n => n+20)}>Далее</button></p>
  </main></>;
}
