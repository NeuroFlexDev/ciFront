import RulesFields from './RulesFields';
import { useLocale } from '@/i18n/useLocale';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/shared/api';
import { ApiError } from '@/shared/errors';
import { useAuth } from '@/auth/useAuth';
import { useDurableState } from '@/hooks/useDurableState';
import { Shell } from '@/Pages/Workspace/shared';
import { LoadingState, RequestError } from '@/Components/RequestState';
import OrganizationTabs from './OrganizationTabs';
import ResourceUsagePanel from '@/Components/ResourceUsagePanel';
import CourseTransferPanel from './CourseTransferPanel';
import { resourceProfiles } from './resourceProfiles';
import { useLearningData } from '../Learning/useLearningData';
import { dateLabel } from '../Learning/types';
import { ActionStatus, useTeamAction } from './TeamTools';
import { type Team, type TeamSettings, roles } from './types';
import s from '../Learning/learning.module.css';
import { useManagementConfirmation } from './useManagementConfirmation';
import { businessRoles, isBusiness } from '@/shared/business';

type Permission = { can_manage_team: boolean; can_manage_admins: boolean };
export default function TeamSettingsPage() {
  const { t } = useLocale();
  const { user } = useAuth();

  const [params] = useSearchParams();
  const tab = ['general', 'rules', 'audit'].includes(params.get('tab') || '')
    ? params.get('tab')!
    : 'general';
  const settings = useLearningData<TeamSettings>('/team/settings');
  const permission = useLearningData<Permission>('/team/permissions');
  return (
    <Shell
      title={t('Настройки организации')}
      description={t('Правила организации, её учебный контекст и управление владением.')}
    >
      <div className={`${s.page} ${s.settingsPage}`}>
        <OrganizationTabs />
        {tab === 'general' && settings.data && (
          <p className={s.caption}>
            {t('Профиль ресурсов')}:{' '}
            <strong>
              {t(
                resourceProfiles[String(settings.data.delivery.resource_profile ?? 'custom')] ??
                  'Индивидуальный',
              )}
            </strong>
            . {t('Действуют индивидуально установленные квоты, показанные ниже.')}
          </p>
        )}
        {tab === 'general' && permission.data?.can_manage_team && (
          <details className={s.organizationUsage}>
            <summary>{t('Использование ресурсов')}</summary>
            <ResourceUsagePanel />
          </details>
        )}
        {!!settings.error && (
          <RequestError error={settings.error} onRetry={() => void settings.reload()} />
        )}{' '}
        {!!permission.error && (
          <RequestError error={permission.error} onRetry={() => void permission.reload()} />
        )}{' '}
        {settings.loading && !settings.data ? (
          <LoadingState>{t('Загружаем правила обучения…')}</LoadingState>
        ) : (
          settings.data &&
          tab !== 'audit' && (
            <SettingsForm
              tab={tab}
              settings={settings.data}
              canManage={!!permission.data?.can_manage_team}
              reload={settings.reload}
            />
          )
        )}
        {tab === 'general' && (
          <details className={s.card}>
            <summary>{t('Владение организацией и передача материалов')}</summary>
            <Ownership isOwner={!!permission.data?.can_manage_admins} />
            {permission.data?.can_manage_admins &&
              user?.organization_role === 'owner' &&
              !user.is_admin && <CourseTransferPanel />}
            {permission.data?.can_manage_admins && (
              <Link className={s.secondary} to='/support-access'>
                {t('Доступ поддержки')}
              </Link>
            )}
          </details>
        )}
        {tab === 'audit' && permission.data?.can_manage_team && <Audit />}
      </div>
    </Shell>
  );
}

const profileLabels: Record<string, string> = {
  business: 'Компания',
  education: 'Образовательная организация',
  training_center: 'Учебный центр',
  government: 'Государственная организация',
  individual: 'Индивидуальное обучение',
};

