import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, useResource } from '../../lib/session';
import type { Position } from '../../lib/types';
import { Page, Card, Txt, Button, Loading, ErrorState } from '../../ui/components';
export default function PositionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    position = useResource<Position>('/business/positions/' + id),
    q = useResource<{
      items: { id: number; name: string; description: string; publication_status: string }[];
    }>('/business/positions/' + id + '/regulations?limit=100'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [message, setMessage] = useState('');
  async function assign(courseId: number) {
    if (!position.data) return;
    setBusy(true);
    try {
      const result = await api.request<{ created: number; already_assigned: number }>(
        '/business/positions/' + id + '/regulations/' + courseId + '/assign',
        'POST',
        { expected_revision: position.data.revision },
      );
      setMessage(
        'Новых назначений: ' + result.created + '. Уже назначено: ' + result.already_assigned + '.',
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title={position.data?.name || 'Регламенты'} back>
      {q.isPending && <Loading />}
      {!!(q.error || error) && (
        <ErrorState error={q.error || error} retry={() => void q.refetch()} />
      )}
      {message && <Txt>{message}</Txt>}
      {q.data?.items.map((r) => (
        <Card key={r.id}>
          <Txt size={21}>{r.name}</Txt>
          <Txt muted>{r.description}</Txt>
          <Button
            title={
              r.publication_status === 'published' ? 'Назначить по должности' : 'Ещё не опубликован'
            }
            busy={busy}
            disabled={r.publication_status !== 'published'}
            onPress={() =>
              Alert.alert(
                'Назначить регламент?',
                r.name + ' будет назначен доступным вам сотрудникам и кандидатам этой должности.',
                [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Назначить', onPress: () => void assign(r.id) },
                ],
              )
            }
          />
        </Card>
      ))}
      <Txt muted size={13}>
        Создание и редактирование материалов доступно в веб-платформе. Здесь можно назначать
        опубликованные регламенты команде.
      </Txt>
    </Page>
  );
}
