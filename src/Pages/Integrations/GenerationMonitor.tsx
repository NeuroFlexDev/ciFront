import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '@/i18n/useLocale';
import { dateText, statuses, type Overview } from '@/Pages/Workspace/shared';
import { useResource } from './useResource';
import { ResourceState } from './IntegrationComponents';
import s from './integrations.module.css';
import o from './operations.module.css';

const stages: Record<string, string> = {
  ingestion: 'Анализ материалов',
  competency_mapping: 'Учебные цели',
  course_architecture: 'Структура курса',
  lesson_writing: 'Написание уроков',
  assessment_generation: 'Задания и тесты',
  quality_assurance: 'Проверка качества',
  materialization: 'Сохранение курса',
};
export default function GenerationMonitor() {
  const { t } = useLocale();
  const resource = useResource<Overview>('/admin/overview');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<number | null>(null);
  const runs = resource.data?.runs ?? [];
  const visible = runs.filter(
    (run) =>
      status === 'all' ||
      (status === 'problems'
        ? ['failed', 'paused'].includes(run.status)
        : ['running', 'queued'].includes(run.status)),
  );
  const current = runs.find((run) => run.id === selected);
  const title = (courseId: number | null) =>
    resource.data?.courses.find((course) => course.id === courseId)?.title ||
    (courseId ? `${t('Курс')} №${courseId}` : t('Курс недоступен'));
  return (
    <section className={o.generationMonitor} aria-label={t('Генерации и сбои')}>
      <div className={o.toolbar}>
        <label>
          {t('Статус')}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value='all'>{t('Все статусы')}</option>
            <option value='problems'>{t('Ошибка или пауза')}</option>
            <option value='active'>{t('В работе и очереди')}</option>
          </select>
        </label>
        <button className={s.secondary} onClick={resource.reload} disabled={resource.loading}>
          {t('Обновить')}
        </button>
      </div>
      <ResourceState {...resource} />
      {resource.data && (
        <>
          <p className={o.scopeNote}>
            {t('Последние 30 запусков за 30 дней. Фильтр применяется к этому списку.')}
          </p>
          <div className={o.runLayout}>
            <div className={o.runTable}>
              <table>
                <thead>
                  <tr>
                    <th>{t('Курс')}</th>
                    <th>{t('Этап')}</th>
                    <th>{t('Запуск')}</th>
                    <th>{t('Прогресс')}</th>
                    <th>{t('Статус')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((run) => (
                    <tr key={run.id} data-selected={run.id === selected}>
                      <td>
                        <button onClick={() => setSelected(run.id)}>
                          {title(run.course_id)}
                          <small>#{run.id}</small>
                        </button>
                      </td>
                      <td>{t(stages[run.stage] ?? run.stage ?? 'Ожидание')}</td>
                      <td>{dateText(run.created_at)}</td>
                      <td>{run.progress_percent}%</td>
                      <td>
                        <span className={o.runStatus} data-state={run.status}>
                          {t(statuses[run.status] ?? run.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length && <p className={s.empty}>{t('Запусков с таким статусом нет')}</p>}
            </div>
            <aside className={`${s.panel} ${o.runDetails}`}>
              {current ? (
                <>
                  <header>
                    <h2>
                      {t('Генерация курса')} · #{current.id}
                    </h2>
                    <button
                      type='button'
                      aria-label={t('Закрыть панель')}
                      onClick={() => setSelected(null)}
                    >
                      ×
                    </button>
                  </header>
                  <p>{title(current.course_id)}</p>
                  <dl>
                    <dt>{t('Статус')}</dt>
                    <dd>
                      <span className={o.runStatus} data-state={current.status}>
                        {t(statuses[current.status] ?? current.status)}
                      </span>
                    </dd>
                    <dt>{t('Запуск')}</dt>
                    <dd>{dateText(current.created_at)}</dd>
                    <dt>{t('Текущий этап')}</dt>
                    <dd>{t(stages[current.stage] ?? current.stage ?? 'Ожидание')}</dd>
                  </dl>
                  <progress
                    max={100}
                    value={current.progress_percent}
                    aria-label={t('Прогресс генерации')}
                  />
                  <p>{current.progress_percent}%</p>
                  {current.error_message && (
                    <section className={o.runError}>
                      <h3>{t('Ошибка')}</h3>
                      <p>{current.error_message}</p>
                    </section>
                  )}
                  <Link className={s.secondary} to='/support-access'>
                    {t('Открыть доступ поддержки')}
                  </Link>
                  <p className={o.scopeNote}>
                    {t(
                      'Для изменения материалов и продолжения запуска требуется согласованный доступ к организации.',
                    )}
                  </p>
                </>
              ) : (
                <>
                  <h2>{t('Подробности запуска')}</h2>
                  <p>
                    {t(
                      'Выберите курс в таблице, чтобы увидеть этап, прогресс и сообщение об ошибке.',
                    )}
                  </p>
                </>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
