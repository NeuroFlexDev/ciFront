import type { Rules } from "../Learning/types";
export type TeamMember = {
  id: number;
  email: string | null;
  username?: string | null;
  full_name: string;
  organization_role: string;
  is_active: boolean;
};
export type Team = {
  organization: {
    id: number;
    name: string;
    kind: string;
    seat_limit: number;
    course_limit: number;
    ai_unlimited?: boolean;
    generation_limit: number;
    reserved_seats: number;
    courses: number;
  } | null;
  members: TeamMember[];
  can_manage: boolean;
};
export type Group = {
  id: number;
  name: string;
  description: string;
  is_archived: boolean;
  state_token: string;
  user_ids: number[];
  staff: { id: number; user_id: number; role: string }[];
};
export type Department = { id: number; name: string; parent_id: number | null; is_archived: boolean; state_token: string };
export type Person = {
  user_id: number;
  department_id: number | null;
  position: string;
  external_id: string | null;
  attributes: Record<string, string>;
};
export type CatalogueItem = {
  course_id: number;
  course_version_id: number;
  title: string;
  revision: number;
  published_at: string;
};
export type TeamSettings = {
  organization_id: number;
  revision: number;
  profile: string;
  languages: string[];
  role_labels: Record<string, string>;
  features: Record<string, boolean>;
  delivery: Record<string, unknown>;
  rules: Rules;
  ai_context: Record<string, string>;
};
export type Program = {
  id: number;
  title: string;
  description: string;
  revision: number;
  steps: { course_version_id: number; due_days: number | null }[];
  recurrence_days: number | null;
  reminder_days: number;
  is_archived: boolean;
};
export type RoleGrant = {
  id: number;
  role: string;
  scope_type: string;
  scope_id: number;
};
export const roles: Record<string, string> = {
  owner: "Владелец",
  admin: "Администратор",
  author: "Автор",
  reviewer: "Проверяющий",
  manager: "Руководитель",
  member: "Участник",
};
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((v) => v[0])
    .join("")
    .toUpperCase() || (getLocale() === "en" ? "L" : "Л");
import { getLocale } from "@/i18n/locale";
