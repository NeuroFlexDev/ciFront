import { View } from 'react-native';
import { router } from 'expo-router';
import type { Assignment } from '../lib/types';
import { date, states } from '../lib/types';
import { c } from './theme';
import { Badge, Button, Card, Progress, Txt } from './components';
export function AssignmentCard({ item }: { item: Assignment }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View
        style={{
          height: 96,
          backgroundColor: c.bg,
          flexDirection: 'row',
          gap: 6,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 80 }, (_, i) => (
          <View
            key={i}
            style={{ height: 100, width: 4, backgroundColor: c.inner, borderRadius: 2 }}
          />
        ))}
      </View>
      <View style={{ padding: 24, gap: 12 }}>
        <Badge
          tone={
            item.status === 'overdue'
              ? 'alert'
              : item.status === 'in_progress'
                ? 'accent'
                : 'neutral'
          }
        >
          {states[item.state !== 'active' ? item.state : item.status] || item.status}
        </Badge>
        <Txt size={20} style={{ fontWeight: '600' }}>
          {item.title}
        </Txt>
        <Txt muted size={14}>
          {item.completed_lessons.length} из {item.lesson_count} материалов изучено
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Progress value={item.progress_percent} alert={item.status === 'overdue'} />
          </View>
          <Txt size={12}>{item.progress_percent}%</Txt>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt size={12} muted style={item.status === 'overdue' ? { color: c.alert } : undefined}>
            {date(item.due_at)}
          </Txt>
        </View>
        <Button
          title={
            item.status === 'completed'
              ? 'Открыть материалы'
              : item.progress_percent
                ? 'Продолжить'
                : 'Начать'
          }
          secondary={item.status === 'completed'}
          disabled={item.status === 'locked' || item.state !== 'active'}
          onPress={() => router.push(`/assignment/${item.id}`)}
        />
        {(item.status === 'locked' || item.state !== 'active') && (
          <Txt size={12} muted>
            {item.state !== 'active'
              ? 'Назначение больше не действует. Сохранённые результаты доступны во вкладке «Результаты».'
              : 'Сначала завершите предыдущий этап программы.'}
          </Txt>
        )}
      </View>
    </Card>
  );
}
