import { useState } from 'react';
import { router } from 'expo-router';
import { api, useResource, useSession, queryClient } from '../lib/session';
import type { Position } from '../lib/types';
import {
  Page,
  Card,
  Txt,
  Field,
  Button,
  Loading,
  ErrorState,
  Chips,
  Empty,
} from '../ui/components';
export default function Positions() {
  const [archived, setArchived] = useState('current');
  const q = useResource<{ items: Position[] }>(
      '/business/positions?limit=100&archived=' + (archived === 'archived'),
    ),
    { scope } = useSession(),
    [name, setName] = useState(''),
    [description, setDescription] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function create() {
    setBusy(true);
    try {
      await api.request('/business/positions', 'POST', { name, description });
      setName('');
      setDescription('');
      await queryClient.invalidateQueries({ queryKey: [scope] });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title='Должности' back>
      <Chips
        value={archived}
        onChange={setArchived}
        items={[
          { id: 'current', label: 'Действующие' },
          { id: 'archived', label: 'Архив' },
        ]}
      />
      {q.isPending && <Loading />}
      {!!(q.error || error) && (
        <ErrorState error={q.error || error} retry={() => void q.refetch()} />
      )}
      {q.data?.items.map((p) => (
        <Card key={p.id}>
          <Txt size={22}>{p.name}</Txt>
          <Txt muted>{p.description}</Txt>
          <Button
            title='Регламенты должности'
            secondary
            onPress={() => router.push('/position/' + p.id)}
          />
        </Card>
      ))}
      {q.data && !q.data.items.length && (
        <Empty
          title={archived === 'archived' ? 'Архив пуст' : 'Должностей пока нет'}
          body={
            archived === 'archived'
              ? 'Архивные должности и их регламенты можно восстановить.'
              : 'Добавьте первую должность и соберите регламенты для команды.'
          }
        />
      )}
      <Card>
        <Txt size={22}>Новая должность</Txt>
        <Field label='Название' value={name} onChangeText={setName} maxLength={200} />
        <Field
          label='Описание'
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={3000}
        />
        <Button
          title='Создать должность'
          disabled={!name.trim()}
          busy={busy}
          onPress={() => void create()}
        />
      </Card>
    </Page>
  );
}
