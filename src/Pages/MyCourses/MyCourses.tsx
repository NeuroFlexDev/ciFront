import CourseNavigation from '@/Components/CourseNavigation';
import { useAuth } from '@/auth/useAuth';
import { isBusiness } from '@/shared/business';
import businessCss from '../Business/business.module.css';
import { Info, UserRoundPlus } from 'lucide-react';
import Dialog from '@/Components/Admin/AdminDialog';
import CourseInfoDialog from './CourseInfoDialog';
import CreateRegulationDialog from './CreateRegulationDialog';
import { useLearningData } from '../Learning/useLearningData';
import cs from './myCourses.module.css';
import { useLocale } from '@/i18n/useLocale';
import { RequestError, LoadingState } from '@/Components/RequestState';
import { useReconnect } from '@/hooks/useReconnect';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/shared/api';
import { Shell, styles } from '@/Pages/Workspace/shared';
export type Course = {
  id: number;
  title: string | null;
  description?: string | null;
  publication_status: string;
  updated_at?: string;
  module_count: number;
  lesson_count: number;
  author_name?: string | null;
  position_id?: number | null;
  position_name?: string | null;
};
export default function MyCoursesPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const business = isBusiness(user);
  const permissions = useLearningData<{ can_manage_team: boolean; can_report: boolean }>(
    '/team/permissions',
  );
  const [info, setInfo] = useState<Course | null>(null);
  const [confirmation, setConfirmation] = useState<Course | null>(null);
  const [creation, setCreation] = useState<'files' | 'assistant' | null>(null);

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
    setRemoving(course.id);
    setError(null);
    try {
      await api.delete(`/courses/${course.id}`);
      setConfirmation(null);
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
      description={
        business
          ? t('Инструкции компании: добавляйте готовые документы или создавайте вместе с ИИ.')
          : t('Ваши материалы, черновики и опубликованные курсы.')
      }
      action={
        business ? (
          <div className={cs.creationActions}>
            <button className={styles.secondary} onClick={() => setCreation('files')}>
              {t('Добавить готовый регламент')}
            </button>
            <button className={styles.primary} onClick={() => setCreation('assistant')}>
              {t('Создать с ИИ')}
            </button>
          </div>
        ) : (
          <Link className={styles.primary} to='/express'>
            {t('Создать курс +')}
          </Link>
        )
      }
    >
      <CourseNavigation />
      <div className={cs.filters} aria-label={t('Фильтр курсов')}>
        {[
          ['', t(business ? 'Все регламенты' : 'Все курсы')],
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
          <h2>
            {filter
              ? t('В этом разделе пока пусто')
              : t(business ? 'Создайте первый регламент' : 'Создайте первый курс')}
          </h2>
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
                    <span className={cs.eyebrow}>
                      {t(business ? 'Автор регламента' : 'Автор курса')}
                    </span>
                    <span>{c.author_name || t('Автор не указан')}</span>
                  </div>
                  <div className={cs.quickActions}>
                    <button
                      className={cs.circle}
                      type='button'
                      onClick={() => setInfo(c)}
                      aria-label={`${t('Информация о курсе')}: ${title}`}
                      title={t('Информация о курсе')}
                    >
                      <Info size={24} strokeWidth={1.5} />
                    </button>
                    {permissions.data?.can_manage_team && c.publication_status === 'published' && (
                      <Link
                        className={cs.circle}
                        to={`/assignments?course=${c.id}`}
                        aria-label={`${t('Назначить обучение')}: ${title}`}
                        title={t('Назначить обучение')}
                      >
                        <UserRoundPlus size={24} strokeWidth={1.5} />
                      </Link>
                    )}
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
                  {business &&
                    (c.position_id ? (
                      <Link className={cs.positionLabel} to={`/company/positions/${c.position_id}`}>
                        {c.position_name || t('Должность')}
                      </Link>
                    ) : (
                      <span className={cs.positionLabel}>{t('Общий регламент')}</span>
                    ))}
                  <span className={cs.publishBadge}>
                    {t(c.publication_status === 'published' ? 'Опубликован' : 'Черновик')}
                  </span>
                  <div className={cs.actions}>
                    <Link className={cs.open} to={href}>
                      {c.lesson_count
                        ? t(business ? 'Открыть регламент' : 'Открыть курс')
                        : t('Продолжить создание')}{' '}
                      <span aria-hidden='true'>↗</span>
                    </Link>
                    <button
                      className={cs.remove}
                      disabled={removing !== null}
                      onClick={() => {
                        setError(null);
                        setConfirmation(c);
                      }}
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
      {info && (
        <CourseInfoDialog
          key={info.id}
          course={info}
          canReport={!!permissions.data?.can_report}
          canAssign={!!permissions.data?.can_manage_team}
          onClose={() => setInfo(null)}
        />
      )}
      {creation && <CreateRegulationDialog mode={creation} onClose={() => setCreation(null)} />}
      {confirmation && (
        <Dialog
          title={t('Удалить курс?')}
          busy={removing !== null}
          onClose={() => setConfirmation(null)}
          className={cs.infoDialog}
        >
          <p>
            {t('Курс «{v0}» исчезнет из вашего списка. Это действие нельзя отменить.', {
              v0: confirmation.title || t('Черновик №{v0}', { v0: confirmation.id }),
            })}
          </p>
          {!!error && <RequestError error={error} />}
          <div className={cs.infoActions}>
            <button
              className={styles.secondary}
              disabled={removing !== null}
              onClick={() => setConfirmation(null)}
            >
              {t('Отмена')}
            </button>
            <button
              className={styles.primary}
              disabled={removing !== null}
              onClick={() => void remove(confirmation)}
            >
              {t(removing !== null ? 'Удаляем…' : 'Удалить')}
            </button>
          </div>
        </Dialog>
      )}
    </Shell>
  );
}
