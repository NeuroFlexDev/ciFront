import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FileText, Search } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useLocale } from '@/i18n/useLocale';
import { api } from '@/shared/api';
import { useDurableState } from '@/hooks/useDurableState';
import { Shell, styles } from '@/Pages/Workspace/shared';
import Dialog from '@/Components/Admin/AdminDialog';
import { RequestError } from '@/Components/RequestState';
import catalog from '@/legal/catalog.json';
import s from './help.module.css';

const questions = [
  {
    title: 'Как добавить сотрудника без почты?',
    answer:
      'Откройте «Команда», нажмите «Добавить сотрудника» и выберите «По логину и паролю». Введите имя, логин и пароль. Сотрудник сможет подключить свою почту в личном профиле.',
    role: 'manager',
    href: '/company?tab=employees',
  },
  {
    title: 'Почему не пришло приглашение?',
    answer:
      'Проверьте адрес получателя и папку «Спам». Действующую ссылку приглашения можно передать лично. Если ссылка истекла, попросите ответственного за обучение создать новое приглашение.',
    role: 'all',
    href: '/account',
  },
  {
    title: 'Как назначить обучение группе?',
    answer:
      'Откройте «Назначения», выберите опубликованный курс, группу и срок прохождения. Проверьте список участников перед подтверждением.',
    role: 'manager',
    href: '/assignments',
  },
  {
    title: 'Как создать регламент из документов?',
    answer:
      'Откройте должность, добавьте регламент и загрузите исходные документы. Уточните настройки, проверьте план и запустите генерацию. Проверьте содержание перед публикацией.',
    role: 'author',
    href: '/company?tab=positions',
  },
  {
    title: 'Как продолжить обучение?',
    answer:
      'В разделе «Обучение» откройте назначенный курс и нажмите «Продолжить». Сохранённый прогресс доступен после входа в тот же аккаунт.',
    role: 'learner',
    href: '/learning',
  },
  {
    title: 'Где посмотреть результат задания?',
    answer:
      'Откройте «Результаты». Автоматически проверяемые ответы появятся после отправки, а открытые вопросы и практические задания — после проверки наставником.',
    role: 'learner',
    href: '/results',
  },
  {
    title: 'Что делать, если закончился лимит генераций?',
    answer:
      'Владелец компании может проверить условия и доступные лимиты в разделе «Тариф и оплата». Если нужна помощь с увеличением лимита, отправьте обращение в поддержку.',
    role: 'author',
    href: '/billing',
  },
];

