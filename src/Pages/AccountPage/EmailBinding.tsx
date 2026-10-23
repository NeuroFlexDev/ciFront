import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/auth/useAuth';
import { useLocale } from '@/i18n/useLocale';
import { api, captureAuthSession, assertAuthSession } from '@/shared/api';
import type { AuthResponse } from '@/auth/auth-context';
import { errorMessage } from '@/shared/errors';
import styles from './styles.module.css';

export default function EmailBinding() {
  const { user, completeAuthentication, logout } = useAuth();
  const { t, locale } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('email_token') || '',
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (!fragment.has('email_token')) return;
    fragment.delete('email_token');
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search + (fragment.size ? '#' + fragment : ''),
    );
  }, []);
  async function requestEmail(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    const session = captureAuthSession();
    try {
      await api.post('/me/email', { email, password, locale });
      assertAuthSession(session);
      setPassword('');
      setMessage(t('Проверьте почту и откройте ссылку подтверждения. Она действует 30 минут.'));
    } catch (reason) {
      setError(t(errorMessage(reason)));
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError('');
    const session = captureAuthSession();
    try {
      const { data } = await api.post<AuthResponse>('/me/email/confirm', { token });
      assertAuthSession(session);
      if (!completeAuthentication) throw new Error(t('Обновите страницу и войдите снова.'));
      completeAuthentication(data, session);
      setToken('');
      setMessage(t('Почта подключена. Вход по логину продолжает работать.'));
    } catch (reason) {
      setError(t(errorMessage(reason)));
    } finally {
      setBusy(false);
    }
  }
  if (!user || (!user.username && !token)) return null;
  return (
    <section className={styles.card}>
      <h2>{t('Почта')}</h2>
      <p>
        {t('Аккаунт')}: <strong>{user.username || user.email}</strong>
      </p>
      {message && (
        <p className={styles.success} role='status'>
          {message}
        </p>
      )}
      {error && (
        <p className={styles.error} role='alert'>
          {error}
        </p>
      )}
      {token ? (
        <>
          <p>{t('Подтвердите подключение почты к этому аккаунту.')}</p>
          <button className={styles.primary} disabled={busy} onClick={() => void confirm()}>
            {t('Подтвердить почту')}
          </button>
          <button
            className={styles.secondary}
            disabled={busy}
            onClick={() => {
              setToken('');
              setError('');
            }}
          >
            {t('Запросить новое письмо')}
          </button>
          <p>
            <a href={'/auth#email_token=' + encodeURIComponent(token)} onClick={() => logout()}>
              {t('Войти в другой аккаунт')}
            </a>
          </p>
        </>
      ) : user.email ? (
        <p>{user.email}</p>
      ) : (
        <>
          <p>{t('Подключите почту для восстановления доступа. Ваш логин сохранится.')}</p>
          <form onSubmit={requestEmail}>
            <label>
              {t('Ваша почта')}
              <input
                type='email'
                autoComplete='email'
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              {t('Текущий пароль')}
              <input
                type='password'
                autoComplete='current-password'
                required
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className={styles.primary} disabled={busy}>
              {t('Подключить почту')}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
