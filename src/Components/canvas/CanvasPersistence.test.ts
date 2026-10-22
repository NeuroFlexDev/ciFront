import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCanvasStore } from "@/store/canvasStore";
import { createCanvasNode } from "@/utils/nodeFactory";
import { createCanvasEdge } from "@/utils/edgeFactory";
import { readDraft, setDraftOwner, writeDraft } from "@/shared/drafts";
import type { CanvasSnapshot } from "@/types/canvas";
import { api } from "@/shared/api";

vi.mock("@/shared/api", () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));
let owner = 9670;
const node = createCanvasNode(
  "module",
  { x: 90, y: 80 },
  { title: "Сохранённый модуль" },
);
const second = createCanvasNode("lesson", { x: 400, y: 80 }, { title: "Урок" });
const edge = createCanvasEdge(node.id, second.id, "contains");
const snapshot: CanvasSnapshot = {
  courseId: "28",
  courseTitle: "Настоящее название",
  nodes: [node, second],
  edges: [edge],
  viewport: { x: 120, y: 75, zoom: 0.8 },
  updatedAt: 1700000000000,
};
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  setDraftOwner(++owner);
  vi.mocked(api.get).mockResolvedValue({ data: { version: 3, snapshot } });
  vi.mocked(api.put).mockResolvedValue({ data: { version: 4 } });
});
afterEach(() => {
  setDraftOwner(null);
  localStorage.clear();
});
it("does not create an unsaved draft from initial measurements, selection or viewport navigation", async () => {
  await useCanvasStore.getState().loadCourse("28");
  useCanvasStore
    .getState()
    .onNodesChange([
      {
        id: node.id,
        type: "dimensions",
        dimensions: { width: 280, height: 190 },
      },
    ]);
  useCanvasStore
    .getState()
    .onNodesChange([{ id: node.id, type: "select", selected: true }]);
  useCanvasStore
    .getState()
    .onEdgesChange([{ id: edge.id, type: "select", selected: true }]);
  useCanvasStore.getState().setViewport({ x: 15, y: 10, zoom: 1 });
  expect(useCanvasStore.getState().nodes[0].measured?.width).toBe(280);
  expect(useCanvasStore.getState().hasUnsavedChanges).toBe(false);
  expect(useCanvasStore.getState().recoveredDraft).toBe(false);
  expect(readDraft("canvas:28")).toBeNull();
  expect(api.put).not.toHaveBeenCalled();
});
it("persists actual node movement and remains saved after reload and layout measurements", async () => {
  await useCanvasStore.getState().loadCourse("28");
  useCanvasStore
    .getState()
    .onNodesChange([
      {
        id: node.id,
        type: "position",
        position: { x: 190, y: 180 },
        dragging: true,
      },
    ]);
  expect(useCanvasStore.getState().hasUnsavedChanges).toBe(true);
  expect(
    readDraft<CanvasSnapshot>("canvas:28")?.value.nodes[0].position,
  ).toEqual({ x: 190, y: 180 });
  expect(
    readDraft<CanvasSnapshot>("canvas:28")?.value.nodes[0],
  ).not.toHaveProperty("dragging");
  await useCanvasStore.getState().saveCourse();
  const sent = vi.mocked(api.put).mock.calls[0][1] as {
    version: number;
    snapshot: CanvasSnapshot;
  };
  expect(sent.version).toBe(3);
  vi.mocked(api.get).mockResolvedValue({
    data: { version: 4, snapshot: sent.snapshot },
  });
  await useCanvasStore.getState().loadCourse("28");
  useCanvasStore
    .getState()
    .onNodesChange([
      {
        id: node.id,
        type: "dimensions",
        dimensions: { width: 282, height: 192 },
      },
    ]);
  expect(useCanvasStore.getState().hasUnsavedChanges).toBe(false);
  expect(useCanvasStore.getState().viewport).toEqual(snapshot.viewport);
  expect(readDraft("canvas:28")).toBeNull();
});
it("discards a legacy recovery copy containing only UI state and uses the canonical course title", async () => {
  writeDraft(
    "canvas:28",
    {
      ...snapshot,
      courseTitle: "Курс 28",
      nodes: snapshot.nodes.map((n) => ({
        ...n,
        selected: true,
        measured: { width: 300, height: 200 },
      })),
      viewport: { x: 0, y: 0, zoom: 1.8 },
      updatedAt: 0,
    },
    2,
  );
  await useCanvasStore.getState().loadCourse("28");
  expect(useCanvasStore.getState().courseTitle).toBe(snapshot.courseTitle);
  expect(useCanvasStore.getState().recoveredDraft).toBe(false);
  expect(useCanvasStore.getState().hasUnsavedChanges).toBe(false);
  expect(readDraft("canvas:28")).toBeNull();
});
it("keeps newer authored content when an older save finishes, despite layout updates", async () => {
  await useCanvasStore.getState().loadCourse("28");
  useCanvasStore
    .getState()
    .updateNodeData(node.id, { title: "Отправленное название" });
  let finish!: (value: { data: { version: number } }) => void;
  vi.mocked(api.put).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const save = useCanvasStore.getState().saveCourse();
  useCanvasStore
    .getState()
    .onNodesChange([
      {
        id: node.id,
        type: "dimensions",
        dimensions: { width: 280, height: 190 },
      },
    ]);
  useCanvasStore
    .getState()
    .updateNodeData(node.id, { title: "Новое название во время сохранения" });
  finish({ data: { version: 4 } });
  await save;
  expect(useCanvasStore.getState().hasUnsavedChanges).toBe(true);
  const recovery = readDraft<CanvasSnapshot>("canvas:28");
  expect(recovery?.value.nodes[0].data.title).toBe(
    "Новое название во время сохранения",
  );
  expect(recovery?.baseRevision).toBe(4);
  expect(recovery?.value.nodes[0]).not.toHaveProperty("measured");
});
