import AuthStory from '../AuthPage/AuthStory';
import { useLocale } from '@/i18n/useLocale';
import LanguageSwitch from '@/Components/LanguageSwitch';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/shared/api';
import styles from '../AuthPage/styles.module.css';

export default function AccessPage({ reset = false }: { reset?: boolean }) {
  const { t, locale } = useLocale();

  const [token] = useState(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    if (value) window.history.replaceState(null, '', window.location.pathname);
    return value;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (reset && password !== confirm) {
      setError(t('Пароли не совпадают.'));
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<{ message: string }>(
        reset ? '/auth/password-reset/confirm' : '/auth/password-reset',
        reset ? { token, new_password: password } : { email, locale },
      );
      setMessage(data.message);
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Не удалось отправить запрос.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <AuthStory title={t('Создайте свой первый курс')} registration showBrand={false} />
        <section className={styles.card}>
          <LanguageSwitch />
          <h2>{reset ? t('Новый пароль') : t('Восстановить доступ')}</h2>
          {reset && !token ? (
            <div className={styles.notice}>
              <h3>{t('Ссылка недействительна')}</h3>
              <p>{t('Откройте ссылку из письма или запросите новую.')}</p>
              <Link to='/forgot-password'>{t('Получить новую ссылку')}</Link>
            </div>
          ) : message ? (
            <div className={styles.notice} role='status'>
              <h3>{reset ? t('Пароль изменён') : t('Проверьте почту')}</h3>
              <p>{t(message)}</p>
              {!reset && (
                <p>
                  {t(
                    'Ссылка действует 30 минут. Проверьте папку «Спам». Если письмо не пришло, запросите новую ссылку позднее.',
                  )}
                </p>
              )}
              <Link to='/auth'>{t('Перейти ко входу ↗')}</Link>
            </div>
          ) : (
            <form className={styles.form} onSubmit={submit}>
              {reset ? (
                <>
                  <label>
                    {t('Новый пароль')}
                    <input
                      disabled={busy}
                      type='password'
                      autoComplete='new-password'
                      minLength={12}
                      maxLength={128}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('Минимум 12 символов')}
                    />
                  </label>
                  <label>
                    {t('Повторите пароль')}
                    <input
                      disabled={busy}
                      type='password'
                      autoComplete='new-password'
                      minLength={12}
                      maxLength={128}
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </label>
                </>
              ) : (
                <label>
                  {t('Почта вашего аккаунта')}
                  <input
                    disabled={busy}
                    type='email'
                    autoComplete='email'
                    maxLength={255}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='example@company.ru'
                  />
                </label>
              )}
              {error && (
                <p className={styles.error} role='alert'>
                  {error}
                </p>
              )}
              <button className={styles.submit} disabled={busy}>
                {busy ? t('Подождите…') : reset ? t('Сохранить пароль') : t('Получить ссылку')}
              </button>
            </form>
          )}
          {!reset && (
            <p className={styles.hint}>
              {t(
                'Входите по логину и ещё не подключили почту? Попросите руководителя задать новый пароль в карточке сотрудника.',
              )}
            </p>
          )}
          <footer className={styles.footer}>
            <Link to='/auth'>{t('Вернуться ко входу')}</Link>
            <a href='/legal/contacts/'>{t('Нужна помощь')}</a>
          </footer>
        </section>
      </div>
    </main>
  );
}
