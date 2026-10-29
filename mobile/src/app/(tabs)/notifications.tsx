import { useState } from 'react';
import { Pressable, View, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api, useSession, queryClient } from '../../lib/session';
import type { Inbox, Notice } from '../../lib/types';
import { date } from '../../lib/types';
import { noticeRoute } from '../../lib/push';
import { Page, Txt, Button, Chips, Loading, ErrorState, Empty } from '../../ui/components';
import { c } from '../../ui/theme';
export default function NotificationCenter() {
  const { scope } = useSession(),
    [filter, setFilter] = useState('all'),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const query = useInfiniteQuery({
    queryKey: [scope, 'inbox', filter],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) =>
      api.request<Inbox>(
        '/notifications?limit=30' +
          (pageParam ? '&before_id=' + pageParam : '') +
          (filter === 'unread' ? '&unread=true' : filter !== 'all' ? '&category=' + filter : ''),
      ),
    getNextPageParam: (p) => p.next_cursor,
  });
  const first = query.data?.pages[0],
    items = query.data?.pages.flatMap((p) => p.items) || [];
  async function mark(note?: Notice) {
    setBusy(true);
    setError(null);
    try {
      await api.request(
        note ? '/notifications/' + note.id + '/read' : '/notifications/read-all',
        'POST',
        note ? undefined : { through_id: first?.latest_id || 0 },
      );
      await queryClient.invalidateQueries({ queryKey: [scope] });
      if (Platform.OS !== 'web')
        await Notifications.setBadgeCountAsync(
          Math.max(0, (first?.unread_count || 0) - (note ? 1 : first?.unread_count || 0)),
        );
      if (note) router.push(noticeRoute(note));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title='Уведомления'
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <Button
        title={first?.unread_count ? 'Прочитать все · ' + first.unread_count : 'Всё прочитано'}
        secondary
        disabled={!first?.unread_count}
        busy={busy}
        onPress={() => void mark()}
      />
      <Chips
        items={[
          { id: 'all', label: 'Все' },
          { id: 'unread', label: 'Непрочитанные' },
          { id: 'assignment', label: 'Назначения' },
          { id: 'result', label: 'Результаты' },
          { id: 'review', label: 'Проверки' },
          { id: 'deadline', label: 'Сроки' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {query.isPending && <Loading />}
      {!!(query.error || error) && (
        <ErrorState error={query.error || error} retry={() => void query.refetch()} />
      )}
      <View style={{ gap: 8 }}>
        {items.map((note) => (
          <Pressable
            key={note.id}
            accessibilityRole='button'
            onPress={() => void mark(note)}
            disabled={busy}
            style={{
              padding: 12,
              borderRadius: 16,
              backgroundColor: note.read_at ? 'transparent' : c.card,
              flexDirection: 'row',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: note.category === 'deadline' ? '#382019' : '#272D1A',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Txt style={{ color: note.category === 'deadline' ? c.alert : c.lime }}>
                {note.category === 'deadline' ? '!' : '✓'}
              </Txt>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Txt size={14}>{note.title}</Txt>
              <Txt muted size={12}>
                {note.body}
              </Txt>
              <Txt muted size={11}>
                {date(note.created_at)}
              </Txt>
            </View>
            {!note.read_at && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: c.lime,
                  marginTop: 5,
                }}
              />
            )}
          </Pressable>
        ))}
      </View>
      {!query.isPending && !query.error && !items.length && (
        <Empty
          title={filter === 'unread' ? 'Всё прочитано' : 'Пока тихо'}
          body='Здесь появятся назначения, сроки и результаты. История сохраняется между устройствами.'
        />
      )}
      {query.hasNextPage && (
        <Button
          title='Более ранние'
          secondary
          busy={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        />
      )}
      <Button
        title='Настройки уведомлений'
        secondary
        onPress={() => router.push('/notification-settings')}
      />
    </Page>
  );
}
