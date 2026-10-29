import { useState } from 'react';
import { router, Redirect } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api, useSession } from '../../lib/session';
import { manages, roles, type Person } from '../../lib/types';
import { Page, Card, Txt, Button, Field, Loading, ErrorState, Empty } from '../../ui/components';
export default function Team() {
  const { user, scope } = useSession(),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('');
  const q = useInfiniteQuery({
    queryKey: [scope, 'people', filter],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.request<{ items: Person[]; total: number }>(
        '/business/employees?limit=30&offset=' + pageParam + '&q=' + encodeURIComponent(filter),
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
      <Button title='Добавить участника' onPress={() => router.push('/person/new')} />
      <Button title='Должности и регламенты' secondary onPress={() => router.push('/positions')} />
      <Button title='Ответы на проверку' secondary onPress={() => router.push('/reviews')} />
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
        .map((p) => (
          <Card key={p.id}>
            <Txt size={21}>{p.full_name || p.username}</Txt>
            <Txt muted>
              {roles[p.organization_role] || p.organization_role} ·{' '}
              {p.is_active ? 'Доступ открыт' : 'Доступ закрыт'}
            </Txt>
            <Txt muted size={14}>
              {p.position_name || 'Должность не назначена'}
            </Txt>
            <Button
              title='Профиль и результаты'
              secondary
              onPress={() => router.push('/person/' + p.id)}
            />
          </Card>
        ))}
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
