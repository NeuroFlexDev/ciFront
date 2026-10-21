import {RequestError,LoadingState} from '@/Components/RequestState';
import {useReconnect} from '@/hooks/useReconnect';
import {useDurableState} from '@/hooks/useDurableState';
import DraftNotice from '@/Components/DraftNotice';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { api, apiFetch, setAuthToken } from '@/shared/api';
import catalog from '@/legal/catalog.json';
import styles from './styles.module.css';

type Receipt = {id:number; slug:string; version:string; action:string; created_at:string; document:{title:string; sections:{title:string; paragraphs:string[]}[]}};
export default function AccountPage() {
  const {user, logout, refreshUser} = useAuth();
  const [tab,setTab] = useState('profile');
  const [name,setName,clearName] = useDurableState('account:name',user?.full_name ?? '');
  const [oldPassword,setOldPassword] = useState('');
  const [newPassword,setNewPassword] = useState('');
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [receipts,setReceipts] = useState<Receipt[]>([]);
  const [marketing,setMarketing] = useState<boolean|null>(null);
  const [choice,setChoice] = useState(false);
  const [selected,setSelected] = useState<Receipt|null>(null);

  const [documentsError,setDocumentsError]=useState<unknown>(null);
  const [documentsLoading,setDocumentsLoading]=useState(true);
  async function loadDocuments() {
    setDocumentsLoading(true);setDocumentsError(null);
    try {
    const {data} = await api.get<{receipts:Receipt[];marketing_active:boolean}>('/legal/me/receipts');
    setReceipts(data.receipts);setMarketing(data.marketing_active);
    } catch(error){setDocumentsError(error);} finally{setDocumentsLoading(false);}
  }
  useEffect(() => { void loadDocuments(); }, []);
  useReconnect(()=>{void loadDocuments();});
  async function perform(action:() => Promise<void>) {
    setBusy(true);setMessage('');setError('');
    try {await action();} catch (err) {setError(err instanceof Error ? err.message : 'Не удалось сохранить изменения.');}
    finally {setBusy(false);}
  }
  function profile(event:FormEvent) {event.preventDefault();void perform(async () => {const savedName=name;await api.patch('/me',{full_name:savedName});clearName(savedName);await refreshUser?.();setMessage('Имя сохранено.');});}
  function password(event:FormEvent) {event.preventDefault();void perform(async () => {
    const {data} = await api.post<{access_token:string}>('/change-password',{old_password:oldPassword,new_password:newPassword});
    setAuthToken(data.access_token);setOldPassword('');setNewPassword('');setMessage('Пароль изменён. Предыдущие сеансы завершены.');
  });}
  async function changeMarketing(accepted:boolean) {
    await perform(async () => {
      const response = await apiFetch('/legal/me/marketing',{method:'PUT',body:JSON.stringify({accepted,legal_version:catalog.version})});
      if(!response.ok) {const body=await response.json();throw new Error(typeof body.detail==='string'?body.detail:'Не удалось изменить подписку.');}
      await loadDocuments();setChoice(false);setMessage(accepted?'Предпочтение сохранено.':'Согласие на рассылку отозвано.');
    });
  }
  return <main className={styles.page}>
    <header className={styles.header}><a href="/" className={styles.brand}>ЛЕРНИУМ</a><nav><Link to="/dashboard">Обзор</Link>{user?.is_admin&&<Link to="/admin">Админка</Link>}<Link to="/courses">Мои курсы</Link><Link to="/express">Создать курс</Link><a href="/legal/">Документы</a><button onClick={logout}>Выйти</button></nav></header>
    <div className={styles.container}><h1>Личный профиль</h1><p className={styles.subtitle}>Управляйте аккаунтом, безопасностью и согласиями.</p>
      <div className={styles.tabs} aria-label="Разделы профиля">{[['profile','Основные настройки'],['security','Безопасность'],['documents','Документы и согласия']].map(([id,label]) => <button key={id} className={tab===id?styles.active:''} onClick={() => {setTab(id);setMessage('');setError('');}} aria-pressed={tab===id}>{label}</button>)}</div>
      {message&&<p className={styles.success} role="status">{message}</p>}{error&&<p className={styles.error} role="alert">{error}</p>}
      {tab==='profile'&&<div className={styles.grid}><section className={styles.card}><div className={styles.identity}><div className={styles.avatar}>{(name||user?.email||'Л').slice(0,2).toUpperCase()}</div><div><h2>{name||'Ваш аккаунт'}</h2><p>{user?.email}</p><span className={styles.badge}>Личный профиль</span></div></div><hr/><h3>Данные организации</h3><p>Подключение организации и состав доступа оформляются индивидуально.</p><a href="/legal/contacts/#request">Обсудить подключение ↗</a></section>
        <section className={styles.card}><h2>Личные данные</h2><DraftNotice/><form onSubmit={profile}><label>Имя и фамилия<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} maxLength={160} minLength={1} required/></label><label>Электронная почта<input type="email" value={user?.email??''} readOnly/></label><p className={styles.muted}>Для изменения почты обратитесь в поддержку: сначала потребуется подтвердить владение аккаунтом.</p><button className={styles.primary} disabled={busy}>Сохранить изменения</button></form></section></div>}
      {tab==='security'&&<div className={styles.grid}><section className={styles.card}><h2>Изменить пароль</h2><form onSubmit={password}><label>Текущий пароль<input type="password" autoComplete="current-password" required value={oldPassword} onChange={e=>setOldPassword(e.target.value)}/></label><label>Новый пароль<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><p className={styles.muted}>Минимум 12 символов. После смены остальные сеансы завершатся.</p><button className={styles.primary} disabled={busy}>Изменить пароль</button></form></section><section className={styles.card}><h2>Сеансы и доступ</h2><p>Если вы входили на чужом устройстве, завершите все сеансы. Затем войдите снова на своём устройстве.</p><button className={styles.secondary} disabled={busy} onClick={()=>void perform(async()=>{await api.post('/auth/logout-all');logout();})}>Завершить все сеансы</button><hr/><h3>Закрыть аккаунт</h3><p>Перед закрытием сохраните нужные материалы. Отправьте запрос, чтобы мы проверили принадлежность аккаунта и обработали его данные.</p><a href="/legal/contacts/#request">Отправить запрос ↗</a></section></div>}
      {tab==='documents'&&!!documentsError&&<RequestError error={documentsError} onRetry={()=>void loadDocuments()} retrying={documentsLoading}/>}{tab==='documents'&&documentsLoading&&<LoadingState>Загружаем документы и согласия…</LoadingState>}
      {tab==='documents'&&!documentsError&&!documentsLoading&&<div className={styles.grid}><section className={styles.card}><h2>Новости и предложения</h2><p>{marketing===null?'Загружаем статус…':marketing?'Согласие на рассылку действует.':'Рекламная подписка отключена.'}</p>
        {marketing===true?<button className={styles.secondary} disabled={busy} onClick={()=>void changeMarketing(false)}>Отозвать согласие</button>:marketing===false?<><label className={styles.checkbox}><input type="checkbox" checked={choice} onChange={e=>setChoice(e.target.checked)}/><span>Хочу получать новости по почте. Даю отдельное <a href="/legal/marketing-consent/" target="_blank" rel="noopener">согласие на рассылку</a>.</span></label><button className={styles.primary} disabled={busy||!choice} onClick={()=>void changeMarketing(true)}>Сохранить выбор</button></>:null}
        <hr/><a href="/legal/">Все актуальные документы ↗</a><p className={styles.muted}>Принятие условий и подписка сохраняются раздельно. Отказ от рекламы не влияет на доступ.</p></section>
        <section className={styles.card}><h2>История принятия</h2>{receipts.length===0?<p>Для этого аккаунта записей пока нет. Старые действия не отмечаются как принятые задним числом.</p>:<ul className={styles.receipts}>{receipts.map(receipt=><li key={receipt.id}><button onClick={()=>setSelected(receipt)}>{receipt.document.title}</button><span>{receipt.action==='withdrawn'?'Отозвано':'Принято'} · {new Date(receipt.created_at.endsWith('Z')?receipt.created_at:receipt.created_at+'Z').toLocaleDateString('ru-RU')} · {receipt.version}</span></li>)}</ul>}</section></div>}
      {selected&&<section className={styles.snapshot} aria-label="Сохранённая редакция"><button className={styles.secondary} onClick={()=>setSelected(null)}>Закрыть редакцию</button><h2>{selected.document.title}</h2><p>Редакция {selected.version} · Сохранённый текст</p>{selected.document.sections.map(section=><section key={section.title}><h3>{section.title}</h3>{section.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</section>)}</section>}
      <footer className={styles.footer}><a href="/legal/privacy/">Политика обработки данных</a><a href="/legal/contacts/">Помощь и контакты</a><a href="/legal/cookies/">Данные браузера</a></footer>
    </div>
  </main>;
}
