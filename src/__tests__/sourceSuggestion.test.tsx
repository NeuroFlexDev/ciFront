import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CourseWizard from "@/Pages/ExpressPage/CourseWizard";
import GenerationPreflight from "@/Pages/ExpressPage/GenerationPreflight";
import { readDraft, setDraftOwner, writeDraft } from "@/shared/drafts";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api", () => ({ api: mocks }));
vi.mock("@/Components/Menu/Menu", () => ({ default: () => null }));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: { id: 42 } }) }));
const settings = { title: "", goal: "", target_audience: "", difficulty: "basic", language: "ru", lesson_count: 6, module_tests_enabled: true, final_test_enabled: true, expected_revision: 0 };
const suggestion = { title: "Продукт и клиенты", goal: "Сотрудники изучат продукт и научатся отвечать на вопросы клиентов.", method: "source_excerpt", sources: [{ id: 1, version: 1, filename: "guide.pdf" }] };

beforeEach(() => {
  localStorage.clear(); setDraftOwner(42); mocks.get.mockReset(); mocks.post.mockReset();
  writeDraft("generation:8", { settings, document_ids: [1], selection_initialized: true, request_id: "test-request" }, undefined, 42);
  mocks.get.mockImplementation(async (url: string) => ({ data: url.includes("generation-settings") ? { ...settings, revision: 0 } : url.includes("documents") ? { items: [], total: 1 } : { document_formats: ["pdf"], document_max_bytes: 100000 } }));
});
afterEach(() => { cleanup(); setDraftOwner(null); });
const page = () => render(<MemoryRouter initialEntries={["/express?course=8&step=3"]}><CourseWizard /></MemoryRouter>);

it("fills source topic and description, persists them, and keeps both editable", async () => {
  mocks.post.mockResolvedValue({ data: suggestion });
  page();
  await waitFor(() => expect(screen.getByLabelText("Название курса")).toHaveValue(suggestion.title));
  expect(screen.getByLabelText("Описание и цель курса")).toHaveValue(suggestion.goal);
  fireEvent.change(screen.getByLabelText("Название курса"), { target: { value: "Моя редакция" } });
  expect(readDraft<{ settings: typeof settings }>("generation:8", 42)?.value.settings.title).toBe("Моя редакция");
});

it("never replaces typing or an intentionally cleared field with a late response", async () => {
  let resolve!: (value: unknown) => void;
  mocks.post.mockImplementation(() => new Promise(done => { resolve = done; }));
  page();
  await waitFor(() => expect(mocks.post).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText("Название курса"), { target: { value: "Своё название" } });
  fireEvent.change(screen.getByLabelText("Описание и цель курса"), { target: { value: "Временно" } });
  fireEvent.change(screen.getByLabelText("Описание и цель курса"), { target: { value: "" } });
  resolve({ data: suggestion });
  await screen.findByText(/Тема и описание взяты/);
  expect(screen.getByLabelText("Название курса")).toHaveValue("Своё название");
  expect(screen.getByLabelText("Описание и цель курса")).toHaveValue("");
});

it("preserves edits after reopening while refetching suggestions", async () => {
  mocks.post.mockResolvedValue({ data: suggestion });
  const first = page();
  await waitFor(() => expect(screen.getByLabelText("Название курса")).toHaveValue(suggestion.title));
  fireEvent.change(screen.getByLabelText("Описание и цель курса"), { target: { value: "Сохранённое описание" } });
  first.unmount(); page();
  await screen.findByText(/Тема и описание взяты/);
  expect(screen.getByLabelText("Описание и цель курса")).toHaveValue("Сохранённое описание");
});

it("can retry a failed suggestion without blocking manual configuration", async () => {
  mocks.post.mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce({ data: suggestion });
  page();
  fireEvent.change(screen.getByLabelText("Название курса"), { target: { value: "Своя тема" } });
  fireEvent.click(await screen.findByRole("button", { name: "Повторить автозаполнение" }));
  await waitFor(() => expect(screen.getByLabelText("Описание и цель курса")).toHaveValue(suggestion.goal));
  expect(screen.getByLabelText("Название курса")).toHaveValue("Своя тема");
});

it("explains preflight, keeps technical details collapsed, and prevents a rejected launch", () => {
  const onGenerate = vi.fn(), onBack = vi.fn();
  render(<GenerationPreflight settings={{ ...settings, title: "Тестовый курс" }} sourceCount={2} busy={false}
    preflight={{ allowed: false, reasons: ["Сократите количество уроков"], source_characters: 5000, source_bytes: 10000, minimum_calls: 40, calls_limit: 20, output_token_reservation: 5000, tokens_limit: 10000, note: "Расчёт нижней границы" }}
    onGenerate={onGenerate} onBack={onBack} onPrepare={() => {}} />);
  expect(screen.getByText(/Курс сохранится как черновик/)).toBeInTheDocument();
  expect(screen.getByText("Ресурсы и ограничения генерации").closest("details")).not.toHaveAttribute("open");
  const launch = screen.getByRole("button", { name: "Сгенерировать курс" });
  expect(launch).toBeDisabled(); fireEvent.click(launch); expect(onGenerate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Изменить настройки" })); expect(onBack).toHaveBeenCalledOnce();
});
