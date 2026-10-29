import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, useSession } from '../../lib/session';
import type { Assignment } from '../../lib/types';
import { states, date } from '../../lib/types';
import { Page, Card, Txt, Button, Loading, ErrorState, Empty, Progress } from '../../ui/components';
export default function Results() {
  const { scope, user } = useSession();
  const q = useInfiniteQuery({
    queryKey: [scope, 'assignment-history'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.request<{ items: Assignment[]; total: number }>(
        `/learning/assignments?include_history=true&limit=30&offset=${pageParam}`,
      ),
    getNextPageParam: (last, pages) => {
      const count = pages.reduce((n, page) => n + page.items.length, 0);
      return count < last.total && last.items.length ? count : undefined;
    },
    enabled: !!user?.organization_id,
  });
  const items = q.data?.pages.flatMap((page) => page.items) || [];
  return (
    <Page title='Мои результаты' refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      {q.isPending && <Loading />}
      {q.error && <ErrorState error={q.error} retry={() => void q.refetch()} />}
      {items.map((a) => (
        <Card key={a.id}>
          <Txt size={20}>{a.title}</Txt>
          <Txt muted>
            {states[a.state !== 'active' ? a.state : a.status] || a.status} · {date(a.due_at)}
          </Txt>
          <Txt heading size={32}>
            {a.points} / {a.max_points}
          </Txt>
          <Progress value={a.score_percent || 0} />
          <Txt muted size={13}>
            На проверке: {a.pending_reviews}
          </Txt>
          <Button
            title='Ответы и обратная связь'
            secondary
            onPress={() => router.push(`/assignment/${a.id}?results=1`)}
          />
        </Card>
      ))}
      {q.data && !items.length && (
        <Empty
          title='Всё ещё впереди'
          body='Пройдите назначенное обучение — здесь появятся ваши баллы и обратная связь.'
        />
      )}
      {q.hasNextPage && (
        <Button
          title='Загрузить ещё'
          secondary
          busy={q.isFetchingNextPage}
          onPress={() => void q.fetchNextPage()}
        />
      )}
    </Page>
  );
}
