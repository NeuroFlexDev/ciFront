import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/shared/api';
import styles from '../AuthPage/styles.module.css';

export default function AccessPage({reset=false}:{reset?:boolean}) {
  const [token] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    if(value) window.history.replaceState(null,'',window.location.pathname);
    return value;
  });
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [confirm,setConfirm] = useState('');
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function submit(event:FormEvent) {
    event.preventDefault();setError('');
    if(reset&&password!==confirm){setError('Пароли не совпадают.');return;}
    setBusy(true);
    try {
      const {data} = await api.post<{message:string}>(reset?'/auth/password-reset/confirm':'/auth/password-reset',reset?{token,new_password:password}:{email});
      setMessage(data.message);setPassword('');setConfirm('');
    }catch(err){setError(err instanceof Error?err.message:'Не удалось отправить запрос.');}
    finally{setBusy(false);}
  }
  return <main className={styles.page}><div className={styles.shell}><section className={styles.story}><a href="/" className={styles.brand}>ЛЕРНИУМ</a><div className={styles.storyBody}><h1>Вернитесь<br/>к своим идеям</h1><p>Восстановите доступ и продолжите работу с курсами.</p></div></section><section className={styles.card}><h2>{reset?'Новый пароль':'Восстановить доступ'}</h2>
    {reset&&!token?<div className={styles.notice}><h3>Ссылка недействительна</h3><p>Откройте ссылку из письма или запросите новую.</p><Link to="/forgot-password">Получить новую ссылку</Link></div>:message?<div className={styles.notice} role="status"><h3>{reset?'Пароль изменён':'Проверьте почту'}</h3><p>{message}</p>{!reset&&<p>Ссылка действует 30 минут. Проверьте папку «Спам». Если письмо не пришло, запросите новую ссылку позднее.</p>}<Link to="/auth">Перейти ко входу ↗</Link></div>:<form className={styles.form} onSubmit={submit}>
      {reset?<><label>Новый пароль<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Минимум 12 символов"/></label><label>Повторите пароль<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label></>:<label>Почта вашего аккаунта<input type="email" autoComplete="email" maxLength={255} required value={email} onChange={e=>setEmail(e.target.value)} placeholder="example@company.ru"/></label>}
      {error&&<p className={styles.error} role="alert">{error}</p>}<button className={styles.submit} disabled={busy}>{busy?'Подождите…':reset?'Сохранить пароль':'Получить ссылку'}</button></form>}
    <footer className={styles.footer}><Link to="/auth">Вернуться ко входу</Link><a href="/legal/contacts/">Нужна помощь</a></footer>
  </section></div></main>;
}
