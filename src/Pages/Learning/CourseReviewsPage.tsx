import {useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Shell} from '@/Pages/Workspace/shared';
import {LoadingState, RequestError} from '@/Components/RequestState';
import MarkdownContent from '@/Components/MarkdownContent';
import DraftNotice from '@/Components/DraftNotice';
import ImageLibrary from '@/Components/ElementUi/ImageEditor/ImageLibrary';
import {useDurableState} from '@/hooks/useDurableState';
import {useLocale} from '@/i18n/useLocale';
import {api} from '@/shared/api';
import {useLearningData} from './useLearningData';
import {type AssignmentDetail, type Assessment, dateLabel} from './types';
import s from '../Workspace/workspace.module.css';

type ReviewContent = {content: AssignmentDetail['content']; content_digest: string};
type Approval = {id:number; decision:'approved'|'rejected'; reviewer_id:number; revision:number; content_digest:string; comment:string; created_at:string};
type ApprovalHistory = {required:boolean; content_digest:string; items:Approval[]; next_cursor:number|null};

export function PublicationHistory({courseId}:{courseId:number}) {
  const {t}=useLocale();
  const [before,setBefore]=useState<number|null>(null);
  const history=useLearningData<ApprovalHistory>(`/courses/${courseId}/approvals${before?`?before_id=${before}`:''}`);
  return <section className={s.panel} aria-label={t('История согласования')}>
    <h2>{t('История согласования')}</h2>
    {history.loading&&<LoadingState/>}
    {!!history.error&&<RequestError error={history.error} onRetry={history.reload}/>}
    {history.data&&<>
      <p>{history.data.required?t('Перед публикацией требуется независимое согласование.'):t('Независимое согласование не обязательно по правилам организации.')}</p>
      {!history.data.items.length&&<p>{t('Решений по этому курсу пока нет.')}</p>}
      <ol>{history.data.items.map(item=><li key={item.id}>
        <strong>{t(item.decision==='approved'?'Согласован':'На доработку')}</strong> · {dateLabel(item.created_at)} · {t('Проверяющий №{id}',{id:item.reviewer_id})}
        <p>{t(item.content_digest===history.data?.content_digest?'Решение относится к текущему содержанию.':'После этого решения содержание изменилось.')}</p>
        <p style={{whiteSpace:'pre-wrap'}}>{item.comment}</p>
      </li>)}</ol>
      <div className={s.row}>{before&&<button className={s.secondary} onClick={()=>setBefore(null)}>{t('Последние решения')}</button>}
      {history.data.next_cursor&&<button className={s.secondary} onClick={()=>setBefore(history.data!.next_cursor)}>{t('Более ранние решения')}</button>}</div>
    </>}
  </section>;
}

function AssessmentPreview({item}:{item:Assessment & {correct_answers?:string[]}}) {
  const {t}=useLocale();
  return <article className={s.panel}><h3>{item.question}</h3>
    <MarkdownContent>{item.description}</MarkdownContent>
    <p>{t('Максимум: {points}',{points:item.max_points})} · {t(item.question_type==='open'?'Открытый ответ':item.question_type==='multiple'?'Несколько правильных ответов':'Один правильный ответ')}</p>
    {!!item.answers.length&&<ul>{item.answers.map((answer,index)=><li key={index}>{answer}</li>)}</ul>}
    {!!item.correct_answers?.length&&<details><summary>{t('Ключ ответа — только для проверяющего')}</summary><ul>{item.correct_answers.map((answer,index)=><li key={index} style={{whiteSpace:'pre-wrap'}}>{answer}</li>)}</ul></details>}
    <ul>{item.criteria.map(criterion=><li key={criterion.id}><strong>{criterion.title} · {criterion.max_points}</strong><p>{criterion.description}</p>
      {!!criterion.levels?.length&&<ul>{criterion.levels.map((level,index)=><li key={index}>{level.title} · {level.points}: {level.description}</li>)}</ul>}
    </li>)}</ul>
  </article>;
}

function ContentPreview({content}:{content:ReviewContent['content']}) {
  const {t}=useLocale();
  return <><h2>{content.course.title}</h2><MarkdownContent>{content.course.description}</MarkdownContent>
    {content.modules.map(module=><section key={module.id}><h2>{module.title}</h2><MarkdownContent>{module.description}</MarkdownContent>
      {module.lessons.map(lesson=><article className={s.panel} key={lesson.id}><h3>{lesson.title}</h3><MarkdownContent>{lesson.description}</MarkdownContent><MarkdownContent>{lesson.content}</MarkdownContent></article>)}
      {module.assessments.map(item=><AssessmentPreview key={item.id} item={item}/>)}
    </section>)}
    {!!content.assessments.length&&<section><h2>{t('Итоговые задания')}</h2>{content.assessments.map(item=><AssessmentPreview key={item.id} item={item}/>)}</section>}
  </>;
}

