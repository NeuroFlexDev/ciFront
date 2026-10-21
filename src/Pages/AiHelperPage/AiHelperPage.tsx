import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowUp,BookOpen,Check,Edit3,MessageCircle,Plus,RefreshCw,Search,Trash2,X} from 'lucide-react';
import Menu from '@/Components/Menu/Menu';
import MarkdownContent from '@/Components/MarkdownContent';
import ImageLibrary from '@/Components/ElementUi/ImageEditor/ImageLibrary';
import {RequestError,LoadingState} from '@/Components/RequestState';
import DraftNotice from '@/Components/DraftNotice';
import {api} from '@/shared/api';
import {ApiError} from '@/shared/errors';
import {useDurableState} from '@/hooks/useDurableState';
import {useReconnect} from '@/hooks/useReconnect';
import styles from './styles.module.css';

type Chat={id:number;name:string;course_id:number|null};
type Message={id:number;author:string;text:string;request_id?:string;status?:string;error_code?:string};
type Receipt={chat_id:number;request_id:string;status:string;error_code?:string;text:string};
type Draft={text:string;requestId?:string;submittedText?:string};
type Source={id:number;filename:string;document_version:number;page:number|null;section:string|null;text:string};

function SourceLink({courseId,id}:{courseId:number;id:number}) {
  const [source,setSource]=useState<Source|null>(null);const [error,setError]=useState<unknown>(null);const [open,setOpen]=useState(false);const [loading,setLoading]=useState(false);
  const show=async()=>{setOpen(true);setLoading(true);setError(null);try{setSource((await api.get<Source>(`/courses/${courseId}/sources/${id}`)).data);}catch(e){setError(e);}finally{setLoading(false);}};
  return <><button className={styles.sourceButton} onClick={()=>void show()}><BookOpen size={13}/> Источник {id}</button>{open&&<section className={styles.source} aria-label={`Фрагмент источника ${id}`}><button className={styles.icon} aria-label="Закрыть источник" onClick={()=>setOpen(false)}><X size={16}/></button>{loading&&<LoadingState/>}{!!error&&<RequestError error={error} onRetry={()=>void show()}/>} {source&&<><h3>{source.filename}</h3><small>Версия {source.document_version}{source.page?` · страница ${source.page}`:''}{source.section?` · ${source.section}`:''}</small><blockquote>{source.text}</blockquote></>}</section>}</>;
}

