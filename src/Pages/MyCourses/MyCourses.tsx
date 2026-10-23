import { useAuth } from '@/auth/useAuth';
import { isBusiness } from '@/shared/business';
import businessCss from '../Business/business.module.css';
import { ArrowUpRight, Network } from 'lucide-react';
import cs from './myCourses.module.css';
import { useLocale } from '@/i18n/useLocale';
import { RequestError, LoadingState } from '@/Components/RequestState';
import { useReconnect } from '@/hooks/useReconnect';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/shared/api';
import { Shell, styles } from '@/Pages/Workspace/shared';
type Course = {
  id: number;
  title: string | null;
  description?: string | null;
  publication_status: string;
  module_count: number;
  lesson_count: number;
};
export default function MyCoursesPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const business = isBusiness(user);

  const [courses, setCourses] = useState<Course[]>([]);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState('');
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  useReconnect(() => setVersion((v) => v + 1));
  useEffect(() => {
    let stopped = false;
    setLoading(true);
    api
      .get<Course[]>(
        `/courses/?limit=20&offset=${offset}${filter ? '&publication_status=' + filter : ''}`,
      )
      .then(({ data }) => {
        if (!stopped) {
          setCourses(data);
          setError(null);
        }
      })
      .catch((e) => {
        if (!stopped) setError(e);
      })
      .finally(() => {
        if (!stopped) setLoading(false);
      });
    return () => {
      stopped = true;
    };
  }, [offset, filter, version]);
  async function remove(course: Course) {
    if (
      !window.confirm(
        t(
          'Удалить курс «{v0}»? Он исчезнет из вашего списка, опубликованная версия станет недоступна.',
          { v0: course.title?.trim() || t('Черновик №{v0}', { v0: course.id }) },
        ),
      )
    )
      return;
    setRemoving(course.id);
    setError(null);
    try {
      await api.delete(`/courses/${course.id}`);
      if (courses.length === 1 && offset > 0) setOffset((n) => n - 20);
      else setVersion((n) => n + 1);
    } catch (e) {
      setError(e);
    } finally {
      setRemoving(null);
    }
  }
  return (
    <Shell
      className={business ? businessCss.workspace : ''}
      title={t(business ? 'Регламенты' : 'Мои курсы')}
      description={business ? undefined : t('Ваши материалы, черновики и опубликованные курсы.')}
      action={
        <Link className={styles.primary} to={business ? '/company?tab=positions' : '/express'}>
          {t(business ? 'Добавить регламент' : 'Создать курс +')}
        </Link>
      }
    >
      <div className={styles.tabs} aria-label={t('Фильтр курсов')}>
        {[
          ['', t('Все курсы')],
          ['draft', t('Черновики')],
          ['published', t('Опубликованные')],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={filter === value}
            aria-selected={filter === value}
            onClick={() => {
              setFilter(value);
              setOffset(0);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {!!error && <RequestError error={error} onRetry={() => setVersion((v) => v + 1)} />}
      {loading && <LoadingState>{t('Загружаем курсы…')}</LoadingState>}
      {!loading && !courses.length && !error && (
        <section className={styles.empty}>
          <h2>{filter ? t('В этом разделе пока пусто') : t('Создайте первый курс')}</h2>
          <p>
            {t(
              business
                ? 'Создайте должность, чтобы собрать для неё регламенты и добавить сотрудников.'
                : 'Начните со своих документов или выберите готовый сценарий настройки.',
            )}
          </p>
          <Link className={styles.primary} to={business ? '/company?tab=positions' : '/templates'}>
            {t(business ? 'Открыть должности' : 'Выбрать сценарий')}
          </Link>
        </section>
      )}
      {!loading && (
        <div className={cs.grid}>
          {courses.map((c) => {
            const href = c.lesson_count ? `/courses/${c.id}/edit` : `/express?course=${c.id}`;
            const title = c.title?.trim() || t('Черновик №{v0}', { v0: c.id });
            return (
              <article className={cs.card} key={c.id}>
                <div className={cs.cardTop}>
                  <div className={cs.status}>
                    <span className={cs.eyebrow}>{t('Курс')}</span>
                    <span>
                      {c.publication_status === 'published' ? t('Опубликован') : t('Черновик')}
                    </span>
                  </div>
                  <div className={cs.quickActions}>
                    {!business && (
                      <Link
                        className={cs.circle}
                        to={`/courses/${c.id}/canvas`}
                        aria-label={`${t('Канва')}: ${title}`}
                        title={t('Канва')}
                      >
                        <Network size={23} strokeWidth={1.5} />
                      </Link>
                    )}
                    <Link
                      className={cs.circle}
                      to={href}
                      aria-label={`${t('Открыть курс')}: ${title}`}
                      title={t('Открыть курс')}
                    >
                      <ArrowUpRight size={27} strokeWidth={1.6} />
                    </Link>
                  </div>
                </div>
                <div className={cs.cardBody}>
                  <h2>
                    <Link to={href}>{title}</Link>
                  </h2>
                  {!business && (
                    <dl className={cs.metrics}>
                      <div>
                        <dt>{t('Уроки')}</dt>
                        <dd>{c.lesson_count}</dd>
                      </div>
                      <div>
                        <dt>{t('Модули')}</dt>
                        <dd>{c.module_count}</dd>
                      </div>
                    </dl>
                  )}
                  {c.description && <p className={cs.description}>{c.description}</p>}
                  <div className={cs.actions}>
                    <Link className={cs.open} to={href}>
                      {c.lesson_count ? t('Открыть курс') : t('Продолжить создание')}{' '}
                      <span aria-hidden='true'>↗</span>
                    </Link>
                    <button
                      className={cs.remove}
                      disabled={removing !== null}
                      onClick={() => void remove(c)}
                    >
                      {removing === c.id ? t('Удаляем…') : t('Удалить')}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {(offset > 0 || courses.length >= 20) && (
        <div className={styles.row} style={{ marginTop: 28 }}>
          <button
            className={styles.secondary}
            disabled={offset === 0 || loading}
            onClick={() => setOffset((n) => Math.max(0, n - 20))}
          >
            {t('Назад')}
          </button>
          <button
            className={styles.secondary}
            disabled={courses.length < 20 || loading}
            onClick={() => setOffset((n) => n + 20)}
          >
            {t('Далее')}
          </button>
        </div>
      )}
    </Shell>
  );
}