function ReviewForm({courseId,current,onReload}:{courseId:number;current:ReviewContent;onReload:()=>Promise<void>}) {
  const {t}=useLocale();
  const [form,setForm,clearForm]=useDurableState(`publication-review:${courseId}`,{comment:'',decision:'approved' as 'approved'|'rejected',content_digest:current.content_digest,content:current.content});
  const [busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null),[notice,setNotice]=useState('');
  const [historyVersion,setHistoryVersion]=useState(0);
  const stale=form.content_digest!==current.content_digest;
  async function submit(){
    if(busy||stale)return;
    setBusy(true);setError(null);setNotice('');
    try {
      await api.post(`/courses/${courseId}/approvals`,{comment:form.comment,decision:form.decision,content_digest:form.content_digest});
      clearForm(form);const empty={...form,comment:''};setForm(empty);clearForm(empty);
      setHistoryVersion(v=>v+1);setNotice(t('Решение сохранено в истории.'));
    } catch(reason){setError(reason);await onReload();} finally{setBusy(false);}
  }
  return <>
    {stale&&<section className={s.panel}><h2>{t('Содержание изменилось во время проверки')}</h2><p>{t('Комментарий сохранён. Сравните обе версии и подтвердите проверку текущей перед отправкой решения.')}</p>
      <details><summary>{t('Содержание, открытое ранее')}</summary><ContentPreview content={form.content}/></details>
      <button className={s.secondary} disabled={busy} onClick={()=>setForm({...form,content:current.content,content_digest:current.content_digest})}>{t('Я проверил текущее содержание')}</button>
    </section>}
    <ContentPreview content={current.content}/>
    <details className={s.panel}><summary>{t('Иллюстрации курса')}</summary><ImageLibrary courseId={courseId}/></details>
    <section className={s.panel}><h2>{t('Решение по курсу')}</h2><DraftNotice/>
      {!!error&&<RequestError error={error}/>}{notice&&<p role="status" className={s.success}>{notice}</p>}
      <form onSubmit={event=>{event.preventDefault();void submit();}}>
        <fieldset disabled={busy} className={s.form}>
          <label>{t('Решение')}<select value={form.decision} onChange={event=>setForm({...form,decision:event.target.value as 'approved'|'rejected'})}><option value="approved">{t('Согласовать')}</option><option value="rejected">{t('Вернуть на доработку')}</option></select></label>
          <label className={s.span}>{t('Комментарий проверяющего')}<textarea rows={6} maxLength={10000} required value={form.comment} onChange={event=>setForm({...form,comment:event.target.value})}/></label>
          <button className={s.primary} disabled={stale||busy||!form.comment.trim()}>{t(busy?'Сохраняем…':'Сохранить решение')}</button>
        </fieldset>
      </form>
    </section>
    <PublicationHistory key={historyVersion} courseId={courseId}/>
  </>;
}

export default function CourseReviewsPage(){
  const {t}=useLocale();
  const [params,setParams]=useSearchParams();
  const selected=params.get('course');
  const courseId=selected&&/^\d+$/.test(selected)?Number(selected):null;
  const [after,setAfter]=useState(0);
  const queue=useLearningData<{items:{id:number;title:string;revision:number;status:string}[];next_cursor:number|null}>(courseId?null:`/learning/course-reviews?after_id=${after}`);
  const detail=useLearningData<ReviewContent>(courseId?`/courses/${courseId}/review-content`:null);
  return <Shell title={t('Согласование курсов')} description={t('Проверяйте назначенные вам курсы перед публикацией. Решение связано с конкретным содержанием.')}>
    <p><Link to="/reviews">{t('Проверка работ участников')}</Link></p>
    {courseId?<>
      <button className={s.secondary} onClick={()=>setParams({})}>{t('К списку курсов')}</button>
      {detail.loading&&<LoadingState/>}{!!detail.error&&<RequestError error={detail.error} onRetry={detail.reload}/>}
      {detail.data&&<ReviewForm key={courseId} courseId={courseId} current={detail.data} onReload={detail.reload}/>}
    </>:<>
      {queue.loading&&<LoadingState/>}{!!queue.error&&<RequestError error={queue.error} onRetry={queue.reload}/>}
      {queue.data&&!queue.data.items.length&&<section className={s.empty}><h2>{t('Нет курсов на согласование')}</h2><p>{t('Администратор организации назначает проверяющего на конкретный курс в разделе команды.')}</p><Link to="/groups">{t('Команда и группы')}</Link></section>}
      <div className={s.grid}>{queue.data?.items.map(course=><article key={course.id} className={s.card}><h2>{course.title}</h2><p>{t('Редакция {revision}',{revision:course.revision})}</p><button className={s.primary} onClick={()=>setParams({course:String(course.id)})}>{t('Открыть на проверку')}</button></article>)}</div>
      <div className={s.row}>{after>0&&<button className={s.secondary} onClick={()=>setAfter(0)}>{t('К началу списка')}</button>}{queue.data?.next_cursor&&<button className={s.secondary} onClick={()=>setAfter(queue.data!.next_cursor!)}>{t('Следующие курсы')}</button>}</div>
    </>}
  </Shell>;
}