export default function HelpPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reference, setReference] = useState('');
  const [draft, setDraft, clearDraft] = useDurableState('support-request', {
    subject: '',
    category: 'Доступ и вход',
    message: '',
    email: user?.email ?? '',
  });
  const visible = questions.filter(
    (item) =>
      (role === 'all' || item.role === 'all' || item.role === role) &&
      t(item.title).toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ reference: string }>('/legal/requests', {
        purpose: 'support',
        name: user?.full_name ?? '',
        email: draft.email,
        message: `${draft.category}\n${draft.subject.trim()}\n\n${draft.message.trim()}`,
        legal_version: catalog.version,
        consent: false,
      });
      setReference(data.reference);
      setOpen(false);
      const reset = { subject: '', category: 'Доступ и вход', message: '', email: draft.email };
      setDraft(reset);
      clearDraft(reset);
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell
      title={t('Помощь')}
      description={t('Инструкции, ответы на частые вопросы и связь с поддержкой Лерниума')}
    >
      <label className={s.search}>
        <Search size={22} />
        <input
          aria-label={t('Поиск по вопросам')}
          placeholder={t('Например: как назначить курс группе')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <nav className={s.filters} aria-label={t('Материалы для роли')}>
        <span>{t('Материалы для роли:')}</span>
        {[
          ['all', 'Все'],
          ['manager', 'Руководитель'],
          ['author', 'Автор курсов'],
          ['learner', 'Участник'],
        ].map(([key, label]) => (
          <button key={key} aria-pressed={role === key} onClick={() => setRole(key)}>
            {t(label)}
          </button>
        ))}
      </nav>
      <div className={s.layout}>
        <div className={s.stack}>
          <section className={s.panel}>
            <h2>{t('Частые вопросы')}</h2>
            {visible.map((question) => (
              <details className={s.question} key={question.title}>
                <summary>
                  {t(question.title)}
                  <ArrowUpRight size={20} />
                </summary>
                <p>{t(question.answer)}</p>
                <Link to={question.href}>{t('Открыть раздел')} →</Link>
              </details>
            ))}
            {!visible.length && (
              <p>{t('По этому запросу ничего не найдено. Попробуйте другие слова.')}</p>
            )}
          </section>
          <section className={s.panel}>
            <h2>{t('Инструкции')}</h2>
            {user?.organization_kind === 'business' && (
              <button
                className={styles.secondary}
                onClick={() => window.dispatchEvent(new Event('lernium-tour-start'))}
              >
                {t('Знакомство с платформой')}
              </button>
            )}
            <div className={s.guides}>
              {[
                [
                  'Обучение и задания',
                  '/learning',
                  'Ваши материалы, задания и сохранённый прогресс',
                ],
                ['Личный профиль', '/account', 'Пароль, почта и настройки аккаунта'],
                ['Результаты', '/results', 'Проверенные ответы и комментарии наставника'],
              ].map(([title, href, text]) => (
                <Link key={href} to={href}>
                  <FileText size={24} />
                  <strong>{t(title)}</strong>
                  <span>{t(text)}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <aside className={s.stack}>
          <button
            className={styles.primary}
            onClick={() => {
              setOpen(true);
              setError(null);
            }}
          >
            {t('Написать в поддержку')}
          </button>
          <section className={s.panel}>
            <h3>{t('Связь с поддержкой')}</h3>
            <p>
              {t('Опишите, что произошло. Ответ придёт на почту, которую вы укажете в обращении.')}
            </p>
            <a href='/legal/contacts/'>{t('Контакты Лерниума')} ↗</a>
          </section>
          {reference && (
            <section className={s.panel} role='status'>
              <h3>{t('Обращение отправлено')}</h3>
              <p>{t('Сохраните номер обращения:')}</p>
              <code className={s.reference}>{reference}</code>
              <p>{t('Ответ придёт на указанную почту.')}</p>
            </section>
          )}
        </aside>
      </div>
      {open && (
        <Dialog
          title={t('Написать в поддержку')}
          onClose={() => setOpen(false)}
          busy={busy}
          guard
          className={s.dialog}
        >
          <form className={s.form} onSubmit={submit}>
            <label>
              {t('Тема')}
              <input
                required
                maxLength={160}
                value={draft.subject}
                onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
              />
            </label>
            <fieldset>
              <legend>{t('Категория')}</legend>
              <div className={s.filters}>
                {['Доступ и вход', 'Курсы и генерация', 'Оплата и тариф', 'Другое'].map(
                  (category) => (
                    <button
                      type='button'
                      key={category}
                      aria-pressed={draft.category === category}
                      onClick={() => setDraft({ ...draft, category })}
                    >
                      {t(category)}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            <label>
              {t('Описание')}
              <textarea
                required
                minLength={10}
                maxLength={4500}
                rows={5}
                value={draft.message}
                onChange={(event) => setDraft({ ...draft, message: event.target.value })}
              />
            </label>
            <label>
              {t('Почта для ответа')}
              <input
                required
                type='email'
                autoComplete='email'
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              />
            </label>
            {!!error && <RequestError error={error} />}
            <div className={s.actions}>
              <button
                type='button'
                className={styles.secondary}
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                {t('Отмена')}
              </button>
              <button className={styles.primary} disabled={busy}>
                {t(busy ? 'Отправляем…' : 'Отправить')}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </Shell>
  );
}
