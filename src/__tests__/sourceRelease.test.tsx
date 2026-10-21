import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SourceReleasePanel, {
  LearnerSources,
} from "@/Components/SourceReleasePanel";
import { api } from "@/shared/api";
vi.mock("@/shared/api", () => ({
  api: { get: vi.fn(), put: vi.fn() },
  apiFetch: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const source = {
  document_id: 7,
  version: 3,
  filename: "Материал.txt",
  content_hash: "a".repeat(64),
  mime_type: "text/plain",
  size_bytes: 128,
  learner_visible: false,
  status: "indexed",
  content_url: "/api/courses/1/source-release/7/content",
};

it("requires explicit original-file confirmation and sends the reviewed version with CAS", async () => {
  vi.mocked(api.get).mockResolvedValue({
    data: { items: [source], total: 1, can_edit: true, content_revision: 9 },
  });
  vi.mocked(api.put).mockResolvedValue({ data: {} });
  render(<SourceReleasePanel courseId={1} />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Разрешить ученикам" }),
  );
  const button = screen.getByRole("button", { name: "Подтвердить доступ" });
  expect(button).toBeDisabled();
  expect(api.put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(button);
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith("/courses/1/source-release/7", {
      learner_visible: true,
      confirm_original_safe: true,
      expected_revision: 9,
      document_version: 3,
      content_hash: "a".repeat(64),
    }),
  );
});

it("does not expose publication controls to reviewers or learners", async () => {
  vi.mocked(api.get).mockResolvedValue({
    data: { items: [source], total: 1, can_edit: false, content_revision: 9 },
  });
  render(<SourceReleasePanel courseId={1} />);
  await screen.findByText("Материал.txt");
  expect(
    screen.queryByRole("button", { name: "Разрешить ученикам" }),
  ).not.toBeInTheDocument();
  cleanup();
  render(<LearnerSources assignmentId={8} sources={[]} />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
