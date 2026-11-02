import { useState } from 'react';
import { View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, useSession, useResource } from '../../lib/session';
import { manages, roles, type Person } from '../../lib/types';
import {
  Page,
  Card,
  Txt,
  Button,
  Field,
  Loading,
  ErrorState,
  Empty,
  Avatar,
  Badge,
  Chips,
  Progress,
} from '../../ui/components';
import { c } from '../../ui/theme';
export default function Team() {
  const { user, scope } = useSession(),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState(''),
    [role, setRole] = useState('all');
  const report = useResource<{
    items: { user_id: number; state: string; status: string; progress_percent: number }[];
  }>(manages(user) ? '/team/results' : null);
  const q = useInfiniteQuery({
    queryKey: [scope, 'people', filter, role],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.request<{ items: Person[]; total: number }>(
        '/business/employees?limit=30&offset=' +
          pageParam +
          '&q=' +
          encodeURIComponent(filter) +
          (role === 'all' ? '' : '&role=' + role),
      ),
    getNextPageParam: (last, all) => {
      const n = all.reduce((s, p) => s + p.items.length, 0);
      return n < last.total ? n : undefined;
    },
    enabled: manages(user),
  });
  if (!manages(user)) return <Redirect href='/' />;
  return (
    <Page
      title='Команда'
      subtitle={
        user?.organization_role === 'owner'
          ? 'Руководители, сотрудники и кандидаты компании'
          : 'Ваши сотрудники и кандидаты'
      }
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
    >
      <Chips
        value={role}
        onChange={setRole}
        items={[
          { id: 'all', label: 'Вся команда' },
          ...(user?.organization_role === 'owner'
            ? [{ id: 'manager', label: 'Руководители' }]
            : []),
          { id: 'member', label: 'Сотрудники' },
          { id: 'candidate', label: 'Кандидаты' },
        ]}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title='+ Добавить участника' compact onPress={() => router.push('/person/new')} />
        <Button title='Должности' compact secondary onPress={() => router.push('/positions')} />
      </View>
      <Field
        label='Поиск по имени или логину'
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => setFilter(search)}
        returnKeyType='search'
      />
      <Button title='Найти' secondary onPress={() => setFilter(search)} />
      {q.isPending && <Loading />}
      {q.error && <ErrorState error={q.error} retry={() => void q.refetch()} />}
      {q.data?.pages
        .flatMap((p) => p.items)
        .map((p) => {
          const assignments =
              report.data?.items.filter((a) => a.user_id === p.id && a.state === 'active') || [],
            percent = assignments.length
              ? Math.round(
                  assignments.reduce((n, a) => n + a.progress_percent, 0) / assignments.length,
                )
              : 0;
          return (
            <Card key={p.id}>
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <Avatar name={p.full_name || p.username} size={60} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Txt size={18} style={{ fontWeight: '600' }}>
                    {p.full_name || p.username}
                  </Txt>
                  <Txt size={13} style={{ color: c.lime }}>
                    {p.position_name || roles[p.organization_role] || p.organization_role}
                  </Txt>
                </View>
              </View>
              {!p.is_active && <Badge>Доступ закрыт</Badge>}
              {report.data && (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <Txt muted size={12}>
                      {assignments.length ? 'Прогресс по назначениям' : 'Обучение ещё не назначено'}
                    </Txt>
                    {assignments.length > 0 && <Txt size={12}>{percent}%</Txt>}
                  </View>
                  <Progress value={percent} />
                </>
              )}
              <Button
                title='Профиль и результаты'
                secondary
                onPress={() => router.push('/person/' + p.id)}
                compact
              />
            </Card>
          );
        })}
      {q.data && !q.data.pages[0].total && (
        <Empty
          title='Никого не найдено'
          body='Измените поиск или добавьте первого участника команды.'
        />
      )}
      {q.hasNextPage && (
        <Button
          title='Показать ещё'
          secondary
          busy={q.isFetchingNextPage}
          onPress={() => void q.fetchNextPage()}
        />
      )}
    </Page>
  );
}
