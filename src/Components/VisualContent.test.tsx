// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import ImageLibrary from "./ElementUi/ImageEditor/ImageLibrary";
import DiagramEditor from "./DiagramEditor";
import MarkdownContent from "./MarkdownContent";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  diagram: vi.fn(),
}));
vi.mock("@/shared/api", () => ({
  api: { get: mocks.get, post: mocks.post },
  apiFetch: vi.fn(),
}));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: { id: 9 } }) }));
vi.mock("@/i18n/useLocale", () => ({
  useLocale: () => ({ t: (key: string) => key, locale: "ru" }),
}));
vi.mock("@/shared/diagrams", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/diagrams")>()),
  renderDiagram: mocks.diagram,
}));

beforeEach(() => {
  localStorage.clear();
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.diagram.mockReset();
  mocks.diagram.mockResolvedValue({
    svg: '<svg viewBox="0 0 100 80"><text>Rendered diagram</text></svg>',
    width: 100,
    height: 80,
  });
});
afterEach(cleanup);

it("a lost image response survives remount and retries the original idempotency key", async () => {
  mocks.get.mockImplementation((path: string) =>
    Promise.resolve({
      data: path.includes("capabilities")
        ? {
            image_generation_available: true,
            image_max_bytes: 1000000,
            image_max_pixels: 10000,
            image_price_rub_upper_bound: "20",
          }
        : path.startsWith("/images/")
          ? { id: 3, status: "queued" }
          : { items: [], total: 0, can_generate: true },
    }),
  );
  mocks.post
    .mockRejectedValueOnce(new Error("Lost connection"))
    .mockResolvedValueOnce({ data: { id: 3, status: "queued" } });
  const first = render(<ImageLibrary courseId={7} />);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Описание изображения" }),
    { target: { value: "A cell diagram" } },
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Сгенерировать изображение" }),
    ).not.toBeDisabled(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Сгенерировать изображение" }),
  );
  await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
  await screen.findByText(/Запрос сохранён/);
  const sent = mocks.post.mock.calls[0][1];
  first.unmount();
  render(<ImageLibrary courseId={7} />);
  expect(
    screen.getByRole("textbox", { name: "Описание изображения" }),
  ).toHaveValue("A cell diagram");
  const retry = await screen.findByRole("button", {
    name: "Проверить запуск генерации",
  });
  await waitFor(() => expect(retry).not.toBeDisabled());
  fireEvent.click(retry);
  await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(2));
  expect(mocks.post.mock.calls[1][1]).toEqual(sent);
});

it("diagram syntax errors preserve the draft and cannot insert an invalid result", async () => {
  mocks.diagram.mockRejectedValue(
    new Error(
      "Не удалось построить схему. Проверьте её синтаксис; исходный текст сохранён.",
    ),
  );
  const insert = vi.fn();
  const first = render(<DiagramEditor draftKey="7:11" onInsert={insert} />);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Исходный текст схемы" }),
    { target: { value: "flowchart LR\nA[broken" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Добавить схему в урок" }),
  );
  await waitFor(() =>
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0),
  );
  expect(insert).not.toHaveBeenCalled();
  first.unmount();
  render(<DiagramEditor draftKey="7:11" onInsert={insert} />);
  expect(
    screen.getByRole("textbox", { name: "Исходный текст схемы" }),
  ).toHaveValue("flowchart LR\nA[broken");
  expect(screen.getByRole("button", { name: "Процесс" })).toBeDisabled();
});

it("Markdown diagram fences use the renderer while ordinary code and hostile HTML stay inert", async () => {
  const source =
    '```mermaid\nflowchart LR\nA-->B\n```\n\n```python\nprint("Hello")\n```\n\n<script>alert(1)</script>';
  const { container } = render(<MarkdownContent>{source}</MarkdownContent>);
  await screen.findByText("Rendered diagram");
  expect(mocks.diagram).toHaveBeenCalledWith(
    "flowchart LR\nA-->B\n",
    "mermaid",
  );
  expect(screen.getByText('print("Hello")')).toBeInTheDocument();
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelector("pre figure")).toBeNull();
});
