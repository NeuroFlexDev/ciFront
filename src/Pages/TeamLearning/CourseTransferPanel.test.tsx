import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CourseTransferPanel from "./CourseTransferPanel";
import { api, apiFetch } from "@/shared/api";

vi.mock("@/shared/api", () => ({ api: { get: vi.fn() }, apiFetch: vi.fn() }));
const version = {
  course_id: 20,
  course_version_id: 31,
  revision: 3,
  title: "Safety basics",
  published_at: "2026-10-21T00:00:00Z",
  snapshot_sha256: "a".repeat(64),
  source_count: 2,
};
const consent =
  "Я подтверждаю передачу выбранной версии и указанного состава материалов.";
beforeEach(() => {
  vi.mocked(api.get).mockResolvedValue({
    data: { items: [version], total: 1 },
  });
  vi.mocked(apiFetch).mockResolvedValue(
    new Response(new Blob(["zip bytes"]), {
      status: 200,
      headers: { "Content-Type": "application/zip" },
    }),
  );
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:course-transfer"),
      revokeObjectURL: vi.fn(),
    }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

it("downloads only the owner-selected immutable version after explicit consent and never includes keys by default", async () => {
  render(<CourseTransferPanel />);
  const select = await screen.findByRole("combobox", {
    name: "Версия для передачи",
  });
  fireEvent.change(select, { target: { value: "31" } });
  const button = screen.getByRole("button", { name: "Скачать пакет курса" });
  expect(button).toBeDisabled();
  expect(apiFetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox", { name: consent }));
  fireEvent.click(button);
  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
  const [path, options] = vi.mocked(apiFetch).mock.calls[0];
  expect(path).toBe("/team/course-transfers/export");
  expect(JSON.parse(String(options?.body))).toEqual({
    course_version_id: 31,
    snapshot_sha256: "a".repeat(64),
    include_sources: true,
    include_answer_keys: false,
    confirm_transfer: true,
    confirm_private_materials: false,
  });
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Пакет подготовлен",
  );
  expect(screen.getByRole("checkbox", { name: consent })).not.toBeChecked();
});

it("requires a new composition confirmation and separate private-key consent, preserving the form on download failure", async () => {
  vi.mocked(apiFetch).mockResolvedValue(
    new Response(JSON.stringify({ detail: "Источник временно недоступен" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    }),
  );
  render(<CourseTransferPanel />);
  fireEvent.change(
    await screen.findByRole("combobox", { name: "Версия для передачи" }),
    { target: { value: "31" } },
  );
  fireEvent.click(screen.getByRole("checkbox", { name: consent }));
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "Включить закрытые ключи ответов для передачи преподавателю",
    }),
  );
  expect(screen.getByRole("checkbox", { name: consent })).not.toBeChecked();
  const button = screen.getByRole("button", { name: "Скачать пакет курса" });
  fireEvent.click(screen.getByRole("checkbox", { name: consent }));
  expect(button).toBeDisabled();
  fireEvent.click(
    screen.getByRole("checkbox", {
      name: "Подтверждаю передачу закрытых ключей только уполномоченному получателю, не ученикам.",
    }),
  );
  fireEvent.click(button);
  expect(
    await screen.findByText("Источник временно недоступен"),
  ).toBeInTheDocument();
  expect(screen.getByRole("combobox")).toHaveValue("31");
  expect(screen.getByRole("checkbox", { name: consent })).toBeChecked();
  expect(screen.queryByText(/Пакет подготовлен/)).not.toBeInTheDocument();
});
