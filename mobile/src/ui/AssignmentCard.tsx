import { View } from 'react-native';
import { router } from 'expo-router';
import type { Assignment } from '../lib/types';
import { date, states } from '../lib/types';
import { c } from './theme';
import { Button, Card, Progress, Txt } from './components';
export function AssignmentCard({ item }: { item: Assignment }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View
        style={{
          height: 92,
          backgroundColor: c.inner,
          flexDirection: 'row',
          gap: 6,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 80 }, (_, i) => (
          <View key={i} style={{ height: 100, width: 4, backgroundColor: '#414141' }} />
        ))}
      </View>
      <View style={{ padding: 24, gap: 16 }}>
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: item.status === 'overdue' ? '#3B211B' : '#252A17',
          }}
        >
          <Txt size={12} style={{ color: item.status === 'overdue' ? c.alert : c.lime }}>
            {states[item.status] || item.status}
          </Txt>
        </View>
        <Txt size={21} style={{ fontWeight: '600' }}>
          {item.title}
        </Txt>
        <Txt muted size={14}>
          {item.completed_lessons.length} из {item.lesson_count} материалов изучено
        </Txt>
        <Progress value={item.progress_percent} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt size={13} muted>
            {date(item.due_at)}
          </Txt>
          <Txt size={13}>{item.progress_percent}%</Txt>
        </View>
        <Button
          title={
            item.status === 'completed'
              ? 'Материалы и результаты'
              : item.progress_percent
                ? 'Продолжить'
                : 'Открыть'
          }
          secondary={item.status === 'completed'}
          disabled={item.status === 'locked' || item.state !== 'active'}
          onPress={() => router.push(`/assignment/${item.id}`)}
        />
      </View>
    </Card>
  );
}
