import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import LearningAssistant from "./LearningAssistant";
import { api } from "@/shared/api";
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: { id: 993 } }) }));
vi.mock("@/shared/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/Components/MarkdownContent", () => ({
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});
it("keeps past answers readable and deletable while organization disables new assistant requests", async () => {
  vi.mocked(api.get).mockResolvedValue({
    data: {
      can_send: false,
      disabled_reason: "assistant_disabled",
      total: 1,
      items: [
        {
          id: 9,
          lesson_id: 3,
          question: "Сохранённый вопрос",
          answer: "Сохранённое объяснение",
          status: "completed",
          citations: [],
          created_at: "2026-10-21T12:00:00Z",
          model: "test",
          error_code: null,
        },
      ],
    },
  });
  render(
    <LearningAssistant
      assignmentId={8}
      lessonId={3}
      allowSend={false}
      onLesson={() => {}}
    />,
  );
  expect(await screen.findByText("Сохранённое объяснение")).toBeInTheDocument();
  expect(screen.getByLabelText("Вопрос по открытому уроку")).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Спросить помощника ↑" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Удалить мой диалог" }),
  ).toBeEnabled();
  expect(api.post).not.toHaveBeenCalled();
});
