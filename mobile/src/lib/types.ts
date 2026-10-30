export type User = {
  id: number;
  email: string | null;
  username?: string;
  full_name: string;
  organization_id: number | null;
  organization_role: string;
  organization_kind?: string;
};
export type Session = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
};
export type Bootstrap = {
  api_origin: string;
  api_compatibility: string;
  minimum_app_version: string;
  push_notifications: boolean;
  login_methods: string[];
};
export type Notice = {
  id: number;
  title: string;
  body: string;
  category: string;
  resource_type: string;
  resource_id: number;
  created_at: string;
  read_at: string | null;
};
export type Inbox = {
  items: Notice[];
  unread_count: number;
  latest_id: number;
  next_cursor: number | null;
};
export type Preferences = {
  push_enabled: boolean;
  assignment_enabled: boolean;
  deadline_enabled: boolean;
  result_enabled: boolean;
  review_enabled: boolean;
  generation_enabled: boolean;
  timezone: string;
  quiet_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
};
export type Answer = { text?: string; selected?: string[] };
export type Assessment = {
  locked_reason?: string;
  id: string;
  question: string;
  description: string;
  question_type: 'open' | 'single' | 'multiple';
  answers: string[];
  max_points: number;
  criteria: { id: string; title: string; max_points: number }[];
};
export type Response = {
  id: number;
  submission_key?: string | null;
  assessment_id: string;
  attempt: number;
  revision: number;
  answer: Answer;
  status: string;
  points: number | null;
  max_points: number;
  feedback: string;
  can_retry: boolean;
  correct_answers?: string[];
};
export type Lesson = { id: number; title: string; description: string; content: string };
export type Assignment = {
  id: number;
  title: string;
  course_version_id: number;
  state: string;
  status: string;
  due_at: string | null;
  created_at: string;
  progress_percent: number;
  progress_revision: number;
  completed_lessons: number[];
  lesson_count: number;
  last_lesson_id: number | null;
  points: number;
  max_points: number;
  score_percent: number | null;
  pending_reviews: number;
  rules: {
    max_attempts: number;
    pass_percent: number;
    allow_late_submission: boolean;
    allow_ai_assistant: boolean;
  };
};
export type Detail = Assignment & {
  content: {
    practice_requires_test_pass?: boolean;
    course: { description: string };
    modules: { id: number; title: string; lessons: Lesson[]; assessments: Assessment[] }[];
    assessments: Assessment[];
  };
  responses: Response[];
};
export type Person = {
  id: number;
  full_name: string;
  username: string;
  email: string | null;
  organization_role: string;
  is_active: boolean;
  manager_id: number | null;
  position_id: number | null;
  position_name: string;
  auth_version: number;
};
export type Position = {
  id: number;
  name: string;
  description: string;
  responsibilities: string;
  competencies: string;
  revision: number;
  is_archived: boolean;
};
export type Review = Response & { full_name: string; course_title: string; assessment: Assessment };
export const roles: Record<string, string> = {
  owner: 'Владелец',
  manager: 'Руководитель',
  member: 'Сотрудник',
  candidate: 'Кандидат',
};
export const states: Record<string, string> = {
  assigned: 'Назначено',
  in_progress: 'В процессе',
  overdue: 'Срок истёк',
  completed: 'Завершено',
  locked: 'Следующий этап',
  revoked: 'Отозвано',
  draft: 'Черновик',
  pending_review: 'На проверке',
  reviewed: 'Проверено',
};
export const date = (value?: string | null) =>
  value
    ? new Date(/[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z').toLocaleDateString(
        'ru-RU',
        { day: 'numeric', month: 'long' },
      )
    : 'Без срока';
export const manages = (user?: User | null) =>
  !!user && ['owner', 'manager', 'admin'].includes(user.organization_role);