function SettingsForm({
  tab,
  settings,
  canManage,
  reload,
}: {
  tab: string;
  settings: TeamSettings;
  canManage: boolean;
  reload: () => Promise<void>;
}) {
  const { t } = useLocale();
  const { user } = useAuth();
  const visibleRoles = isBusiness(user) ? businessRoles : roles;

  const initial = {
    expected_revision: settings.revision,
    profile: settings.profile,
    languages: settings.languages,
    role_labels: settings.role_labels,
    rules: settings.rules,
    ai_context: settings.ai_context,
  };
  const [draft, setDraft, clear] = useDurableState(
    `learning-settings:${settings.organization_id}`,
    initial,
  );
  const action = useTeamAction();
  const conflict = draft.expected_revision !== settings.revision;
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        void action.run(async () => {
          try {
            const r = await api.put<TeamSettings>('/team/settings', draft);
            clear(draft);
            const clean = { ...draft, expected_revision: r.data.revision };
            setDraft(clean);
            clear(clean);
            window.dispatchEvent(new Event('lernium-team-settings-changed'));
            await reload();
          } catch (e) {
            if (e instanceof ApiError && e.status === 409) await reload();
            throw e;
          }
        }, t('Настройки сохранены. Уже выданные назначения используют зафиксированные правила.'));
      }}
    >
      <fieldset
        disabled={action.busy}
        style={{
          border: 0,
          padding: 0,
          margin: 0,
          minWidth: 0,
          display: 'contents',
        }}
      >
        {conflict && (
          <section className={s.conflict}>
            <h3>{t('Настройки изменились')}</h3>
            <p>
              {t('Ваш черновик относится к редакции') + ' '}
              {draft.expected_revision}
              {t('. На сервере редакция') + ' '}
              {settings.revision}.
            </p>
            <details>
              <summary>{t('Сравнить текущие настройки сервера')}</summary>
              <pre>{JSON.stringify(initial, null, 2)}</pre>
            </details>
            <div className={s.row}>
              <button type='button' className={s.secondary} onClick={() => setDraft(initial)}>
                {t('Взять настройки сервера')}
              </button>
              <button
                type='button'
                className={s.secondary}
                disabled={!canManage}
                onClick={() => setDraft({ ...draft, expected_revision: settings.revision })}
              >
                {t('Применить мои после сравнения')}
              </button>
            </div>
          </section>
        )}
        {tab === 'general' && (
          <section className={s.card}>
            <h2>{t('Профиль организации')}</h2>
            <div className={s.formGrid}>
              <label className={s.field}>
                {t('Тип учебной среды')}
                <select
                  disabled={!canManage}
                  value={draft.profile}
                  onChange={(e) => setDraft({ ...draft, profile: e.target.value })}
                >
                  {Object.entries(profileLabels).map(([v, n]) => (
                    <option key={v} value={v}>
                      {t(String(n))}
                    </option>
                  ))}
                </select>
              </label>
              <div className={s.field}>
                <span>{t('Языки материалов и приглашений')}</span>
                {[
                  ['ru', t('Русский')],
                  ['en', 'English'],
                ].map(([code, label]) => (
                  <label className={s.check} key={code}>
                    <input
                      type='checkbox'
                      disabled={
                        !canManage ||
                        (draft.languages.length === 1 && draft.languages.includes(code))
                      }
                      checked={draft.languages.includes(code)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          languages: e.target.checked
                            ? [...draft.languages, code]
                            : draft.languages.filter((l) => l !== code),
                        })
                      }
                    />
                    {t(String(label))}
                  </label>
                ))}
              </div>
            </div>
            <h3>{t('Названия ролей в вашей организации')}</h3>
            <div className={s.formGrid}>
              {Object.entries(visibleRoles).map(([key, title]) => (
                <label key={key} className={s.field}>
                  {t(String(title))} · RU
                  <input
                    disabled={!canManage}
                    maxLength={100}
                    value={draft.role_labels[`${key}_ru`] ?? draft.role_labels[key] ?? ''}
                    placeholder={t(String(title))}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        role_labels: {
                          ...draft.role_labels,
                          [`${key}_ru`]: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              ))}
              {Object.entries(visibleRoles).map(([key, title]) => (
                <label key={`${key}_en`} className={s.field}>
                  {t(String(title))} · EN
                  <input
                    disabled={!canManage}
                    maxLength={100}
                    value={draft.role_labels[`${key}_en`] ?? ''}
                    placeholder={t('Название роли для английского интерфейса')}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        role_labels: {
                          ...draft.role_labels,
                          [`${key}_en`]: event.target.value,
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </section>
        )}
        {tab === 'rules' && (
          <RulesFields
            value={draft.rules}
            features={settings.features}
            disabled={!canManage}
            onChange={(rules) => setDraft({ ...draft, rules })}
          />
        )}
        {tab === 'general' && (
          <section className={s.card}>
            <h2>{t('Учебный контекст для AI')}</h2>
            <p className={s.muted}>
              {t(
                'Контекст организации помогает учитывать аудиторию и терминологию при работе с материалами. Он не заменяет критерии оценки.',
              )}
            </p>
            <div className={s.stack}>
              {[
                ['audience', t('Кого обучаем')],
                ['terminology', t('Терминология и стиль')],
                ['goals', t('Учебные цели')],
                ['constraints', t('Требования к содержанию')],
                ['specialist_role', t('Профиль специалиста')],
                ['industry', t('Отрасль организации')],
              ].map(([key, label]) => (
                <label key={key} className={s.field}>
                  {t(String(label))}
                  <textarea
                    disabled={!canManage}
                    maxLength={2000}
                    value={draft.ai_context[key] ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        ai_context: {
                          ...draft.ai_context,
                          [key]: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </section>
        )}
        <ActionStatus action={action} />
        {canManage ? (
          <button className={s.primary} disabled={action.busy || conflict}>
            {t('Сохранить настройки')}
          </button>
        ) : (
          <p className={s.notice}>
            {t('Вы видите действующие правила. Изменить их может администратор организации.')}
          </p>
        )}
      </fieldset>
    </form>
  );
}

type Transfer = {
  id: number;
  from_user_id: number;
  to_user_id: number;
  expires_at: string;
};
function Ownership({ isOwner }: { isOwner: boolean }) {
  const { t } = useLocale();

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const team = useLearningData<Team>(isOwner ? '/team' : null);
  const transfers = useLearningData<{ items: Transfer[] }>('/team/ownership-transfers');
  const [target, setTarget] = useState(params.get('user') ?? '');
  const action = useTeamAction();
  const confirmation = useManagementConfirmation();
  return (
    <section className={s.card} style={{ marginTop: 28 }}>
      {confirmation.dialog}
      <h2>{t('Владение организацией')}</h2>
      <p className={s.muted}>
        {t(
          'Передача завершается после подтверждения выбранным участником из его аккаунта. После принятия оба участника входят заново.',
        )}
      </p>
      {isOwner && (
        <form
          className={s.inlineForm}
          onSubmit={(e) => {
            e.preventDefault();
            confirmation.ask({
              title: t('Предложить передачу владения'),
              description: t(
                'Предложить передачу владения выбранному участнику? До его принятия вы остаётесь владельцем.',
              ),
              confirmLabel: t('Предложить передачу'),
              action: () =>
                action.run(async () => {
                  await api.post('/team/ownership-transfers', {
                    user_id: Number(target),
                  });
                  await transfers.reload();
                }, t('Предложение создано. Получатель подтвердит его в настройках своего аккаунта.')),
            });
          }}
        >
          <label className={s.field}>
            {t('Новый владелец')}
            <select required value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value=''>{t('Выберите участника')}</option>
              {team.data?.members
                .filter((m) => m.id !== user?.id && m.is_active)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
            </select>
          </label>
          <button className={s.secondary} disabled={action.busy || !target}>
            {t('Предложить передачу')}
          </button>
        </form>
      )}
      {!!team.error && <RequestError error={team.error} onRetry={() => void team.reload()} />}{' '}
      {!!transfers.error && (
        <RequestError error={transfers.error} onRetry={() => void transfers.reload()} />
      )}{' '}
      {transfers.data?.items.map((transfer) => (
        <section className={s.notice} key={transfer.id}>
          <p>
            {transfer.to_user_id === user?.id
              ? t('Вам предложено принять владение организацией.')
              : t('Ожидается подтверждение участника {v0}.', {
                  v0:
                    team.data?.members.find((m) => m.id === transfer.to_user_id)?.full_name ||
                    transfer.to_user_id,
                })}
          </p>
          <p className={s.caption}>
            {t('Действует до') + ' '}
            {dateLabel(transfer.expires_at)}
          </p>
          <div className={s.row}>
            {transfer.to_user_id === user?.id && (
              <button
                className={s.primary}
                disabled={action.busy}
                onClick={() =>
                  confirmation.ask({
                    title: t('Принять владение'),
                    description: t(
                      'Принять права владельца? После этого нужно снова войти в свой аккаунт.',
                    ),
                    confirmLabel: t('Принять владение'),
                    action: () =>
                      action.run(async () => {
                        await api.post(`/team/ownership-transfers/${transfer.id}/accept`);
                        logout();
                        navigate('/auth?returnTo=%2Fteam-settings', {
                          replace: true,
                        });
                      }),
                  })
                }
              >
                {t('Принять владение')}
              </button>
            )}
            <button
              className={s.secondary}
              disabled={action.busy}
              onClick={() =>
                void action.run(async () => {
                  await api.delete(`/team/ownership-transfers/${transfer.id}`);
                  await transfers.reload();
                }, t('Передача отменена'))
              }
            >
              {t('Отменить предложение')}
            </button>
          </div>
        </section>
      ))}
      {transfers.data && !transfers.data.items.length && (
        <p className={s.muted}>{t('Активных предложений передачи нет.')}</p>
      )}
      <ActionStatus action={action} />
      <Link className={s.secondary} to='/team'>
        {t('Участники и приглашения')}
      </Link>
    </section>
  );
}

function Audit() {
  const { t } = useLocale();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const data = useLearningData<{
    total: number;
    items: {
      id: number;
      actor_id: number | null;
      action: string;
      target_type: string;
      target_id: string;
      details: Record<string, unknown>;
      created_at: string;
    }[];
  }>(`/team/audit?limit=30&offset=${offset}`);
  const team = useLearningData<Team>('/team');
  const event = data.data?.items.find((item) => item.id === selected);
  const names: Record<string, string> = {
    'team.settings.updated': 'Изменены настройки обучения',
    'assignment.created': 'Назначено обучение',
    'member.updated': 'Изменён участник',
    'group.created': 'Создана группа',
    'group.updated': 'Изменена группа',
    'department.created': 'Создано подразделение',
    'course.published': 'Курс опубликован',
    'role.granted': 'Выдана роль',
    'role.revoked': 'Отозвана роль',
  };
  const actor = (id: number | null) =>
    id === null
      ? t('Система')
      : team.data?.members.find((member) => member.id === id)?.full_name ||
        t('Участник №{v0}', { v0: id });
  return (
    <div className={s.auditLayout} data-selected={!!event}>
      <section className={s.card}>
        <h2>{t('Журнал действий')}</h2>
        {!!data.error && <RequestError error={data.error} onRetry={() => void data.reload()} />}
        {data.loading && !data.data && <LoadingState />}
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>{t('Дата и время')}</th>
                <th>{t('Исполнитель')}</th>
                <th>{t('Действие')}</th>
                <th>{t('Объект')}</th>
                <th>{t('Подробности')}</th>
              </tr>
            </thead>
            <tbody>
              {data.data?.items.map((item) => (
                <tr key={item.id} data-selected={selected === item.id}>
                  <td>{dateLabel(item.created_at)}</td>
                  <td>{actor(item.actor_id)}</td>
                  <td>{t(names[item.action] || item.action)}</td>
                  <td>
                    {item.target_type} · {item.target_id}
                  </td>
                  <td>
                    <button
                      className={s.secondary}
                      aria-label={`${t('Открыть событие')} ${item.id}`}
                      onClick={() => setSelected(item.id)}
                    >
                      {t('Открыть')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.data && !data.data.total && (
          <p className={s.muted}>{t('Событий организации пока нет.')}</p>
        )}
        <div className={s.stickyActions}>
          <button
            className={s.secondary}
            disabled={!offset || data.loading}
            onClick={() => {
              setSelected(null);
              setOffset(Math.max(0, offset - 30));
            }}
          >
            {t('Назад')}
          </button>
          <span>
            {data.data?.total
              ? t('{v0}–{v1} из {v2}', {
                  v0: offset + 1,
                  v1: Math.min(offset + 30, data.data.total),
                  v2: data.data.total,
                })
              : t('0 событий')}
          </span>
          <button
            className={s.secondary}
            disabled={data.loading || offset + 30 >= (data.data?.total || 0)}
            onClick={() => {
              setSelected(null);
              setOffset(offset + 30);
            }}
          >
            {t('Далее')}
          </button>
        </div>
      </section>
      {event && (
        <aside className={s.card}>
          <div className={s.spread}>
            <h2>{t(names[event.action] || event.action)}</h2>
            <button
              className={s.secondary}
              onClick={() => setSelected(null)}
              aria-label={t('Закрыть подробности')}
            >
              ×
            </button>
          </div>
          <dl>
            <dt>{t('Когда')}</dt>
            <dd>{dateLabel(event.created_at)}</dd>
            <dt>{t('Кто')}</dt>
            <dd>{actor(event.actor_id)}</dd>
            <dt>{t('Объект')}</dt>
            <dd>
              {event.target_type} · {event.target_id}
            </dd>
          </dl>
          <h3>{t('Данные события')}</h3>
          <pre className={s.auditDetails}>{JSON.stringify(event.details, null, 2)}</pre>
        </aside>
      )}
    </div>
  );
}
