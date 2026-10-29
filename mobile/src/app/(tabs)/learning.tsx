import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, useSession } from '../../lib/session';
import type { Assignment } from '../../lib/types';
import { Page, Chips, Loading, ErrorState, Empty, Button } from '../../ui/components';
import { AssignmentCard } from '../../ui/AssignmentCard';
export default function Learning() {
  const { scope, user } = useSession(),
    [filter, setFilter] = useState('all');
  const query = useInfiniteQuery({
    queryKey: [scope, 'assignments'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.request<{ items: Assignment[]; total: number }>(
        `/learning/assignments?limit=30&offset=${pageParam}`,
      ),
    getNextPageParam: (last, all) => {
      const count = all.reduce((n, p) => n + p.items.length, 0);
      return count < last.total ? count : undefined;
    },
    enabled: !!user?.organization_id,
  });
  const items = query.data?.pages.flatMap((p) => p.items) || [],
    visible = items.filter(
      (a) =>
        filter === 'all' ||
        (filter === 'in_progress'
          ? ['assigned', 'in_progress'].includes(a.status)
          : a.status === filter),
    );
  return (
    <Page
      title={user?.organization_kind === 'business' ? 'Мои регламенты' : 'Моё обучение'}
      subtitle='Изучайте материалы, проходите тесты и отслеживайте результат.'
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <Chips
        items={[
          { id: 'all', label: 'Все' },
          { id: 'in_progress', label: 'В процессе' },
          { id: 'overdue', label: 'Срок истёк' },
          { id: 'completed', label: 'Завершено' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {query.isPending && <Loading />}
      {query.error && <ErrorState error={query.error} retry={() => void query.refetch()} />}
      {visible.map((item) => (
        <AssignmentCard key={item.id} item={item} />
      ))}
      {!query.isPending && !query.error && !visible.length && (
        <Empty
          title='Назначений пока нет'
          body='Когда руководитель назначит вам обучение, оно появится здесь. Потяните экран вниз, чтобы обновить список.'
        />
      )}
      {query.hasNextPage && (
        <Button
          title='Загрузить ещё'
          busy={query.isFetchingNextPage}
          secondary
          onPress={() => void query.fetchNextPage()}
        />
      )}
    </Page>
  );
}
