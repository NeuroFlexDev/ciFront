import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import CourseEditPage from "./CourseEditPage";
import { ApiError } from "@/shared/errors";
import { readDraft, setDraftOwner } from "@/shared/drafts";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), generation: 0 }));
const user = vi.hoisted(() => ({ id: 9519, organization_id: null, organization_role: "owner", is_admin: false }));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/shared/api", () => ({ api: mocks,
  captureAuthSession: () => ({ generation: mocks.generation, storedToken: "test-token" }),
  authSessionIsCurrent: (session: { generation: number }) => session.generation === mocks.generation,
  assertAuthSession: vi.fn(), apiFetch: vi.fn() }));
vi.mock("@/Components/Menu/Menu", () => ({ default: () => null }));
vi.mock("@/Components/SourceReleasePanel", () => ({ default: () => null }));
vi.mock("@/Components/MarkdownContent", () => ({ default: ({ children }: { children: string }) => <div>{children}</div> }));

const transferPath = "/team/course-transfers?offset=0&limit=20&course_id=7";
const published = { course_id: 7, course_version_id: 91, revision: 9, title: "Курс", published_at: "2026-10-22T00:00:00Z", snapshot_sha256: "a".repeat(64), source_count: 0 };
const lesson = { id: 71, title: "Урок", description: "", content: "Сохранённый текст", revision: 3 };
let transfers: { items: typeof published[]; total: number };
let transferError: unknown;

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mocks.generation++;
  setDraftOwner(++user.id);
  transfers = { items: [], total: 0 };
  transferError = null;
  mocks.get.mockImplementation(async (path: string) => {
    if (path === "/courses/8/structure") return { data: { course_id: 8, title: "Курс Б", content_revision: 13, status: "draft", modules_timeline: [{ module_id: 80 }] } };
    if (path === "/modules/80") return { data: { id: 80, title: "Модуль Б", revision: 2, lessons: [{ ...lesson, id: 81, title: "Урок Б", content: "Текст курса Б" }], tests: [], tasks: [] } };
    if (path === "/team/course-transfers?offset=0&limit=20&course_id=8") return { data: { items: [], total: 0 } };
    if (path === transferPath) {
      if (transferError) throw transferError;
      return { data: transfers };
    }
    if (path.endsWith("/structure")) return { data: { course_id: 7, title: "Курс", content_revision: 8, status: "draft", modules_timeline: [{ module_id: 70 }] } };
    if (path === "/modules/70") return { data: { id: 70, title: "Модуль", revision: 2, lessons: [lesson], tests: [], tasks: [] } };
    return { data: [] };
  });
  mocks.post.mockImplementation(async () => {
    transfers = { items: [published], total: 1 };
    transferError = null;
    return { data: { id: 7, publication_status: "published", revision: 9, published_at: published.published_at } };
  });
});
afterEach(() => { cleanup(); setDraftOwner(null); localStorage.clear(); });

