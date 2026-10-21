import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AiHelperPage from "@/Pages/AiHelperPage/AiHelperPage";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { useLocale } from "@/i18n/useLocale";
import { materialsEnglish } from "@/i18n/materials";
const mocked = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/shared/api", () => ({ api: mocked }));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: { id: 42 } }) }));
vi.mock("@/Components/Menu/Menu", () => ({ default: () => null }));
vi.mock("@/Components/MarkdownContent", () => ({
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
vi.mock("@/Components/ElementUi/ImageEditor/ImageLibrary", () => ({
  default: () => null,
}));
beforeEach(() => {
  mocked.get.mockReset();
  mocked.post.mockReset();
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);
function SwitchLocale() {
  const { setLocale } = useLocale();
  return <button onClick={() => setLocale("ru")}>Switch language</button>;
}
it("switches interface language without translating history, renaming chats or losing an unsent question", async () => {
  localStorage.setItem("lernium_locale", "en");
  mocked.get.mockImplementation(async (path: string) => ({
    data: path.startsWith("/chat/?")
      ? [{ id: 5, name: "Мой исходный диалог", course_id: 2 }]
      : [{ id: 1, author: "bot", text: "Русский учебный ответ" }],
  }));
  render(
    <LocaleProvider dictionaries={{ en: materialsEnglish }}>
      <SwitchLocale />
      <MemoryRouter initialEntries={["/ai-helper?course=2"]}>
        <AiHelperPage />
      </MemoryRouter>
    </LocaleProvider>,
  );
  expect(
    await screen.findByRole("heading", { name: "AI assistant" }),
  ).toBeInTheDocument();
  fireEvent.change(await screen.findByLabelText("Message to assistant"), {
    target: { value: "Мой несохранённый вопрос" },
  });
  expect(screen.getByText("Русский учебный ответ")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Switch language"));
  expect(screen.getByLabelText("Сообщение помощнику")).toHaveValue(
    "Мой несохранённый вопрос",
  );
  expect(
    screen.getByRole("heading", { name: "Мой исходный диалог" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Русский учебный ответ")).toBeInTheDocument();
  expect(mocked.post).not.toHaveBeenCalled();
});
it("recovers a completed author request after a lost response without sending or billing it twice", async () => {
  let completed = false;
  const messages = [
    { id: 1, author: "user", text: "Не потерять учебную цель" },
    { id: 2, author: "bot", text: "Сохранённый ответ помощника" },
  ];
  mocked.get.mockImplementation(async (path: string) => {
    if (path.startsWith("/chat/?"))
      return { data: [{ id: 5, name: "План курса", course_id: 2 }] };
    if (path.startsWith("/chat/requests/"))
      return {
        data: {
          chat_id: 5,
          request_id: path.split("/").at(-1),
          status: completed ? "completed" : "pending",
          text: messages[0].text,
        },
      };
    return { data: completed ? messages : [] };
  });
  mocked.post.mockRejectedValue(new TypeError("Response lost"));
  const page = () => (
    <MemoryRouter initialEntries={["/ai-helper?course=2"]}>
      <AiHelperPage />
    </MemoryRouter>
  );
  const initial = render(page());
  fireEvent.change(await screen.findByLabelText("Сообщение помощнику"), {
    target: { value: messages[0].text },
  });
  fireEvent.click(screen.getByLabelText("Отправить сообщение"));
  await waitFor(() => expect(mocked.post).toHaveBeenCalledTimes(1));
  expect(mocked.post.mock.calls[0][1].request_id).toBeTruthy();
  await waitFor(() =>
    expect(screen.getByLabelText("Сообщение помощнику")).toBeDisabled(),
  );
  expect(screen.getByLabelText("Сообщение помощнику")).toHaveValue(
    messages[0].text,
  );
  initial.unmount();
  completed = true;
  render(page());
  await screen.findByText("Сохранённый ответ помощника");
  await waitFor(() =>
    expect(screen.getByLabelText("Сообщение помощнику")).toHaveValue(""),
  );
  expect(mocked.post).toHaveBeenCalledTimes(1);
});
