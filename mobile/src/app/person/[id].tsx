import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { ConfirmSheet, type Confirmation } from '../../ui/ConfirmSheet';
import { api, useResource, useSession, queryClient } from '../../lib/session';
import type { Person, Assignment, Position } from '../../lib/types';
import { roles, states } from '../../lib/types';
import {
  Page,
  Card,
  Txt,
  Chips,
  Loading,
  ErrorState,
  Avatar,
  Badge,
  Field,
  Button,
  Empty,
  Progress,
} from '../../ui/components';
export default function PersonDetail() {
  const { id, removed } = useLocalSearchParams<{ id: string; removed?: string }>(),
    { scope, user } = useSession(),
    people = useResource<{ items: Person[] }>(
      '/business/employees?user_id=' + id + '&removed=' + (removed === 'true'),
    ),
    results = useResource<{ items: Assignment[] }>('/team/results?user_id=' + id),
    positions = useResource<{ items: Position[] }>('/business/positions?limit=100'),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const person = people.data?.items.find((p) => p.id === Number(id));
  async function position(value: string) {
    if (!person) return;
    setBusy(true);
    try {
      await api.request('/business/employees/' + id + '/position', 'PUT', {
        position_id: value === 'none' ? null : Number(value),
        expected_position_id: person.position_id,
      });
      void queryClient.invalidateQueries({ queryKey: [scope] });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title={person?.full_name || 'Участник команды'} back>
      {people.isPending && <Loading />}
      {(error || people.error || results.error) && (
        <ErrorState
          error={error || people.error || results.error}
          retry={() => void people.refetch()}
        />
      )}
      {person && (
        <Card>
          <Avatar name={person.full_name || person.username} size={96} />
          <Badge tone='accent'>{roles[person.organization_role] || person.organization_role}</Badge>
          <Txt muted>{person.email || person.username}</Txt>
          <Badge>
            {person.organization_removed_at
              ? 'Удалён из команды'
              : person.is_active
                ? 'Доступ открыт'
                : 'Доступ приостановлен'}
          </Badge>
          {person.organization_removed_at && (
            <Txt muted>
              Аккаунт и история обучения сохранены. Восстановление вернёт участника в команду.
            </Txt>
          )}
          {person.id !== user?.id && !person.organization_removed_at && (
            <PersonName
              key={person.id}
              person={person}
              onSaved={() => {
                void people.refetch();
                void queryClient.invalidateQueries({ queryKey: [scope, 'people'] });
              }}
            />
          )}
          {!person.organization_removed_at &&
            ['member', 'candidate'].includes(person.organization_role) && (
              <>
                <Txt size={20}>Должность</Txt>
                <Chips
                  items={[
                    { id: 'none', label: 'Не назначена' },
                    ...(positions.data?.items || []).map((p) => ({
                      id: String(p.id),
                      label: p.name,
                    })),
                  ]}
                  value={person.position_id ? String(person.position_id) : 'none'}
                  onChange={(value) => {
                    if (!busy) void position(value);
                  }}
                />
              </>
            )}
          {person.id !== user?.id &&
            (['member', 'candidate'].includes(person.organization_role) ||
              (user?.organization_role === 'owner' &&
                ['manager', 'admin'].includes(person.organization_role))) && (
              <>
                {!person.organization_removed_at && (
                  <Button
                    title={person.is_active ? 'Приостановить доступ' : 'Возобновить доступ'}
                    secondary
                    disabled={busy}
                    onPress={() =>
                      setConfirmation({
                        title: `${person.is_active ? 'Приостановить' : 'Возобновить'} доступ?`,
                        description: `${person.full_name || person.username}. Аккаунт и результаты обучения сохранятся. Участник останется в списке команды.`,
                        actionLabel: person.is_active ? 'Приостановить' : 'Возобновить',
                        action: async () => {
                          await api.request('/business/employees/' + id + '/access', 'PUT', {
                            is_active: !person.is_active,
                            expected_auth_version: person.auth_version,
                          });
                          void queryClient.invalidateQueries({ queryKey: [scope] });
                        },
                      })
                    }
                  />
                )}
                <Button
                  title={
                    person.organization_removed_at ? 'Восстановить в команде' : 'Удалить из команды'
                  }
                  danger={!person.organization_removed_at}
                  disabled={busy}
                  onPress={() =>
                    setConfirmation({
                      title: `${person.organization_removed_at ? 'Восстановить' : 'Удалить'} «${person.full_name || person.username}»?`,
                      description: person.organization_removed_at
                        ? 'Участник снова сможет войти с прежним паролем. Результаты и назначения сохранены. Старые сеансы и приглашения не восстанавливаются.'
                        : ['manager', 'admin'].includes(person.organization_role)
                          ? 'Вход руководителя будет закрыт. Его сотрудники останутся в компании без руководителя. Аккаунт и результаты сохранятся. Восстановить можно в списке удалённых; команду потребуется назначить заново.'
                          : 'Участник исчезнет из рабочего списка и потеряет доступ. Аккаунт, ответы и результаты сохранятся. Восстановить его можно в списке удалённых.',
                      actionLabel: person.organization_removed_at
                        ? 'Восстановить'
                        : 'Удалить из команды',
                      danger: !person.organization_removed_at,
                      action: async () => {
                        await api.request(
                          '/business/employees/' +
                            id +
                            (person.organization_removed_at ? '/restore' : ''),
                          person.organization_removed_at ? 'POST' : 'DELETE',
                          { expected_auth_version: person.auth_version },
                        );
                        void queryClient.invalidateQueries({ queryKey: [scope] });
                        router.setParams({
                          removed: person.organization_removed_at ? 'false' : 'true',
                        });
                      },
                    })
                  }
                />
              </>
            )}
        </Card>
      )}
      {people.data && !person && (
        <Empty
          title='Участник недоступен'
          body='Участник не найден в вашей области доступа. Вернитесь к команде и обновите список.'
        />
      )}
      <Txt heading size={24}>
        Результаты обучения
      </Txt>
      {results.data?.items.map((a) => (
        <Card key={a.id}>
          <Txt size={20}>{a.title}</Txt>
          <Txt muted>{states[a.status] || a.status}</Txt>
          <Progress value={a.progress_percent} />
          <Txt>
            {a.points} / {a.max_points} баллов · {a.progress_percent}% изучено
          </Txt>
        </Card>
      ))}
      {person && results.data && !results.data.items.length && (
        <Empty
          title='Обучение ещё не назначено'
          body='Результаты появятся после назначения регламентов и прохождения тестов.'
        />
      )}
      {confirmation && <ConfirmSheet value={confirmation} onClose={() => setConfirmation(null)} />}
    </Page>
  );
}

function PersonName({ person, onSaved }: { person: Person; onSaved: () => void }) {
  const [editing, setEditing] = useState(false),
    [name, setName] = useState(person.full_name),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.request('/business/employees/' + person.id + '/profile', 'PATCH', {
        full_name: name.trim(),
        expected_full_name: person.full_name,
      });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {editing ? (
        <>
          <Field label='Имя и фамилия' value={name} onChangeText={setName} maxLength={160} />
          <Button
            title='Сохранить имя'
            busy={busy}
            disabled={!name.trim()}
            onPress={() => void save()}
          />
          <Button title='Отмена' secondary disabled={busy} onPress={() => setEditing(false)} />
        </>
      ) : (
        <Button
          title='Изменить имя'
          secondary
          compact
          onPress={() => {
            setName(person.full_name);
            setEditing(true);
          }}
        />
      )}
      {!!error && <ErrorState error={error} />}
    </>
  );
}
