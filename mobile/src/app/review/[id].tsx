import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { api, useResource, queryClient, useSession } from '../../lib/session';
import type { Review } from '../../lib/types';
import { Page, Card, Txt, Field, Button, ErrorState, Loading } from '../../ui/components';
export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    { scope } = useSession(),
    q = useResource<Review>('/learning/reviews/' + id),
    [scores, setScores] = useState<Record<string, string>>({}),
    [points, setPoints] = useState(''),
    [feedback, setFeedback] = useState(''),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  async function grade() {
    if (!q.data) return;
    setBusy(true);
    try {
      const criteria = q.data.assessment.criteria.map((c) => ({
        id: c.id,
        points: Number(scores[c.id]),
      }));
      await api.request('/learning/reviews/' + id + '/grade', 'POST', {
        expected_revision: q.data.revision,
        points: criteria.length ? criteria.reduce((s, c) => s + c.points, 0) : Number(points),
        feedback,
        criteria_scores: criteria,
      });
      await queryClient.invalidateQueries({ queryKey: [scope] });
      router.replace('/reviews');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const valid =
    q.data &&
    feedback.trim() &&
    (q.data.assessment.criteria.length
      ? q.data.assessment.criteria.every(
          (c) =>
            scores[c.id] !== undefined &&
            scores[c.id] !== '' &&
            Number.isFinite(Number(scores[c.id])) &&
            Number(scores[c.id]) >= 0 &&
            Number(scores[c.id]) <= c.max_points,
        )
      : points !== '' &&
        Number.isFinite(Number(points)) &&
        Number(points) >= 0 &&
        Number(points) <= q.data.assessment.max_points);
  return (
    <Page title='Проверка ответа' back>
      {q.isPending && <Loading />}
      {!!(q.error || error) && (
        <ErrorState error={q.error || error} retry={() => void q.refetch()} />
      )}
      {q.data && (
        <>
          <Card>
            <Txt size={21}>{q.data.assessment.question}</Txt>
            <Txt muted>{q.data.assessment.description}</Txt>
            <Txt>{q.data.answer.text || q.data.answer.selected?.join(', ')}</Txt>
          </Card>
          <Card>
            <Txt size={21}>Оценка и обратная связь</Txt>
            {q.data.assessment.criteria.length ? (
              q.data.assessment.criteria.map((c) => (
                <Field
                  key={c.id}
                  label={c.title + ' · до ' + c.max_points}
                  keyboardType='decimal-pad'
                  value={scores[c.id] || ''}
                  onChangeText={(v) => setScores({ ...scores, [c.id]: v.replace(',', '.') })}
                />
              ))
            ) : (
              <Field
                label={'Баллы · до ' + q.data.assessment.max_points}
                value={points}
                keyboardType='decimal-pad'
                onChangeText={setPoints}
              />
            )}
            <Field
              label='Обратная связь участнику'
              value={feedback}
              multiline
              onChangeText={setFeedback}
            />
            <Button
              title='Сохранить оценку'
              busy={busy}
              disabled={!valid}
              onPress={() => void grade()}
            />
          </Card>
        </>
      )}
    </Page>
  );
}
