import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from '../src/lib/client';
import { bounded, deliverAnswer } from '../src/lib/answer-delivery';
import type { Draft } from '../src/lib/drafts';
import type { Response } from '../src/lib/types';

const draft: Draft = {
  answer: { text: 'My retained answer' },
  attempt: 1,
  revision: 0,
  submission_key: 'stable-submission-key',
};
const accepted: Response = {
  id: 33,
  assessment_id: 'task:20',
  attempt: 1,
  revision: 1,
  submission_key: draft.submission_key,
  answer: draft.answer,
  status: 'pending_review',
  points: null,
  max_points: 1,
  feedback: '',
  can_retry: false,
};
const base = {
  assignmentId: 21,
  questionId: 'task:20',
  draft,
  submit: true,
  persisted: Promise.resolve(),
  phase: () => {},
  timeoutMs: 20,
  recoveryTimeoutMs: 20,
  localTimeoutMs: 20,
};
function transport(fn: (path: string, method?: string, body?: unknown) => Promise<unknown>) {
  return fn as <T>(path: string, method?: string, body?: unknown) => Promise<T>;
}
const forever = () => new Promise<never>(() => {});

test('confirmed submission returns the receipt without a second detail request', async () => {
  const calls: { path: string; method?: string; body: any }[] = [];
  const result = await deliverAnswer({
    ...base,
    request: transport(async (path, method, body) => {
      calls.push({ path, method, body });
      return accepted;
    }),
  });
  assert.equal(result.status, 'pending_review');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/learning/assignments/21/responses/task%3A20/submit');
  assert.equal(calls[0].body.submission_key, draft.submission_key);
  assert.deepEqual(calls[0].body.answer, draft.answer);
});

test('hung native transport recovers a committed submission by its idempotency key', async () => {
  const phases: string[] = [],
    methods: (string | undefined)[] = [];
  const result = await deliverAnswer({
    ...base,
    phase: (p) => phases.push(p),
    request: transport(async (_, method) => {
      methods.push(method);
      return method === 'POST' ? forever() : { responses: [accepted] };
    }),
  });
  assert.equal(result, accepted);
  assert.deepEqual(methods, ['POST', undefined]);
  assert.deepEqual(phases, ['saving', 'sending', 'checking']);
});

test('lost response without confirmation stops loading, retaining the answer and retry key', async () => {
  const before = structuredClone(draft);
  await assert.rejects(
    deliverAnswer({
      ...base,
      request: transport(async (_, method) => {
        if (method === 'POST') throw new TypeError('connection dropped');
        return { responses: [{ ...accepted, submission_key: 'different-operation' }] };
      }),
    }),
    /Не удалось подтвердить отправку/,
  );
  assert.deepEqual(draft, before);
});

test('hung POST and reconciliation both have a finite deadline', async () => {
  await assert.rejects(
    deliverAnswer({ ...base, request: transport(forever) }),
    /Не удалось подтвердить отправку/,
  );
});

test('no answer is sent if device persistence never acknowledges the draft', async () => {
  let requests = 0;
  await assert.rejects(
    deliverAnswer({
      ...base,
      persisted: forever(),
      request: transport(async () => {
        requests++;
        return accepted;
      }),
    }),
    /Ответ ещё не отправлен/,
  );
  assert.equal(requests, 0);
});

test('authorization and revision conflicts do not trigger recovery under a different account', async () => {
  for (const status of [401, 403, 404, 409, 422]) {
    let requests = 0;
    await assert.rejects(
      deliverAnswer({
        ...base,
        request: transport(async () => {
          requests++;
          throw new ApiError(status, 'rejected');
        }),
      }),
      (error: unknown) => error instanceof ApiError && error.status === status,
    );
    assert.equal(requests, 1);
  }
});

test('a prior draft or another question with the same key cannot confirm submission', async () => {
  for (const response of [
    { ...accepted, status: 'draft' },
    { ...accepted, assessment_id: 'task:21' },
    { ...accepted, attempt: 2 },
  ]) {
    await assert.rejects(
      deliverAnswer({
        ...base,
        request: transport(async (_, method) => {
          if (method === 'POST') throw new TypeError('lost');
          return { responses: [response] };
        }),
      }),
      /Не удалось подтвердить отправку/,
    );
  }
});

test('late native rejection after deadline is handled', async () => {
  let reject: (error: Error) => void = () => {};
  const operation = new Promise((_, fail) => {
    reject = fail;
  });
  await assert.rejects(bounded(operation, 10, 'deadline'), /deadline/);
  reject(new Error('late native error'));
  await new Promise((resolve) => setTimeout(resolve, 0));
});
