import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CourseEditPage from "./CourseEditPage";
import { ApiError } from "@/shared/errors";
import { readDraft, setDraftOwner } from "@/shared/drafts";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
const user = vi.hoisted(() => ({ id: 9519, organization_id: null, organization_role: "owner", is_admin: false }));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/shared/api", () => ({ api: mocks, captureAuthSession: vi.fn(), assertAuthSession: vi.fn(), apiFetch: vi.fn() }));
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
  setDraftOwner(++user.id);
  transfers = { items: [], total: 0 };
  transferError = null;
  mocks.get.mockImplementation(async (path: string) => {
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

async function page() {
  render(<MemoryRouter initialEntries={["/courses/7/edit"]}><Routes><Route path="/courses/:id/edit" element={<CourseEditPage />} /></Routes></MemoryRouter>);
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

it("keeps text entered while publication is pending and does not refetch the editor", async () => {
  const text = await page();
  let finish!: (value: { data: unknown }) => void;
  mocks.post.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "Опубликовать курс" }));
  fireEvent.change(text, { target: { value: "Текст, введённый во время публикации" } });
  transfers = { items: [published], total: 1 };
  await act(async () => finish({ data: { id: 7, publication_status: "published", revision: 9, published_at: published.published_at } }));
  expect(text).toHaveValue("Текст, введённый во время публикации");
  expect(readDraft<string>("lesson:71", user.id)?.value).toBe("Текст, введённый во время публикации");
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
