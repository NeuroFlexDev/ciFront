import type { WebSearchEvidence } from './WebSearchStatus';

export type GenerationRun = {
  run_id: number;
  course_id: number;
  status: string;
  progress_percent?: number | null;
  current_stage?: string;
  stages: { code: string; title: string; status: string }[];
  status_error?: { message: string; retryable: boolean } | null;
  status_notice?: string | null;
  settings_snapshot?: { title?: string; approved_plan?: string[]; web_search_enabled?: boolean };
  web_search?: WebSearchEvidence | null;
  created_at?: string | null;
  queued_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export type GenerationConnection =
  'loading' | 'connected' | 'reconnecting' | 'session' | 'unavailable';
export type GenerationPlan = {
  title: string;
  modules: { id: string; title: string; lessons: string[] }[];
};

export const generationActive = (run: GenerationRun | null) =>
  Boolean(run && ['queued', 'running'].includes(run.status));
export const generationSucceeded = (run: GenerationRun | null) =>
  Boolean(run && ['completed', 'succeeded'].includes(run.status));

export function generationTimestamp(value?: string | null): number | null {
  if (!value) return null;
  // The API currently serializes UTC database timestamps without an offset.
  const timestamp = Date.parse(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

/** Keep only the validated, completed course plan; never render raw model HTML. */
export function readGenerationPlan(value: unknown, runId: number): GenerationPlan | null {
  if (!Array.isArray(value)) return null;
  const artifact = value
    .filter(
      (item) =>
        item?.run_id === runId && item.artifact === 'course_plan' && item.status === 'completed',
    )
    .sort((a, b) => (b.sequence ?? 0) - (a.sequence ?? 0))[0];
  const plan = artifact?.payload;
  if (
    !plan ||
    typeof plan.title !== 'string' ||
    !Array.isArray(plan.modules) ||
    !Array.isArray(plan.lessons)
  )
    return null;
  const lessons = new Map<string, string>();
  for (const lesson of plan.lessons) {
    if (typeof lesson?.id === 'string' && typeof lesson.title === 'string')
      lessons.set(lesson.id, lesson.title);
  }
  const modules: GenerationPlan['modules'] = [];
  for (const module of plan.modules) {
    if (
      typeof module?.id !== 'string' ||
      typeof module.title !== 'string' ||
      !Array.isArray(module.lesson_ids)
    )
      continue;
    modules.push({
      id: module.id,
      title: module.title,
      lessons: module.lesson_ids.flatMap((id: unknown) =>
        typeof id === 'string' && lessons.has(id) ? [lessons.get(id)!] : [],
      ),
    });
  }
  return modules.length ? { title: plan.title, modules } : null;
}
