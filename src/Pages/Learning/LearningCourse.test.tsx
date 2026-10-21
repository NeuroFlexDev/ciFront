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
import { ApiError } from "@/shared/errors";
vi.mock("@/shared/api", () => ({ api: { get: vi.fn(), put: vi.fn() } }));
vi.mock("@/Pages/Workspace/shared", () => ({
  Shell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/Components/MarkdownContent", () => ({
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
vi.mock("./AssessmentAnswer", () => ({
  default: ({ assessment }: { assessment: { question: string } }) => (
    <h2>{assessment.question}</h2>
  ),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function assessmentRecord() {
  return {
    id: 4,
    title: "Course",
    revision: 1,
    state: "active",
    status: "in_progress",
    completed_lessons: [],
    progress_revision: 5,
    last_lesson_id: 1,
    last_item_key: "lesson:1",
    progress_percent: 0,
    lesson_count: 1,
    rules_revision: 1,
    rules: { max_attempts: 2, pass_percent: 60 },
    responses: [],
    content: {
      course: { id: 1, title: "Course" },
      assessments: [],
      modules: [
        {
          id: 1,
          title: "Module",
          lessons: [{ id: 1, title: "Lesson", content: "Lesson text" }],
          assessments: [
            {
              id: "test:5",
              question: "Saved assessment",
              description: "",
              question_type: "single",
              answers: ["A", "B"],
              criteria: [],
              max_points: 1,
            },
          ],
        },
      ],
    },
  };
}
function openLearning(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/learning/:id" element={<LearningCourse />} />
      </Routes>
    </MemoryRouter>,
  );
}
it("persists a direct assessment link and resumes that server bookmark in a new page", async () => {
  const record = assessmentRecord();
  vi.mocked(api.get).mockImplementation(async () => ({
    data: structuredClone(record),
  }));
  vi.mocked(api.put).mockImplementation(async (_path, payload) => {
    expect(payload).toEqual({ expected_revision: 5, item_key: "test:5" });
    record.last_item_key = "test:5";
    record.progress_revision++;
    return { data: structuredClone(record) };
  });
  const first = openLearning("/learning/4?item=test%3A5");
  expect(
    await screen.findByRole("heading", { name: "Saved assessment" }),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith("/learning/assignments/4/bookmark", {
      expected_revision: 5,
      item_key: "test:5",
    }),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Lesson/ })).toBeEnabled(),
  );
  first.unmount();
  openLearning("/learning/4");
  expect(
    await screen.findByRole("heading", { name: "Saved assessment" }),
  ).toBeInTheDocument();
  expect(api.put).toHaveBeenCalledTimes(1);
});
it("does not retry a conflicting deep-link bookmark against a newer revision automatically", async () => {
  const record = assessmentRecord();
  vi.mocked(api.get).mockImplementation(async () => ({
    data: structuredClone(record),
  }));
  vi.mocked(api.put).mockImplementation(async () => {
    record.progress_revision = 6;
    throw new ApiError("Changed on another device", 409, "http");
  });
  openLearning("/learning/4?item=test%3A5");
  await screen.findByText("Changed on another device");
  window.dispatchEvent(new Event("online"));
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  expect(api.put).toHaveBeenCalledTimes(1);
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
    last_item_key: "lesson:1",
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
      item_key?: string;
    };
    expect(input.expected_revision).toBe(record.progress_revision);
    record.progress_revision++;
    record.last_item_key = input.item_key ?? `lesson:${input.lesson_id}`;
    if (record.last_item_key.startsWith("lesson:"))
      record.last_lesson_id = Number(record.last_item_key.split(":")[1]);
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
    expect(api.put).toHaveBeenCalledWith("/learning/assignments/4/bookmark", {
      expected_revision: 5,
      item_key: "lesson:2",
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
      "/learning/assignments/4/bookmark",
      { expected_revision: 7, item_key: "lesson:3" },
    ),
  );
  expect(record.completed_lessons).toEqual([1, 2]);
  expect(record.last_lesson_id).toBe(3);
  expect(await screen.findByText("Content 3")).toBeInTheDocument();
});
