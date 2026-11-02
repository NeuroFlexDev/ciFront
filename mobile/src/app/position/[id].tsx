import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { api, useResource, useSession, queryClient } from '../../lib/session';
import type { Position } from '../../lib/types';
import { Page, Card, Txt, Button, Loading, ErrorState, Empty, Badge } from '../../ui/components';
import { ConfirmSheet, type Confirmation } from '../../ui/ConfirmSheet';
export default function PositionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { scope } = useSession(),
    position = useResource<Position>('/business/positions/' + id),
    q = useResource<{
      items: {
        id: number;
        name: string;
        description: string;
        publication_status: string;
        status: string;
        content_revision: number;
      }[];
    }>('/business/positions/' + id + '/regulations?limit=100'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [message, setMessage] = useState(''),
    [confirmation, setConfirmation] = useState<Confirmation | null>(null);
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
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title={position.data?.name || 'Регламенты'} back>
      {(q.isPending || position.isPending) && <Loading />}
      {!!(q.error || position.error || error) && (
        <ErrorState
          error={q.error || position.error || error}
          retry={() => {
            setError(null);
            void q.refetch();
            void position.refetch();
          }}
        />
      )}
      {message && <Txt>{message}</Txt>}
      {position.data && (
        <Card>
          <Badge>
            {position.data.is_archived ? 'Должность в архиве' : 'Действующая должность'}
          </Badge>
          <Txt muted>
            {position.data.description || 'Регламенты и обучение сотрудников этой должности.'}
          </Txt>
          <Button
            title={position.data.is_archived ? 'Восстановить должность' : 'В архив'}
            secondary
            disabled={busy}
            onPress={() => {
              const p = position.data!;
              setConfirmation({
                title: `${p.is_archived ? 'Восстановить' : 'Архивировать'} «${p.name}»?`,
                description: p.is_archived
                  ? 'Должность снова будет доступна для новых участников и регламентов. Отозванные приглашения останутся недействительными.'
                  : 'Должность исчезнет из рабочего списка. Регламенты, назначения и результаты сохранятся. Неиспользованные приглашения на эту должность будут отозваны. Должность можно восстановить из архива.',
                actionLabel: p.is_archived ? 'Восстановить' : 'В архив',
                action: async () => {
                  await api.request('/business/positions/' + id + '/state', 'PUT', {
                    expected_revision: p.revision,
                    is_archived: !p.is_archived,
                  });
                  setMessage(
                    p.is_archived
                      ? 'Должность восстановлена.'
                      : 'Должность перенесена в архив. Результаты сохранены.',
                  );
                  void queryClient.invalidateQueries({ queryKey: [scope] });
                },
              });
            }}
          />
        </Card>
      )}
      {q.data?.items.map((r) => (
        <Card key={r.id}>
          <Txt size={21}>{r.name}</Txt>
          <Txt muted>{r.description}</Txt>
          <Button
            title={
              r.publication_status === 'published' ? 'Назначить по должности' : 'Ещё не опубликован'
            }
            busy={busy}
            disabled={
              r.publication_status !== 'published' || !!position.data?.is_archived || !position.data
            }
            onPress={() =>
              setConfirmation({
                title: 'Назначить регламент?',
                description:
                  r.name + ' будет назначен доступным вам сотрудникам и кандидатам этой должности.',
                actionLabel: 'Назначить',
                action: () => assign(r.id),
              })
            }
          />
          <Button
            title={r.status === 'generating' ? 'Удаление после генерации' : 'Удалить регламент'}
            secondary
            disabled={busy || r.status === 'generating'}
            onPress={() =>
              setConfirmation({
                title: `Удалить «${r.name}»?`,
                description:
                  'Регламент исчезнет из каталога и должности. Новые назначения будут недоступны. Уже выданные материалы, ответы и результаты сохранятся. Восстановить регламент сможет оператор платформы из архива.',
                actionLabel: 'Удалить регламент',
                danger: true,
                action: async () => {
                  await api.request(
                    '/courses/' + r.id + '?expected_revision=' + r.content_revision,
                    'DELETE',
                  );
                  setMessage('Регламент удалён. Выданные материалы и результаты сохранены.');
                  void queryClient.invalidateQueries({ queryKey: [scope] });
                },
              })
            }
          />
        </Card>
      ))}
      {q.data && !q.data.items.length && (
        <Empty
          title='Регламентов пока нет'
          body='Создайте регламент в веб-платформе. После публикации его можно назначить команде.'
        />
      )}
      <Txt muted size={13}>
        Создание и редактирование материалов доступно в веб-платформе. Здесь можно назначать
        опубликованные регламенты команде.
      </Txt>
      {confirmation && <ConfirmSheet value={confirmation} onClose={() => setConfirmation(null)} />}
    </Page>
  );
}
