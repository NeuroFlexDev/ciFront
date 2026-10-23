import { useLocale } from '@/i18n/useLocale';
import { useAuth } from '@/auth/useAuth';
import type { AuthResponse } from '@/auth/auth-context';
import LanguageSwitch from '@/Components/LanguageSwitch';
import { RequestError } from '@/Components/RequestState';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, setAuthToken, captureAuthSession, assertAuthSession } from '@/shared/api';
import catalog from '@/legal/catalog.json';
import styles from '@/Pages/Workspace/workspace.module.css';
import { errorText } from '@/Pages/Workspace/shared';
type Preview = {
  email: string;
  organization_name: string;
  role: string;
  existing_account: boolean;
};
export default function InvitePage() {
  const { t } = useLocale();

  const auth = useAuth();
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') || '',
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inspectError, setInspectError] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    window.history.replaceState(null, '', window.location.pathname);
    if (!token) {
      setError(t('Откройте полную ссылку из приглашения.'));
      return;
    }
    let active = true;
    setInspectError(null);
    api
      .post<Preview>('/auth/invitations/inspect', { token })
      .then((r) => {
        if (active) setPreview(r.data);
      })
      .catch((e) => {
        if (active) setInspectError(e);
      });
    return () => {
      active = false;
    };
  }, [token, t, retry]);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const session=captureAuthSession();
    api
      .post<AuthResponse>(
        preview?.existing_account
          ? '/auth/invitations/accept-existing'
          : '/auth/invitations/accept',
        preview?.existing_account
          ? { token }
          : {
              token,
              full_name: name,
              password,
              terms_accepted: accepted,
              marketing_accepted: marketing,
              legal_version: catalog.version,
            },
      )
      .then((r) => {
        assertAuthSession(session);
        if (auth.completeAuthentication) auth.completeAuthentication(r.data,session);
        else setAuthToken(r.data.access_token,session);
        window.location.replace('/dashboard');
      })
      .catch((e) => setError(errorText(e)))
      .finally(() => setBusy(false));
  }
  async function signIn(e: FormEvent) {
    e.preventDefault();
    if (busy || !preview) return;
    setBusy(true);
    setError('');
    try {
      await auth.login({ email: preview.email, password });
      setPassword('');
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.page} style={{ maxWidth: 740, paddingTop: 45 }}>
      <a href='/' style={{ fontSize: 28, fontWeight: 800, textDecoration: 'none' }}>
        {t('ЛЕРНИУМ')}
      </a>
      <LanguageSwitch />
      <section className={styles.panel}>
        <h1>{t('Присоединиться к команде')}</h1>
        {error && (
          <p className={styles.error} role='alert'>
            {error}
          </p>
        )}
        {!preview && inspectError != null && (
          <RequestError error={inspectError} onRetry={() => setRetry((value) => value + 1)} />
        )}
        {!preview && !error && !inspectError && <p>{t('Проверяем приглашение…')}</p>}
        {preview && (
          <>
            <h2>{preview.organization_name}</h2>
            <p>
              {preview.email} ·{' '}
              {(
                {
                  owner: t('Владелец организации'),
                  admin: t('Администратор'),
                  author: t('Автор'),
                  reviewer: t('Проверяющий'),
                  manager: t('Руководитель'),
                  member: t('Участник'),
                } as Record<string, string>
              )[preview.role] ?? preview.role}
            </p>
            {preview.existing_account ? (
              <section>
                <p>
                  {t(
                    'У вас уже есть аккаунт. Присоединение сохранит ваш пароль и существующие материалы.',
                  )}
                </p>
                {auth.user?.email?.toLowerCase() === preview.email.toLowerCase() ? (
                  <form onSubmit={submit}>
                    <p>{t('Вы вошли под адресом приглашения.')}</p>
                    <button className={styles.primary} disabled={busy}>
                      {busy ? t('Подключаем…') : t('Присоединиться к организации')}
                    </button>
                  </form>
                ) : auth.user ? (
                  <>
                    <p>
                      {t(
                        'Сейчас открыт другой аккаунт. Выйдите из него и войдите под адресом приглашения.',
                      )}
                    </p>
                    <button className={styles.secondary} disabled={busy} onClick={auth.logout}>
                      {t('Выйти из другого аккаунта')}
                    </button>
                  </>
                ) : (
                  <form onSubmit={signIn}>
                    <label>
                      {t('Пароль существующего аккаунта')}
                      <input
                        type='password'
                        required
                        maxLength={128}
                        autoComplete='current-password'
                        disabled={busy}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </label>
                    <p>
                      <Link to='/forgot-password'>{t('Не помню пароль')}</Link>
                    </p>
                    <button className={styles.primary} disabled={busy}>
                      {busy ? t('Подождите…') : t('Войти для принятия приглашения')}
                    </button>
                  </form>
                )}
              </section>
            ) : (
              <form onSubmit={submit} style={{ display: 'grid', gap: 20 }}>
                <label>
                  {t('Имя и фамилия')}
                  <input
                    disabled={busy}
                    required
                    maxLength={160}
                    autoComplete='name'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  {t('Придумайте пароль')}
                  <input
                    disabled={busy}
                    required
                    type='password'
                    minLength={12}
                    maxLength={128}
                    autoComplete='new-password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <p>{t('Минимум 12 символов. Используйте отдельный пароль для Лерниума.')}</p>
                <label className={styles.check}>
                  <input
                    disabled={busy}
                    type='checkbox'
                    required
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                  />
                  <span>
                    {t('Мне есть 18 лет. Принимаю') + ' '}
                    <a href='/legal/terms/' target='_blank' rel='noopener'>
                      {t('пользовательское соглашение')}
                    </a>
                    .
                  </span>
                </label>
                <p>
                  {t('Обработка данных описана в') + ' '}
                  <a href='/legal/privacy/' target='_blank' rel='noopener'>
                    {t('политике')}
                  </a>
                  .
                </p>
                <label className={styles.check}>
                  <input
                    disabled={busy}
                    type='checkbox'
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                  />
                  <span>
                    {t('Хочу получать новости: даю отдельное') + ' '}
                    <a href='/legal/marketing-consent/' target='_blank' rel='noopener'>
                      {t('согласие на рассылку')}
                    </a>
                    {t('. Необязательно.')}
                  </span>
                </label>
                <button className={styles.primary} disabled={busy || !accepted}>
                  {busy ? t('Создаём аккаунт…') : t('Принять приглашение')}
                </button>
              </form>
            )}
          </>
        )}
        <p style={{ marginTop: 24 }}>
          <Link to='/auth'>{t('Уже есть аккаунт? Войти')}</Link>
        </p>
      </section>
    </main>
  );
}
