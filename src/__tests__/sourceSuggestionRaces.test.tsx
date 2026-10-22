import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import CourseWizard from "@/Pages/ExpressPage/CourseWizard";
import { readDraft, setDraftOwner, writeDraft } from "@/shared/drafts";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
const user = vi.hoisted(() => ({ id: 9382 }));
vi.mock("@/shared/api", () => ({ api: mocks }));
vi.mock("@/Components/Menu/Menu", () => ({ default: () => null }));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user }) }));
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  setDraftOwner(++user.id);
});
afterEach(() => {
  cleanup();
  setDraftOwner(null);
  localStorage.clear();
});
function ReviewHarness() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate(-1)}>Browser back</button>
      <CourseWizard />
    </>
  );
}
it("invalidates approved preflight when returning autofill changes its checked settings", async () => {
  const settings = {
    title: "Первый источник",
    goal: "Исходная цель",
    target_audience: null,
    difficulty: "basic",
    language: "ru",
    lesson_count: 2,
    module_tests_enabled: true,
    final_test_enabled: true,
    expected_revision: 0,
    approved_plan: [],
  };
  writeDraft("generation:82", {
    settings,
    document_ids: [1],
    selection_initialized: true,
    request_id: "stable-original-key",
    source_fill: { title: settings.title, goal: settings.goal },
  });
  const changed = {
    title: "Обновлённый источник",
    goal: "Новая цель после замены источника",
  };
  let suggestionCalls = 0;
  let sourceUpdated = false;
  mocks.get.mockImplementation(async (path: string) => ({
    data: path.includes("generation-settings")
      ? { ...settings, revision: 0 }
      : path.includes("documents")
        ? { items: [], total: 1 }
        : {
            document_formats: ["pdf"],
            document_max_bytes: 50000,
            source_characters_limit: 50000,
          },
  }));
  mocks.post.mockImplementation(async (path: string) => ({
    data: path.includes("source-suggestion")
      ? {
          ...(sourceUpdated ? changed : settings),
          method: "source_excerpt",
          sources: [
            { id: 1, version: ++suggestionCalls, filename: "source.pdf" },
          ],
        }
      : {
          allowed: true,
          reasons: [],
          source_characters: 500,
          source_bytes: 500,
          minimum_calls: 4,
          calls_limit: 200,
          output_token_reservation: 8000,
          tokens_limit: 50000,
          note: "checked",
        },
  }));
  mocks.put.mockResolvedValue({ data: { ...settings, revision: 1 } });
  render(
    <MemoryRouter initialEntries={["/express?course=82&step=3"]}>
      <ReviewHarness />
    </MemoryRouter>,
  );
  await waitFor(() => expect(suggestionCalls).toBeGreaterThan(0));
  await act(async () => {});
  await screen.findByText(/Тема и описание взяты/);
  expect(
    readDraft<{ request_id: string }>("generation:82")?.value.request_id,
  ).toBe("stable-original-key");
  fireEvent.click(
    screen.getByRole("button", { name: "Сохранить и продолжить →" }),
  );
  await screen.findByRole("button", { name: "Сгенерировать курс" });
  sourceUpdated = true;
  fireEvent.click(screen.getByRole("button", { name: "Изменить настройки" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Название курса")).toHaveValue(changed.title),
  );
  const changedKey = readDraft<{ request_id: string }>("generation:82")?.value
    .request_id;
  expect(changedKey).toBeTruthy();
  expect(changedKey).not.toBe("stable-original-key");
  fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
  expect(
    screen.queryByRole("button", { name: "Сгенерировать курс" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Проверить параметры" }),
  ).toBeEnabled();
  expect(
    readDraft<{ request_id: string }>("generation:82")?.value.request_id,
  ).toBe(changedKey);
  expect(
    mocks.post.mock.calls.filter(([path]) => path.endsWith("/generation-runs")),
  ).toEqual([]);
});

it.each([false, true])(
  "waits for late authoritative settings before autofill and preserves author text (local draft: %s)",
  async (hadDraft) => {
    const settings = {
      title: "Название автора",
      goal: "Авторская цель обучения",
      target_audience: null,
      difficulty: "basic",
      language: "ru",
      lesson_count: 2,
      module_tests_enabled: true,
      final_test_enabled: true,
      expected_revision: 4,
      approved_plan: [],
    };
    if (hadDraft)
      writeDraft("generation:83", {
        settings,
        document_ids: [1],
        selection_initialized: true,
        request_id: "author-request-key",
      });
    let resolveSettings!: (response: { data: unknown }) => void;
    let resolveSuggestion!: (response: { data: unknown }) => void;
    mocks.get.mockImplementation((path: string) =>
      path.includes("generation-settings")
        ? new Promise((resolve) => {
            resolveSettings = resolve;
          })
        : Promise.resolve({
            data: path.includes("documents")
              ? {
                  items: [
                    { id: 1, status: "ready", original_filename: "source.pdf" },
                  ],
                  total: 1,
                }
              : {
                  document_formats: ["pdf"],
                  document_max_bytes: 50000,
                  source_characters_limit: 50000,
                },
          }),
    );
    mocks.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSuggestion = resolve;
        }),
    );
    render(
      <MemoryRouter initialEntries={["/express?course=83&step=3"]}>
        <CourseWizard />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(
        readDraft<{ document_ids: number[] }>("generation:83")?.value
          .document_ids,
      ).toEqual([1]),
    );
    await act(async () => {});
    expect(mocks.post).not.toHaveBeenCalled();
    await act(async () =>
      resolveSettings({ data: { ...settings, revision: 4 } }),
    );
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledExactlyOnceWith(
        "/courses/83/source-suggestion",
        { document_ids: [1] },
      ),
    );
    expect(screen.getByLabelText("Название курса")).toHaveValue(settings.title);
    expect(screen.getByLabelText("Описание и цель курса")).toHaveValue(
      settings.goal,
    );
    const keyBeforeSuggestion = readDraft<{ request_id: string }>(
      "generation:83",
    )?.value.request_id;
    await act(async () =>
      resolveSuggestion({
        data: {
          title: "Тема из документа",
          goal: "Автоматическое описание",
          method: "source_excerpt",
          sources: [{ id: 1, version: 1, filename: "source.pdf" }],
        },
      }),
    );
    await screen.findByText(/Тема и описание взяты/);
    expect(screen.getByLabelText("Название курса")).toHaveValue(settings.title);
    expect(screen.getByLabelText("Описание и цель курса")).toHaveValue(
      settings.goal,
    );
    expect(
      readDraft<{ request_id: string; settings: typeof settings }>(
        "generation:83",
      )?.value,
    ).toMatchObject({ request_id: keyBeforeSuggestion, settings });
    expect(mocks.put).not.toHaveBeenCalled();
  },
);
