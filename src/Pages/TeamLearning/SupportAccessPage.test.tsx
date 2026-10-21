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
import SupportAccessPage from "./SupportAccessPage";
import { api } from "@/shared/api";
const { user } = vi.hoisted(() => ({
  user: { id: 3, is_admin: false, organization_role: "owner" },
}));
vi.mock("@/auth/useAuth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/shared/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/Pages/Workspace/shared", () => ({
  Shell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/Components/MarkdownContent", () => ({
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
const grant = {
  id: 7,
  organization_id: 40,
  organization_name: "Org",
  operator_id: 8,
  operator_name: "Support operator",
  scope_type: "assignment",
  scope_id: 90,
  reason: "Inspect the reported answer",
  requested_hours: 2,
  revision: 3,
  status: "pending",
  created_at: "2026-10-21T10:00:00",
  expires_at: null,
  decision_comment: "",
};
beforeEach(() => {
  user.is_admin = false;
  user.organization_role = "owner";
  vi.mocked(api.get).mockResolvedValue({ data: { items: [grant], total: 1 } });
  vi.mocked(api.post).mockResolvedValue({
    data: { ...grant, status: "approved", revision: 4 },
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("shows the exact scope to the owner and submits an explicit decision with its revision", async () => {
  render(
    <MemoryRouter>
      <SupportAccessPage />
    </MemoryRouter>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Разрешить чтение" }),
  );
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith("/support/grants/7/decision", {
      expected_revision: 3,
      decision: "approved",
      hours: 1,
      comment: "",
    }),
  );
  expect(api.get).not.toHaveBeenCalledWith(
    "/support/grants/7/content",
    expect.anything(),
  );
  expect(
    screen.queryByRole("button", { name: "Открыть разрешённые данные" }),
  ).not.toBeInTheDocument();
});
it("requires an explicit operator open action and revocation closes loaded private content", async () => {
  user.is_admin = true;
  user.organization_role = "member";
  let active = true;
  vi.mocked(api.get).mockImplementation(async (path) => ({
    data: path.includes("/content")
      ? {
          grant: {
            ...grant,
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          },
          content: {
            modules: [
              {
                id: 1,
                title: "Module",
                lessons: [
                  {
                    id: 1,
                    title: "Private lesson",
                    content: "Owner-approved lesson",
                  },
                ],
                assessments: [],
              },
            ],
            assessments: [],
          },
          responses: [],
        }
      : path.includes("/admin/organizations")
        ? { items: [] }
        : {
            items: [{ ...grant, status: active ? "approved" : "revoked" }],
            total: 1,
          },
  }));
  vi.mocked(api.post).mockImplementation(async () => {
    active = false;
    return { data: {} };
  });
  render(
    <MemoryRouter>
      <SupportAccessPage />
    </MemoryRouter>,
  );
  const open = await screen.findByRole("button", {
    name: "Открыть разрешённые данные",
  });
  expect(screen.queryByText("Owner-approved lesson")).not.toBeInTheDocument();
  fireEvent.click(open);
  expect(await screen.findByText("Owner-approved lesson")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Закрыть запрос и доступ" }),
  );
  await waitFor(() =>
    expect(screen.queryByText("Owner-approved lesson")).not.toBeInTheDocument(),
  );
  expect(api.post).toHaveBeenCalledWith("/support/grants/7/revoke", {
    expected_revision: 3,
  });
});
