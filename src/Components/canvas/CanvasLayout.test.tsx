import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CanvasToolbar } from "./CanvasToolbar";
import LerniumCanvasPage from "@/Pages/LerniumCanvasPage/LerniumCanvasPage";
import { useCanvasStore } from "@/store/canvasStore";
import { createCanvasNode } from "@/utils/nodeFactory";
import { api } from "@/shared/api";
import { clearDraft, readDraft, setDraftOwner } from "@/shared/drafts";
const availability = vi.hoisted(() => ({
  status: "ready",
  reason: null as string | null,
  blocked: false,
  reload: vi.fn(),
}));
vi.mock("@/Pages/AiHelperPage/useAssistantAvailability", () => ({
  useAssistantAvailability: () => availability,
}));

vi.mock("@/shared/api", () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));
vi.mock("./CanvasView", () => ({
  CanvasView: () => <div data-testid="canvas-surface" />,
}));
vi.mock("@/Components/ai/AIProposalReview", () => ({ default: () => null }));
beforeEach(() => {
  localStorage.clear();
  setDraftOwner(17);
  Object.assign(availability, {
    status: "ready",
    reason: null,
    blocked: false,
  });
  useCanvasStore.setState({
    courseId: null,
    nodes: [],
    edges: [],
    selectedNodeIds: [],
    selectedEdgeIds: [],
    hasUnsavedChanges: false,
    aiProposal: null,
    isSaving: false,
    isAiRunning: false,
    lastError: null,
  });
});