function BackToCourse() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Назад к курсу Б</button>;
}
async function page() {
  render(<MemoryRouter initialEntries={["/courses/8/edit", "/courses/7/edit"]} initialIndex={1}><BackToCourse /><Routes><Route path="/courses/:id/edit" element={<CourseEditPage />} /></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Исходник" }));
  const text = await screen.findByRole("textbox", { name: "Текст урока (Markdown)" });
  fireEvent.click(screen.getByText("Экспорт опубликованной версии: PDF и ZIP"));
  return text;
}

it("refreshes the mounted export panel after publish and loads the exact new immutable version without reloading editor data", async () => {
  await page();
  expect(await screen.findByText("Для передачи сначала опубликуйте курс.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Опубликовать курс" }));
  expect(await screen.findByText("Курс опубликован")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Опубликовано" })).toBeDisabled();
  const select = await screen.findByRole("combobox", { name: "Версия для передачи" });
  expect(screen.getByRole("option", { name: "Курс · Версия 9" })).toHaveValue("91");
  expect(screen.queryByText("Для передачи сначала опубликуйте курс.")).not.toBeInTheDocument();
  expect(select).toHaveValue(""); // transfer still requires explicit version/consent
  expect(mocks.get.mock.calls.filter(([path]) => path === transferPath)).toHaveLength(2);
  expect(mocks.get.mock.calls.filter(([path]) => path === "/courses/7/structure")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Настройки курса" }));
  fireEvent.change(screen.getByLabelText("Название"), { target: { value: "Уточнённое название" } });
  mocks.put.mockResolvedValue({ data: {} });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
  await waitFor(() => expect(mocks.put).toHaveBeenCalledWith("/courses/7", expect.objectContaining({ expected_revision: 9 })));
});

it("clears a stale version-list error on successful publication", async () => {
  transferError = new ApiError("Список версий временно недоступен", 503);
  await page();
  expect(await screen.findByText("Список версий временно недоступен")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Опубликовать курс" }));
  expect(await screen.findByRole("combobox", { name: "Версия для передачи" })).toBeInTheDocument();
  expect(screen.queryByText("Список версий временно недоступен")).not.toBeInTheDocument();
});

it("locks content while publication is pending and does not refetch or replace the editor", async () => {
  const text = await page();
  let finish!: (value: { data: unknown }) => void;
  mocks.post.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Опубликовать курс" }));
  expect(text).toBeDisabled();
  fireEvent.change(text, { target: { value: "Текст, введённый во время публикации" } });
  transfers = { items: [published], total: 1 };
  await act(async () => finish({ data: { id: 7, publication_status: "published", revision: 9, published_at: published.published_at } }));
  expect(text).toHaveValue(lesson.content);
  expect(readDraft<string>("lesson:71", user.id)).toBeNull();
  expect(mocks.get.mock.calls.filter(([path]) => path === "/courses/7/structure")).toHaveLength(1);
});

it("does not claim publication or reset export state when the publish request fails", async () => {
  await page();
  mocks.post.mockRejectedValue(new ApiError("Публикация отклонена", 422));
  fireEvent.click(screen.getByRole("button", { name: "Опубликовать курс" }));
  expect(await screen.findByText("Публикация отклонена")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Опубликовать курс" })).toBeEnabled();
  expect(screen.queryByText("Курс опубликован")).not.toBeInTheDocument();
  expect(mocks.get.mock.calls.filter(([path]) => path === transferPath)).toHaveLength(1);
});

function deferred() {
  let resolve!: (value: { data: unknown }) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<{ data: unknown }>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

it.each(["success", "failure"])("ignores a late lesson save %s after navigating to another course, including its finally", async outcome => {
  const a = deferred(), b = deferred();
  mocks.put.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const text = await page();
  fireEvent.change(text, { target: { value: "Черновик А" } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить урок" }));
  expect(text).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Назад к курсу Б" }));
  await screen.findByRole("heading", { name: "Курс Б" });
  fireEvent.click(screen.getByRole("button", { name: "Исходник" }));
  const current = screen.getByRole("textbox", { name: "Текст урока (Markdown)" });
  fireEvent.change(current, { target: { value: "Черновик Б" } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить урок" }));
  await act(async () => outcome === "success" ? a.resolve({ data: { ...lesson, revision: 99 } }) : a.reject(new ApiError("Ошибка урока А", 409)));
  expect(current).toHaveValue("Черновик Б");
  expect(current).toBeDisabled();
  expect(screen.queryByText("Ошибка урока А")).not.toBeInTheDocument();
  expect(readDraft<string>("lesson:81", user.id)?.baseRevision).toBe(3);
  await act(async () => b.resolve({ data: { ...lesson, id: 81, content: "Черновик Б", revision: 4 } }));
  expect(current).toBeEnabled();
  expect(readDraft<string>("lesson:81", user.id)).toBeNull();
  expect(readDraft<string>("lesson:71", user.id)?.value).toBe("Черновик А");
  fireEvent.change(current, { target: { value: "Следующая редакция Б" } });
  mocks.put.mockResolvedValue({ data: { ...lesson, id: 81, revision: 5 } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить урок" }));
  await waitFor(() => expect(mocks.put).toHaveBeenLastCalledWith("/lessons/81", { content: "Следующая редакция Б", expected_revision: 4 }));
});

it("does not apply a lesson save from a replaced auth session or clear its recovery copy", async () => {
  const pending = deferred();
  mocks.put.mockReturnValue(pending.promise);
  const text = await page();
  fireEvent.change(text, { target: { value: "Сохранить после входа" } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить урок" }));
  mocks.generation++;
  await act(async () => pending.resolve({ data: { ...lesson, revision: 99 } }));
  expect(readDraft<string>("lesson:71", user.id)?.value).toBe("Сохранить после входа");
  act(() => window.dispatchEvent(new Event("lernium-session-renewed")));
  await waitFor(() => expect(screen.getByRole("button", { name: "Сохранить урок" })).toBeEnabled());
  const sourceButton = screen.getByRole("button", { name: "Исходник" });
  fireEvent.click(sourceButton);
  expect(screen.getByRole("textbox", { name: "Текст урока (Markdown)" })).toHaveValue("Сохранить после входа");
  mocks.put.mockResolvedValue({ data: { ...lesson, revision: 4 } });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить урок" }));
  await waitFor(() => expect(mocks.put).toHaveBeenLastCalledWith("/lessons/71", { content: "Сохранить после входа", expected_revision: 3 }));
});

it.each(["success", "failure"])("ignores a late %s from course A after navigation, including its finally during course B publication", async (outcome) => {
  const a = deferred(), b = deferred();
  mocks.post.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  await page();
  fireEvent.click(screen.getByRole("button", { name: "Опубликовать курс" }));
  fireEvent.click(screen.getByRole("button", { name: "Назад к курсу Б" }));
  await screen.findByRole("heading", { name: "Курс Б" });
  fireEvent.click(screen.getByRole("button", { name: "Исходник" }));
  expect(screen.getByRole("textbox", { name: "Текст урока (Markdown)" })).toHaveValue("Текст курса Б");
  expect(screen.getByRole("button", { name: "Опубликовать курс" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Опубликовать курс" }));
  expect(mocks.post.mock.calls.map(([path]) => path)).toEqual(["/courses/7/publish", "/courses/8/publish"]);
  await act(async () => {
    if (outcome === "success") a.resolve({ data: { id: 7, publication_status: "published", revision: 9 } });
    else a.reject(new ApiError("Ошибка публикации курса А", 422));
  });
  expect(screen.queryByText("Курс опубликован")).not.toBeInTheDocument();
  expect(screen.queryByText("Ошибка публикации курса А")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Опубликовано" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Опубликовать курс" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Настройки курса" })).toBeDisabled();
  await act(async () => b.reject(new ApiError("Текущая публикация Б отклонена", 422)));
  expect(await screen.findByText("Текущая публикация Б отклонена")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Опубликовать курс" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Настройки курса" }));
  fireEvent.change(screen.getByLabelText("Название"), { target: { value: "Уточнённое название Б" } });
  mocks.put.mockResolvedValue({ data: {} });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
  await waitFor(() => expect(mocks.put).toHaveBeenCalledWith("/courses/8", expect.objectContaining({ expected_revision: 13 })));
});

it("ignores publication from a previous session and keeps a renewed-session request busy until its own result", async () => {
  const old = deferred(), renewed = deferred();
  mocks.post.mockReturnValueOnce(old.promise).mockReturnValueOnce(renewed.promise);
  await page();
  fireEvent.click(screen.getByRole("button", { name: "Опубликовать курс" }));
  mocks.generation++;
  await act(async () => old.resolve({ data: { id: 7, publication_status: "published", revision: 99 } }));
  expect(screen.queryByText("Курс опубликован")).not.toBeInTheDocument();
  act(() => window.dispatchEvent(new Event("lernium-session-renewed")));
  await waitFor(() => expect(screen.getByRole("button", { name: "Опубликовать курс" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Опубликовать курс" }));
  expect(screen.getByRole("button", { name: "Опубликовать курс" })).toBeDisabled();
  await act(async () => renewed.resolve({ data: { id: 7, publication_status: "published", revision: 10 } }));
  expect(await screen.findByText("Курс опубликован")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Настройки курса" }));
  fireEvent.change(screen.getByLabelText("Название"), { target: { value: "Текущий сеанс" } });
  mocks.put.mockResolvedValue({ data: {} });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
  await waitFor(() => expect(mocks.put).toHaveBeenCalledWith("/courses/7", expect.objectContaining({ expected_revision: 10 })));
});
