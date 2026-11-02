import type { Assignment, Detail, Response } from './types';

export function latestResponses(responses: Response[]): Response[] {
  const latest = new Map<string, Response>();
  for (const response of responses) {
    const current = latest.get(response.assessment_id);
    if (
      !current ||
      response.attempt > current.attempt ||
      (response.attempt === current.attempt && response.revision > current.revision)
    )
      latest.set(response.assessment_id, response);
  }
  return [...latest.values()];
}
export function resultSummary(assignments: Assignment[], details: Detail[]) {
  const responses = details.flatMap((detail) => latestResponses(detail.responses));
  const graded = responses.filter(
    (response) => response.status === 'reviewed' && response.points != null,
  );
  const points = graded.reduce((sum, response) => sum + (response.points || 0), 0);
  const max = graded.reduce((sum, response) => sum + response.max_points, 0);
  return {
    completed: assignments.filter((a) => a.status === 'completed').length,
    overdue: assignments.filter((a) => a.state === 'active' && a.status === 'overdue').length,
    pending: responses.filter((r) => r.status === 'pending_review').length,
    score: max ? Math.round((points / max) * 100) : null,
    graded: graded.length,
  };
}
export function filterAssignments(items: Assignment[], filter: string) {
  return items.filter(
    (a) =>
      filter === 'all' ||
      (filter === 'in_progress'
        ? ['assigned', 'in_progress'].includes(a.status)
        : a.status === filter),
  );
}
