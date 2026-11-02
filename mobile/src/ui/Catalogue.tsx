import { useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { api, useSession, useResource } from '../lib/session';
import { API_ORIGIN } from '../lib/config';
import type { Assignment } from '../lib/types';
import { date } from '../lib/types';
import {
  Page,
  Txt,
  Chips,
  Button,
  Badge,
  Progress,
  Loading,
  ErrorState,
  Empty,
  Icon,
} from './components';
import { c } from './theme';

export type Course = {
  id: number;
  title: string | null;
  description: string | null;
  publication_status: 'draft' | 'published';
  module_count: number;
  lesson_count: number;
  updated_at: string;
  author_name?: string | null;
  position_id?: number | null;
  position_name?: string | null;
};
type Report = {
  items: Assignment[];
  metrics: {
    assigned: number;
    completed: number;
    in_progress: number;
    overdue: number;
    pending_reviews: number;
    average_score_percent: number | null;
  };
};
export function Catalogue() {
  const { scope } = useSession(),
    { width } = useWindowDimensions();
  const [filter, setFilter] = useState('all'),
    [selected, setSelected] = useState<Course | null>(null);
  const query = useInfiniteQuery({
    queryKey: [scope, 'catalogue', filter],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.request<Course[]>(
        `/courses/?limit=30&offset=${pageParam}${filter === 'all' ? '' : '&publication_status=' + filter}`,
      ),
    getNextPageParam: (last, all) => (last.length === 30 ? all.flat().length : undefined),
  });
  const items = query.data?.pages.flat() || [];
  return (
    <Page
      title='Регламенты'
      subtitle='Материалы компании, по которым обучается команда'
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      <Chips
        items={[
          { id: 'all', label: 'Все регламенты' },
          { id: 'published', label: 'Опубликованы' },
          { id: 'draft', label: 'Черновики' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button title='Должности' compact secondary onPress={() => router.push('/positions')} />
        <Button
          title='Мои назначения'
          compact
          secondary
          onPress={() => router.push('/my-learning')}
        />
      </View>
      {query.isPending && <Loading />}
      {query.error && <ErrorState error={query.error} retry={() => void query.refetch()} />}
      <View style={{ gap: 24, flexDirection: width >= 700 ? 'row' : 'column', flexWrap: 'wrap' }}>
        {items.map((course) => (
          <View key={course.id} style={{ width: width >= 700 ? '48%' : '100%' }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <View
                style={{
                  flex: 1,
                  minHeight: 90,
                  backgroundColor: c.card,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  padding: 20,
                  gap: 6,
                }}
              >
                <Txt size={14} style={{ color: c.lime }}>
                  Автор регламента
                </Txt>
                <Txt size={18}>{course.author_name || 'Автор не указан'}</Txt>
              </View>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel={`О регламенте ${course.title || 'Без названия'}`}
                onPress={() => setSelected(course)}
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: c.lime,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name='info' size={24} color={c.bg} />
              </Pressable>
              {course.publication_status === 'published' && (
                <Pressable
                  accessibilityRole='button'
                  accessibilityLabel={'Назначить регламент ' + course.title}
                  onPress={() =>
                    router.push(
                      course.position_id ? `/position/${course.position_id}` : '/positions',
                    )
                  }
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: c.lime,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name='assign' color={c.bg} />
                </Pressable>
              )}
            </View>
            <View
              style={{
                backgroundColor: c.card,
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
                borderTopRightRadius: 20,
                padding: 24,
                gap: 20,
                flex: 1,
              }}
            >
              <Txt heading size={20}>
                {course.title || 'Без названия'}
              </Txt>
              {!!course.description && (
                <Txt muted size={14} numberOfLines={3}>
                  {course.description}
                </Txt>
              )}
              <Txt size={14} style={{ color: c.lime }}>
                {course.position_name || 'Общий регламент'}
              </Txt>
              <Badge tone={course.publication_status === 'published' ? 'accent' : 'neutral'}>
                {course.publication_status === 'published' ? 'Опубликован' : 'Черновик'}
              </Badge>
              <Txt muted size={12}>
                Обновлён {date(course.updated_at)}
              </Txt>
              <Button title='Открыть регламент ↗' compact onPress={() => setSelected(course)} />
            </View>
          </View>
        ))}
      </View>
      {!query.isPending && !query.error && !items.length && (
        <Empty
          title='Регламентов пока нет'
          body='Создайте первый регламент в веб-редакторе или выберите другую категорию.'
        />
      )}
      {query.hasNextPage && (
        <Button
          title='Показать ещё'
          secondary
          busy={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        />
      )}
      {selected && <CourseSheet course={selected} close={() => setSelected(null)} />}
    </Page>
  );
}
function CourseSheet({ course, close }: { course: Course; close: () => void }) {
  const insets = useSafeAreaInsets(),
    report = useResource<Report>('/team/results?course_id=' + course.id),
    [error, setError] = useState<unknown>(null);
  const metrics = report.data?.metrics;
  return (
    <Modal transparent animationType='slide' onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0009' }}>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Закрыть информацию'
          onPress={close}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: c.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '92%',
            paddingBottom: insets.bottom + 16,
          }}
        >
          <ScrollView contentContainerStyle={{ padding: 20, gap: 24 }}>
            <View style={{ width: 40, height: 4, borderRadius: 4, backgroundColor: c.line }} />
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
              <Txt heading size={24} style={{ flex: 1 }}>
                {course.title || 'Без названия'}
              </Txt>
              <Button title='Закрыть' compact secondary onPress={close} />
            </View>
            <Txt muted size={14}>
              {course.author_name || 'Автор не указан'} ·{' '}
              {course.position_name || 'Общий регламент'}
            </Txt>
            <Badge tone={course.publication_status === 'published' ? 'accent' : 'neutral'}>
              {course.publication_status === 'published' ? 'Опубликован' : 'Черновик'}
            </Badge>
            {!!course.description && (
              <View style={{ gap: 8 }}>
                <Txt size={18} style={{ fontWeight: '600' }}>
                  О регламенте
                </Txt>
                <Txt size={14} muted>
                  {course.description}
                </Txt>
              </View>
            )}
            {report.isPending && <Loading />}
            {!!(report.error || error) && (
              <ErrorState error={report.error || error} retry={() => void report.refetch()} />
            )}
            {metrics && (
              <>
                <Txt size={18} style={{ fontWeight: '600' }}>
                  Прогресс команды
                </Txt>
                <Progress
                  value={metrics.assigned ? (metrics.completed / metrics.assigned) * 100 : 0}
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {[
                    ['Назначено', metrics.assigned],
                    ['Завершено', metrics.completed],
                    ['Просрочено', metrics.overdue],
                    [
                      'Средний балл',
                      metrics.average_score_percent == null
                        ? '—'
                        : metrics.average_score_percent + '%',
                    ],
                  ].map(([label, value]) => (
                    <View
                      key={label}
                      style={{
                        width: '47%',
                        borderRadius: 16,
                        padding: 16,
                        gap: 6,
                        backgroundColor: c.inner,
                      }}
                    >
                      <Txt size={12} muted>
                        {label}
                      </Txt>
                      <Txt
                        heading
                        size={20}
                        style={{
                          color: label === 'Просрочено' && Number(value) > 0 ? c.alert : c.text,
                        }}
                      >
                        {value}
                      </Txt>
                    </View>
                  ))}
                </View>
                <Txt muted size={12}>
                  Только назначения в вашей области доступа. Отозванные назначения не входят в
                  показатели.
                </Txt>
              </>
            )}
            <Button
              title='Аналитика по регламенту'
              onPress={() => {
                close();
                router.push(`/results?course=${course.id}`);
              }}
            />
            <Button
              title='Открыть веб-редактор'
              secondary
              onPress={() =>
                void WebBrowser.openBrowserAsync(
                  API_ORIGIN + '/courses/' + course.id + '/edit',
                ).catch(setError)
              }
            />
            <Button
              title='Назначить через должность'
              secondary
              onPress={() => {
                close();
                router.push(course.position_id ? `/position/${course.position_id}` : '/positions');
              }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
