export type Rules = {
  max_attempts: number;
  pass_percent: number;
  require_all_lessons: boolean;
  require_all_assessments: boolean;
  allow_late_submission: boolean;
  reveal_answers: "never" | "after_pass" | "after_final_attempt";
  allow_ai_assistant: boolean;
  allow_ai_grading: boolean;
  require_independent_approval: boolean;
  assignment_overrides: string[];
};
export type Criterion = {
  id: string;
  title: string;
  description?: string;
  max_points: number;
};
export type Assessment = {
  id: string;
  question: string;
  description: string;
  question_type: "single" | "multiple" | "open";
  answers: string[];
  max_points: number;
  criteria: Criterion[];
  grading_mode: string;
};
export type Lesson = {
  id: number;
  title: string;
  description: string;
  content: string;
};
export type LearningModule = {
  id: number;
  title: string;
  description: string;
  lessons: Lesson[];
  assessments: Assessment[];
};
export type Answer = { text?: string; selected?: string[] };
export type AIProposal = {
  request_id: string;
  response_revision: number;
  created_at: string;
  status: "pending" | "completed" | "failed";
  points: number | null;
  feedback: string;
  criteria_scores: { id: string; points: number }[];
  model: string | null;
  error_code: string | null;
};
export type LearnerResponse = {
  id: number;
  assignment_id: number;
  assessment_id: string;
  attempt: number;
  revision: number;
  answer: Answer;
  status: "draft" | "pending_review" | "reviewed";
  submitted_at: string | null;
  points: number | null;
  feedback: string;
  max_points: number;
  can_retry: boolean;
  correct_answers?: string[];
  grading_metadata?: {
    method?: string;
    reason?: string;
    ai_proposal?: AIProposal;
  };
  updated_at: string;
};
export type Assignment = {
  id: number;
  course_id: number;
  course_version_id: number;
  title: string;
  revision: number;
  user_id: number;
  group_id: number | null;
  state: string;
  status: string;
  due_at: string | null;
  created_at: string;
  completed_at: string | null;
  completed_lessons: number[];
  lesson_count: number;
  last_lesson_id: number | null;
  progress_revision: number;
  progress_percent: number;
  points: number;
  max_points: number;
  score_percent: number | null;
  pending_reviews: number;
  rules: Rules;
  rules_revision: number;
  full_name?: string;
  email?: string;
};
export type AssignmentDetail = Assignment & {
  content: {
    course: {
      id: number;
      title: string;
      description: string;
      revision: number;
    };
    modules: LearningModule[];
    assessments: Assessment[];
  };
  responses: LearnerResponse[];
};
export type ProgramEnrollment = {
  id: number;
  program_id: number;
  program_revision: number;
  title: string;
  user_id: number;
  created_at: string;
  next_cycle_at: string | null;
  status: string;
  assignments: Assignment[];
  next_assignment_id: number | null;
};
export type GradeHistory = {
  id: number;
  actor_id: number | null;
  old_points: number | null;
  points: number;
  feedback: string;
  criteria_scores: { id: string; points: number }[];
  source: string;
  created_at: string;
};
export type Review = LearnerResponse & {
  user_id: number;
  full_name: string;
  course_title: string;
  assessment: Assessment;
  history?: GradeHistory[];
};
export const stateLabel: Record<string, string> = {
  assigned: "Назначен",
  in_progress: "В процессе",
  completed: "Завершён",
  locked: "Следующий этап",
  revoked: "Назначение отозвано",
  draft: "Черновик",
  pending_review: "Ожидает проверки",
  reviewed: "Проверено",
};
export const dateLabel = (value: string | null) =>
  value
    ? new Date(
        /[zZ]|[+-]\d\d:\d\d$/.test(value) ? value : value + "Z",
      ).toLocaleString(getLocale() === "en" ? "en-GB" : "ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : translate(getLocale(), "Без срока");
import { getLocale, translate } from "@/i18n/locale";
