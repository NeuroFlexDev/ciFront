import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { api, useResource, useSession, queryClient } from '../../lib/session';
import type { Person, Assignment, Position } from '../../lib/types';
import { roles, states } from '../../lib/types';
import { Page, Card, Txt, Chips, Loading, ErrorState } from '../../ui/components';
export default function PersonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { scope } = useSession(),
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
          <Txt>{roles[person.organization_role] || person.organization_role}</Txt>
          <Txt muted>{person.email || person.username}</Txt>
          <Txt size={20}>Должность</Txt>
          <Chips
            items={[
              { id: 'none', label: 'Не назначена' },
              ...(positions.data?.items || []).map((p) => ({ id: String(p.id), label: p.name })),
            ]}
            value={person.position_id ? String(person.position_id) : 'none'}
            onChange={(value) => {
              if (!busy) void position(value);
            }}
          />
        </Card>
      )}
      <Txt heading size={24}>
        Результаты обучения
      </Txt>
      {results.data?.items.map((a) => (
        <Card key={a.id}>
          <Txt size={20}>{a.title}</Txt>
          <Txt muted>{states[a.status] || a.status}</Txt>
          <Txt>
            {a.points} / {a.max_points} баллов · {a.progress_percent}% изучено
          </Txt>
        </Card>
      ))}
    </Page>
  );
}
