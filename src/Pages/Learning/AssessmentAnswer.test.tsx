import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { api } from "@/shared/api";
import { ApiError } from "@/shared/errors";
import { readDraft, setDraftOwner, writeDraft } from "@/shared/drafts";
import { AnswerForm } from "./AssessmentAnswer";
import type { Assessment, LearnerResponse } from "./types";

vi.mock("@/shared/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: { id: 45 } }) }));
vi.mock("@/Components/MarkdownContent", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
const assessment: Assessment = {
  id: "task:1",
  question: "Explain",
  description: "",
  question_type: "open",
  answers: [],
  max_points: 10,
  criteria: [],
  grading_mode: "manual",
};
const response = (patch: Partial<LearnerResponse> = {}): LearnerResponse => ({
  id: 100,
  assignment_id: 71,
  assessment_id: "task:1",
  attempt: 1,
  revision: 1,
  answer: { text: "My answer" },
  status: "draft",
  submitted_at: null,
  points: null,
  feedback: "",
  max_points: 10,
  can_retry: false,
  updated_at: "2026-10-21T11:00:00",
  ...patch,
});
let assignmentId = 70;
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  setDraftOwner(45);
  assignmentId += 1;
});

describe("durable learner answers", () => {
  it("retries the same submitted answer and UUID after a lost response and reload, with no automatic write", async () => {
    const saved = vi.fn(async () => {});
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError("connection lost", 0, "network"),
    );
    const view = render(
      <AnswerForm
        assignmentId={assignmentId}
        assessment={assessment}
        attempt={1}
        onSaved={saved}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "My durable answer" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Отправить на проверку →" }),
    );
    await screen.findByRole("alert");
    const first = vi.mocked(api.post).mock.calls[0][1] as {
      submission_key: string;
      answer: { text: string };
      expected_revision: number;
    };
    expect(first.submission_key).toMatch(/^[\da-f-]{36}$/);
    expect(
      readDraft<{ submission_key: string }>(
        `learning:${assignmentId}:task:1:attempt:1`,
        45,
      )?.value.submission_key,
    ).toBe(first.submission_key);
    view.unmount();
    render(
      <AnswerForm
        assignmentId={assignmentId}
        assessment={assessment}
        attempt={1}
        onSaved={saved}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("My durable answer");
    act(() => window.dispatchEvent(new Event("online")));
    expect(api.post).toHaveBeenCalledTimes(1);
    vi.mocked(api.post).mockResolvedValueOnce({
      data: response({
        status: "pending_review",
        answer: { text: "My durable answer" },
      }),
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Проверить и повторить отправку" }),
    );
    await screen.findByRole("heading", { name: "Ответ принят сервером" });
    expect(vi.mocked(api.post).mock.calls[1][1]).toEqual(first);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(saved).toHaveBeenCalledOnce();
  });

  it("does not silently rebase restored text onto a newer server revision", async () => {
    const key = `learning:${assignmentId}:task:1:attempt:1`;
    writeDraft(
      key,
      {
        answer: { text: "Local original" },
        expected_revision: 2,
        attempt: 1,
        submission_key: null,
        dirty: true,
      },
      undefined,
      45,
    );
    const latest = response({
      revision: 3,
      answer: { text: "Other tab text" },
    });
    render(
      <AnswerForm
        assignmentId={assignmentId}
        assessment={assessment}
        attempt={1}
        server={latest}
        onSaved={async () => {}}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("Local original");
    expect(screen.getByText("Other tab text")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Сохранить черновик" }),
    ).toBeDisabled();
    expect(api.put).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Продолжить с моим текстом" }),
    );
    vi.mocked(api.put).mockResolvedValueOnce({
      data: response({ revision: 4, answer: { text: "Local original" } }),
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить черновик" }));
    await waitFor(() => expect(api.put).toHaveBeenCalled());
    expect(vi.mocked(api.put).mock.calls[0][1]).toEqual({
      answer: { text: "Local original" },
      expected_revision: 3,
      attempt: 1,
    });
  });

  it("compares 409 contents and retains local answer when the submitted server attempt is immutable", async () => {
    vi.mocked(api.post).mockRejectedValueOnce(
      new ApiError("conflict", 409, "http"),
    );
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        responses: [
          response({
            revision: 2,
            status: "pending_review",
            answer: { text: "Accepted elsewhere" },
          }),
        ],
      },
    });
    render(
      <AnswerForm
        assignmentId={assignmentId}
        assessment={assessment}
        attempt={1}
        onSaved={async () => {}}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Local not submitted" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Отправить на проверку →" }),
    );
    await screen.findByText("Accepted elsewhere");
    expect(screen.getByRole("textbox")).toHaveValue("Local not submitted");
    expect(
      screen.queryByRole("button", { name: "Продолжить с моим текстом" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Проверить и повторить отправку" }),
    ).toBeDisabled();
    expect(
      readDraft<{ answer: { text: string } }>(
        `learning:${assignmentId}:task:1:attempt:1`,
        45,
      )?.value.answer.text,
    ).toBe("Local not submitted");
  });

  it("keeps the accepted receipt even if refreshing the surrounding page fails", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: response({
        revision: 5,
        status: "pending_review",
        answer: { text: "Accepted answer" },
      }),
    });
    render(
      <AnswerForm
        assignmentId={assignmentId}
        assessment={assessment}
        attempt={1}
        onSaved={async () => {
          throw new Error("read failed");
        }}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Accepted answer" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Отправить на проверку →" }),
    );
    await screen.findByRole("heading", { name: "Ответ принят сервером" });
    expect(
      screen.queryByRole("button", { name: "Отправить на проверку →" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Accepted answer")).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledOnce();
  });

  it("persists a newly selected attempt separately from the previous submitted attempt", () => {
    const key = `learning:${assignmentId}:task:1:attempt:1`;
    writeDraft(
      key,
      {
        answer: { text: "Attempt one" },
        expected_revision: 1,
        attempt: 1,
        submission_key: "old-key-123",
        dirty: true,
      },
      undefined,
      45,
    );
    const view = render(
      <AnswerForm
        assignmentId={assignmentId}
        assessment={assessment}
        attempt={2}
        onSaved={async () => {}}
      />,
    );
    expect(screen.getByRole("textbox")).toHaveValue("");
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Attempt two" },
    });
    view.unmount();
    expect(
      readDraft<{ answer: { text: string } }>(key, 45)?.value.answer.text,
    ).toBe("Attempt one");
    expect(
      readDraft<{ answer: { text: string } }>(
        `learning:${assignmentId}:task:1:attempt:2`,
        45,
      )?.value.answer.text,
    ).toBe("Attempt two");
  });
});
