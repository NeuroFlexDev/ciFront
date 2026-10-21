import {useState,type FormEvent} from 'react';
import type {AuthResponse} from './auth-context';
import type {MFAChallengeResponse} from './mfa';
import {api} from '@/shared/api';
import {errorMessage} from '@/shared/errors';
import {useLocale} from '@/i18n/useLocale';
import styles from './mfa.module.css';
export default function MFAChallengeForm({challenge,onSuccess,onCancel}:{challenge?:MFAChallengeResponse;onSuccess:(response:AuthResponse&{assignment_id?:number})=>void;onCancel:()=>void}){
  const {t}=useLocale();
  const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(event:FormEvent){
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    try{
      const {data}=await api.post<AuthResponse&{assignment_id?:number}>(challenge?'/auth/mfa/verify':'/auth/mfa/step-up',
        challenge?{challenge_token:challenge.challenge_token,code}:{code});
      setCode('');onSuccess(data);
    }catch(reason){setError(errorMessage(reason));}finally{setBusy(false);}
  }
  return <form onSubmit={submit} className={styles.form}>
    <p>{t('Введите новый шестизначный код из приложения-аутентификатора или один резервный код. Каждый код можно использовать только один раз.')}</p>
    {challenge&&<p>{t('Проверка входа действует 5 минут. Если она истекла, начните вход заново.')}</p>}
    <label>{t('Код подтверждения')}<input autoFocus autoComplete="one-time-code" name="mfa-code" required minLength={6} maxLength={64} spellCheck={false} value={code} onChange={e=>setCode(e.target.value)} disabled={busy}/></label>
    {error&&<p role="alert" className={styles.error}>{t(error)}</p>}
    <button className={styles.primary} disabled={busy}>{t(busy?'Проверяем…':'Подтвердить вход')}</button>
    <button className={styles.secondary} type="button" disabled={busy} onClick={onCancel}>{t(challenge?'Начать вход заново':'Вернуться к форме')}</button>
  </form>;
}

