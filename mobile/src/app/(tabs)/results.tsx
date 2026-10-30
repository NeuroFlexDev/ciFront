import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, useSession, useResource } from '../../lib/session';
import type { Assignment, Detail } from '../../lib/types';
import { states, date, manages } from '../../lib/types';
import { latestResponses, resultSummary } from '../../lib/learning-summary';
import {
  Page,
  Card,
  Txt,
  Button,
  Loading,
  ErrorState,
  Empty,
  Progress,
  Badge,
  Chips,
} from '../../ui/components';
import { c } from '../../ui/theme';
type Report = {
  items: (Assignment & { user_id: number; full_name: string })[];
  metrics: {
    assigned: number;
    completed: number;
    overdue: number;
    pending_reviews: number;
    average_score_percent: number | null;
  };
};
export default function Results() {
  const { user } = useSession(),
    params = useLocalSearchParams<{ view?: string; course?: string }>();
  return manages(user) && params.view !== 'mine' ? (
    <TeamResults course={params.course} />
  ) : (
    <PersonalResults />
  );
}
const minWidth = (width: number) => Math.min(width - 40, 920);
function MetricGrid({
  items,
}: {
  items: { label: string; value: string | number; alert?: boolean }[];
}) {
  const { width } = useWindowDimensions(),
    small = width < 360,
    cell = (minWidth(width) - 24) / 2;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
      {items.map((item) => (
        <Card
          key={item.label}
          style={{ width: cell, padding: small ? 16 : 24, gap: 8, minHeight: 160 }}
        >
          <Txt muted size={12}>
            {item.label}
          </Txt>
          <Txt heading size={small ? 28 : 36} style={{ color: item.alert ? c.alert : c.text }}>
            {item.value}
          </Txt>
        </Card>
      ))}
    </View>
  );
}
function TeamResults({ course }: { course?: string }) {
  const [filter, setFilter] = useState('all');
  const report = useResource<Report>(
    '/team/results' + (course && /^\d+$/.test(course) ? '?course_id=' + course : ''),
  );
  const metrics = report.data?.metrics,
    items =
      report.data?.items.filter(
        (a) =>
          filter === 'all' || (filter === 'pending' ? a.pending_reviews > 0 : a.status === filter),
      ) || [];
  return (
    <Page
      title={course ? 'Результаты регламента' : 'Результаты команды'}
      subtitle='Прогресс, проверки и сроки в вашей области доступа'
      refreshing={report.isRefetching}
      onRefresh={() => void report.refetch()}
    >
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Button title='Ответы на проверку' compact onPress={() => router.push('/reviews')} />
        <Button
          title='Мои результаты'
          compact
          secondary
          onPress={() => router.setParams({ view: 'mine' })}
        />
      </View>
      {report.isPending && <Loading />}
      {report.error && <ErrorState error={report.error} retry={() => void report.refetch()} />}
      {metrics && (
        <MetricGrid
          items={[
            { label: 'Завершено', value: metrics.completed },
            {
              label: 'Средний балл',
              value:
                metrics.average_score_percent == null
                  ? '—'
                  : Math.round(metrics.average_score_percent) + '%',
            },
            { label: 'На проверке', value: metrics.pending_reviews },
            { label: 'Срок истёк', value: metrics.overdue, alert: metrics.overdue > 0 },
          ]}
        />
      )}
      <Chips
        value={filter}
        onChange={setFilter}
        items={[
          { id: 'all', label: 'Все' },
          { id: 'pending', label: 'На проверке' },
          { id: 'completed', label: 'Завершено' },
          { id: 'overdue', label: 'Просрочено' },
        ]}
      />
      {items.map((a) => (
        <Card key={a.id}>
          <Badge
            tone={
              a.status === 'completed' ? 'accent' : a.status === 'overdue' ? 'alert' : 'neutral'
            }
          >
            {states[a.state !== 'active' ? a.state : a.status] || a.status}
          </Badge>
          <Txt heading size={18}>
            {a.title}
          </Txt>
          <Txt size={14}>{a.full_name}</Txt>
          <Progress value={a.progress_percent} />
          <Txt muted size={13}>
            {a.progress_percent}% изучено · {date(a.due_at)}
          </Txt>
          <Txt size={14}>
            {a.score_percent == null
              ? 'Оценки ещё нет'
              : a.points + ' из ' + a.max_points + ' баллов'}
            {a.pending_reviews ? ' · На проверке: ' + a.pending_reviews : ''}
          </Txt>
          <Button
            title='Профиль и результаты сотрудника'
            compact
            secondary
            onPress={() => router.push('/person/' + a.user_id)}
          />
        </Card>
      ))}
      {report.data && !items.length && (
        <Empty
          title='Нет результатов в этой категории'
          body='Назначьте обучение команде или выберите другой фильтр.'
        />
      )}
    </Page>
  );
}
function PersonalResults() {
  const { scope, user } = useSession(),
    [filter, setFilter] = useState('all');
  const q = useInfiniteQuery({
    queryKey: [scope, 'assignment-history'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.request<{ items: Assignment[]; total: number }>(
        '/learning/assignments?include_history=true&limit=30&offset=' + pageParam,
      ),
    getNextPageParam: (last, pages) => {
      const count = pages.reduce((n, p) => n + p.items.length, 0);
      return count < last.total && last.items.length ? count : undefined;
    },
    enabled: !!user?.organization_id,
  });
  const items = q.data?.pages.flatMap((p) => p.items) || [],
    active = items.filter((a) => a.state === 'active'),
    graded = active.filter((a) => a.score_percent != null);
  const summary = {
    completed: active.filter((a) => a.status === 'completed').length,
    pending: active.reduce((n, a) => n + a.pending_reviews, 0),
    overdue: active.filter((a) => a.status === 'overdue').length,
    score: graded.length
      ? Math.round(graded.reduce((n, a) => n + (a.score_percent || 0), 0) / graded.length)
      : null,
  };
  const visible = items.filter(
    (a) => filter === 'all' || (filter === 'pending' ? a.pending_reviews > 0 : a.status === filter),
  );
  return (
    <Page
      title='Мои результаты'
      subtitle='Ваш прогресс, оценки и обратная связь'
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
    >
      {manages(user) && (
        <Button
          title='Результаты команды'
          compact
          secondary
          onPress={() => router.setParams({ view: 'team' })}
        />
      )}
      {q.isPending && !!user?.organization_id && <Loading />}
      {q.error && <ErrorState error={q.error} retry={() => void q.refetch()} />}
      {q.data && (
        <>
          <MetricGrid
            items={[
              { label: 'Завершено', value: summary.completed },
              { label: 'Средний балл', value: summary.score == null ? '—' : summary.score + '%' },
              { label: 'На проверке', value: summary.pending },
              { label: 'Срок истёк', value: summary.overdue, alert: summary.overdue > 0 },
            ]}
          />
          {q.hasNextPage && (
            <Txt muted size={12}>
              Показатели по загруженным {items.length} из {q.data.pages[0].total} назначений.
              Загрузите остальные для полного итога.
            </Txt>
          )}
        </>
      )}
      <Chips
        value={filter}
        onChange={setFilter}
        items={[
          { id: 'all', label: 'Все результаты' },
          { id: 'pending', label: 'На проверке' },
          { id: 'completed', label: 'Завершено' },
        ]}
      />
      {visible.map((a) => (
        <ResultCard key={a.id} assignment={a} />
      ))}
      {(!user?.organization_id || (q.data && !visible.length)) && (
        <Empty
          title='Всё ещё впереди'
          body='После прохождения назначенного обучения здесь появятся ваши баллы и обратная связь.'
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
function ResultCard({ assignment: a }: { assignment: Assignment }) {
  const [open, setOpen] = useState(false),
    detail = useResource<Detail>(open ? '/learning/assignments/' + a.id : null);
  const questions = [
    ...(detail.data?.content.assessments || []),
    ...(detail.data?.content.modules.flatMap((m) => m.assessments) || []),
  ];
  const summary = detail.data ? resultSummary([a], [detail.data]) : null;
  return (
    <Card>
      <Badge tone={a.status === 'completed' ? 'accent' : 'neutral'}>
        {states[a.state !== 'active' ? a.state : a.status] || a.status}
      </Badge>
      <Txt heading size={18}>
        {a.title}
      </Txt>
      <Txt muted size={13}>
        {date(a.due_at)} · {a.progress_percent}% изучено
      </Txt>
      <Progress value={a.progress_percent} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <Txt size={14}>
          {a.score_percent == null ? 'Оценки ещё нет' : a.points + ' / ' + a.max_points + ' баллов'}
        </Txt>
        <Txt size={13} muted>
          На проверке: {a.pending_reviews}
        </Txt>
      </View>
      <Button
        title={open ? 'Свернуть ответы' : 'Посмотреть ответы и оценки'}
        secondary
        compact
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          {detail.isPending && <Loading />}
          {detail.error && <ErrorState error={detail.error} retry={() => void detail.refetch()} />}
          {summary?.score != null && (
            <Txt muted size={12}>
              По проверенным ответам: {summary.score}% · {summary.graded} оценок
            </Txt>
          )}
          {detail.data &&
            latestResponses(detail.data.responses).map((response) => (
              <View
                key={response.id}
                style={{ padding: 16, borderRadius: 16, backgroundColor: c.bg, gap: 10 }}
              >
                <Txt size={14}>
                  {questions.find((q) => q.id === response.assessment_id)?.question || 'Задание'}
                </Txt>
                <Txt muted size={13} selectable>
                  {response.answer.text || response.answer.selected?.join(', ') || 'Без ответа'}
                </Txt>
                <Badge tone={response.status === 'reviewed' ? 'accent' : 'neutral'}>
                  {response.status === 'pending_review'
                    ? 'На проверке'
                    : response.points == null
                      ? 'Черновик'
                      : response.points + ' / ' + response.max_points + ' баллов'}
                </Badge>
                {!!response.feedback && <Txt size={13}>{response.feedback}</Txt>}
              </View>
            ))}
          {detail.data && !detail.data.responses.length && (
            <Txt muted size={14}>
              Ответов пока нет. Перейдите к тестам, чтобы начать.
            </Txt>
          )}
          <Button
            title='Открыть тесты и обратную связь'
            onPress={() => router.push('/assignment/' + a.id + '?results=1')}
          />
        </>
      )}
    </Card>
  );
}
