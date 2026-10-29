import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import Dialog from '@/Components/Admin/AdminDialog';
import { LoadingState, RequestError } from '@/Components/RequestState';
import { useLocale } from '@/i18n/useLocale';
import { useAuth } from '@/auth/useAuth';
import { useLearningData } from '@/Pages/Learning/useLearningData';
import type { Assignment } from '@/Pages/Learning/types';
import type { SourceAttachment } from '@/Components/SourceReleasePanel';
import { styles } from '@/Pages/Workspace/shared';
import type { Course } from './MyCourses';
import s from './myCourses.module.css';

export default function CourseInfoDialog({
  course,
  canReport,
  canAssign,
  onClose,
}: {
  course: Course;
  canReport: boolean;
  canAssign: boolean;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const assignments = useLearningData<{ items: Assignment[] }>(
    canReport ? `/courses/${course.id}/assignments` : null,
  );
  const sources = useLearningData<{
    items: SourceAttachment[];
    total: number;
    content_revision: number;
  }>(`/courses/${course.id}/source-release?offset=0&limit=20`);
  const rows = assignments.data?.items.filter((a) => a.state === 'active') ?? [];
  const completed = rows.filter((a) => a.status === 'completed').length;
  const points = rows.reduce((sum, a) => sum + a.points, 0);
  const max = rows.reduce((sum, a) => sum + a.max_points, 0);
  const title = course.title?.trim() || t('Черновик №{v0}', { v0: course.id });
  return (
    <Dialog title={title} onClose={onClose} className={s.infoDialog}>
      <div className={s.infoBody}>
        <div className={s.infoStatus}>
          <span>{t(course.publication_status === 'published' ? 'Опубликован' : 'Черновик')}</span>
          {sources.data && (
            <small>{t('Версия {version}', { version: sources.data.content_revision })}</small>
          )}
        </div>
        <section>
          <h3>{t('О курсе')}</h3>
          {course.description && <p>{course.description}</p>}
          <dl className={s.facts}>
            <div>
              <dt>{t('Автор')}</dt>
              <dd>{user?.full_name || user?.username || user?.email}</dd>
            </div>
            <div>
              <dt>{t('Уроков')}</dt>
              <dd>{course.lesson_count}</dd>
            </div>
            {course.updated_at && (
              <div>
                <dt>{t('Обновлён')}</dt>
                <dd>
                  {new Date(course.updated_at).toLocaleDateString(
                    locale === 'en' ? 'en-GB' : 'ru-RU',
                  )}
                </dd>
              </div>
            )}
          </dl>
        </section>
        {canReport && (
          <section>
            <h3>{t('Прогресс')}</h3>
            {assignments.loading && <LoadingState>{t('Загружаем результаты…')}</LoadingState>}
            {!!assignments.error && (
              <RequestError error={assignments.error} onRetry={() => void assignments.reload()} />
            )}
            {assignments.data && (
              <>
                <progress
                  className={s.infoProgress}
                  max={Math.max(1, rows.length)}
                  value={completed}
                  aria-label={t('Завершено назначений')}
                />
                <div className={s.infoStats}>
                  {[
                    [
                      t('Начали'),
                      rows.filter(
                        (a) =>
                          a.status === 'completed' ||
                          a.status === 'in_progress' ||
                          a.completed_lessons.length > 0,
                      ).length,
                    ],
                    [t('Завершили'), completed],
                    [t('Просрочили'), rows.filter((a) => a.status === 'overdue').length],
                    [t('Ср. балл'), max ? `${Math.round((points / max) * 100)}%` : '—'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                {!rows.length && <p>{t('Этот курс ещё никому не назначен.')}</p>}
              </>
            )}
          </section>
        )}
        <section>
          <h3>{t('Источники')}</h3>
          {sources.loading && <LoadingState>{t('Загружаем материалы…')}</LoadingState>}
          {!!sources.error && (
            <RequestError error={sources.error} onRetry={() => void sources.reload()} />
          )}
          {sources.data?.items.map((source) => (
            <div className={s.source} key={source.document_id}>
              <FileText size={24} />
              <div>
                <strong>{source.filename}</strong>
                <small>
                  {Math.ceil(source.size_bytes / 1024).toLocaleString(locale)} {t('КБ')}
                </small>
              </div>
            </div>
          ))}
          {sources.data && !sources.data.items.length && <p>{t('Исходные файлы не добавлены.')}</p>}
          {(sources.data?.total ?? 0) > 20 && (
            <Link to={`/courses/${course.id}/edit`}>{t('Все источники')} →</Link>
          )}
        </section>
        <footer className={s.infoActions}>
          {canAssign && course.publication_status === 'published' && (
            <Link className={styles.secondary} to={`/assignments?course=${course.id}`}>
              {t('Назначить обучение')}
            </Link>
          )}
          <Link
            className={styles.primary}
            to={course.lesson_count ? `/courses/${course.id}/edit` : `/express?course=${course.id}`}
          >
            {t(course.lesson_count ? 'Редактировать курс' : 'Продолжить создание')}
          </Link>
        </footer>
      </div>
    </Dialog>
  );
}
