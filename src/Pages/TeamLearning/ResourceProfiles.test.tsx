import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import DeliveryPage from "../AdminPage/DeliveryPage";
import { api } from "@/shared/api";
import { setDraftOwner } from "@/shared/drafts";
vi.mock("@/shared/api", () => ({ api: { get: vi.fn(), put: vi.fn() } }));
vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({ user: { id: 80, is_admin: true } }),
}));
vi.mock("@/Pages/Workspace/shared", () => ({
  Shell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  styles: {},
}));
vi.mock("@/Components/OrganizationResourcePolicy", () => ({
  default: () => null,
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  localStorage.clear();
  setDraftOwner(null);
});
it("changes a neutral resource label without introducing or changing numeric quotas and features", async () => {
  setDraftOwner(80);
  const record = {
    organization_id: 40,
    revision: 3,
    profile: "education",
    languages: ["ru"],
    role_labels: {},
    ai_context: {},
    features: { authoring: true, ai_grading: false },
    delivery: { deployment_mode: "cloud", support_contact: "Support" },
    rules: {},
  };
  vi.mocked(api.get).mockResolvedValue({ data: record });
  vi.mocked(api.put).mockResolvedValue({ data: { ...record, revision: 4 } });
  render(
    <MemoryRouter initialEntries={["/admin/organizations/40/delivery"]}>
      <Routes>
        <Route
          path="/admin/organizations/:organizationId/delivery"
          element={<DeliveryPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.change(await screen.findByLabelText("Профиль ресурсов"), {
    target: { value: "pilot" },
  });
  expect(api.put).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Сохранить состав поставки" }),
  );
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith("/admin/organizations/40/delivery", {
      expected_revision: 3,
      profile: "education",
      languages: ["ru"],
      role_labels: {},
      ai_context: {},
      features: record.features,
      delivery: { ...record.delivery, resource_profile: "pilot" },
    }),
  );
  expect(api.put).toHaveBeenCalledTimes(1);
});
