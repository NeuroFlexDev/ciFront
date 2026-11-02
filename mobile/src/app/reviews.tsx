import { router } from 'expo-router';
import { useResource } from '../lib/session';
import type { Review } from '../lib/types';
import { Page, Card, Txt, Button, Loading, ErrorState, Empty } from '../ui/components';
export default function Reviews() {
  const q = useResource<{ items: Review[] }>('/learning/reviews');
  return (
    <Page title='Проверки' back refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      {q.isPending && <Loading />}
      {q.error && <ErrorState error={q.error} retry={() => void q.refetch()} />}
      {q.data?.items.map((r) => (
        <Card key={r.id}>
          <Txt size={20}>{r.full_name}</Txt>
          <Txt muted>{r.course_title}</Txt>
          <Txt>{r.assessment.question}</Txt>
          <Button title='Проверить ответ' onPress={() => router.push('/review/' + r.id)} />
        </Card>
      ))}
      {q.data && !q.data.items.length && (
        <Empty
          title='Все работы проверены'
          body='Здесь появятся ответы ваших сотрудников и кандидатов, которым нужна ручная оценка.'
        />
      )}
    </Page>
  );
}
