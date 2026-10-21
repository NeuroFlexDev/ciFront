import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import LearningDashboard, {
  type LearningDashboardData,
} from "./LearningDashboard";
import { api } from "@/shared/api";
vi.mock("@/Components/Menu/Menu", () => ({ default: () => null }));
vi.mock("@/shared/api", () => ({ api: { get: vi.fn() } }));
const data: LearningDashboardData = {
  scope: "authorized_team",
  period_days: 30,
  activity_days: 7,
  as_of: "2026-10-21T12:00:00Z",
  metrics: {
    assignments_in_period: 4,
    completed_in_period: 3,
    completion_percent: 75,
    average_completion_hours: 15.5,
    courses: 2,
    people: 3,
    active_assignments: 4,
    completed_lessons: 7,
    assigned_lessons: 10,
    lesson_completion_percent: 70,
    pending_review: 2,
    submitted_attempts: 9,
  },
  daily: [
    { date: "2026-10-20", submitted_attempts: 4 },
    { date: "2026-10-21", submitted_attempts: 5 },
  ],
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("renders actual aggregate values and reloads using the selected metric periods", async () => {
  vi.mocked(api.get).mockImplementation(async (path) => ({
    data:
      path === "/team/permissions"
        ? {
            can_author: false,
            can_review: true,
            can_report: true,
            can_manage_team: false,
          }
        : data,
  }));
  render(
    <MemoryRouter>
      <LearningDashboard />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("img", { name: "Завершено 3 из 4 назначений" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: "Завершено 7 из 10 уроков" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Открыть очередь проверки →" }),
  ).toHaveAttribute("href", "/reviews");
  expect(
    screen.getByRole("link", { name: "Открыть участников" }),
  ).toHaveAttribute("href", "/learning-analytics");
  fireEvent.change(screen.getByLabelText("Период активности"), {
    target: { value: "14" },
  });
  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      "/learning/dashboard?days=30&activity_days=14",
    ),
  );
  await screen.findByLabelText("Период назначений");
  fireEvent.change(screen.getByLabelText("Период назначений"), {
    target: { value: "90" },
  });
  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      "/learning/dashboard?days=90&activity_days=14",
    ),
  );
});
it("keeps empty percentages unknown rather than rendering invented learning progress", async () => {
  vi.mocked(api.get).mockImplementation(async (path) => ({
    data:
      path === "/team/permissions"
        ? { can_author: false }
        : {
            ...data,
            scope: "self",
            metrics: {
              ...data.metrics,
              assignments_in_period: 0,
              completed_in_period: 0,
              completion_percent: null,
              lesson_completion_percent: null,
              average_completion_hours: null,
              people: null,
              submitted_attempts: 0,
            },
            daily: [],
          },
  }));
  render(
    <MemoryRouter>
      <LearningDashboard />
    </MemoryRouter>,
  );
  await screen.findByText("Нет назначений");
  expect(screen.queryByText("75%")).not.toBeInTheDocument();
  expect(
    screen.getByText("За этот период ответы ещё не отправляли"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Открыть назначения" }),
  ).toHaveAttribute("href", "/learning");
  expect(screen.getAllByText("—")).toHaveLength(3);
});
