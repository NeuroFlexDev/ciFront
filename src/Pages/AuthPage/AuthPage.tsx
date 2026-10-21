import {useLocale} from '@/i18n/useLocale';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { api, apiFetch, apiUrl } from '@/shared/api';
import type { AuthResponse } from '@/auth/auth-context';
import catalog from '@/legal/catalog.json';
import styles from './styles.module.css';
export default function AuthPage() {
    const { t } = useLocale();
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const auth = useAuth() as ReturnType<typeof useAuth> & {
        completeAuthentication?: (response: AuthResponse) => void;
    };
    const { user, isAuthenticated, isLoading, login, register } = auth;
    const ssoFragment = useRef(new URLSearchParams(window.location.hash.slice(1)));
    const ssoStarted = useRef(false);
    const [ssoHandled, setSsoHandled] = useState(() => ['sso_code', 'lti_code', 'sso_error'].some(key => ssoFragment.current.has(key)));
    const [ssoPending, setSsoPending] = useState(() => ['sso_code', 'lti_code'].some(key => ssoFragment.current.has(key)));
    const completeAuthentication = useRef(auth.completeAuthentication);
    completeAuthentication.current = auth.completeAuthentication;
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
        if (ssoStarted.current)
            return;
        ssoStarted.current = true;
        const fragment = ssoFragment.current;
        const failure = fragment.get('sso_error');
        const lti = fragment.has('lti_code');
        const code = fragment.get(lti ? 'lti_code' : 'sso_code');
        const state = fragment.get(lti ? 'lti_state' : 'sso_state');
        if (!failure && !code)
            return;
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
        ssoFragment.current = new URLSearchParams();
        if (failure) {
            setError(failure);
            setSsoPending(false);
            return;
        }
        if (!state || !code) {
            setError(t("Ссылка входа неполная. Откройте вход из вашей организации или LMS заново."));
            setSsoPending(false);
            return;
        }
        void api.post<AuthResponse & {
            assignment_id?: number;
        }>(lti ? '/lti/exchange' : '/auth/oidc/exchange', { code, state }).then(({ data }) => {
            if (!completeAuthentication.current)
                throw new Error(t("Не удалось завершить вход. Обновите страницу и откройте вход заново."));
            completeAuthentication.current(data);
            navigate(data.assignment_id ? `/learning/${data.assignment_id}` : data.user.is_admin ? '/admin' : '/dashboard', { replace: true });
        }).catch(reason => { setError(t("{value0} Повторите вход из корпоративного сервиса или LMS; ваши материалы и ответы сохранены.", { value0: reason instanceof Error ? reason.message : t("Не удалось завершить вход.") })); }).finally(() => setSsoPending(false));
    }, [navigate,t]);
    useEffect(() => {
        let active = true;
        void apiFetch('/legal/catalog').then(async (response) => {
            if (response.ok && active)
                setRegistrationEnabled((await response.json()).registration_enabled === true);
        }).catch(() => { });
        return () => { active = false; };
    }, []);
    useEffect(() => {
        if (!isLoading && isAuthenticated && !ssoHandled) {
            const next = params.get('next');
            const safe = next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') && !next.startsWith('/auth');
            navigate(safe ? next : user?.is_admin ? '/admin' : '/dashboard', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate, params, user?.is_admin, ssoHandled]);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        setSsoHandled(false);
        if (isRegistration && !accepted) {
            setError(t("Примите пользовательское соглашение."));
            return;
        }
        setSubmitting(true);
        try {
            const credentials = { email: email.trim(), password };
            if (isRegistration)
                await register({ ...credentials, full_name: `${name.trim()} ${surname.trim()}`.trim(),
                    terms_accepted: true, marketing_accepted: marketing, legal_version: catalog.version });
            else
                await login(credentials);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : t("Не удалось выполнить запрос. Попробуйте ещё раз."));
        }
        finally {
            setSubmitting(false);
        }
    }
    function switchMode() {
        const next = new URLSearchParams(params);
        next.set('mode', isRegistration ? 'login' : 'register');
        setParams(next);
        setPassword('');
        setError('');
        setAccepted(false);
        setMarketing(false);
    }
    return <main className={styles.page}>
    <div className={styles.shell}>
      <section className={styles.story}>
        <a className={styles.brand} href="/">{t("ЛЕРНИУМ")}</a>
        <div className={styles.storyBody}><h1>{isRegistration ? t("Создайте свой первый курс") : t("Ваши идеи. Ваши курсы.")}</h1>
          <p>{isRegistration ? t("От ваших материалов — к новому учебному опыту") : t("Продолжите работу там, где остановились")}</p>
          <ol className={styles.steps}><li><span>1</span>{t("Создайте")}<br />{t("свой аккаунт")}</li><li><span>2</span>{t("Добавьте")}<br />{t("учебные материалы")}</li><li><span>3</span>{t("Подготовьте")}<br />{t("и проверьте курс")}</li></ol>
        </div>
      </section>
      <section className={styles.card} aria-labelledby="auth-title">
        <h2 id="auth-title">{isRegistration ? t("Регистрация") : t("С возвращением")}</h2>
        {ssoPending && <p className={styles.notice} role="status">{t("Проверяем корпоративный вход…")}</p>}
        {!isRegistration && /^\d+$/.test(params.get('provider') || '') && <p><a className={styles.forgot} href={apiUrl(`/auth/oidc/${params.get('provider')}/start`)}>{t("Войти через организацию ↗")}</a></p>}
        {ssoHandled && !ssoPending && isAuthenticated && <p><Link to="/account">{t("Вернуться к своему профилю")}</Link></p>}
        {isRegistration && registrationEnabled === false ? <div className={styles.notice} role="status"><h3>{t("Доступ по приглашению")}</h3><p>{t("Регистрация в этом контуре пока закрыта. Войдите в существующий аккаунт. Для нового аккаунта откройте персональную ссылку приглашения от администратора организации.")}</p><button type="button" className={styles.submit} onClick={switchMode}>{t("Войти в аккаунт")}</button></div> :
            <form className={styles.form} onSubmit={submit}>
          {isRegistration && <div className={styles.nameRow}>
            <label>{t("Имя") + " "}<span className={styles.optional}>{t("(необязательно)")}</span><input autoComplete="given-name" maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder={t("Иван")}/></label>
            <label>{t("Фамилия") + " "}<span className={styles.optional}>{t("(необязательно)")}</span><input autoComplete="family-name" maxLength={79} value={surname} onChange={e => setSurname(e.target.value)} placeholder={t("Иванов")}/></label>
          </div>}
          <label>{t("Ваша почта")}<input type="email" autoComplete="email" required maxLength={255} value={email} onChange={e => setEmail(e.target.value)} placeholder="example@company.ru"/></label>
          <label>{isRegistration ? t("Придумайте пароль") : t("Пароль")}<span className={styles.passwordField}><input type={visible ? 'text' : 'password'} autoComplete={isRegistration ? 'new-password' : 'current-password'} required minLength={isRegistration ? 8 : undefined} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder={isRegistration ? t("Минимум 8 символов") : t("Введите пароль")}/><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? t("Скрыть пароль") : t("Показать пароль")}>{visible ? <EyeOff size={20}/> : <Eye size={20}/>}</button></span></label>
          {isRegistration ? <p className={styles.hint}>{t("Используйте длинный пароль, который не повторяется на других сайтах.")}</p> : <Link className={styles.forgot} to="/forgot-password">{t("Не помню пароль")}</Link>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.submit} type="submit" disabled={submitting || ssoPending}>{submitting ? t("Подождите…") : isRegistration ? t("Зарегистрироваться") : t("Войти")}</button>
          {isRegistration && <div className={styles.choices}>
            <label className={styles.checkbox}><input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)}/><span>{t("Мне есть 18 лет. Принимаю") + " "}<a href="/legal/terms/" target="_blank" rel="noopener">{t("Пользовательское соглашение")}</a>.</span></label>
            <p className={styles.hint}>{t("Для работы аккаунта данные обрабатываются на основании соглашения. Подробнее — в") + " "}<a href="/legal/privacy/" target="_blank" rel="noopener">{t("политике обработки данных")}</a>.</p>
            <label className={styles.checkbox}><input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)}/><span>{t("Хочу получать новости и предложения Лерниума: даю отдельное") + " "}<a href="/legal/marketing-consent/" target="_blank" rel="noopener">{t("согласие на рассылку")}</a>{t(". Необязательно.")}</span></label>
          </div>}
        </form>}
        <p className={styles.switch}>{isRegistration ? t("Уже есть аккаунт?") : t("Впервые здесь?")} <button type="button" onClick={switchMode}>{isRegistration ? t("Войти") : t("Зарегистрироваться")}</button></p>
        <footer className={styles.footer}><a href="/legal/">{t("Все документы")}</a><a href="/legal/contacts/">{t("Помощь и контакты")}</a></footer>
      </section>
    </div>
  </main>;
}
