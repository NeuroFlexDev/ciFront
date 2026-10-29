import { View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useResource, useSession } from '../../lib/session';
import { manages, roles, type Assignment } from '../../lib/types';
import { Page, Card, Txt, Progress, Button, Loading, ErrorState } from '../../ui/components';
import { AssignmentCard } from '../../ui/AssignmentCard';

type Overview = {
  company_name: string;
  employees: number;
  candidates: number;
  metrics: { assigned: number; completed: number; overdue: number; pending_reviews: number };
  managers: {
    id: number;
    full_name: string;
    employees: number;
    candidates: number;
    completed: number;
    assigned: number;
  }[];
};
export default function Home() {
  const { user } = useSession(),
    manager = manages(user);
  const company = useResource<Overview>(manager ? '/business/dashboard' : null);
  const mine = useResource<{ items: Assignment[]; total: number }>(
    !manager && user?.organization_id ? '/learning/assignments?limit=5' : null,
  );
  const data = company.data;
  return (
    <Page
      title={manager ? 'Обзор компании' : 'Ваше обучение'}
      subtitle={
        user?.full_name
          ? user.full_name + ' · ' + roles[user.organization_role]
          : roles[user?.organization_role || 'member']
      }
      refreshing={company.isRefetching || mine.isRefetching}
      onRefresh={() => void (manager ? company.refetch() : mine.refetch())}
    >
      {(manager ? company.isPending : mine.isPending) && <Loading />}
      {(company.error || mine.error) && (
        <ErrorState
          error={company.error || mine.error}
          retry={() => void (manager ? company.refetch() : mine.refetch())}
        />
      )}
      {data && (
        <>
          <Card>
            <Txt size={21}>{data.company_name}</Txt>
            <Txt muted size={14}>
              {user?.organization_role === 'owner'
                ? 'Все команды компании'
                : 'Сотрудники и кандидаты вашей команды'}
            </Txt>
            <Txt heading size={48}>
              {data.metrics.assigned
                ? Math.round((data.metrics.completed / data.metrics.assigned) * 100)
                : 0}
              %
            </Txt>
            <Progress
              value={
                data.metrics.assigned ? (data.metrics.completed / data.metrics.assigned) * 100 : 0
              }
            />
            <Txt muted size={14}>
              Завершено {data.metrics.completed} из {data.metrics.assigned} назначений
            </Txt>
          </Card>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Card style={{ flex: 1, padding: 20 }}>
              <Txt heading size={30}>
                {data.employees}
              </Txt>
              <Txt muted size={13}>
                Сотрудников
              </Txt>
            </Card>
            <Card style={{ flex: 1, padding: 20 }}>
              <Txt heading size={30}>
                {data.candidates}
              </Txt>
              <Txt muted size={13}>
                Кандидатов
              </Txt>
            </Card>
          </View>
          <Card>
            <Txt size={21}>Требуют внимания</Txt>
            <Txt muted>
              Истёк срок: {data.metrics.overdue}. Ответов на проверке:{' '}
              {data.metrics.pending_reviews}.
            </Txt>
            <Button title='Проверить ответы' onPress={() => router.push('/reviews')} />
          </Card>
          {data.managers.length > 0 && (
            <Txt heading size={24}>
              Руководители
            </Txt>
          )}
          {data.managers.map((m) => (
            <Card key={m.id}>
              <Txt size={20}>{m.full_name}</Txt>
              <Txt muted>
                {m.employees} сотрудников · {m.candidates} кандидатов
              </Txt>
              <Progress value={m.assigned ? (m.completed / m.assigned) * 100 : 0} />
              <Txt size={13} muted>
                Завершено {m.completed} из {m.assigned}
              </Txt>
            </Card>
          ))}
        </>
      )}
      {mine.data && (
        <>
          <Card>
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <View style={{ flex: 1, gap: 12 }}>
                <Txt size={20}>Новый шаг каждый день</Txt>
                <Txt size={14} muted>
                  Откройте назначение и продолжите с сохранённого места.
                </Txt>
              </View>
              <Image
                source={require('../../../assets/figma/assistant-orb.webp')}
                style={{ width: 82, height: 82 }}
              />
            </View>
            <Button title='Всё обучение' onPress={() => router.push('/learning')} />
          </Card>
          {mine.data.items.slice(0, 2).map((a) => (
            <AssignmentCard key={a.id} item={a} />
          ))}
        </>
      )}
      <Card>
        <Txt size={20}>Не пропускайте важное</Txt>
        <Txt muted size={14}>
          Новые назначения, приближающиеся сроки и результаты проверок — в одном месте.
        </Txt>
        <Button
          title='Настроить уведомления'
          secondary
          onPress={() => router.push('/notification-settings')}
        />
      </Card>
    </Page>
  );
}