function ChatSession({chat,onRename,onDelete}:{chat:Chat;onRename:(name:string)=>Promise<void>;onDelete:()=>Promise<void>}) {
  const [messages,setMessages]=useState<Message[]>([]);const [error,setError]=useState<unknown>(null);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [hasOlder,setHasOlder]=useState(false);const [search,setSearch]=useState('');const [name,setName]=useState(chat.name);const [editing,setEditing]=useState(false);const [confirmDelete,setConfirmDelete]=useState(false);
  const [draft,setDraft]=useDurableState<Draft>(`chat:${chat.id}:input`,{text:''});const [receiptStatus,setReceiptStatus]=useState('');const [notice,setNotice]=useState('');const alive=useRef(true);const sending=useRef(false);const bottom=useRef<HTMLDivElement>(null);
  const load=useCallback(async()=>{setLoading(true);try{const {data}=await api.get<Message[]>(`/chat/${chat.id}/messages?limit=50&newest=true`);if(alive.current){setMessages(data);setHasOlder(data.length===50);setError(null);}}catch(e){if(alive.current)setError(e);}finally{if(alive.current)setLoading(false);}},[chat.id]);
  useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;};},[load]);
  const check=useCallback(async()=>{
    if(!draft.requestId)return;
    try{const {data}=await api.get<Receipt>(`/chat/requests/${draft.requestId}`);if(!alive.current)return;setReceiptStatus(data.status);if(data.status==='completed'){setDraft(current=>({...current,text:current.text.trim()===current.submittedText?'':current.text,requestId:undefined,submittedText:undefined}));setNotice('Ответ сохранён в истории.');await load();}}
    catch(e){if(!alive.current)return;if(e instanceof ApiError&&e.status===404)setReceiptStatus('not_received');else setError(e);}
  },[draft.requestId,load]);
  useEffect(()=>{if(!draft.requestId)return;void check();const timer=setInterval(()=>{if(receiptStatus!=='failed')void check();},5000);return()=>clearInterval(timer);},[draft.requestId,check,receiptStatus]);
  useReconnect(()=>{void load();void check();});
  useEffect(()=>{bottom.current?.scrollIntoView({block:'nearest'});},[messages.length]);
  const send=async()=>{
    if(sending.current||!draft.text.trim())return;
    if(draft.requestId&&receiptStatus!=='not_received'){await check();return;}
    const pending=draft.requestId?draft:{text:draft.text,requestId:crypto.randomUUID(),submittedText:draft.text.trim()};
    setDraft(pending);setBusy(true);sending.current=true;setError(null);setNotice('');setReceiptStatus('pending');
    try{await api.post('/chat/send',{chat_id:chat.id,text:pending.submittedText,request_id:pending.requestId});if(alive.current){setDraft(current=>({...current,text:current.text.trim()===pending.submittedText?'':current.text,requestId:undefined,submittedText:undefined}));setReceiptStatus('completed');await load();}}
    catch(e){if(alive.current){setError(e);setNotice('Ваш вопрос сохранён. Проверяем, получил ли сервер запрос.');}}
    finally{sending.current=false;if(alive.current)setBusy(false);}
  };
  const older=async()=>{setLoading(true);try{const {data}=await api.get<Message[]>(`/chat/${chat.id}/messages?limit=50&newest=true&offset=${messages.length}`);setMessages(previous=>[...data,...previous]);setHasOlder(data.length===50);}catch(e){setError(e);}finally{setLoading(false);}};
  const selected=messages.filter(message=>!search.trim()||message.text.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <section className={styles.session} aria-label="Диалог с помощником">
    <header className={styles.chatHeader}>{editing?<form onSubmit={e=>{e.preventDefault();void onRename(name).then(()=>setEditing(false)).catch(setError);}}><input aria-label="Название диалога" maxLength={255} value={name} onChange={e=>setName(e.target.value)}/><button className={styles.icon} aria-label="Сохранить название" disabled={!name.trim()}><Check size={17}/></button></form>:<h2>{chat.name}</h2>}<div className={styles.actions}><button className={styles.icon} aria-label="Переименовать диалог" onClick={()=>setEditing(v=>!v)}><Edit3 size={17}/></button><button className={styles.icon} aria-label="Удалить диалог" onClick={()=>setConfirmDelete(v=>!v)}><Trash2 size={17}/></button></div></header>
    {confirmDelete&&<div className={styles.notice}><p>Удалить диалог из вашей истории? Несохранённый текст останется в локальном черновике.</p><button className={styles.secondary} onClick={()=>void onDelete().catch(setError)}>Удалить диалог</button> <button className={styles.secondary} onClick={()=>setConfirmDelete(false)}>Отмена</button></div>}
    <div className={styles.context}>{chat.course_id?<><BookOpen size={16}/><Link to={`/courses/${chat.course_id}/edit`}>Материалы курса №{chat.course_id}</Link><span>Ответы опираются на обработанные источники курса.</span></>:<><MessageCircle size={16}/><span>Общий диалог. Чтобы работать по источникам, откройте помощника из мастера курса.</span></>}</div>
    <label className={styles.search}><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск в загруженной истории" aria-label="Поиск сообщений"/></label>
    {!!error&&<RequestError error={error} onRetry={()=>{void load();void check();}}/>}
    <div className={styles.messages} aria-live="polite">
      {hasOlder&&<button className={styles.secondary} disabled={loading} onClick={()=>void older()}>Загрузить предыдущие сообщения</button>}
      {loading&&<LoadingState>Загружаем историю…</LoadingState>}
      {!loading&&!messages.length&&!error&&<div className={styles.empty}><MessageCircle size={32}/><h3>С чего начнём?</h3><p>Опишите аудиторию, задачу обучения или задайте вопрос по материалам. История и черновик сохраняются.</p></div>}
      {search&&!selected.length&&!loading&&<p>В загруженных сообщениях совпадений нет.</p>}
      {selected.map(message=><article key={message.id} className={`${styles.message} ${message.author==='user'?styles.user:styles.bot}`}><strong>{message.author==='user'?'Вы':'Помощник'}</strong><MarkdownContent>{message.text}</MarkdownContent>{message.status==='pending'&&<small>Ответ готовится</small>}{message.status==='failed'&&<small>Вопрос сохранён, ответ не получен</small>}{chat.course_id&&message.author!=='user'&&<div className={styles.sources}>{Array.from(new Set(Array.from(message.text.matchAll(/\[chunk:(\d+)\]/g),match=>Number(match[1])))).map(id=><SourceLink key={id} id={id} courseId={chat.course_id!}/>)}</div>}</article>)}<div ref={bottom}/>
    </div>
    {notice&&<p className={styles.notice} role="status">{notice}</p>}
    {draft.requestId&&<div className={styles.notice} role="status">{receiptStatus==='failed'?<>Сервер сохранил вопрос, но не завершил ответ. Новая попытка может расходовать лимит AI. <button className={styles.secondary} onClick={()=>{setDraft({...draft,requestId:undefined,submittedText:undefined});setReceiptStatus('');}}>Подготовить новую попытку</button></>:receiptStatus==='not_received'?'Сервер пока не подтвердил приём. Повторная отправка использует тот же ключ.':'Запрос выполняется или его результат проверяется. Платный запрос не повторяется автоматически.'}</div>}
    <form className={styles.composer} onSubmit={e=>{e.preventDefault();void send();}}><textarea aria-label="Сообщение помощнику" placeholder="Задайте вопрос или опишите учебную задачу" value={draft.text} maxLength={12000} disabled={!!draft.requestId} onChange={e=>setDraft({...draft,text:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();void send();}}} rows={3}/><button className={styles.send} aria-label={draft.requestId?'Проверить отправку':'Отправить сообщение'} disabled={busy||!draft.text.trim()||receiptStatus==='failed'}>{draft.requestId?<RefreshCw size={21}/>:<ArrowUp size={21}/>}</button></form><p className={styles.hint}>Ctrl + Enter — отправить · черновик сохраняется на этом устройстве</p><DraftNotice/>
  </section>;
}

