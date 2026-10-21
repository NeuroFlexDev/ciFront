import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import LearningCourse from "./LearningCourse";
import { api } from "@/shared/api";
vi.mock("@/shared/api", () => ({ api: { get: vi.fn(), put: vi.fn() } }));
vi.mock("@/Pages/Workspace/shared", () => ({
  Shell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/Components/MarkdownContent", () => ({
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("remembers opening a lesson and advances using the confirmed revision without erasing completion", async () => {
  const record = {
    id: 4,
    title: "Course",
    revision: 1,
    state: "active",
    status: "in_progress",
    completed_lessons: [1],
    progress_revision: 5,
    last_lesson_id: 1,
    progress_percent: 33,
    lesson_count: 3,
    due_at: null,
    rules_revision: 1,
    rules: { allow_ai_assistant: false, max_attempts: 3, pass_percent: 60 },
    responses: [],
    content: {
      course: { id: 1, title: "Course", description: "" },
      assessments: [],
      modules: [
        {
          id: 1,
          title: "Module",
          description: "",
          assessments: [],
          lessons: [1, 2, 3].map((id) => ({
            id,
            title: `Lesson ${id}`,
            description: "",
            content: `Content ${id}`,
          })),
        },
      ],
    },
  };
  vi.mocked(api.get).mockImplementation(async () => ({
    data: structuredClone(record),
  }));
  vi.mocked(api.put).mockImplementation(async (_path, payload) => {
    const input = payload as {
      lesson_id: number;
      completed: boolean;
      expected_revision: number;
    };
    expect(input.expected_revision).toBe(record.progress_revision);
    record.progress_revision++;
    record.last_lesson_id = input.lesson_id;
    if (input.completed) record.completed_lessons.push(input.lesson_id);
    return { data: structuredClone(record) };
  });
  render(
    <MemoryRouter initialEntries={["/learning/4"]}>
      <Routes>
        <Route path="/learning/:id" element={<LearningCourse />} />
      </Routes>
    </MemoryRouter>,
  );
  const second = await screen.findByRole("button", { name: /2 Lesson 2/ });
  fireEvent.click(second);
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith("/learning/assignments/4/progress", {
      expected_revision: 5,
      lesson_id: 2,
      completed: false,
    }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Урок пройден · продолжить →" }),
    ).toBeEnabled(),
  );
  expect(record.completed_lessons).toEqual([1]);
  fireEvent.click(
    screen.getByRole("button", { name: "Урок пройден · продолжить →" }),
  );
  await waitFor(() =>
    expect(api.put).toHaveBeenLastCalledWith(
      "/learning/assignments/4/progress",
      { expected_revision: 7, lesson_id: 3, completed: false },
    ),
  );
  expect(record.completed_lessons).toEqual([1, 2]);
  expect(record.last_lesson_id).toBe(3);
  expect(await screen.findByText("Content 3")).toBeInTheDocument();
});
