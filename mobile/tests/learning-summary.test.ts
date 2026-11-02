import assert from 'node:assert/strict';
import test from 'node:test';
import { latestResponses, resultSummary, filterAssignments } from '../src/lib/learning-summary';
import type { Assignment, Detail, Response } from '../src/lib/types';
const response = (change: Partial<Response>): Response => ({
  id: 1,
  assessment_id: 'task:1',
  attempt: 1,
  revision: 1,
  answer: {},
  status: 'reviewed',
  points: 4,
  max_points: 10,
  feedback: '',
  can_retry: true,
  ...change,
});
test('results use the latest attempt and revision without counting a superseded grade', () => {
  const rows = [
    response({}),
    response({ id: 2, attempt: 2, status: 'draft', points: null }),
    response({ id: 2, attempt: 2, revision: 2, status: 'pending_review', points: null }),
  ];
  assert.deepEqual(latestResponses(rows), [rows[2]]);
  const summary = resultSummary([], [{ responses: rows } as Detail]);
  assert.equal(summary.score, null);
  assert.equal(summary.pending, 1);
  assert.equal(summary.graded, 0);
});
test('score only includes graded answers; unsubmitted and pending work do not become zero grades', () => {
  const summary = resultSummary(
    [],
    [
      {
        responses: [
          response({}),
          response({ assessment_id: 'task:2', status: 'pending_review', points: null }),
          response({ assessment_id: 'task:3', points: 8, max_points: 10 }),
        ],
      } as Detail,
    ],
  );
  assert.equal(summary.score, 60);
  assert.equal(summary.graded, 2);
  assert.equal(summary.pending, 1);
});
test('overdue ignores withdrawn assignments and filters keep not-started work in progress', () => {
  const rows = [
    { id: 1, status: 'overdue', state: 'revoked' },
    { id: 2, status: 'overdue', state: 'active' },
    { id: 3, status: 'assigned', state: 'active' },
  ] as Assignment[];
  assert.equal(resultSummary(rows, []).overdue, 1);
  assert.deepEqual(
    filterAssignments(rows, 'in_progress').map((a) => a.id),
    [3],
  );
});