it("shows the actual manual course title and useful empty state without creating a server workspace", async () => {
  vi.mocked(api.get).mockImplementation(async (url) => ({
    data: String(url).endsWith("/workspace")
      ? { version: 0, snapshot: null, course_title: "Знакомство с Лерниумом" }
      : { nodes: [], edges: [], updated_at: null },
  }));
  render(
    <MemoryRouter initialEntries={["/courses/4/canvas"]}>
      <Routes>
        <Route path="/courses/:id/canvas" element={<LerniumCanvasPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Знакомство с Лерниумом" });
  expect(
    screen.getByRole("heading", { name: "Схема ещё не создана" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Открыть содержание курса" }),
  ).toHaveAttribute("href", "/courses/4/edit");
  expect(useCanvasStore.getState().hasUnsavedChanges).toBe(false);
  expect(readDraft("canvas:4", 17)).toBeNull();
  expect(api.put).not.toHaveBeenCalled();
  expect(api.post).not.toHaveBeenCalled();
  for (const button of screen.getAllByRole("button", {
    name: /Разбить модуль|Сгенерировать тест|Достроить ветку|Упростить структуру|Найти пробелы/,
  })) {
    expect(button).toBeDisabled();
    fireEvent.click(button);
  }
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Добавить модуль" }));
  expect(
    screen.queryByRole("heading", { name: "Схема ещё не создана" }),
  ).not.toBeInTheDocument();
  expect(useCanvasStore.getState().nodes).toHaveLength(1);
  expect(useCanvasStore.getState().nodes[0].data.nodeType).toBe("module");
  expect(readDraft("canvas:4", 17)).not.toBeNull();
  expect(api.put).not.toHaveBeenCalled();
  expect(
    screen
      .getAllByRole("button", { name: /Разбить модуль на уроки/ })
      .every((button) => !button.hasAttribute("disabled")),
  ).toBe(true);
  expect(
    screen
      .getAllByRole("button", { name: /Упростить структуру/ })
      .every((button) => button.hasAttribute("disabled")),
  ).toBe(true);
});

it("keeps AI unavailable for a disabled organization despite a selected module, with an explanation", async () => {
  availability.reason =
    "Помощник отключён в настройках вашей организации. Обратитесь к администратору.";
  availability.blocked = true;
  const node = createCanvasNode("module", { x: 0, y: 0 }, { title: "Модуль" });
  vi.mocked(api.get).mockResolvedValue({
    data: {
      version: 1,
      snapshot: {
        courseId: "4",
        courseTitle: "Курс",
        nodes: [node],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        updatedAt: 0,
      },
    },
  });
  render(
    <MemoryRouter initialEntries={["/courses/4/canvas"]}>
      <Routes>
        <Route path="/courses/:id/canvas" element={<LerniumCanvasPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Курс" });
  act(() =>
    useCanvasStore.getState().setSelection({ nodeIds: [node.id], edgeIds: [] }),
  );
  const button = screen.getAllByRole("button", {
    name: /Разбить модуль на уроки/,
  })[0];
  expect(button).toBeDisabled();
  expect(screen.getAllByText(availability.reason).length).toBeGreaterThan(0);
  fireEvent.click(button);
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.getByRole("textbox", { name: "Заголовок" })).toBeEnabled();
});
afterEach(() => {
  cleanup();
  for (const resource of ["canvas:4", "canvas:23"]) {
    const record = readDraft(resource, 17);
    if (record) clearDraft(resource, record.value, 17);
  }
  vi.resetAllMocks();
  setDraftOwner(null);
  localStorage.clear();
});

it("keeps AI actions collapsed, dispatches exactly the chosen action, and closes on Escape", () => {
  const ai = vi.fn(),
    search = vi.fn(),
    save = vi.fn();
  render(
    <CanvasToolbar
      courseTitle="Курс автора"
      isSaving={false}
      isAiRunning={false}
      lastSavedAt={1234}
      hasUnsavedChanges
      onSave={save}
      onSearch={search}
      onZoomIn={vi.fn()}
      onZoomOut={vi.fn()}
      onFitView={vi.fn()}
      onAiAction={ai}
    />,
  );
  const summary = screen.getByText("AI-действия");
  const disclosure = summary.closest("details")!;
  expect(disclosure).not.toHaveAttribute("open");
  expect(screen.getByRole("status")).toHaveTextContent(
    "Есть несохранённые изменения",
  );
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "Моя тема" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Найти узел" }));
  expect(search).toHaveBeenCalledWith("Моя тема");
  fireEvent.click(summary);
  fireEvent.click(
    within(disclosure).getByRole("button", { name: /Разбить модуль на уроки/ }),
  );
  expect(ai).toHaveBeenCalledExactlyOnceWith("split_module");
  expect(disclosure).not.toHaveAttribute("open");
  fireEvent.click(summary);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(disclosure).not.toHaveAttribute("open");
  expect(summary).toHaveFocus();
  expect(screen.getByRole("searchbox")).toHaveValue("Моя тема");
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
  expect(save).toHaveBeenCalledOnce();
});

it("preserves node edits and durable draft while switching mobile panels and saving", async () => {
  const node = createCanvasNode(
    "module",
    { x: 0, y: 0 },
    { title: "Первый модуль", description: "Описание автора" },
  );
  const snapshot = {
    courseId: "23",
    courseTitle: "Настоящий курс",
    nodes: [node],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    updatedAt: 0,
  };
  vi.mocked(api.get).mockResolvedValue({ data: { version: 3, snapshot } });
  vi.mocked(api.put).mockResolvedValue({ data: { version: 4 } });
  render(
    <MemoryRouter initialEntries={["/courses/23/canvas"]}>
      <Routes>
        <Route path="/courses/:id/canvas" element={<LerniumCanvasPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole(
    "heading",
    { name: "Настоящий курс" },
    { timeout: 10000 },
  );
  expect(
    screen.getByRole("button", { name: "Создать frame из выделения" }),
  ).toBeDisabled();
  act(() =>
    useCanvasStore.getState().setSelection({ nodeIds: [node.id], edgeIds: [] }),
  );
  const title = screen.getByRole("textbox", { name: "Заголовок" });
  fireEvent.change(title, { target: { value: "Несохранённое название" } });
  fireEvent.click(screen.getByRole("button", { name: "Инструменты" }));
  fireEvent.click(screen.getByRole("button", { name: "Свойства" }));
  expect(screen.getByRole("textbox", { name: "Заголовок" })).toBe(title);
  expect(title).toHaveValue("Несохранённое название");
  expect(readDraft("canvas:23", 17)).not.toBeNull();
  expect(
    screen.getByRole("button", { name: "Создать frame из выделения" }),
  ).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Схема" }));
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
  await screen.findByText(/Сохранено /, {}, { timeout: 10000 });
  expect(api.put).toHaveBeenCalledWith(
    "/courses/23/workspace",
    expect.objectContaining({
      version: 3,
      snapshot: expect.objectContaining({
        nodes: [
          expect.objectContaining({
            data: expect.objectContaining({ title: "Несохранённое название" }),
          }),
        ],
      }),
    }),
  );
});
