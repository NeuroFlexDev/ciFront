import {useEffect,useRef,useState} from 'react';
import {api} from '@/shared/api';
import {ApiError} from '@/shared/errors';
import {useDurableState} from '@/hooks/useDurableState';
import {RequestError,LoadingState} from '@/Components/RequestState';
import DraftNotice from '@/Components/DraftNotice';
import styles from './courseEditPage.module.css';

type Criterion={id:string;title:string;description:string;max_points:number};
type Assessment={question_type:'single'|'multiple'|'open';correct_answers:string[];max_points:number;criteria:Criterion[];grading_mode:'automatic'|'manual'|'ai_assisted';revision:number};
export type AssessmentTarget={kind:'test'|'task';id:number;title:string;answers:string[]};
const labels={single:'Один правильный ответ',multiple:'Несколько правильных ответов',open:'Открытый ответ'};
const modes={automatic:'Автоматически по ключу',manual:'Проверка преподавателем',ai_assisted:'ИИ предлагает, преподаватель подтверждает'};

export default function AssessmentEditor({target,onClose,onSaved}:{target:AssessmentTarget;onClose:()=>void;onSaved:()=>void}){
  const [server,setServer]=useState<Assessment|null>(null);const [error,setError]=useState<unknown>(null);const [version,setVersion]=useState(0);
  const path=`/${target.kind==='test'?'tests':'tasks'}/${target.id}/assessment-settings`;
  useEffect(()=>{let active=true;api.get<Assessment>(path).then(({data})=>{if(active){setServer(data);setError(null);}}).catch(reason=>{if(active)setError(reason);});return()=>{active=false;};},[path,version]);
  return <div className={styles.overlay}>{server?<AssessmentForm key={`${target.kind}:${target.id}`} target={target} server={server} path={path} onServer={setServer} onClose={onClose} onSaved={onSaved}/>:<div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Настройки оценивания">{error?<RequestError error={error} onRetry={()=>setVersion(value=>value+1)}/>:<LoadingState>Загружаем правила оценивания…</LoadingState>}<button onClick={onClose}>Закрыть</button></div>}</div>;
}
function AssessmentForm({target,server,path,onServer,onClose,onSaved}:{target:AssessmentTarget;server:Assessment;path:string;onServer:(value:Assessment)=>void;onClose:()=>void;onSaved:()=>void}){
  const {revision,...values}=server;
  const [form,setForm,clearForm]=useDurableState(`assessment:${target.kind}:${target.id}`,{...values,expected_revision:revision});
  const [busy,setBusy]=useState(false);const [error,setError]=useState<unknown>(null);const dialog=useRef<HTMLDivElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.focus();return()=>previous?.focus();},[]);
  const criteriaTotal=form.criteria.reduce((sum,item)=>sum+Number(item.max_points||0),0);
  const conflict=form.expected_revision!==server.revision;
  function criteria(next:Criterion[]){setForm({...form,criteria:next,max_points:next.length?next.reduce((sum,item)=>sum+Number(item.max_points||0),0):form.max_points});}
  async function save(){
    if(busy)return;setBusy(true);setError(null);
    try{
      if(form.question_type==='single'&&form.correct_answers.length!==1)throw new Error('Выберите один правильный ответ.');
      if(form.question_type==='multiple'&&!form.correct_answers.length)throw new Error('Выберите правильные ответы.');
      if(form.question_type==='open'&&!form.criteria.length)throw new Error('Добавьте хотя бы один критерий оценивания.');
      if(form.criteria.length&&Math.abs(criteriaTotal-form.max_points)>0.0001)throw new Error('Сумма баллов по критериям должна совпадать с максимальным баллом.');
      await api.put<Assessment>(path,form);clearForm(form);onSaved();
    }catch(reason){setError(reason);if(reason instanceof ApiError&&reason.status===409){try{onServer((await api.get<Assessment>(path)).data);}catch{/* Keep the original conflict and local criteria. */}}}finally{setBusy(false);}
  }
  return <div ref={dialog} tabIndex={-1} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="assessment-title" onKeyDown={event=>{
    if(event.key==='Escape'&&!busy)onClose();
    if(event.key==='Tab'){const list=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')??[]);if(event.shiftKey&&(document.activeElement===list[0]||document.activeElement===dialog.current)){event.preventDefault();list.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===list.at(-1)){event.preventDefault();list[0]?.focus();}}
  }}><h2 id="assessment-title">Оценивание: {target.title}</h2><DraftNotice/>{!!error&&<RequestError error={error}/>}
    {conflict&&<section className="request-state"><h3>Правила изменены в другой вкладке</h3><details><summary>Правила на сервере</summary><p>{labels[server.question_type]} · {modes[server.grading_mode]} · {server.max_points} баллов</p><p>Правильные ответы: {server.correct_answers.join(', ')||'нет ключа'}</p><ul>{server.criteria.map(item=><li key={item.id}>{item.title} — {item.max_points}: {item.description}</li>)}</ul></details><button disabled={busy} onClick={()=>setForm({...form,expected_revision:server.revision})}>Сохранить мои правила вместо этой версии</button><button disabled={busy} onClick={()=>setForm({...values,expected_revision:server.revision})}>Взять правила сервера</button></section>}
    <form onSubmit={event=>{event.preventDefault();void save();}}><label>Тип ответа<select disabled={busy||target.kind==='task'} value={form.question_type} onChange={event=>{const type=event.target.value as Assessment['question_type'];setForm({...form,question_type:type,correct_answers:type==='open'?[]:type==='single'?form.correct_answers.slice(0,1):form.correct_answers,grading_mode:type==='open'?'manual':'automatic'});}}>{Object.entries(labels).map(([value,title])=><option key={value} value={value}>{title}</option>)}</select></label>
      {form.question_type!=='open'&&<fieldset><legend>Правильные ответы</legend>{target.answers.length?target.answers.map((answer,index)=><label key={index}><input type={form.question_type==='single'?'radio':'checkbox'} name="correct" checked={form.correct_answers.includes(answer)} disabled={busy} onChange={event=>setForm({...form,correct_answers:form.question_type==='single'?[answer]:event.target.checked?[...form.correct_answers,answer]:form.correct_answers.filter(item=>item!==answer)})}/>{answer}</label>):<p>Сначала добавьте варианты ответа в редакторе вопроса.</p>}</fieldset>}
      <label>Способ проверки<select value={form.grading_mode} disabled={busy} onChange={event=>setForm({...form,grading_mode:event.target.value as Assessment['grading_mode']})}>{Object.entries(modes).filter(([value])=>form.question_type!=='open'||value!=='automatic').map(([value,title])=><option key={value} value={value}>{title}</option>)}</select></label>
      {form.grading_mode==='ai_assisted'&&<p>Подсказка ИИ не выставляет итоговую оценку. Проверяющий сверяет её с ответом и критериями. Возможность зависит от настроек вашей организации.</p>}
      <label>Максимальный балл<input type="number" required min={0.01} max={10000} step="any" disabled={busy||form.criteria.length>0} value={form.max_points} onChange={event=>setForm({...form,max_points:Number(event.target.value)})}/></label>
      <fieldset><legend>Критерии оценивания</legend>{form.criteria.map((item,index)=><section key={item.id}><label>Критерий {index+1}<input required maxLength={500} disabled={busy} value={item.title} onChange={event=>criteria(form.criteria.map(value=>value.id===item.id?{...value,title:event.target.value}:value))}/></label><label>Что должен показать ответ<textarea maxLength={5000} disabled={busy} value={item.description} onChange={event=>criteria(form.criteria.map(value=>value.id===item.id?{...value,description:event.target.value}:value))}/></label><label>Баллы за критерий<input type="number" min={0.01} max={10000} step="any" required disabled={busy} value={item.max_points} onChange={event=>criteria(form.criteria.map(value=>value.id===item.id?{...value,max_points:Number(event.target.value)}:value))}/></label><button type="button" disabled={busy} onClick={()=>criteria(form.criteria.filter(value=>value.id!==item.id))}>Убрать критерий {index+1}</button></section>)}<button type="button" disabled={busy||form.criteria.length>=100} onClick={()=>criteria([...form.criteria,{id:crypto.randomUUID(),title:'',description:'',max_points:1}])}>Добавить критерий</button>{form.criteria.length>0&&<p>Всего по критериям: {criteriaTotal} баллов</p>}</fieldset>
      <div className={styles.buttons}><button type="button" disabled={busy} onClick={onClose}>Закрыть, сохранив черновик</button><button className={styles.primary} disabled={busy||conflict}>{busy?'Сохраняем…':'Сохранить оценивание'}</button></div>
    </form></div>;
}
