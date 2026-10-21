import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { apiFetch } from '@/shared/api';
import catalog from '@/legal/catalog.json';
import styles from './styles.module.css';

export default function AuthPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, login, register } = useAuth();
  const isRegistration = params.get('mode') === 'register';
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch('/legal/catalog').then(async response => {
      if (response.ok && active) setRegistrationEnabled((await response.json()).registration_enabled === true);
    }).catch(() => { /* The submission reports availability if the catalog is unreachable. */ });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const next = params.get('next');
      const safe = next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') && !next.startsWith('/auth');
      navigate(safe ? next : '/courses', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, params]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    if (isRegistration && !accepted) { setError('Примите пользовательское соглашение.'); return; }
    setSubmitting(true);
    try {
      const credentials = {email: email.trim(), password};
      if (isRegistration) await register({...credentials, full_name: `${name.trim()} ${surname.trim()}`.trim(),
        terms_accepted: true, marketing_accepted: marketing, legal_version: catalog.version});
      else await login(credentials);
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось выполнить запрос. Попробуйте ещё раз.'); }
    finally { setSubmitting(false); }
  }
  function switchMode() {
    const next = new URLSearchParams(params);
    next.set('mode', isRegistration ? 'login' : 'register'); setParams(next);
    setPassword(''); setError(''); setAccepted(false); setMarketing(false);
  }

  return <main className={styles.page}>
    <div className={styles.shell}>
      <section className={styles.story}>
        <a className={styles.brand} href="/">ЛЕРНИУМ</a>
        <div className={styles.storyBody}><h1>{isRegistration ? 'Создайте свой первый курс' : 'Ваши идеи. Ваши курсы.'}</h1>
          <p>{isRegistration ? 'От ваших материалов — к новому учебному опыту' : 'Продолжите работу там, где остановились'}</p>
          <ol className={styles.steps}><li><span>1</span>Создайте<br/>свой аккаунт</li><li><span>2</span>Добавьте<br/>учебные материалы</li><li><span>3</span>Подготовьте<br/>и проверьте курс</li></ol>
        </div>
      </section>
      <section className={styles.card} aria-labelledby="auth-title">
        <h2 id="auth-title">{isRegistration ? 'Регистрация' : 'С возвращением'}</h2>
        {isRegistration && registrationEnabled === false ? <div className={styles.notice} role="status"><h3>Доступ по приглашению</h3><p>Регистрация в этом контуре пока закрыта. Оставьте заявку на подключение или войдите в существующий аккаунт.</p><a href="/legal/contacts/#request">Обсудить подключение ↗</a></div> :
        <form className={styles.form} onSubmit={submit}>
          {isRegistration && <div className={styles.nameRow}>
            <label>Имя <span className={styles.optional}>(необязательно)</span><input autoComplete="given-name" maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Иван" /></label>
            <label>Фамилия <span className={styles.optional}>(необязательно)</span><input autoComplete="family-name" maxLength={79} value={surname} onChange={e => setSurname(e.target.value)} placeholder="Иванов" /></label>
          </div>}
          <label>Ваша почта<input type="email" autoComplete="email" required maxLength={255} value={email} onChange={e => setEmail(e.target.value)} placeholder="example@company.ru" /></label>
          <label>{isRegistration ? 'Придумайте пароль' : 'Пароль'}<span className={styles.passwordField}><input type={visible ? 'text' : 'password'} autoComplete={isRegistration ? 'new-password' : 'current-password'} required minLength={isRegistration ? 8 : undefined} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder={isRegistration ? 'Минимум 8 символов' : 'Введите пароль'} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}>{visible ? <EyeOff size={20}/> : <Eye size={20}/>}</button></span></label>
          {isRegistration ? <p className={styles.hint}>Используйте длинный пароль, который не повторяется на других сайтах.</p> : <Link className={styles.forgot} to="/forgot-password">Не помню пароль</Link>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.submit} type="submit" disabled={submitting}>{submitting ? 'Подождите…' : isRegistration ? 'Зарегистрироваться' : 'Войти'}</button>
          {isRegistration && <div className={styles.choices}>
            <label className={styles.checkbox}><input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)}/><span>Мне есть 18 лет. Принимаю <a href="/legal/terms/" target="_blank" rel="noopener">Пользовательское соглашение</a>.</span></label>
            <p className={styles.hint}>Для работы аккаунта данные обрабатываются на основании соглашения. Подробнее — в <a href="/legal/privacy/" target="_blank" rel="noopener">политике обработки данных</a>.</p>
            <label className={styles.checkbox}><input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)}/><span>Хочу получать новости и предложения Лерниума: даю отдельное <a href="/legal/marketing-consent/" target="_blank" rel="noopener">согласие на рассылку</a>. Необязательно.</span></label>
          </div>}
        </form>}
        <p className={styles.switch}>{isRegistration ? 'Уже есть аккаунт?' : 'Впервые здесь?'} <button type="button" onClick={switchMode}>{isRegistration ? 'Войти' : 'Зарегистрироваться'}</button></p>
        <footer className={styles.footer}><a href="/legal/">Все документы</a><a href="/legal/contacts/">Помощь и контакты</a></footer>
      </section>
    </div>
  </main>;
}
