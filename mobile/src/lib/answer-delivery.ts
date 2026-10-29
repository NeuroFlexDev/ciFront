import { ApiError } from './client';
import type { Draft } from './drafts';
import type { Response } from './types';

export function bounded<T>(
  operation: Promise<T>,
  milliseconds: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;
const uncertain =
  'Не удалось подтвердить отправку. Ответ сохранён на устройстве. Повторите отправку с подключённым интернетом: повтор не создаст ещё одну попытку.';

/** A lost POST response is not evidence that the server rejected the answer. */
export async function deliverAnswer({
  request,
  assignmentId,
  questionId,
  draft,
  submit,
  persisted,
  phase,
  timeoutMs = 30000,
  localTimeoutMs = 10000,
  recoveryTimeoutMs = 10000,
}: {
  request: Request;
  assignmentId: number;
  questionId: string;
  draft: Draft;
  submit: boolean;
  persisted: Promise<void>;
  phase: (value: 'saving' | 'sending' | 'checking') => void;
  timeoutMs?: number;
  localTimeoutMs?: number;
  recoveryTimeoutMs?: number;
}): Promise<Response> {
  phase('saving');
  await bounded(
    persisted,
    localTimeoutMs,
    'Не удалось подтвердить сохранение на устройстве. Ответ ещё не отправлен. Скопируйте текст и повторите сохранение.',
  );
  phase('sending');
  const base = `/learning/assignments/${assignmentId}`;
  try {
    return await bounded(
      request<Response>(
        base + `/responses/${encodeURIComponent(questionId)}` + (submit ? '/submit' : ''),
        submit ? 'POST' : 'PUT',
        {
          answer: draft.answer,
          expected_revision: draft.revision,
          attempt: draft.attempt,
          ...(submit ? { submission_key: draft.submission_key } : {}),
        },
      ),
      timeoutMs,
      uncertain,
    );
  } catch (error) {
    // Do not reinterpret access failures, validation errors or conflicts as success.
    if (!submit || (error instanceof ApiError && error.status < 500)) throw error;
    phase('checking');
    try {
      const detail = await bounded(
        request<{ responses: Response[] }>(base),
        recoveryTimeoutMs,
        uncertain,
      );
      const confirmed = detail.responses.find(
        (response) =>
          response.assessment_id === questionId &&
          response.attempt === draft.attempt &&
          response.submission_key === draft.submission_key &&
          ['pending_review', 'reviewed'].includes(response.status),
      );
      if (confirmed) return confirmed;
    } catch (recoveryError) {
      if (recoveryError instanceof ApiError && [401, 403, 404].includes(recoveryError.status))
        throw recoveryError;
    }
    throw new Error(uncertain);
  }
}
