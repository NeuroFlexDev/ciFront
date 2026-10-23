import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AiHelperPage from "@/Pages/AiHelperPage/AiHelperPage";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { materialsEnglish } from "@/i18n/materials";
import { readDraft, setDraftOwner, writeDraft } from "@/shared/drafts";

const mocked = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("@/shared/api", () => ({ api: mocked }));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: { id: 42, organization_id: 2 } }) }));
vi.mock("@/Components/Menu/Menu", () => ({ default: () => null }));
vi.mock("@/Components/MarkdownContent", () => ({ default: ({ children }: { children: string }) => <p>{children}</p> }));
vi.mock("@/Components/ElementUi/ImageEditor/ImageLibrary", () => ({ default: () => null }));

let enabled: boolean;
let usage: { ai_unlimited?: boolean; chat_monthly_limit: number; interactive_requests_this_month: number; interactive_requests_admission_total?: number; interactive_requests_own_legacy_unattributed?: number };
let failUsage: boolean;
beforeEach(() => {
  Object.values(mocked).forEach((method) => method.mockReset());
  localStorage.clear();
  setDraftOwner(42);
  Element.prototype.scrollIntoView = vi.fn();
  enabled = true;
  failUsage = false;
  usage = { chat_monthly_limit: 10, interactive_requests_this_month: 0 };
  mocked.get.mockImplementation(async (path: string) => {
    if (path === "/team/settings") return { data: { features: { assistant: enabled } } };
    if (path === "/materials/resource-usage") {
      if (failUsage) throw new TypeError("Connection interrupted");
      return { data: usage };
    }
    if (path.startsWith("/chat/?")) return { data: [{ id: 5, name: "Сохранённый диалог", course_id: 4 }] };
    if (path.startsWith("/chat/requests/")) return { data: { chat_id: 5, request_id: "existing-receipt", status: "pending", text: "Вопрос уже отправлен" } };
    return { data: [{ id: 1, author: "bot", text: "Сохранённый учебный ответ" }] };
  });
});
afterEach(() => { cleanup(); setDraftOwner(null); });

function page() {
  return render(<LocaleProvider dictionaries={{ en: materialsEnglish }}><MemoryRouter initialEntries={["/ai-helper?course=4"]}><AiHelperPage /></MemoryRouter></LocaleProvider>);
}

it("explains a disabled organization assistant, keeps history and a durable editable draft, and blocks click and keyboard sends", async () => {
  enabled = false;
  usage.chat_monthly_limit = 0;
  const initial = page();
  expect(await screen.findByText(/Помощник отключён в настройках/)).toBeInTheDocument();
  expect(await screen.findByText("Сохранённый учебный ответ")).toBeInTheDocument();
  const input = screen.getByLabelText("Сообщение помощнику");
  expect(input).toBeEnabled();
  fireEvent.change(input, { target: { value: "Мой будущий вопрос" } });
  fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
  fireEvent.click(screen.getByRole("button", { name: "Отправить сообщение" }));
  expect(screen.getByRole("button", { name: "Отправить сообщение" })).toBeDisabled();
  expect(mocked.post).not.toHaveBeenCalled();
  expect(readDraft<{ text: string }>("chat:5:input", 42)?.value.text).toBe("Мой будущий вопрос");
  initial.unmount();
  page();
  expect(await screen.findByLabelText("Сообщение помощнику")).toHaveValue("Мой будущий вопрос");
});

it("shows zero quota before submission without requiring the newer backend counters", async () => {
  usage.chat_monthly_limit = 0;
  page();
  expect(await screen.findByText(/нулевой лимит запросов/)).toBeInTheDocument();
  expect(screen.getByLabelText("Сообщение помощнику")).toBeEnabled();
  expect(screen.getByRole("button", { name: "Отправить сообщение" })).toBeDisabled();
  expect(mocked.post).not.toHaveBeenCalled();
});

it("waits for the initial read before allowing a keyboard submission while keeping draft input available", async () => {
  const original = mocked.get.getMockImplementation()!;
  let resolveUsage!: (value: { data: typeof usage }) => void;
  mocked.get.mockImplementation((path: string) => path === "/materials/resource-usage"
    ? new Promise((resolve) => { resolveUsage = resolve; })
    : original(path));
  page();
  const input = await screen.findByLabelText("Сообщение помощнику");
  fireEvent.change(input, { target: { value: "Черновик до проверки" } });
  fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
  expect(screen.getByText("Проверяем доступность помощника…")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Отправить сообщение" })).toBeDisabled();
  expect(mocked.post).not.toHaveBeenCalled();
  await act(async () => { resolveUsage({ data: usage }); });
  expect(screen.getByRole("button", { name: "Отправить сообщение" })).toBeEnabled();
  expect(input).toHaveValue("Черновик до проверки");
});

it.each([
  { chat_monthly_limit: 2, interactive_requests_this_month: 2 },
  { chat_monthly_limit: 2, interactive_requests_this_month: 1, interactive_requests_admission_total: 2 },
  { chat_monthly_limit: 2, interactive_requests_this_month: 1, interactive_requests_own_legacy_unattributed: 1 },
])("honors exhausted monthly admission counters %j", async (value) => {
  usage = value;
  page();
  expect(await screen.findByText(/Месячный лимит запросов к помощнику исчерпан/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Сообщение помощнику"), { target: { value: "Черновик" } });
  expect(screen.getByRole("button", { name: "Отправить сообщение" })).toBeDisabled();
  expect(mocked.post).not.toHaveBeenCalled();
});

it("fails closed on an availability read error and enables sending only after an explicit successful read retry, preserving the draft", async () => {
  failUsage = true;
  localStorage.setItem("lernium_locale", "en");
  page();
  expect(await screen.findByText(/Assistant availability could not be checked/)).toBeInTheDocument();
  const input = screen.getByLabelText("Message to assistant");
  fireEvent.change(input, { target: { value: "Unsent draft" } });
  fireEvent.keyDown(input, { key: "Enter", metaKey: true });
  expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  failUsage = false;
  fireEvent.click(screen.getByRole("button", { name: "Refresh availability" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled());
  expect(input).toHaveValue("Unsent draft");
  expect(mocked.post).not.toHaveBeenCalled();
});

it("still permits reading an existing receipt while new AI requests are disabled", async () => {
  enabled = false;
  writeDraft("chat:5:input", { text: "Вопрос уже отправлен", submittedText: "Вопрос уже отправлен", requestId: "existing-receipt" }, undefined, 42);
  page();
  await screen.findByText(/Помощник отключён в настройках/);
  const calls = mocked.get.mock.calls.filter(([path]) => String(path).startsWith("/chat/requests/")).length;
  const check = screen.getByRole("button", { name: "Проверить отправку" });
  expect(check).toBeEnabled();
  fireEvent.click(check);
  await waitFor(() => expect(mocked.get.mock.calls.filter(([path]) => String(path).startsWith("/chat/requests/")).length).toBeGreaterThan(calls));
  expect(mocked.post).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Сообщение помощнику")).toHaveValue("Вопрос уже отправлен");
});


it("allows an exempt organization to send despite exhausted product quotas", async () => {
  writeDraft("chat:5:input", { text: "" }, undefined, 42);
  usage = { ai_unlimited: true, chat_monthly_limit: 0, interactive_requests_this_month: 10000 };
  page();
  const input = await screen.findByLabelText("Сообщение помощнику");
  fireEvent.change(input, { target: { value: "Помоги разобраться в регламенте" } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Отправить сообщение" })).toBeEnabled());
  expect(screen.queryByText(/нулевой лимит запросов/)).not.toBeInTheDocument();
});
