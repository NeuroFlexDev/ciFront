import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
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
  const { id } = useLocalSearchParams<{ id: string }>(),
    { scope, user } = useSession(),
    people = useResource<{ items: Person[] }>('/business/employees?user_id=' + id),
    results = useResource<{ items: Assignment[] }>('/team/results?user_id=' + id),
    positions = useResource<{ items: Position[] }>('/business/positions?limit=100'),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const person = people.data?.items.find((p) => p.id === Number(id));
  async function position(value: string) {
    if (!person) return;
    setBusy(true);
    try {
      await api.request('/business/employees/' + id + '/position', 'PUT', {
        position_id: value === 'none' ? null : Number(value),
        expected_position_id: person.position_id,
      });
      await queryClient.invalidateQueries({ queryKey: [scope] });
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
          {person.id !== user?.id && (
            <PersonName
              key={person.id}
              person={person}
              onSaved={() => {
                void people.refetch();
                void queryClient.invalidateQueries({ queryKey: [scope, 'people'] });
              }}
            />
          )}
          {['member', 'candidate'].includes(person.organization_role) && (
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
