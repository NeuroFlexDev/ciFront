import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Path, Rect, Defs, Pattern, Line } from 'react-native-svg';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { API_ORIGIN } from '../lib/config';
import { useResource, useSession } from '../lib/session';
import { Page, Card, Txt, Badge, Button, Loading, ErrorState } from './components';
import { c } from './theme';

export type BusinessOverview = {
  scope: 'company' | 'team';
  company_name: string;
  employees: number;
  candidates: number;
  unassigned: number;
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
type DashboardData = {
  metrics: {
    assignments_in_period: number;
    completed_in_period: number;
    completion_percent: number | null;
    average_completion_hours: number | null;
    courses: number;
    assigned_lessons: number;
    completed_lessons: number;
    lesson_completion_percent: number | null;
    submitted_attempts: number;
    pending_review: number;
  };
  daily: { date: string; submitted_attempts: number }[];
};
const number = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
export function Gauge({
  value,
  half = false,
  caption,
}: {
  value: number | null;
  half?: boolean;
  caption: string;
}) {
  const v = Math.min(100, Math.max(0, value || 0));
  const radius = half ? 145 : 98,
    length = Math.PI * radius * (half ? 1 : 2);
  return (
    <View
      accessible
      accessibilityLabel={`${caption}: ${value == null ? 'нет данных' : number(v) + '%'}`}
      style={{
        width: half ? '100%' : 216,
        height: half ? 182 : 216,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Svg width='100%' height='100%' viewBox={half ? '0 0 320 182' : '0 0 216 216'}>
        {half ? (
          <>
            <Path
              d='M15 170 A145 145 0 0 1 305 170'
              stroke={c.bg}
              strokeWidth={8}
              fill='none'
              strokeLinecap='round'
            />
            {value != null && (
              <Path
                d='M15 170 A145 145 0 0 1 305 170'
                stroke={c.lime}
                strokeWidth={8}
                fill='none'
                strokeLinecap='round'
                strokeDasharray={[(length * v) / 100, length]}
              />
            )}
          </>
        ) : (
          <>
            <Circle cx={108} cy={108} r={98} stroke={c.bg} strokeWidth={4} fill='none' />
            {value != null && (
              <Circle
                cx={108}
                cy={108}
                r={98}
                stroke={c.lime}
                strokeWidth={4}
                fill='none'
                strokeLinecap='round'
                strokeDasharray={[(length * v) / 100, length]}
                rotation={-90}
                origin='108,108'
              />
            )}
          </>
        )}
      </Svg>
      <View
        style={{
          position: 'absolute',
          bottom: half ? 22 : 70,
          alignItems: 'center',
          gap: 6,
          maxWidth: '82%',
        }}
      >
        {half && <Badge tone='accent'>{caption}</Badge>}
        <Txt heading size={half ? 38 : 36}>
          {value == null ? '—' : number(v) + '%'}
        </Txt>
        {!half && (
          <Txt size={11} style={{ textAlign: 'center' }}>
            {caption}
          </Txt>
        )}
      </View>
    </View>
  );
}
function Period({
  value,
  values,
  onChange,
}: {
  value: number;
  values: number[];
  onChange: (n: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={`Период: ${value} дней. Изменить`}
        onPress={() => setOpen(!open)}
        style={{
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: c.bg,
        }}
      >
        <Txt size={11}>{value} дней⌄</Txt>
      </Pressable>
      {open && (
        <View style={{ flexDirection: 'row', gap: 4, paddingTop: 6 }}>
          {values.map((n) => (
            <Pressable
              key={n}
              accessibilityRole='button'
              accessibilityLabel={`${n} дней`}
              onPress={() => {
                onChange(n);
                setOpen(false);
              }}
              style={{
                padding: 10,
                backgroundColor: n === value ? c.lime : c.bg,
                borderRadius: 16,
              }}
            >
              <Txt size={12} style={{ color: n === value ? c.bg : c.text }}>
                {n}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
function Heading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Txt heading size={20} style={{ flexShrink: 1 }}>
        {title}
      </Txt>
      {children}
    </View>
  );
}
export function Dashboard() {
  const { user } = useSession(),
    { width } = useWindowDimensions();
  const [days, setDays] = useState(30),
    [activityDays, setActivityDays] = useState(7),
    [refreshing, setRefreshing] = useState(false),
    [linkError, setLinkError] = useState<unknown>(null);
  const overview = useResource<BusinessOverview>('/business/dashboard');
  const stats = useResource<DashboardData>(
    `/learning/dashboard?days=${days}&activity_days=${activityDays}`,
  );
  const data = overview.data,
    metrics = stats.data?.metrics,
    daily = stats.data?.daily || [];
  const max = Math.max(1, ...daily.map((d) => d.submitted_attempts));
  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([overview.refetch(), stats.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }
  const cell = width >= 760 ? { width: '48.5%' as const } : {};
  return (
    <Page refreshing={refreshing} onRefresh={() => void refresh()}>
      {(overview.isPending || stats.isPending) && !metrics && <Loading />}
      {!!(overview.error || stats.error) && (
        <ErrorState error={overview.error || stats.error} retry={() => void refresh()} />
      )}
      {!!linkError && <ErrorState error={linkError} />}
      {metrics && data && (
        <>
          <View
            style={{ gap: 24, flexDirection: width >= 760 ? 'row' : 'column', flexWrap: 'wrap' }}
          >
            <Card style={[cell, { minHeight: 274 }]}>
              <Heading title='Завершение'>
                <Period value={days} values={[7, 30, 90]} onChange={setDays} />
              </Heading>
              <Gauge
                value={metrics.completion_percent}
                half
                caption={
                  metrics.assignments_in_period
                    ? `${metrics.completed_in_period} из ${metrics.assignments_in_period}`
                    : 'Нет назначений'
                }
              />
            </Card>
            <Card style={[cell, { minHeight: 296 }]}>
              <Heading title={user?.organization_kind === 'business' ? 'Регламенты' : 'Курсы'} />
              {[
                [
                  'Среднее время до завершения',
                  metrics.average_completion_hours == null
                    ? '—'
                    : number(metrics.average_completion_hours) + ' ч',
                ],
                ['В вашей области доступа', number(metrics.courses)],
                ['Завершено назначений', number(metrics.completed_in_period)],
              ].map(([label, value], i) => (
                <View
                  key={label}
                  style={{
                    borderLeftWidth: 3,
                    borderLeftColor: i === 1 ? c.lime : c.text,
                    paddingLeft: 12,
                    gap: 4,
                  }}
                >
                  <Txt size={12} muted>
                    {label}
                  </Txt>
                  <Txt heading size={30}>
                    {value}
                  </Txt>
                </View>
              ))}
            </Card>
            <Card style={[cell, { gap: 20 }]}>
              <Heading title='ИИ-ассистент' />
              <Image
                source={require('../../assets/figma/assistant-orb.webp')}
                style={{ width: 90, height: 90 }}
                contentFit='contain'
              />
              <Txt size={16}>С чего начнём подготовку?</Txt>
              <Txt muted size={13}>
                Соберите регламент из рабочих материалов вместе с ИИ-помощником.
              </Txt>
              <Button
                title='Обсудить с помощником в веб-версии'
                compact
                secondary
                onPress={() =>
                  void WebBrowser.openBrowserAsync(API_ORIGIN + '/ai-helper').catch(setLinkError)
                }
              />
              <Button
                title='Перейти к регламентам'
                compact
                onPress={() => router.push('/learning')}
              />
            </Card>
            <Card style={[cell, { minHeight: 194, justifyContent: 'space-between' }]}>
              <Heading title='Сотрудники' />
              <Txt heading size={32}>
                {data.employees}
              </Txt>
              <Pressable accessibilityRole='button' onPress={() => router.push('/team')}>
                <Txt size={13} style={{ color: c.lime }}>
                  Кандидаты: {data.candidates} · Открыть команду ↗
                </Txt>
              </Pressable>
            </Card>
            <Card style={[cell, { minHeight: 265, justifyContent: 'center' }]}>
              <Gauge value={metrics.lesson_completion_percent} caption='Материалы изучены' />
            </Card>
            <Card style={[cell, { minHeight: 318 }]}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Txt size={14} style={{ fontWeight: '500' }}>
                  Активность обучения
                </Txt>
                <Period value={activityDays} values={[7, 14, 30]} onChange={setActivityDays} />
              </View>
              <Txt heading size={18}>
                {number(metrics.submitted_attempts)} ответов
              </Txt>
              <View style={{ height: 200, flexDirection: 'row', gap: 6, alignItems: 'flex-end' }}>
                {daily.map((day, i) => (
                  <View
                    key={day.date}
                    style={{ flex: 1, alignItems: 'center', gap: 8 }}
                    accessible
                    accessibilityLabel={`${day.date}: ${day.submitted_attempts} ответов`}
                  >
                    <Svg width='100%' height={Math.max(2, (day.submitted_attempts / max) * 166)}>
                      <Defs>
                        <Pattern
                          id={`stripes${i}`}
                          width={10}
                          height={10}
                          patternUnits='userSpaceOnUse'
                          patternTransform='rotate(45)'
                        >
                          <Rect
                            width={10}
                            height={10}
                            fill={day.submitted_attempts === max ? c.lime : 'transparent'}
                          />
                          <Line
                            x1={0}
                            x2={0}
                            y1={0}
                            y2={10}
                            stroke={day.submitted_attempts === max ? c.text : '#68851A'}
                            strokeWidth={1}
                          />
                        </Pattern>
                      </Defs>
                      <Rect width='100%' height='100%' rx={10} fill={`url(#stripes${i})`} />
                    </Svg>
                    {(activityDays === 7 || i === 0 || i === daily.length - 1) && (
                      <Txt size={10} muted>
                        {new Date(day.date + 'T12:00:00Z').toLocaleDateString(
                          'ru-RU',
                          activityDays === 7 ? { weekday: 'short' } : { day: 'numeric' },
                        )}
                      </Txt>
                    )}
                  </View>
                ))}
                {!metrics.submitted_attempts && (
                  <View style={{ position: 'absolute', top: 60, left: 12, right: 12 }}>
                    <Txt muted size={14} style={{ textAlign: 'center' }}>
                      Ответов за этот период пока нет
                    </Txt>
                  </View>
                )}
              </View>
            </Card>
          </View>
          <Txt muted size={12}>
            {data.company_name} · {data.scope === 'company' ? 'Вся компания' : 'Ваша команда'}.
            Время считается от назначения до завершения.
          </Txt>
          {data.managers.length > 0 && (
            <Card>
              <Heading title='Руководители' />
              {data.managers.map((m) => (
                <Pressable
                  key={m.id}
                  accessibilityRole='button'
                  onPress={() => router.push(`/person/${m.id}`)}
                  style={{ padding: 16, borderRadius: 16, backgroundColor: c.bg, gap: 8 }}
                >
                  <Txt size={16}>{m.full_name}</Txt>
                  <Txt muted size={12}>
                    {m.employees} сотрудников · {m.candidates} кандидатов · завершено {m.completed}{' '}
                    из {m.assigned}
                  </Txt>
                </Pressable>
              ))}
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