export default function AiHelperPage() {
  const [params]=useSearchParams();const raw=params.get('course');const courseId=raw&&/^\d+$/.test(raw)&&Number(raw)>0?Number(raw):null;
  const [chats,setChats]=useState<Chat[]>([]);const [selected,setSelected]=useDurableState<number|null>(`helper:${courseId??'all'}:selected`,null);const [offset,setOffset]=useState(0);const [error,setError]=useState<unknown>(null);const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [images,setImages]=useState(false);
  const load=useCallback(async()=>{setLoading(true);try{const {data}=await api.get<Chat[]>(`/chat/?limit=30&offset=${offset}${courseId?`&course_id=${courseId}`:''}`);setChats(data);setError(null);setSelected(value=>data.some(chat=>chat.id===value)?value:data[0]?.id??null);}catch(e){setError(e);}finally{setLoading(false);}},[courseId,offset]);
  useEffect(()=>{void load();},[load]);useReconnect(()=>void load());
  const current=chats.find(chat=>chat.id===selected);
  const create=async()=>{setBusy(true);setError(null);try{const {data}=await api.post<Chat>('/chat/',{name:courseId?`План курса №${courseId}`:'Новый диалог',course_id:courseId});setChats(previous=>[data,...previous]);setSelected(data.id);setImages(false);}catch(e){setError(e);}finally{setBusy(false);}};
  return <><Menu/><main className={styles.page}><header className={styles.heading}><div><p>РАБОЧЕЕ ПРОСТРАНСТВО</p><h1>AI-помощник</h1><p>Работайте над содержанием и проверяйте предложения по исходным материалам.</p></div>{courseId&&<Link className={styles.secondary} to={`/express?course=${courseId}`}>Вернуться к плану курса</Link>}</header><div className={styles.layout}><aside className={styles.history}><button className={styles.primary} disabled={busy} onClick={()=>void create()}><Plus size={18}/> Новый диалог</button><h2>История диалогов</h2>{loading&&<LoadingState/>}{!!error&&<RequestError error={error} onRetry={()=>void load()}/>}{!loading&&!chats.length&&!error&&<p>Диалогов пока нет. Создайте первый, чтобы обсудить материалы.</p>}<nav aria-label="История диалогов">{chats.map(chat=><button key={chat.id} aria-current={chat.id===selected?'page':undefined} onClick={()=>{setSelected(chat.id);setImages(false);}}><MessageCircle size={16}/><span>{chat.name}</span></button>)}</nav><div className={styles.actions}><button className={styles.secondary} disabled={!offset||loading} onClick={()=>setOffset(Math.max(0,offset-30))}>Назад</button><button className={styles.secondary} disabled={chats.length<30||loading} onClick={()=>setOffset(offset+30)}>Далее</button></div>{courseId&&<button className={styles.secondary} onClick={()=>setImages(v=>!v)}>{images?'Вернуться в диалог':'Библиотека иллюстраций'}</button>}</aside><div className={styles.main}>{images&&courseId?<ImageLibrary key={courseId} courseId={courseId}/>:current?<ChatSession key={current.id} chat={current} onRename={async name=>{await api.patch(`/chat/${current.id}`,{name});setChats(items=>items.map(item=>item.id===current.id?{...item,name}:item));}} onDelete={async()=>{await api.delete(`/chat/${current.id}`);await load();}}/>:!loading&&<section className={styles.welcome}><MessageCircle size={44}/><h2>Помощник по вашим материалам</h2><p>Создайте диалог. Обсудите структуру курса, формулировки уроков и вопросы для проверки знаний.</p><button className={styles.primary} disabled={busy} onClick={()=>void create()}><Plus size={18}/> Начать диалог</button></section>}</div></div></main></>;
}
