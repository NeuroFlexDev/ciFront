import {useEffect,useState,type FormEvent} from 'react';
import {useAuth} from '@/auth/useAuth';
import type {AuthResponse} from '@/auth/auth-context';
import {api,captureAuthSession,assertAuthSession,type AuthSessionStamp} from '@/shared/api';
import {errorMessage} from '@/shared/errors';
import {RequestError,LoadingState} from '@/Components/RequestState';
import {useReconnect} from '@/hooks/useReconnect';
import {useLocale} from '@/i18n/useLocale';
import styles from './styles.module.css';
import mfa from '@/auth/mfa.module.css';

type Status={enabled:boolean;enrollment_available:boolean;required_for_operator:boolean;remaining_recovery_codes:number};
type Setup={secret:string;otpauth_uri:string;enrollment_token:string;expires_at:string};
type Result=AuthResponse&{recovery_codes?:string[]};
export default function MFASettings(){
  const {t}=useLocale(),{completeAuthentication}=useAuth();
  const [status,setStatus]=useState<Status|null>(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState<unknown>(null);
  const [password,setPassword]=useState(''),[code,setCode]=useState(''),[setup,setSetup]=useState<Setup|null>(null);
  const [recovery,setRecovery]=useState<string[]>([]),[action,setAction]=useState<'replace'|'disable'|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function load(){
    setLoading(true);setLoadError(null);
    try{setStatus((await api.get<Status>('/auth/mfa/status')).data);}catch(reason){setLoadError(reason);}finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  useReconnect(()=>{void load();});
  async function perform(fn:()=>Promise<void>){
    if(busy)return;setBusy(true);setError('');setMessage('');
    try{await fn();}catch(reason){setError(errorMessage(reason));}finally{setBusy(false);}
  }
  function apply(data:Result,session:AuthSessionStamp){
    assertAuthSession(session);
    if(!completeAuthentication)throw new Error('Не удалось завершить вход. Обновите страницу и откройте вход заново.');
    completeAuthentication(data,session);setRecovery(data.recovery_codes||[]);setPassword('');setCode('');setSetup(null);setAction(null);
  }
  function start(event:FormEvent){event.preventDefault();void perform(async()=>{
    setSetup((await api.post<Setup>('/auth/mfa/enroll',{password})).data);setPassword('');
  });}
  function confirm(event:FormEvent){event.preventDefault();if(!setup)return;void perform(async()=>{
    const session=captureAuthSession();
    apply((await api.post<Result>('/auth/mfa/enroll/confirm',{enrollment_token:setup.enrollment_token,code})).data,session);
    setMessage('Двухэтапный вход подключён. Предыдущие сеансы завершены.');await load();
  });}
  function manage(event:FormEvent){event.preventDefault();if(!action)return;void perform(async()=>{
    const disable=action==='disable';
    const session=captureAuthSession();
    apply((await api.post<Result>(disable?'/auth/mfa/disable':'/auth/mfa/recovery-codes',{password,code})).data,session);
    setMessage(disable?'Двухэтапный вход отключён. Предыдущие сеансы завершены.':'Новые резервные коды выпущены. Старые больше не действуют.');await load();
  });}
  function download(){
    const blob=new Blob(['Lernium — '+t('Резервные коды')+'\n\n'+recovery.join('\n')+'\n'],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download='lernium-recovery-codes.txt';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className={styles.card+' '+mfa.panel} aria-labelledby="mfa-settings-title">
    <h2 id="mfa-settings-title">{t('Двухэтапный вход')}</h2>
    <p>{t('После пароля или корпоративного входа потребуется код из приложения-аутентификатора. Резервные коды помогут войти при потере устройства.')}</p>
    {loading&&<LoadingState>{t('Проверяем защиту аккаунта…')}</LoadingState>}
    {!!loadError&&<RequestError error={loadError} onRetry={()=>void load()} retrying={loading}/>}
    {message&&<p role="status" className={styles.success}>{t(message)}</p>}
    {error&&<p role="alert" className={styles.error}>{t(error)}</p>}
    {!!recovery.length&&<div>
      <h3>{t('Сохраните резервные коды')}</h3>
      <p>{t('Эти коды показываются один раз. Храните их отдельно от устройства с аутентификатором. Каждый код даёт один вход. Не отправляйте коды в поддержку.')}</p>
      <pre className={mfa.secrets}>{recovery.join('\n')}</pre>
      <div className={mfa.actions}><button className={styles.primary} onClick={download}>{t('Скачать резервные коды')}</button><button className={styles.secondary} onClick={()=>setRecovery([])}>{t('Я сохранил коды — скрыть')}</button></div>
    </div>}
    {status&&!loading&&!loadError&&<>
      <p><strong>{t(status.enabled?'Двухэтапный вход включён':'Двухэтапный вход пока выключен')}</strong></p>
      {status.required_for_operator&&<p>{t('Для действий оператора требуется двухэтапный вход. Отключение запрещено политикой контура.')}</p>}
      {!status.enabled&&!status.enrollment_available&&<p role="status">{t('Оператор ещё не настроил защищённое хранение ключей. Подключение станет доступно после настройки.')}</p>}
      {!status.enabled&&status.enrollment_available&&!setup&&<form onSubmit={start}>
        <label>{t('Текущий пароль')}<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
        <button className={styles.primary} disabled={busy}>{t(busy?'Подождите…':'Подключить приложение-аутентификатор')}</button>
      </form>}
      {setup&&<form onSubmit={confirm}>
        <ol><li>{t('Добавьте аккаунт в приложение-аутентификатор: название Lernium, тип — по времени (TOTP), 6 цифр, период 30 секунд.')}</li><li>{t('Введите этот секрет вручную либо откройте ссылку на том же устройстве.')}</li></ol>
        <code className={mfa.secrets}>{setup.secret}</code>
        <a href={setup.otpauth_uri}>{t('Открыть в приложении-аутентификаторе ↗')}</a>
        <p>{t('Завершите настройку за 10 минут. До подтверждения кодом двухэтапный вход не включён.')}</p>
        <label>{t('Код из приложения')}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6} value={code} onChange={e=>setCode(e.target.value)} disabled={busy}/></label>
        <button className={styles.primary} disabled={busy}>{t('Подтвердить подключение')}</button>
        <button type="button" className={styles.secondary} disabled={busy} onClick={()=>{setSetup(null);setCode('');setError('');}}>{t('Отменить настройку')}</button>
      </form>}
      {status.enabled&&<>
        <p>{t('Осталось резервных кодов: {count}',{count:status.remaining_recovery_codes})}</p>
        {!action&&<div className={mfa.actions}>
          <button className={styles.secondary} disabled={busy||!!recovery.length} onClick={()=>{setAction('replace');setError('');setMessage('');}}>{t('Выпустить новые резервные коды')}</button>
          <button className={styles.secondary} disabled={busy||status.required_for_operator||!!recovery.length} onClick={()=>{setAction('disable');setError('');setMessage('');}}>{t('Отключить двухэтапный вход')}</button>
        </div>}
        {action&&<form onSubmit={manage}>
          <h3>{t(action==='disable'?'Отключить двухэтапный вход':'Заменить резервные коды')}</h3>
          <p>{t(action==='disable'?'Следующий вход будет возможен без второго фактора. Подтвердите отключение паролем и новым кодом.':'Все предыдущие резервные коды перестанут действовать. Подтвердите замену паролем и новым кодом.')}</p>
          <label>{t('Текущий пароль')}<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>
          <label>{t('Код подтверждения')}<input autoComplete="one-time-code" required minLength={6} maxLength={64} value={code} onChange={e=>setCode(e.target.value)} disabled={busy}/></label>
          <button className={styles.primary} disabled={busy}>{t(action==='disable'?'Подтвердить отключение':'Заменить коды')}</button>
          <button type="button" className={styles.secondary} disabled={busy} onClick={()=>{setAction(null);setCode('');setPassword('');setError('');}}>{t('Отмена')}</button>
        </form>}
      </>}
    </>}
  </section>;
}

