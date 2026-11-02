import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { api, useSession } from '../lib/session';
import { drafts, type Draft } from '../lib/drafts';
import { ApiError } from '../lib/client';
import { bounded, deliverAnswer } from '../lib/answer-delivery';
import type { Assessment, Answer, Response } from '../lib/types';
import { Badge, Button, Card, ErrorState, Field, Txt } from './components';
import { c } from './theme';
export function AnswerEditor({
  assignmentId,
  versionId,
  question,
  response: serverResponse,
  onSaved,
}: {
  assignmentId: number;
  versionId: number;
  question: Assessment;
  response?: Response;
  onSaved: (response: Response) => void;
}) {
  const { scope } = useSession(),
    key = versionId + ':' + assignmentId + ':' + question.id;
  const [draft, setDraft] = useState<Draft | null>(null),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [conflict, setConflict] = useState<Response | null>(null),
    [retrying, setRetrying] = useState(false),
    [accepted, setAccepted] = useState<Response | null>(null),
    [phase, setPhase] = useState<'saving' | 'sending' | 'checking'>('saving'),
    [storageWarning, setStorageWarning] = useState(false);
  const response =
    accepted &&
    (!serverResponse ||
      accepted.attempt > serverResponse.attempt ||
      (accepted.attempt === serverResponse.attempt && accepted.revision >= serverResponse.revision))
      ? accepted
      : serverResponse;
  const pending = useRef(Promise.resolve()),
    current = useRef<Draft | null>(null),
    mounted = useRef(true),
    sending = useRef(false);
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
    if (!current.current || sending.current) return;
    sending.current = true;
    const snapshot = current.current;
    setBusy(true);
    setError(null);
    try {
      const result = await deliverAnswer({
        request: (path, method, body) => api.request(path, method, body),
        assignmentId,
        questionId: question.id,
        draft: snapshot,
        submit,
        persisted: pending.current,
        phase: (value) => {
          if (mounted.current) setPhase(value);
        },
      });
      if (!mounted.current) return;
      setAccepted(result);
      setConflict(null);
      if (submit) {
        setRetrying(false);
        // Server confirmation immediately ends the sending UI. Local cleanup is optional.
        void bounded(
          drafts.removeIfUnchanged(scope, key, snapshot),
          5000,
          'Draft cleanup timeout',
        ).catch(() => {
          if (mounted.current) setStorageWarning(true);
        });
      } else {
        const next = { ...snapshot, revision: result.revision };
        current.current = next;
        setDraft(next);
        pending.current = drafts.set(scope, key, next);
        void pending.current.catch(() => {
          if (mounted.current) setStorageWarning(true);
        });
      }
      setSaved(true);
      onSaved(result);
    } catch (e) {
      if (!mounted.current) return;
      setError(e);
      if (e instanceof ApiError && e.status === 409) {
        try {
          const detail = await bounded(
            api.request<{ responses: Response[] }>(`/learning/assignments/${assignmentId}`),
            10000,
            'Не удалось загрузить текущий ответ.',
          );
          if (mounted.current)
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
      sending.current = false;
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
      <Badge>
        {question.question_type === 'open'
          ? 'Практическое задание'
          : question.question_type === 'multiple'
            ? 'Несколько вариантов'
            : 'Один вариант'}
      </Badge>
      <Txt heading size={20}>
        {question.question}
      </Txt>
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
      {storageWarning && (
        <Txt muted size={13}>
          Ответ сохранён на сервере. Локальную копию пока не удалось обновить; она будет сверена при
          следующем открытии.
        </Txt>
      )}
      {locked ? (
        <>
          <Txt>
            {response?.answer.text || response?.answer.selected?.join(', ') || 'Ответ отправлен'}
          </Txt>
          <Txt style={{ color: c.lime }}>
            {response?.status === 'pending_review'
              ? 'Ответ отправлен · Ожидает проверки'
              : String(response?.points) + ' / ' + question.max_points + ' баллов'}
          </Txt>
          {!!response?.feedback && <Txt muted>{response.feedback}</Txt>}
          {response?.status === 'pending_review' && (
            <Txt muted size={13}>
              Проверяющий получил ваш ответ. Повторно отправлять его не нужно. Результат появится
              здесь и в уведомлениях.
            </Txt>
          )}
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
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: c.bg,
                    borderWidth: 1,
                    borderColor: draft?.answer.selected?.includes(answer) ? c.lime : c.line,
                    borderRadius: 16,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderWidth: 1,
                      borderColor: draft?.answer.selected?.includes(answer) ? c.lime : c.muted,
                      borderRadius: question.question_type === 'single' ? 11 : 5,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {draft?.answer.selected?.includes(answer) && (
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: question.question_type === 'single' ? 6 : 2,
                          backgroundColor: c.lime,
                        }}
                      />
                    )}
                  </View>
                  <Txt size={14} style={{ flex: 1 }}>
                    {answer}
                  </Txt>
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
          {!!error && <ErrorState error={error} />}
          {!!question.locked_reason && (
            <Txt style={{ color: c.alert }}>{question.locked_reason}</Txt>
          )}
          {busy && (
            <Txt muted size={13}>
              {phase === 'saving'
                ? 'Сохраняем ответ на устройстве…'
                : phase === 'checking'
                  ? 'Проверяем, получил ли сервер ваш ответ…'
                  : 'Отправляем ответ…'}
            </Txt>
          )}
          <Button
            title='Отправить на проверку'
            busy={busy}
            disabled={
              !draft ||
              !!conflict ||
              !!question.locked_reason ||
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
