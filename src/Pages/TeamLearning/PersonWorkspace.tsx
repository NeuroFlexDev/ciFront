import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '@/i18n/useLocale';
import { LoadingState, RequestError } from '@/Components/RequestState';
import { useLearningData } from '../Learning/useLearningData';
import { type Assignment, dateLabel, stateLabel } from '../Learning/types';
import { type TeamMember, type Person, type Department, type Group, initials } from './types';
import { useRoleNames } from './useRoleNames';
import s from '../Learning/learning.module.css';

export default function PersonWorkspace({
  member,
  person,
  departments,
  groups,
  children,
  onBack,
}: {
  member: TeamMember;
  person?: Person;
  departments: Department[];
  groups: Group[];
  children: ReactNode;
  onBack: () => void;
}) {
  const { t } = useLocale();
  const roleName = useRoleNames();
  const [tab, setTab] = useState('learning');
  const results = useLearningData<{ items: Assignment[] }>(`/team/results?user_id=${member.id}`);
  const memberships = groups.filter((g) => g.user_ids.includes(member.id));
  return (
    <div className={s.personWorkspace}>
      <button className={s.textBack} onClick={onBack}>
        ← {t('Сотрудники')}
      </button>
      <header className={s.personIdentity}>
        <div className={s.personMonogram} aria-hidden='true'>
          {initials(member.full_name || member.email || '')}
        </div>
        <div className={s.personName}>
          <h2>{member.full_name || member.email}</h2>
          <span className={s.badge} data-state={member.is_active ? 'active' : 'revoked'}>
            {t(member.is_active ? 'Активен' : 'Доступ отозван')}
          </span>
          <p>{member.email}</p>
        </div>
        <dl>
          <div>
            <dt>{t('Подразделение')}</dt>
            <dd>
              {departments.find((d) => d.id === person?.department_id)?.name || t('Не указано')}
            </dd>
          </div>
          <div>
            <dt>{t('Должность')}</dt>
            <dd>{person?.position || t('Не указано')}</dd>
          </div>
          <div>
            <dt>{t('Роль')}</dt>
            <dd>{roleName(member.organization_role)}</dd>
          </div>
          <div>
            <dt>{t('Группы')}</dt>
            <dd>
              {memberships.length
                ? memberships.map((g) => (
                    <Link key={g.id} to={`/groups?tab=groups&group=${g.id}`}>
                      {g.name}
                    </Link>
                  ))
                : t('Без группы')}
            </dd>
          </div>
        </dl>
      </header>
      <div className={s.tablist} role='tablist' aria-label={t('Карточка участника')}>
        {[
          ['learning', 'Обучение'],
          ['results', 'Результаты'],
          ['access', 'Доступ'],
        ].map(([id, label]) => (
          <button key={id} role='tab' aria-selected={tab === id} onClick={() => setTab(id)}>
            {t(label)}
          </button>
        ))}
      </div>
      {tab === 'access' ? (
        children
      ) : (
        <div className={s.personColumns}>
          <section className={s.card}>
            <h2>{t(tab === 'results' ? 'Результаты обучения' : 'Назначенные курсы')}</h2>
            {results.loading && !results.data && <LoadingState />}
            {!!results.error && (
              <RequestError error={results.error} onRetry={() => void results.reload()} />
            )}
            {results.data && !results.data.items.length && (
              <p>
                {t(
                  'Назначений пока нет. Выберите опубликованный курс и назначьте обучение участнику.',
                )}
              </p>
            )}
            <div className={s.personAssignments}>
              {results.data?.items.map((a) => {
                const percent = a.progress_percent;
                return (
                  <div key={a.id}>
                    <div>
                      <strong>{a.title}</strong>
                      <small>
                        {tab === 'results'
                          ? a.max_points
                            ? `${a.points} / ${a.max_points} ${t('баллов')}`
                            : t('Без оценки')
                          : a.due_at
                            ? `${t('До')} ${dateLabel(a.due_at)}`
                            : t('Без срока')}
                      </small>
                    </div>
                    <div className={s.personProgress}>
                      <progress
                        aria-label={`${a.title} · ${t('Прогресс')}`}
                        value={percent}
                        max={100}
                      />
                      <span>{percent}%</span>
                    </div>
                    <span className={s.badge} data-state={a.status}>
                      {t(stateLabel[a.status] || a.status)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
          <aside className={s.stack}>
            <Link className={s.primary} to={`/assignments?user=${member.id}`}>
              {t('Назначить курс')}
            </Link>
            <button className={s.secondary} onClick={() => setTab('access')}>
              {t('Изменить карточку и доступ')}
            </button>
            <Link className={s.secondary} to={`/learning-analytics?user_id=${member.id}`}>
              {t('Полный отчёт по участнику')}
            </Link>
            <p className={s.muted}>
              {t(
                'Показаны назначения и результаты, доступные вам по роли и области ответственности.',
              )}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
