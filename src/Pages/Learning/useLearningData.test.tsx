import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { api } from "@/shared/api";
import { useLearningData } from "./useLearningData";
vi.mock("@/shared/api", () => ({ api: { get: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
it("never exposes results from the previous URL while switching between result and lesson payloads", async () => {
  vi.mocked(api.get).mockResolvedValueOnce({ data: { responses: [] } });
  const { result, rerender } = renderHook(
    ({ path }) =>
      useLearningData<{ responses?: unknown[]; content?: string }>(path),
    { initialProps: { path: "/results" } },
  );
  await waitFor(() => expect(result.current.data).toEqual({ responses: [] }));
  let resolve: (value: { data: { content: string } }) => void = () => {};
  vi.mocked(api.get).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  rerender({ path: "/content" });
  expect(result.current.data).toBeNull();
  expect(result.current.loading).toBe(true);
  await act(async () => {
    resolve({ data: { content: "Lesson" } });
  });
  expect(result.current.data).toEqual({ content: "Lesson" });
});
it("ignores a late response for a previous assignment after navigation", async () => {
  let oldResolve: (value: { data: { id: number } }) => void = () => {};
  vi.mocked(api.get)
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          oldResolve = r;
        }),
    )
    .mockResolvedValueOnce({ data: { id: 2 } });
  const { result, rerender } = renderHook(
    ({ path }) => useLearningData<{ id: number }>(path),
    { initialProps: { path: "/assignment/1" } },
  );
  rerender({ path: "/assignment/2" });
  await waitFor(() => expect(result.current.data?.id).toBe(2));
  await act(async () => oldResolve({ data: { id: 1 } }));
  expect(result.current.data?.id).toBe(2);
});
