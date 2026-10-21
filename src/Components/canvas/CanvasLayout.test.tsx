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
import { readDraft, setDraftOwner } from "@/shared/drafts";

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
afterEach(() => {
  cleanup();
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
