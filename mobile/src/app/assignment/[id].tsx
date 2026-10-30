import { useState, useRef } from 'react';
import { Linking, View, Pressable } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { api, queryClient, useResource, useSession } from '../../lib/session';
import type { Detail, Lesson, Response } from '../../lib/types';
import { states, date } from '../../lib/types';
import { latestResponses } from '../../lib/learning-summary';
import {
  Page,
  Card,
  Txt,
  Button,
  Loading,
  ErrorState,
  Chips,
  Progress,
  Badge,
} from '../../ui/components';
import { AnswerEditor } from '../../ui/AnswerEditor';
import { LessonImage } from '../../ui/LessonImage';
import { c } from '../../ui/theme';
export default function AssignmentScreen() {
  const { id, results } = useLocalSearchParams<{ id: string; results?: string }>(),
    { user, scope } = useSession(),
    query = useResource<Detail>(/^\d+$/.test(id) ? '/learning/assignments/' + id : null),
    [selected, setSelected] = useState<number | null>(null),
    [questionIndex, setQuestionIndex] = useState(0),
    [tab, setTab] = useState(results ? 'tests' : 'materials'),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    ops = useRef(new Map<number, string>());
  const data = query.data,
    lessons = data?.content.modules.flatMap((m) => m.lessons) || [],
    lesson: Lesson | undefined =
      lessons.find((l) => l.id === (selected ?? data?.last_lesson_id)) || lessons[0],
    assessments = [
      ...(data?.content.assessments || []),
      ...(data?.content.modules.flatMap((m) => m.assessments) || []),
    ].filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i);
  if (data?.content.practice_requires_test_pass)
    assessments.sort(
      (a, b) => Number(a.question_type === 'open') - Number(b.question_type === 'open'),
    );
  function answerSaved(response: Response) {
    queryClient.setQueryData<Detail>([scope, '/learning/assignments/' + id], (current) => {
      if (
        !current ||
        current.responses.some(
          (item) => item.id === response.id && item.revision > response.revision,
        )
      )
        return current;
      return {
        ...current,
        responses: [...current.responses.filter((item) => item.id !== response.id), response],
      };
    });
    if (response.status !== 'draft' && assessments[questionIndex]?.id === response.assessment_id) {
      const latest = latestResponses(data?.responses || []);
      const next = assessments.findIndex(
        (item, index) =>
          index > questionIndex &&
          !latest.some((saved) => saved.assessment_id === item.id && saved.status !== 'draft'),
      );
      if (next >= 0) setQuestionIndex(next);
    }
    void query.refetch();
  }
  async function refresh() {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }
  async function complete() {
    if (!data || !lesson) return;
    setBusy(true);
    setError(null);
    const key = ops.current.get(lesson.id) || Crypto.randomUUID();
    ops.current.set(lesson.id, key);
    try {
      await api.request('/learning/assignments/' + id + '/progress', 'PUT', {
        expected_revision: data.progress_revision,
        lesson_id: lesson.id,
        completed: true,
        operation_key: key,
      });
      await query.refetch();
      const next = lessons[lessons.findIndex((l) => l.id === lesson.id) + 1];
      if (next) setSelected(next.id);
      else setTab('tests');
      ops.current.delete(lesson.id);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      title={data?.title || 'Обучение'}
      headerTitle={user?.organization_kind === 'business' ? 'Регламент' : 'Обучение'}
      back
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      {query.isPending && <Loading />}
      {!!(query.error || error) && (
        <ErrorState error={query.error || error} retry={() => void query.refetch()} />
      )}
      {data && (
        <>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Txt heading size={18}>
                Ваш прогресс
              </Txt>
              <Txt heading size={20}>
                {data.progress_percent}%
              </Txt>
            </View>
            <Progress value={data.progress_percent} />
            <Txt muted size={13}>
              {states[data.status] || data.status} · {data.completed_lessons.length} из{' '}
              {data.lesson_count} материалов
            </Txt>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <Badge tone={data.status === 'overdue' ? 'alert' : 'neutral'}>
                {date(data.due_at)}
              </Badge>
              <Txt muted size={12}>
                {data.rules.max_attempts} попыток · Порог {data.rules.pass_percent}%
              </Txt>
            </View>
          </Card>
          <Chips
            items={[
              {
                id: 'materials',
                label: user?.organization_kind === 'business' ? 'Регламент' : 'Материалы',
              },
              { id: 'tests', label: 'Тесты и ответы' },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === 'materials' ? (
            <>
              {lesson ? (
                <Card>
                  <Txt muted size={12}>
                    Материал {lessons.findIndex((l) => l.id === lesson.id) + 1} из {lessons.length}
                  </Txt>
                  <Txt heading size={22}>
                    {lesson.title}
                  </Txt>
                  <Markdown
                    rules={{
                      image: (node) => (
                        <LessonImage
                          key={node.key}
                          src={String(node.attributes.src || '')}
                          alt={String(node.attributes.alt || 'Иллюстрация')}
                        />
                      ),
                    }}
                    onLinkPress={(url) => {
                      if (/^https:\/\//.test(url)) void Linking.openURL(url).catch(setError);
                      return false;
                    }}
                    style={{
                      body: { color: c.text, fontFamily: 'Golos', fontSize: 16, lineHeight: 26 },
                      heading1: {
                        fontFamily: 'Days',
                        fontSize: 25,
                        color: c.text,
                        marginVertical: 12,
                      },
                      heading2: { fontSize: 22, color: c.text, marginVertical: 12 },
                      heading3: { fontSize: 19, color: c.text },
                      link: { color: c.lime },
                      code_inline: { backgroundColor: c.inner, color: c.text },
                      code_block: { backgroundColor: c.bg, color: c.text, borderColor: c.line },
                      fence: { backgroundColor: c.bg, color: c.text, borderColor: c.line },
                      blockquote: { backgroundColor: c.inner, borderLeftColor: c.lime },
                      table: { borderColor: c.line },
                      tr: { borderBottomColor: c.line },
                    }}
                  >
                    {lesson.content || lesson.description}
                  </Markdown>
                  <Button
                    title={
                      data.completed_lessons.includes(lesson.id)
                        ? 'Изучено · дальше'
                        : 'Отметить изученным'
                    }
                    busy={busy}
                    onPress={() => void complete()}
                  />
                </Card>
              ) : (
                <Card>
                  <Txt>{data.content.course.description || 'Перейдите к тестам.'}</Txt>
                </Card>
              )}
              {lessons.length > 0 && (
                <Card>
                  <Txt heading size={20}>
                    Содержание регламента
                  </Txt>
                  {lessons.map((item, i) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole='button'
                      accessibilityState={{ selected: item.id === lesson?.id }}
                      onPress={() => setSelected(item.id)}
                      style={{
                        padding: 16,
                        borderRadius: 16,
                        backgroundColor: c.bg,
                        borderWidth: 1,
                        borderColor: item.id === lesson?.id ? c.lime : 'transparent',
                        gap: 6,
                      }}
                    >
                      <Txt size={14}>
                        {i + 1}. {item.title}
                      </Txt>
                      <Txt muted size={12}>
                        {data.completed_lessons.includes(item.id)
                          ? '✓ Изучено'
                          : item.id === lesson?.id
                            ? 'Сейчас открыто'
                            : 'Предстоит изучить'}
                      </Txt>
                    </Pressable>
                  ))}
                </Card>
              )}
            </>
          ) : (
            <>
              {assessments.length > 0 && (
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <Txt heading size={20}>
                      Тесты и задания
                    </Txt>
                    <Txt muted size={14}>
                      {Math.min(questionIndex + 1, assessments.length)} / {assessments.length}
                    </Txt>
                  </View>
                  <Txt muted size={13}>
                    Выберите вопрос. Введённые ответы сохраняются на устройстве; отправляйте каждый
                    ответ отдельно.
                  </Txt>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {assessments.map((q, i) => {
                      const response = latestResponses(data.responses).find(
                        (r) => r.assessment_id === q.id,
                      );
                      const sent = response && response.status !== 'draft';
                      return (
                        <Pressable
                          key={q.id}
                          accessibilityRole='button'
                          accessibilityLabel={`Вопрос ${i + 1}${sent ? ', ответ отправлен' : ''}`}
                          accessibilityState={{ selected: questionIndex === i }}
                          onPress={() => setQuestionIndex(i)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: questionIndex === i ? c.lime : c.bg,
                            borderWidth: 1,
                            borderColor: sent ? c.lime : c.line,
                          }}
                        >
                          <Txt size={16} style={{ color: questionIndex === i ? c.bg : c.text }}>
                            {i + 1}
                          </Txt>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
              )}
              {assessments.map((question, index) => (
                <View
                  key={`${scope}:${data.course_version_id}:${data.id}:${question.id}`}
                  style={{
                    display:
                      index === Math.min(questionIndex, assessments.length - 1) ? 'flex' : 'none',
                  }}
                >
                  <AnswerEditor
                    assignmentId={data.id}
                    versionId={data.course_version_id}
                    question={question}
                    response={latestResponses(data.responses).find(
                      (r) => r.assessment_id === question.id,
                    )}
                    onSaved={answerSaved}
                  />
                </View>
              ))}
              {assessments.length > 1 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Button
                    title='← Назад'
                    secondary
                    disabled={questionIndex === 0}
                    onPress={() => setQuestionIndex((i) => Math.max(0, i - 1))}
                  />
                  <Button
                    title='Следующий →'
                    secondary
                    disabled={questionIndex >= assessments.length - 1}
                    onPress={() => setQuestionIndex((i) => Math.min(assessments.length - 1, i + 1))}
                  />
                </View>
              )}
              {!assessments.length && (
                <Card>
                  <Txt>В этом назначении нет тестов. Для завершения изучите материалы.</Txt>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </Page>
  );
}
