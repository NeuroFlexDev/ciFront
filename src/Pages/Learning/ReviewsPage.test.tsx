import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import ReviewsPage from "./ReviewsPage";
import type { AIProposal, Review } from "./types";
import { api } from "@/shared/api";

vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user: { id: 31 } }) }));
vi.mock("@/shared/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/Pages/Workspace/shared", () => ({
  Shell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const proposal: AIProposal = {
  request_id: "saved-request",
  response_revision: 2,
  created_at: "2026-10-21T00:00:00Z",
  status: "completed",
  points: 2,
  feedback: "The answer supports the criterion.",
  model: "configured-model",
  provider: "configured-provider",
  error_code: null,
  criteria_scores: [
    {
      id: "a",
      points: 2,
      rationale: "The process includes a verification step.",
      evidence: ["I verify the result."],
    },
  ],
};
const review: Review = {
  id: 8,
  assignment_id: 12,
  assessment_id: "task:4",
  attempt: 1,
  revision: 2,
  answer: { text: "I verify the result." },
  status: "pending_review",
  submitted_at: "2026-10-21T00:00:00Z",
  points: null,
  feedback: "",
  max_points: 2,
  can_retry: false,
  updated_at: "2026-10-21T00:00:00Z",
  user_id: 91,
  full_name: "Participant",
  course_title: "Course",
  history: [],
  assessment: {
    id: "task:4",
    question: "Describe verification",
    description: "",
    question_type: "open",
    answers: [],
    max_points: 2,
    criteria: [
      {
        id: "a",
        title: "Verification",
        description: "Check the result",
        max_points: 2,
      },
    ],
    grading_mode: "ai_assisted",
  },
  grading_metadata: { ai_proposal: proposal },
};

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.get).mockImplementation(async (path) => ({
    data: path.includes("/reviews/8") ? review : { items: [review] },
  }));
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("shows exact criterion evidence and keeps applying an AI proposal separate from final grading", async () => {
  render(
    <MemoryRouter initialEntries={["/reviews?response=8"]}>
      <ReviewsPage />
    </MemoryRouter>,
  );
  expect(
    await screen.findByText("The process includes a verification step."),
  ).toBeInTheDocument();
  expect(screen.getByText("Цитаты из ответа участника")).toBeInTheDocument();
  expect(document.querySelector("blockquote")?.textContent).toBe(
    "I verify the result.",
  );
  expect(screen.getByRole("spinbutton")).toHaveValue(0);
  fireEvent.click(
    screen.getByRole("button", { name: "Перенести в форму ручной оценки" }),
  );
  expect(screen.getByRole("spinbutton")).toHaveValue(2);
  await waitFor(() => expect(api.post).not.toHaveBeenCalled());
});

it("continues displaying earlier proposals that have no evidence fields", async () => {
  vi.mocked(api.get).mockImplementation(async (path) => ({
    data: path.includes("/reviews/8")
      ? {
          ...review,
          grading_metadata: {
            ai_proposal: {
              ...proposal,
              criteria_scores: [{ id: "a", points: 2 }],
            },
          },
        }
      : { items: [review] },
  }));
  render(
    <MemoryRouter initialEntries={["/reviews?response=8"]}>
      <ReviewsPage />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("button", {
      name: "Перенести в форму ручной оценки",
    }),
  ).toBeEnabled();
  expect(
    screen.queryByText("Цитаты из ответа участника"),
  ).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});
