import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AssessmentEditor from "./AssessmentEditor";
import { api } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { readDraft, setDraftOwner } from "@/shared/drafts";

vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: { id: 710 } }) }));
vi.mock("@/shared/api", () => ({ api: { get: vi.fn(), put: vi.fn() } }));
const original = {
  question_type: "open",
  correct_answers: [],
  max_points: 5,
  grading_mode: "manual",
  revision: 4,
  criteria: [
    {
      id: "reasoning",
      title: "Обоснование",
      description: "Полнота ответа",
      max_points: 5,
      levels: [
        { title: "Полностью", description: "Все шаги объяснены", points: 5 },
        { title: "Частично", description: "Есть пропуски", points: 2 },
      ],
    },
  ],
};
const target = {
  kind: "task" as const,
  id: 17,
  title: "Ответ автора",
  answers: [],
};
beforeEach(() => {
  localStorage.clear();
  setDraftOwner(710);
  vi.mocked(api.get).mockResolvedValue({ data: original });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  setDraftOwner(null);
});

it("edits rubric levels without losing other levels and keeps the original CAS revision", async () => {
  let resolveSave: (value: { data: unknown }) => void = () => {};
  vi.mocked(api.put).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
  );
  const saved = vi.fn();
  render(
    <AssessmentEditor target={target} onClose={() => {}} onSaved={saved} />,
  );
  const fields = await screen.findAllByLabelText("Баллы за уровень");
  fireEvent.change(fields[1], { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить оценивание" }));
  expect(api.put).toHaveBeenCalledWith(
    "/tasks/17/assessment-settings",
    expect.objectContaining({
      expected_revision: 4,
      criteria: [
        {
          ...original.criteria[0],
          levels: [
            original.criteria[0].levels[0],
            { ...original.criteria[0].levels[1], points: 3 },
          ],
        },
      ],
    }),
  );
  expect(fields[0]).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Добавить уровень" }),
  ).toBeDisabled();
  await act(async () => resolveSave({ data: { ...original, revision: 5 } }));
  expect(saved).toHaveBeenCalledTimes(1);
  expect(readDraft("assessment:task:17", 710)).toBeNull();
});

it("keeps local rubric levels after a conflict and requires an explicit choice before reusing the new revision", async () => {
  vi.mocked(api.put).mockRejectedValue(new ApiError("Другая версия", 409));
  vi.mocked(api.get)
    .mockResolvedValueOnce({ data: original })
    .mockResolvedValue({
      data: {
        ...original,
        revision: 5,
        criteria: [
          {
            ...original.criteria[0],
            levels: [
              {
                title: "Новый уровень сервера",
                description: "Серверная шкала",
                points: 4,
              },
            ],
          },
        ],
      },
    });
  render(
    <AssessmentEditor target={target} onClose={() => {}} onSaved={() => {}} />,
  );
  const fields = await screen.findAllByLabelText("Баллы за уровень");
  fireEvent.change(fields[1], { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить оценивание" }));
  await screen.findByText("Правила изменены в другой вкладке");
  expect(screen.getAllByLabelText("Баллы за уровень")[1]).toHaveValue(3);
  expect(
    screen.getByRole("button", { name: "Сохранить оценивание" }),
  ).toBeDisabled();
  expect(screen.getByText(/Новый уровень сервера — 4/)).toBeInTheDocument();
  expect(
    readDraft<{ expected_revision: number }>("assessment:task:17", 710)?.value
      .expected_revision,
  ).toBe(4);
  fireEvent.click(
    screen.getByRole("button", {
      name: "Сохранить мои правила вместо этой версии",
    }),
  );
  vi.mocked(api.put).mockResolvedValue({ data: { ...original, revision: 6 } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить оценивание" }));
  await waitFor(() =>
    expect(api.put).toHaveBeenLastCalledWith(
      "/tasks/17/assessment-settings",
      expect.objectContaining({
        expected_revision: 5,
        criteria: [
          expect.objectContaining({
            levels: [
              original.criteria[0].levels[0],
              { ...original.criteria[0].levels[1], points: 3 },
            ],
          }),
        ],
      }),
    ),
  );
});
