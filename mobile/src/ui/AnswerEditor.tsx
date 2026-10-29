import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { api, useSession } from '../lib/session';
import { drafts, type Draft } from '../lib/drafts';
import { ApiError } from '../lib/client';
import type { Assessment, Answer, Response } from '../lib/types';
import { Button, Card, ErrorState, Field, Txt } from './components';
import { c } from './theme';
export function AnswerEditor({
  assignmentId,
  versionId,
  question,
  response,
  onSaved,
}: {
  assignmentId: number;
  versionId: number;
  question: Assessment;
  response?: Response;
  onSaved: () => void;
}) {
  const { scope } = useSession(),
    key = versionId + ':' + assignmentId + ':' + question.id;
  const [draft, setDraft] = useState<Draft | null>(null),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [conflict, setConflict] = useState<Response | null>(null),
    [retrying, setRetrying] = useState(false);
  const pending = useRef(Promise.resolve()),
    current = useRef<Draft | null>(null),
    mounted = useRef(true);
  const locked = !!response && response.status !== 'draft' && !retrying;
  const localVariant =
    locked &&
    draft &&
    !!(draft.answer.text?.trim() || draft.answer.selected?.length) &&
    JSON.stringify(draft.answer) !== JSON.stringify(response?.answer);
  const [initialResponse] = useState(response);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    void drafts
      .get(scope, key)
      .then((local) => {
        if (!active) return;
        const initial = local || {
          answer: initialResponse?.answer || {},
          revision: initialResponse?.revision || 0,
          attempt: initialResponse?.attempt || 1,
          submission_key: Crypto.randomUUID(),
        };
        current.current = initial;
        setDraft(initial);
        setSaved(!!local);
        if (local && initialResponse?.can_retry && local.attempt > initialResponse.attempt)
          setRetrying(true);
      })
      .catch(setError);
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [scope, key, initialResponse]); // Server updates never replace a locally edited answer.
  function persist(next: Draft) {
    current.current = next;
    setDraft(next);
    setSaved(false);
    pending.current = pending.current
      .catch(() => {})
      .then(() => drafts.set(scope, key, next))
      .then(() => {
        if (mounted.current && current.current === next) setSaved(true);
      })
      .catch((e) => {
        if (mounted.current) setError(e);
        throw e;
      });
    void pending.current.catch(() => {});
  }
  function edit(answer: Answer) {
    if (current.current) persist({ ...current.current, answer });
  }
  async function send(submit: boolean) {
    if (!current.current) return;
    setBusy(true);
    setError(null);
    try {
      await pending.current;
      const snapshot = current.current;
      const payload = {
        answer: snapshot.answer,
        expected_revision: snapshot.revision,
        attempt: snapshot.attempt,
        ...(submit ? { submission_key: snapshot.submission_key } : {}),
      };
      const result = await api.request<Response>(
        `/learning/assignments/${assignmentId}/responses/${encodeURIComponent(question.id)}` +
          (submit ? '/submit' : ''),
        submit ? 'POST' : 'PUT',
        payload,
      );
      if (submit) {
        await drafts.remove(scope, key);
        setRetrying(false);
      } else {
        const next = { ...snapshot, revision: result.revision };
        await drafts.set(scope, key, next);
        current.current = next;
        setDraft(next);
      }
      setSaved(true);
      setConflict(null);
      onSaved();
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && e.status === 409) {
        try {
          const detail = await api.request<{ responses: Response[] }>(
            `/learning/assignments/${assignmentId}`,
          );
          setConflict(
            detail.responses
              .filter((r) => r.assessment_id === question.id)
              .sort((a, b) => b.attempt - a.attempt)[0] || null,
          );
        } catch {
          /* Keep the original conflict and local answer. */
        }
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  function retry() {
    setRetrying(true);
    persist({
      answer: localVariant && draft ? draft.answer : {},
      revision: 0,
      attempt: (response?.attempt || 0) + 1,
      submission_key: Crypto.randomUUID(),
    });
  }
  return (
    <Card>
      <Txt size={20}>{question.question}</Txt>
      {question.description && <Txt muted>{question.description}</Txt>}
      <Txt muted size={13}>
        Максимум {question.max_points} баллов ·{' '}
        {locked ? 'Ответ отправлен' : 'Попытка ' + (draft?.attempt || 1)}
      </Txt>
      {question.criteria.map((criterion) => (
        <Txt muted size={13} key={criterion.id}>
          {criterion.title} — до {criterion.max_points}
        </Txt>
      ))}
      {!!error && <ErrorState error={error} />}
      {locked ? (
        <>
          <Txt>
            {response?.answer.text || response?.answer.selected?.join(', ') || 'Ответ отправлен'}
          </Txt>
          <Txt style={{ color: c.lime }}>
            {response?.status === 'pending_review'
              ? 'Ожидает проверки'
              : String(response?.points) + ' / ' + question.max_points + ' баллов'}
          </Txt>
          {!!response?.feedback && <Txt muted>{response.feedback}</Txt>}
          {localVariant && (
            <View style={{ gap: 8 }}>
              <Txt muted>
                На устройстве сохранён другой, неотправленный ответ. Его можно выделить и
                скопировать.
              </Txt>
              <Txt selectable>{draft.answer.text || draft.answer.selected?.join(', ')}</Txt>
            </View>
          )}
          {response?.can_retry && (
            <Button
              title={localVariant ? 'Новая попытка с сохранённым ответом' : 'Новая попытка'}
              secondary
              onPress={retry}
            />
          )}
        </>
      ) : (
        <>
          {question.question_type === 'open' ? (
            <Field
              label='Ваш ответ'
              multiline
              value={draft?.answer.text || ''}
              editable={!!draft && !busy}
              onChangeText={(text) => edit({ text })}
            />
          ) : (
            <View style={{ gap: 8 }}>
              {question.answers.map((answer) => (
                <Pressable
                  key={answer}
                  accessibilityRole={question.question_type === 'single' ? 'radio' : 'checkbox'}
                  accessibilityState={{
                    checked: draft?.answer.selected?.includes(answer),
                    disabled: !draft || busy,
                  }}
                  disabled={!draft || busy}
                  onPress={() => {
                    const selected = draft?.answer.selected || [];
                    edit({
                      selected:
                        question.question_type === 'single'
                          ? [answer]
                          : selected.includes(answer)
                            ? selected.filter((a) => a !== answer)
                            : [...selected, answer],
                    });
                  }}
                  style={{
                    padding: 16,
                    borderWidth: 1,
                    borderColor: draft?.answer.selected?.includes(answer) ? c.lime : c.line,
                    borderRadius: 16,
                  }}
                >
                  <Txt>{answer}</Txt>
                </Pressable>
              ))}
            </View>
          )}
          <Txt size={12} muted>
            {saved
              ? 'Черновик сохранён на устройстве'
              : error
                ? 'Не удалось подтвердить сохранение. Не закрывайте экран.'
                : 'Сохраняем черновик…'}
          </Txt>
          {!!error && draft && !saved && (
            <Button
              title='Повторить сохранение на устройстве'
              secondary
              disabled={busy}
              onPress={() => {
                setError(null);
                if (current.current) persist(current.current);
              }}
            />
          )}
          {conflict && (
            <View
              style={{
                gap: 12,
                borderWidth: 1,
                borderColor: c.alert,
                padding: 16,
                borderRadius: 16,
              }}
            >
              <Txt>На сервере другая версия:</Txt>
              <Txt muted>{conflict.answer.text || conflict.answer.selected?.join(', ')}</Txt>
              {conflict.status === 'draft' ? (
                <Button
                  title='Продолжить с моим ответом'
                  secondary
                  onPress={() => {
                    if (current.current)
                      persist({
                        ...current.current,
                        revision: conflict.revision,
                        attempt: conflict.attempt,
                      });
                    setConflict(null);
                    setError(null);
                  }}
                />
              ) : (
                <Txt muted>
                  Этот ответ уже отправлен. Ваш локальный текст остаётся сохранённым; обновите
                  экран, чтобы увидеть результат.
                </Txt>
              )}
            </View>
          )}
          <Button
            title='Отправить на проверку'
            busy={busy}
            disabled={
              !draft ||
              !!conflict ||
              !((draft.answer.text || '').trim() || draft.answer.selected?.length)
            }
            onPress={() => void send(true)}
          />
          <Button
            title='Сохранить черновик на сервере'
            secondary
            busy={busy}
            disabled={!draft || !!conflict}
            onPress={() => void send(false)}
          />
        </>
      )}
    </Card>
  );
}
